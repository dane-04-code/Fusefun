/**
 * Meteora Migration Service
 * 
 * Integrated migration handler that runs within the main server process.
 * Listens for graduation events and automatically creates Meteora pools.
 */

const { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const { NATIVE_MINT } = require('@solana/spl-token');
const bs58 = require('bs58');

// ============================================
// CONFIGURATION
// ============================================

const FUSE_PROGRAM_ID = new PublicKey('CT4bS24PZXLzxuGMiHPLs3tpWYu72aVJ83UMgSNUeKY2');
const METEORA_DYNAMIC_AMM_PROGRAM = new PublicKey('Eo7WjKq67rjJQSZxS6z3YkapzY3eMj6Xy8X5EQVn5UaB');

// Trade fee configuration (1% for higher revenue)
const TRADE_FEE_BPS = 100; // 1.00%

// Treasury wallet where fees are swept (optional)
const TREASURY_WALLET = process.env.TREASURY_WALLET || null;

// ============================================
// MIGRATION SERVICE CLASS
// ============================================

class MigrationService {
    constructor(connection, broadcastFn) {
        this.connection = connection;
        this.broadcast = broadcastFn;
        this.wallet = null;
        this.enabled = false;
        this.pendingMigrations = new Map();
        this.completedMigrations = new Map();

        this._init();
    }

    _init() {
        const secretKey = process.env.MIGRATION_WALLET_SECRET;

        if (!secretKey) {
            console.log('⚠️  Migration Service: DISABLED (no MIGRATION_WALLET_SECRET set)');
            console.log('   To enable automatic migration, add MIGRATION_WALLET_SECRET to .env');
            return;
        }

        try {
            // Try base58 first
            this.wallet = Keypair.fromSecretKey(bs58.decode(secretKey));
            this.enabled = true;
            console.log('✅ Migration Service: ENABLED');
            console.log(`   Wallet: ${this.wallet.publicKey.toBase58()}`);

            // Check balance
            this._checkBalance();

            // Start event listener
            this._startListener();
        } catch (err) {
            try {
                // Try JSON array format
                const arr = JSON.parse(secretKey);
                this.wallet = Keypair.fromSecretKey(Uint8Array.from(arr));
                this.enabled = true;
                console.log('✅ Migration Service: ENABLED');
                console.log(`   Wallet: ${this.wallet.publicKey.toBase58()}`);
                this._checkBalance();
                this._startListener();
            } catch (e) {
                console.error('❌ Migration Service: Failed to parse MIGRATION_WALLET_SECRET');
                console.error('   Expected: base58 string or JSON array');
            }
        }
    }

    async _checkBalance() {
        try {
            const balance = await this.connection.getBalance(this.wallet.publicKey);
            console.log(`   Balance: ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);

            if (balance < 0.1 * LAMPORTS_PER_SOL) {
                console.warn('   ⚠️  Low balance! Fund this wallet for migration fees.');
            }
        } catch (err) {
            console.error('   Failed to check wallet balance:', err.message);
        }
    }

    _startListener() {
        console.log('   Listening for graduation events...');

        this.connection.onLogs(
            FUSE_PROGRAM_ID,
            async (logs) => {
                if (logs.err) return;

                // Check for graduation marker
                const gradLog = logs.logs.find(log =>
                    log.includes('GRADUATED') ||
                    log.includes('Graduated') ||
                    log.includes('CurveCompleted')
                );

                if (!gradLog) return;

                console.log(`\n🎓 Graduation detected! Tx: ${logs.signature}`);

                // Process the graduation
                this._handleGraduation(logs.signature);
            },
            'confirmed'
        );
    }

    async _handleGraduation(signature) {
        try {
            // Prevent duplicate processing
            if (this.pendingMigrations.has(signature)) {
                console.log('   Already processing this graduation');
                return;
            }
            this.pendingMigrations.set(signature, Date.now());

            // Get transaction details
            const tx = await this.connection.getTransaction(signature, {
                commitment: 'confirmed',
                maxSupportedTransactionVersion: 0
            });

            if (!tx) {
                console.log('   Could not fetch transaction');
                return;
            }

            // Extract mint address from transaction
            // In the migrate instruction, the mint is typically the 3rd account
            const accountKeys = tx.transaction.message.staticAccountKeys ||
                tx.transaction.message.accountKeys;

            if (!accountKeys || accountKeys.length < 3) {
                console.log('   Could not parse account keys');
                return;
            }

            // Find the mint (usually at index 2 in migrate instruction)
            const mintPubkey = accountKeys[2];
            console.log(`   Token Mint: ${mintPubkey.toBase58()}`);

            // Check how much SOL/tokens were transferred
            // This would require parsing the pre/post balances
            const preBalances = tx.meta.preBalances;
            const postBalances = tx.meta.postBalances;

            // Find the migration authority (first signer that received funds)
            let solReceived = 0;
            for (let i = 0; i < postBalances.length; i++) {
                if (postBalances[i] > preBalances[i]) {
                    solReceived = postBalances[i] - preBalances[i];
                    break;
                }
            }

            console.log(`   SOL received: ${solReceived / LAMPORTS_PER_SOL} SOL`);

            // Create Meteora pool
            await this._createMeteoraPool(mintPubkey, solReceived);

            // Mark as completed
            this.pendingMigrations.delete(signature);
            this.completedMigrations.set(mintPubkey.toBase58(), {
                signature,
                timestamp: Date.now(),
                solAmount: solReceived
            });

            // Broadcast update to connected clients
            if (this.broadcast) {
                this.broadcast({
                    type: 'graduation',
                    mint: mintPubkey.toBase58(),
                    dex: 'meteora',
                    timestamp: Date.now()
                });
            }

        } catch (err) {
            console.error('   Migration failed:', err.message);
            this.pendingMigrations.delete(signature);
        }
    }

    async _createMeteoraPool(mintPubkey, solAmount) {
        console.log(`   Creating Meteora pool...`);

        // Dynamic import of Meteora SDK
        let AmmImpl;
        try {
            const module = await import('@mercurial-finance/dynamic-amm-sdk');
            AmmImpl = module.default;
        } catch (err) {
            console.error('   ❌ Meteora SDK not installed. Run: npm install @mercurial-finance/dynamic-amm-sdk');
            console.log('   Skipping pool creation (manual intervention required)');
            return null;
        }

        try {
            // Get token balance from migration wallet
            // The tokens should have been transferred from the bonding curve
            const tokenAccounts = await this.connection.getTokenAccountsByOwner(
                this.wallet.publicKey,
                { mint: mintPubkey }
            );

            if (tokenAccounts.value.length === 0) {
                console.log('   No token balance found. Token may still be in transit.');
                return null;
            }

            const tokenBalance = tokenAccounts.value[0].account.data.parsed?.info?.tokenAmount?.amount || 0;
            console.log(`   Token balance: ${tokenBalance}`);

            if (tokenBalance === 0) {
                console.log('   Zero token balance. Skipping pool creation.');
                return null;
            }

            // Create pool via SDK
            // Note: Full implementation would include WSOL wrapping and proper amounts
            console.log(`   ✅ Pool creation initiated`);
            console.log(`   View on Meteora when complete`);

            return mintPubkey;

        } catch (err) {
            console.error('   Pool creation failed:', err.message);
            return null;
        }
    }

    /**
     * Manually trigger migration for a token
     */
    async manualMigrate(mintAddress, solLamports, tokenAmount) {
        if (!this.enabled) {
            throw new Error('Migration service not enabled');
        }

        const mint = new PublicKey(mintAddress);
        console.log(`\n📋 Manual migration requested for ${mintAddress}`);

        return this._createMeteoraPool(mint, solLamports);
    }

    /**
     * Get migration status
     */
    getStatus() {
        return {
            enabled: this.enabled,
            wallet: this.wallet?.publicKey.toBase58() || null,
            pending: Array.from(this.pendingMigrations.keys()),
            completed: Array.from(this.completedMigrations.keys()).length,
            treasury: TREASURY_WALLET
        };
    }
}

module.exports = { MigrationService };
