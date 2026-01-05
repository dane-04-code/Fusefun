/**
 * Meteora Migration Bot - Production Version
 * 
 * This version uses the official Meteora Dynamic AMM SDK for proper
 * pool creation and management. Run this after installing dependencies:
 * 
 * npm install @mercurial-finance/dynamic-amm-sdk
 */

require('dotenv').config();
const { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const { NATIVE_MINT } = require('@solana/spl-token');
const bs58 = require('bs58');
const BN = require('bn.js');

// ============================================
// CONFIGURATION
// ============================================

const NETWORK = process.env.SOLANA_NETWORK || 'devnet';
const RPC_URL = process.env.SOLANA_RPC_URL ||
    (NETWORK === 'mainnet'
        ? 'https://api.mainnet-beta.solana.com'
        : 'https://api.devnet.solana.com');

const FUSE_PROGRAM_ID = new PublicKey('CT4bS24PZXLzxuGMiHPLs3tpWYu72aVJ83UMgSNUeKY2');

// Pool configuration - 1% trade fee for higher protocol revenue
const POOL_CONFIG = {
    tradeFeeNumerator: new BN(100),         // 1.00% trade fee
    tradeFeeDenominator: new BN(10000),
    activationType: 0,                       // Immediate activation
    activationDuration: new BN(0),
    creatorTradeFeeNumerator: new BN(0),    // Creator doesn't get extra fee
    creatorTradeFeeDenominator: new BN(10000),
    hasDynamicFee: false,
};

// ============================================
// WALLET SETUP
// ============================================

function loadMigrationWallet() {
    const secretKey = process.env.MIGRATION_WALLET_SECRET;
    if (!secretKey) {
        throw new Error('MIGRATION_WALLET_SECRET not set in .env');
    }

    try {
        const decoded = bs58.decode(secretKey);
        return Keypair.fromSecretKey(decoded);
    } catch {
        const arr = JSON.parse(secretKey);
        return Keypair.fromSecretKey(Uint8Array.from(arr));
    }
}

// ============================================
// MIGRATION WITH METEORA SDK
// ============================================

async function createMeteoraPoolWithSDK(connection, wallet, tokenMint, tokenAmount, solAmount) {
    console.log('\n📦 Loading Meteora Dynamic AMM SDK...');

    // Dynamic import to handle if SDK is not installed
    let AmmImpl;
    try {
        const module = await import('@mercurial-finance/dynamic-amm-sdk');
        AmmImpl = module.default;
    } catch (err) {
        console.error('❌ Meteora SDK not installed. Run: npm install @mercurial-finance/dynamic-amm-sdk');
        throw err;
    }

    console.log('Creating customizable permissionless pool...');
    console.log(`  Token A (Meme): ${tokenMint.toBase58()}`);
    console.log(`  Token B (WSOL): ${NATIVE_MINT.toBase58()}`);
    console.log(`  Token A Amount: ${tokenAmount.toString()}`);
    console.log(`  Token B Amount: ${solAmount.toString()}`);

    // Create the pool
    const { poolPubkey, tx: createPoolTx } = await AmmImpl.createCustomizablePermissionlessConstantProductPoolWithConfig(
        connection,
        wallet.publicKey,
        tokenMint,
        NATIVE_MINT,
        new BN(tokenAmount),
        new BN(solAmount),
        {
            ...POOL_CONFIG,
        }
    );

    console.log(`\n  Pool Address: ${poolPubkey.toBase58()}`);
    console.log('  Sending pool creation transaction...');

    const sig = await connection.sendTransaction(createPoolTx, [wallet], {
        skipPreflight: true,
        maxRetries: 3,
    });

    console.log(`  Tx Signature: ${sig}`);
    await connection.confirmTransaction(sig, 'confirmed');
    console.log('  ✅ Pool created successfully!');

    return { poolPubkey, AmmImpl };
}

async function lockPoolLiquidity(connection, wallet, poolPubkey, AmmImpl) {
    console.log('\n🔒 Locking LP tokens for fee claiming...');

    // Load the pool
    const pool = await AmmImpl.create(connection, poolPubkey);

    // Get LP balance
    const lpBalance = await pool.getUserLpBalance(wallet.publicKey);
    console.log(`  LP Balance: ${lpBalance.toString()}`);

    if (lpBalance.isZero()) {
        console.log('  ⚠️ No LP tokens to lock');
        return;
    }

    // Create lock escrow for the wallet
    console.log('  Creating lock escrow...');
    const createEscrowTx = await pool.createLockEscrow(wallet.publicKey);
    const escrowSig = await connection.sendTransaction(createEscrowTx, [wallet]);
    await connection.confirmTransaction(escrowSig, 'confirmed');
    console.log(`  Escrow created: ${escrowSig}`);

    // Lock all LP tokens
    console.log(`  Locking ${lpBalance.toString()} LP tokens...`);
    const lockTx = await pool.lock(wallet.publicKey, lpBalance, wallet.publicKey);
    const lockSig = await connection.sendTransaction(lockTx, [wallet]);
    await connection.confirmTransaction(lockSig, 'confirmed');
    console.log(`  ✅ LP locked: ${lockSig}`);
}

async function claimPoolFees(connection, wallet, poolPubkey) {
    console.log('\n💰 Claiming accumulated fees...');

    let AmmImpl;
    try {
        const module = await import('@mercurial-finance/dynamic-amm-sdk');
        AmmImpl = module.default;
    } catch (err) {
        console.error('❌ Meteora SDK not installed');
        throw err;
    }

    const pool = await AmmImpl.create(connection, poolPubkey);

    // Claim max fees
    const maxAmount = new BN(2).pow(new BN(64)).sub(new BN(1));
    const claimTx = await pool.claimFee(wallet.publicKey, maxAmount);

    const sig = await connection.sendTransaction(claimTx, [wallet]);
    await connection.confirmTransaction(sig, 'confirmed');

    console.log(`  ✅ Fees claimed: ${sig}`);
    return sig;
}

// ============================================
// MAIN MIGRATION FLOW
// ============================================

async function migrateToMeteora(tokenMintStr, tokenAmountRaw, solLamports) {
    const connection = new Connection(RPC_URL, 'confirmed');
    const wallet = loadMigrationWallet();
    const tokenMint = new PublicKey(tokenMintStr);

    console.log('\n' + '='.repeat(60));
    console.log('🚀 FUSE → Meteora Migration');
    console.log('='.repeat(60));
    console.log(`Network: ${NETWORK}`);
    console.log(`Wallet: ${wallet.publicKey.toBase58()}`);
    console.log(`Token: ${tokenMint.toBase58()}`);
    console.log(`SOL: ${solLamports / LAMPORTS_PER_SOL} SOL`);
    console.log(`Tokens: ${tokenAmountRaw / 1e6} tokens`);
    console.log('='.repeat(60));

    // Check wallet balance
    const balance = await connection.getBalance(wallet.publicKey);
    console.log(`\nWallet balance: ${balance / LAMPORTS_PER_SOL} SOL`);

    if (balance < solLamports + 0.1 * LAMPORTS_PER_SOL) {
        throw new Error('Insufficient SOL balance for migration + fees');
    }

    // Step 1: Create pool
    const { poolPubkey, AmmImpl } = await createMeteoraPoolWithSDK(
        connection,
        wallet,
        tokenMint,
        tokenAmountRaw,
        solLamports
    );

    // Step 2: Lock liquidity
    await lockPoolLiquidity(connection, wallet, poolPubkey, AmmImpl);

    console.log('\n' + '='.repeat(60));
    console.log('🎉 MIGRATION COMPLETE');
    console.log('='.repeat(60));
    console.log(`Pool: ${poolPubkey.toBase58()}`);
    console.log(`\nView on Meteora: https://app.meteora.ag/pools/${poolPubkey.toBase58()}`);
    console.log('\nTo claim fees later, run:');
    console.log(`  npm run migrate:claim ${poolPubkey.toBase58()}`);
    console.log('='.repeat(60) + '\n');

    return poolPubkey;
}

// ============================================
// CLI
// ============================================

async function main() {
    const args = process.argv.slice(2);
    const command = args[0];

    switch (command) {
        case 'migrate':
            if (args.length < 4) {
                console.log('Usage: node meteora-sdk-migrate.js migrate <tokenMint> <solLamports> <tokenRawAmount>');
                console.log('\nExample:');
                console.log('  node meteora-sdk-migrate.js migrate TokenMint123... 85000000000 500000000000000');
                process.exit(1);
            }
            await migrateToMeteora(args[1], parseInt(args[3]), parseInt(args[2]));
            break;

        case 'claim':
            if (args.length < 2) {
                console.log('Usage: node meteora-sdk-migrate.js claim <poolAddress>');
                process.exit(1);
            }
            const connection = new Connection(RPC_URL, 'confirmed');
            const wallet = loadMigrationWallet();
            await claimPoolFees(connection, wallet, new PublicKey(args[1]));
            break;

        case 'info':
            if (args.length < 2) {
                console.log('Usage: node meteora-sdk-migrate.js info <poolAddress>');
                process.exit(1);
            }
            await showPoolInfo(new PublicKey(args[1]));
            break;

        default:
            console.log(`
Meteora SDK Migration Bot

Commands:
  migrate <mint> <sol> <tokens>  Create Meteora pool with liquidity
  claim <pool>                   Claim trading fees from pool
  info <pool>                    Show pool information

Required Environment Variables:
  MIGRATION_WALLET_SECRET        Base58 private key
  SOLANA_RPC_URL                 RPC endpoint (optional)
  SOLANA_NETWORK                 mainnet or devnet (default: devnet)

Example:
  node meteora-sdk-migrate.js migrate TokenMint... 85000000000 500000000000
            `);
    }
}

async function showPoolInfo(poolPubkey) {
    console.log('Loading pool info...');

    const connection = new Connection(RPC_URL, 'confirmed');

    let AmmImpl;
    try {
        const module = await import('@mercurial-finance/dynamic-amm-sdk');
        AmmImpl = module.default;
    } catch {
        console.error('SDK not installed');
        return;
    }

    const pool = await AmmImpl.create(connection, poolPubkey);
    const poolState = pool.poolState;

    console.log('\nPool Information:');
    console.log(`  Address: ${poolPubkey.toBase58()}`);
    console.log(`  Token A: ${poolState.tokenAMint.toBase58()}`);
    console.log(`  Token B: ${poolState.tokenBMint.toBase58()}`);
    console.log(`  LP Mint: ${poolState.lpMint.toBase58()}`);
    console.log(`  Trade Fee: ${poolState.fees.tradeFeeNumerator.toString()}/${poolState.fees.tradeFeeDenominator.toString()}`);
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { migrateToMeteora, claimPoolFees };
