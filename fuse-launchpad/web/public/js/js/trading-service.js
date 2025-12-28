/**
 * FUSE.FUN Trading Service
 * 
 * Handles buying/selling tokens via the bonding curve smart contract
 * Integrates with wallet manager and Solana blockchain
 * 
 * Depends on: fuse-program-client.js (FuseProgramClient)
 */

// Constants
const PROGRAM_ID = 'Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS';
const CURVE_SEED = 'curve';
const VAULT_SEED = 'vault';

// Treasury address - MUST be replaced with your real treasury wallet before launch!
// This should match the treasury in fuse-program-client.js and the deployed program
// Generate with: solana-keygen new -o treasury.json && solana-keygen pubkey treasury.json
const TREASURY_ADDRESS = 'FuseT1111111111111111111111111111111111111111';

// Network configuration
// Use Helius RPC for better performance and reliability
// Get your API key at https://dev.helius.xyz/
const HELIUS_API_KEY = ''; // Set via window.HELIUS_API_KEY or leave empty for public RPC

const getHeliusRpc = (network, apiKey) => {
    if (!apiKey) return null;
    return network === 'mainnet' 
        ? `https://mainnet.helius-rpc.com/?api-key=${apiKey}`
        : `https://devnet.helius-rpc.com/?api-key=${apiKey}`;
};

const NETWORKS = {
    mainnet: getHeliusRpc('mainnet', window.HELIUS_API_KEY || HELIUS_API_KEY) || 'https://api.mainnet-beta.solana.com',
    devnet: getHeliusRpc('devnet', window.HELIUS_API_KEY || HELIUS_API_KEY) || 'https://api.devnet.solana.com',
    localnet: 'http://localhost:8899'
};

class FuseTradingService {
    constructor(network = 'devnet') {
        this.network = network;
        this.connection = new solanaWeb3.Connection(NETWORKS[network], 'confirmed');
        this.programId = new solanaWeb3.PublicKey(PROGRAM_ID);
        this.treasury = new solanaWeb3.PublicKey(TREASURY_ADDRESS);
        
        // Bonding curve constants (matching Rust program)
        this.VIRTUAL_SOL_RESERVES = 30_000_000_000n; // 30 SOL in lamports
        this.VIRTUAL_TOKEN_RESERVES = 1_073_000_000_000_000n; // 1.073B tokens
        this.TOTAL_SUPPLY = 1_000_000_000_000_000n; // 1B tokens
        this.FEE_BPS = 100n; // 1%
        
        // Program client (initialized on first use with wallet)
        this._programClient = null;
    }

    /**
     * Get or create the program client
     */
    getProgramClient() {
        if (!window.fuseWallet?.isConnected()) {
            throw new Error('Wallet not connected');
        }
        
        if (!this._programClient || this._programClient.wallet !== window.fuseWallet) {
            const walletAdapter = {
                publicKey: new solanaWeb3.PublicKey(window.fuseWallet.publicKey),
                signTransaction: (tx) => window.fuseWallet.signTransaction(tx),
                signAndSendTransaction: (tx) => window.fuseWallet.signAndSendTransaction(tx, this.connection)
            };
            
            this._programClient = new FuseProgramClient(this.connection, walletAdapter);
        }
        
        return this._programClient;
    }

    /**
     * Derive the bonding curve PDA
     */
    getCurvePDA(mintPubkey) {
        const [pda, bump] = solanaWeb3.PublicKey.findProgramAddressSync(
            [Buffer.from(CURVE_SEED), mintPubkey.toBuffer()],
            this.programId
        );
        return { pda, bump };
    }

    /**
     * Derive the token vault PDA
     */
    getVaultPDA(mintPubkey) {
        const [pda, bump] = solanaWeb3.PublicKey.findProgramAddressSync(
            [Buffer.from(VAULT_SEED), mintPubkey.toBuffer()],
            this.programId
        );
        return { pda, bump };
    }

    /**
     * Calculate tokens received for SOL input (buy)
     */
    calculateBuyAmount(curveState, solAmount) {
        const fee = (solAmount * this.FEE_BPS) / 10000n;
        const netSol = solAmount - fee;
        
        const virtualSol = BigInt(curveState.virtualSolReserves);
        const virtualTokens = BigInt(curveState.virtualTokenReserves);
        
        const tokensOut = (virtualTokens * netSol) / (virtualSol + netSol);
        
        return {
            tokensOut,
            fee,
            netSolIn: netSol,
            pricePerToken: Number(solAmount) / Number(tokensOut)
        };
    }

    /**
     * Calculate SOL received for token input (sell)
     */
    calculateSellAmount(curveState, tokenAmount) {
        const virtualSol = BigInt(curveState.virtualSolReserves);
        const virtualTokens = BigInt(curveState.virtualTokenReserves);
        
        const grossSolOut = (virtualSol * tokenAmount) / (virtualTokens + tokenAmount);
        const fee = (grossSolOut * this.FEE_BPS) / 10000n;
        const netSolOut = grossSolOut - fee;
        
        return {
            solOut: netSolOut,
            fee,
            pricePerToken: Number(netSolOut) / Number(tokenAmount)
        };
    }

    /**
     * Get current token price
     */
    getCurrentPrice(curveState) {
        const virtualSol = Number(curveState.virtualSolReserves);
        const virtualTokens = Number(curveState.virtualTokenReserves);
        return virtualSol / virtualTokens;
    }

    /**
     * Get market cap in SOL
     */
    getMarketCap(curveState) {
        const price = this.getCurrentPrice(curveState);
        return (Number(this.TOTAL_SUPPLY) * price) / 1e9; // Convert lamports to SOL
    }

    /**
     * Build a buy transaction
     */
    async buildBuyTransaction(mint, userPubkey, solAmount, minTokensOut, treasury) {
        const mintPubkey = new solanaWeb3.PublicKey(mint);
        const userPublicKey = new solanaWeb3.PublicKey(userPubkey);
        const treasuryPubkey = new solanaWeb3.PublicKey(treasury);
        
        const { pda: curvePda } = this.getCurvePDA(mintPubkey);
        const { pda: vaultPda } = this.getVaultPDA(mintPubkey);
        
        // Get user's associated token account
        const userAta = await this.getAssociatedTokenAddress(mintPubkey, userPublicKey);
        
        const transaction = new solanaWeb3.Transaction();
        
        // Check if ATA exists, if not add create instruction
        const ataExists = await this.connection.getAccountInfo(userAta);
        if (!ataExists) {
            transaction.add(
                this.createAssociatedTokenAccountInstruction(
                    userPublicKey,
                    userAta,
                    userPublicKey,
                    mintPubkey
                )
            );
        }

        // Build buy instruction
        const buyInstruction = this.buildBuyInstruction(
            userPublicKey,
            curvePda,
            mintPubkey,
            vaultPda,
            userAta,
            treasuryPubkey,
            solAmount,
            minTokensOut
        );
        
        transaction.add(buyInstruction);
        
        return transaction;
    }

    /**
     * Build a sell transaction
     */
    async buildSellTransaction(mint, userPubkey, tokenAmount, minSolOut, treasury) {
        const mintPubkey = new solanaWeb3.PublicKey(mint);
        const userPublicKey = new solanaWeb3.PublicKey(userPubkey);
        const treasuryPubkey = new solanaWeb3.PublicKey(treasury);
        
        const { pda: curvePda } = this.getCurvePDA(mintPubkey);
        const { pda: vaultPda } = this.getVaultPDA(mintPubkey);
        
        const userAta = await this.getAssociatedTokenAddress(mintPubkey, userPublicKey);
        
        const transaction = new solanaWeb3.Transaction();
        
        // Build sell instruction
        const sellInstruction = this.buildSellInstruction(
            userPublicKey,
            curvePda,
            mintPubkey,
            vaultPda,
            userAta,
            treasuryPubkey,
            tokenAmount,
            minSolOut
        );
        
        transaction.add(sellInstruction);
        
        return transaction;
    }

    /**
     * Build buy instruction data
     */
    buildBuyInstruction(user, curve, mint, vault, userAta, treasury, solAmount, minTokensOut) {
        // Instruction discriminator for "buy" (first 8 bytes of sha256("global:buy"))
        const discriminator = Buffer.from([102, 6, 61, 18, 1, 218, 235, 234]);
        
        // Encode amount_in (u64) and min_tokens_out (u64)
        const amountBuffer = Buffer.alloc(8);
        amountBuffer.writeBigUInt64LE(BigInt(solAmount));
        
        const minTokensBuffer = Buffer.alloc(8);
        minTokensBuffer.writeBigUInt64LE(BigInt(minTokensOut));
        
        const data = Buffer.concat([discriminator, amountBuffer, minTokensBuffer]);
        
        const keys = [
            { pubkey: user, isSigner: true, isWritable: true },
            { pubkey: curve, isSigner: false, isWritable: true },
            { pubkey: mint, isSigner: false, isWritable: false },
            { pubkey: vault, isSigner: false, isWritable: true },
            { pubkey: userAta, isSigner: false, isWritable: true },
            { pubkey: treasury, isSigner: false, isWritable: true },
            { pubkey: new solanaWeb3.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'), isSigner: false, isWritable: false },
            { pubkey: solanaWeb3.SystemProgram.programId, isSigner: false, isWritable: false },
        ];
        
        return new solanaWeb3.TransactionInstruction({
            keys,
            programId: this.programId,
            data
        });
    }

    /**
     * Build sell instruction data
     */
    buildSellInstruction(user, curve, mint, vault, userAta, treasury, tokenAmount, minSolOut) {
        // Instruction discriminator for "sell" (first 8 bytes of sha256("global:sell"))
        const discriminator = Buffer.from([51, 230, 133, 164, 1, 127, 131, 173]);
        
        // Encode amount_in (u64) and min_sol_out (u64)
        const amountBuffer = Buffer.alloc(8);
        amountBuffer.writeBigUInt64LE(BigInt(tokenAmount));
        
        const minSolBuffer = Buffer.alloc(8);
        minSolBuffer.writeBigUInt64LE(BigInt(minSolOut));
        
        const data = Buffer.concat([discriminator, amountBuffer, minSolBuffer]);
        
        const keys = [
            { pubkey: user, isSigner: true, isWritable: true },
            { pubkey: curve, isSigner: false, isWritable: true },
            { pubkey: mint, isSigner: false, isWritable: false },
            { pubkey: vault, isSigner: false, isWritable: true },
            { pubkey: userAta, isSigner: false, isWritable: true },
            { pubkey: treasury, isSigner: false, isWritable: true },
            { pubkey: new solanaWeb3.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'), isSigner: false, isWritable: false },
            { pubkey: solanaWeb3.SystemProgram.programId, isSigner: false, isWritable: false },
        ];
        
        return new solanaWeb3.TransactionInstruction({
            keys,
            programId: this.programId,
            data
        });
    }

    /**
     * Get associated token address
     */
    async getAssociatedTokenAddress(mint, owner) {
        const TOKEN_PROGRAM_ID = new solanaWeb3.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
        const ASSOCIATED_TOKEN_PROGRAM_ID = new solanaWeb3.PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
        
        const [address] = solanaWeb3.PublicKey.findProgramAddressSync(
            [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
            ASSOCIATED_TOKEN_PROGRAM_ID
        );
        
        return address;
    }

    /**
     * Create associated token account instruction
     */
    createAssociatedTokenAccountInstruction(payer, ata, owner, mint) {
        const TOKEN_PROGRAM_ID = new solanaWeb3.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
        const ASSOCIATED_TOKEN_PROGRAM_ID = new solanaWeb3.PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
        
        const keys = [
            { pubkey: payer, isSigner: true, isWritable: true },
            { pubkey: ata, isSigner: false, isWritable: true },
            { pubkey: owner, isSigner: false, isWritable: false },
            { pubkey: mint, isSigner: false, isWritable: false },
            { pubkey: solanaWeb3.SystemProgram.programId, isSigner: false, isWritable: false },
            { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        ];
        
        return new solanaWeb3.TransactionInstruction({
            keys,
            programId: ASSOCIATED_TOKEN_PROGRAM_ID,
            data: Buffer.alloc(0)
        });
    }

    /**
     * Execute a buy trade
     */
    async executeBuy(mint, solAmount, slippagePercent = 1) {
        if (!window.fuseWallet?.isConnected()) {
            throw new Error('Wallet not connected');
        }

        const userPubkey = window.fuseWallet.publicKey;
        const programClient = this.getProgramClient();
        
        // Fetch current curve state from on-chain
        const curveState = await this.fetchCurveState(mint);
        
        // Calculate expected tokens
        const solLamports = BigInt(Math.floor(solAmount * 1e9));
        const { tokensOut, fee } = this.calculateBuyAmount(curveState, solLamports);
        
        // Apply slippage
        const minTokensOut = tokensOut * BigInt(100 - slippagePercent) / 100n;
        
        // Build transaction using program client
        const mintPubkey = new solanaWeb3.PublicKey(mint);
        const buyIx = programClient.buildBuyInstruction(
            new solanaWeb3.PublicKey(userPubkey),
            mintPubkey,
            solLamports,
            minTokensOut
        );

        // Check if user needs ATA created
        const userAta = programClient.getAssociatedTokenAddress(mintPubkey, new solanaWeb3.PublicKey(userPubkey));
        const ataInfo = await this.connection.getAccountInfo(userAta);

        const transaction = new solanaWeb3.Transaction();
        
        if (!ataInfo) {
            // Create associated token account
            const createAtaIx = programClient.createAssociatedTokenAccountInstruction(
                new solanaWeb3.PublicKey(userPubkey),
                mintPubkey
            );
            transaction.add(createAtaIx);
        }
        
        transaction.add(buyIx);

        // Set blockhash and fee payer
        const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.lastValidBlockHeight = lastValidBlockHeight;
        transaction.feePayer = new solanaWeb3.PublicKey(userPubkey);
        
        // Sign and send
        const signature = await window.fuseWallet.signAndSendTransaction(transaction, this.connection);
        
        console.log('Buy transaction sent:', signature);
        
        // Track referral earning (10% of fee)
        await this.recordReferralEarning('buy', mint, userPubkey, fee);
        
        return {
            signature,
            tokensReceived: tokensOut,
            solSpent: solAmount,
            fee: Number(fee) / 1e9
        };
    }

    /**
     * Execute a sell trade
     */
    async executeSell(mint, tokenAmount, slippagePercent = 1) {
        if (!window.fuseWallet?.isConnected()) {
            throw new Error('Wallet not connected');
        }

        const userPubkey = window.fuseWallet.publicKey;
        const programClient = this.getProgramClient();
        
        // Fetch current curve state from on-chain
        const curveState = await this.fetchCurveState(mint);
        
        // Calculate expected SOL
        const tokenLamports = BigInt(Math.floor(tokenAmount * 1e6)); // 6 decimals
        const { solOut, fee } = this.calculateSellAmount(curveState, tokenLamports);
        
        // Apply slippage
        const minSolOut = solOut * BigInt(100 - slippagePercent) / 100n;
        
        // Build transaction using program client
        const mintPubkey = new solanaWeb3.PublicKey(mint);
        const sellIx = programClient.buildSellInstruction(
            new solanaWeb3.PublicKey(userPubkey),
            mintPubkey,
            tokenLamports,
            minSolOut
        );

        const transaction = new solanaWeb3.Transaction();
        transaction.add(sellIx);

        // Set blockhash and fee payer
        const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.lastValidBlockHeight = lastValidBlockHeight;
        transaction.feePayer = new solanaWeb3.PublicKey(userPubkey);
        
        // Sign and send
        const signature = await window.fuseWallet.signAndSendTransaction(transaction, this.connection);
        
        console.log('Sell transaction sent:', signature);
        
        // Track referral earning (10% of fee)
        await this.recordReferralEarning('sell', mint, userPubkey, fee);
        
        return {
            signature,
            solReceived: Number(solOut) / 1e9,
            tokensSold: tokenAmount,
            fee: Number(fee) / 1e9
        };
    }

    /**
     * Record referral earning from trade fee
     * Referrer gets 10% of the trading fee
     */
    async recordReferralEarning(action, mint, userWallet, feeAmountLamports) {
        if (!window.fuseReferralService) return;

        try {
            // Get referral code - either from active referral or user's referrer
            const activeCode = window.fuseReferralService.getActiveReferralCode();
            
            // Also check if user was referred (persistent referral)
            let referralCode = activeCode;
            if (!referralCode) {
                const referrerData = await window.fuseReferralService.getReferrer(userWallet);
                referralCode = referrerData?.code;
            }

            if (referralCode) {
                await window.fuseReferralService.recordReferralEarning({
                    referralCode,
                    feeAmount: Number(feeAmountLamports),
                    action,
                    mint,
                    userWallet
                });
                console.log(`Referral earning recorded: ${action} on ${mint}`);
            }
        } catch (error) {
            console.warn('Failed to record referral earning:', error);
            // Non-fatal - trade still succeeded
        }
    }

    /**
     * Fetch curve state from chain
     * Decodes the BondingCurve account data
     */
    async fetchCurveState(mint) {
        const mintPubkey = new solanaWeb3.PublicKey(mint);
        const [curvePda] = solanaWeb3.PublicKey.findProgramAddressSync(
            [Buffer.from(CURVE_SEED), mintPubkey.toBuffer()],
            this.programId
        );

        try {
            const accountInfo = await this.connection.getAccountInfo(curvePda);
            
            if (!accountInfo) {
                console.warn('Curve account not found, using default virtual reserves');
                // Return default state for tokens not yet on-chain
                return {
                    virtualSolReserves: this.VIRTUAL_SOL_RESERVES,
                    virtualTokenReserves: this.VIRTUAL_TOKEN_RESERVES,
                    realSolReserves: 0n,
                    realTokenReserves: 793_100_000_000_000n,
                    complete: false
                };
            }

            // Decode the account data
            const data = accountInfo.data;
            let offset = 8; // Skip discriminator
            
            // Skip creator (32 bytes) and tokenMint (32 bytes)
            offset += 64;
            
            // tokenTotalSupply (u64)
            // const tokenTotalSupply = data.readBigUInt64LE(offset);
            offset += 8;
            
            // virtualSolReserves (u64)
            const virtualSolReserves = data.readBigUInt64LE(offset);
            offset += 8;
            
            // virtualTokenReserves (u64)
            const virtualTokenReserves = data.readBigUInt64LE(offset);
            offset += 8;
            
            // realSolReserves (u64)
            const realSolReserves = data.readBigUInt64LE(offset);
            offset += 8;
            
            // realTokenReserves (u64)
            const realTokenReserves = data.readBigUInt64LE(offset);
            offset += 8;
            
            // complete (bool)
            const complete = data.readUInt8(offset) === 1;

            return {
                virtualSolReserves,
                virtualTokenReserves,
                realSolReserves,
                realTokenReserves,
                complete
            };
        } catch (error) {
            console.error('Failed to fetch curve state:', error);
            // Fallback to default state
            return {
                virtualSolReserves: this.VIRTUAL_SOL_RESERVES,
                virtualTokenReserves: this.VIRTUAL_TOKEN_RESERVES,
                realSolReserves: 0n,
                realTokenReserves: 793_100_000_000_000n,
                complete: false
            };
        }
    }

    /**
     * Format numbers for display
     */
    formatNumber(num, decimals = 2) {
        if (num >= 1e9) return (num / 1e9).toFixed(decimals) + 'B';
        if (num >= 1e6) return (num / 1e6).toFixed(decimals) + 'M';
        if (num >= 1e3) return (num / 1e3).toFixed(decimals) + 'K';
        return num.toFixed(decimals);
    }
}

// Create global instance
window.fuseTradingService = new FuseTradingService('devnet');

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FuseTradingService;
}
