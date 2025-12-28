/**
 * fuse-program-client.js
 * 
 * A lightweight JS client for interacting with the FUSE Launchpad Anchor program.
 * Uses @solana/web3.js (loaded globally via CDN) and borsh serialization.
 */

// ============================================
// PROGRAM CONSTANTS (must match constants.rs)
// ============================================

const FUSE_PROGRAM_ID = 'Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS';
const TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const ASSOCIATED_TOKEN_PROGRAM_ID = 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';
const SYSTEM_PROGRAM_ID = '11111111111111111111111111111111';
const RENT_SYSVAR = 'SysvarRent111111111111111111111111111111111';

// Treasury address - MUST be replaced with your real treasury wallet before launch!
// This should be a keypair you control for receiving protocol fees
// Generate with: solana-keygen new -o treasury.json && solana-keygen pubkey treasury.json
const TREASURY = 'FuseT1111111111111111111111111111111111111111';

// Seeds
const CURVE_SEED = 'curve';
const VAULT_SEED = 'vault';

// Bonding curve constants
const VIRTUAL_SOL_RESERVES = 30_000_000_000n;        // 30 SOL in lamports
const VIRTUAL_TOKEN_RESERVES = 1_073_000_000_000_000n; // 1.073B tokens (6 decimals)
const REAL_TOKEN_RESERVES = 793_100_000_000_000n;     // 793.1M tokens
const TOTAL_SUPPLY = 1_000_000_000_000_000n;          // 1B tokens
const TOKEN_DECIMALS = 6;
const FEE_BASIS_POINTS = 100n; // 1%

// Instruction discriminators (first 8 bytes of sha256("global:<fn_name>"))
// Computed from Anchor's convention: sha256("global:create_token")[0..8], etc.
const DISCRIMINATORS = {
    createToken: [84, 52, 204, 228, 24, 140, 234, 75],  // sha256("global:create_token")[0..8]
    buy:         [102, 6, 61, 18, 1, 218, 235, 234],    // sha256("global:buy")[0..8]
    sell:        [51, 230, 133, 164, 1, 127, 131, 173], // sha256("global:sell")[0..8]
    migrate:     [155, 234, 231, 146, 236, 158, 162, 30] // sha256("global:migrate")[0..8]
};

// ============================================
// FUSE PROGRAM CLIENT CLASS
// ============================================

class FuseProgramClient {
    constructor(connection, wallet) {
        this.connection = connection;
        this.wallet = wallet; // wallet adapter or keypair with { publicKey, signTransaction }
        this.programId = new solanaWeb3.PublicKey(FUSE_PROGRAM_ID);
        this.tokenProgramId = new solanaWeb3.PublicKey(TOKEN_PROGRAM_ID);
        this.associatedTokenProgramId = new solanaWeb3.PublicKey(ASSOCIATED_TOKEN_PROGRAM_ID);
        this.systemProgramId = new solanaWeb3.PublicKey(SYSTEM_PROGRAM_ID);
        this.rentSysvar = new solanaWeb3.PublicKey(RENT_SYSVAR);
        this.treasury = new solanaWeb3.PublicKey(TREASURY);
    }

    // ============================================
    // PDA DERIVATIONS
    // ============================================

    /**
     * Derive the bonding curve PDA for a given mint
     */
    getCurvePDA(mint) {
        const mintPubkey = mint instanceof solanaWeb3.PublicKey ? mint : new solanaWeb3.PublicKey(mint);
        return solanaWeb3.PublicKey.findProgramAddressSync(
            [Buffer.from(CURVE_SEED), mintPubkey.toBuffer()],
            this.programId
        );
    }

    /**
     * Derive the token vault PDA for a given mint
     */
    getVaultPDA(mint) {
        const mintPubkey = mint instanceof solanaWeb3.PublicKey ? mint : new solanaWeb3.PublicKey(mint);
        return solanaWeb3.PublicKey.findProgramAddressSync(
            [Buffer.from(VAULT_SEED), mintPubkey.toBuffer()],
            this.programId
        );
    }

    /**
     * Get associated token account address
     */
    getAssociatedTokenAddress(mint, owner) {
        const mintPubkey = mint instanceof solanaWeb3.PublicKey ? mint : new solanaWeb3.PublicKey(mint);
        const ownerPubkey = owner instanceof solanaWeb3.PublicKey ? owner : new solanaWeb3.PublicKey(owner);
        
        const [address] = solanaWeb3.PublicKey.findProgramAddressSync(
            [
                ownerPubkey.toBuffer(),
                this.tokenProgramId.toBuffer(),
                mintPubkey.toBuffer()
            ],
            this.associatedTokenProgramId
        );
        return address;
    }

    // ============================================
    // BONDING CURVE MATH (mirrors Rust)
    // ============================================

    /**
     * Calculate tokens received for a given SOL input
     * Formula: tokens_out = (virtual_token_reserves * net_amount) / (virtual_sol_reserves + net_amount)
     */
    calculateTokensOut(virtualSolReserves, virtualTokenReserves, solAmountLamports) {
        const sol = BigInt(solAmountLamports);
        const vSol = BigInt(virtualSolReserves);
        const vTokens = BigInt(virtualTokenReserves);
        
        // Deduct 1% fee
        const fee = sol * FEE_BASIS_POINTS / 10000n;
        const netAmount = sol - fee;
        
        const tokensOut = (vTokens * netAmount) / (vSol + netAmount);
        return tokensOut;
    }

    /**
     * Calculate SOL received for selling tokens
     * Formula: sol_out = (virtual_sol_reserves * token_amount) / (virtual_token_reserves + token_amount)
     */
    calculateSolOut(virtualSolReserves, virtualTokenReserves, tokenAmount) {
        const tokens = BigInt(tokenAmount);
        const vSol = BigInt(virtualSolReserves);
        const vTokens = BigInt(virtualTokenReserves);
        
        const grossSol = (vSol * tokens) / (vTokens + tokens);
        
        // Deduct 1% fee
        const fee = grossSol * FEE_BASIS_POINTS / 10000n;
        const netSol = grossSol - fee;
        
        return netSol;
    }

    /**
     * Calculate current price in lamports per token (scaled by 1e6)
     */
    calculatePrice(virtualSolReserves, virtualTokenReserves) {
        const vSol = BigInt(virtualSolReserves);
        const vTokens = BigInt(virtualTokenReserves);
        return (vSol * 1_000_000n) / vTokens;
    }

    // ============================================
    // INSTRUCTION BUILDERS
    // ============================================

    /**
     * Build CreateToken instruction
     */
    buildCreateTokenInstruction(creator, mint, name, symbol, uri, initialBuyLamports = null) {
        const [curvePda] = this.getCurvePDA(mint);
        const [vaultPda] = this.getVaultPDA(mint);
        const creatorAta = this.getAssociatedTokenAddress(mint, creator);

        // Serialize instruction data
        const nameBytes = Buffer.from(name, 'utf8');
        const symbolBytes = Buffer.from(symbol, 'utf8');
        const uriBytes = Buffer.from(uri, 'utf8');
        
        // Calculate buffer size
        let dataSize = 8 + 4 + nameBytes.length + 4 + symbolBytes.length + 4 + uriBytes.length + 1;
        if (initialBuyLamports !== null) {
            dataSize += 8;
        }
        
        const data = Buffer.alloc(dataSize);
        let offset = 0;
        
        // Discriminator
        Buffer.from(DISCRIMINATORS.createToken).copy(data, offset);
        offset += 8;
        
        // Name (string: 4-byte length prefix + bytes)
        data.writeUInt32LE(nameBytes.length, offset);
        offset += 4;
        nameBytes.copy(data, offset);
        offset += nameBytes.length;
        
        // Symbol
        data.writeUInt32LE(symbolBytes.length, offset);
        offset += 4;
        symbolBytes.copy(data, offset);
        offset += symbolBytes.length;
        
        // URI
        data.writeUInt32LE(uriBytes.length, offset);
        offset += 4;
        uriBytes.copy(data, offset);
        offset += uriBytes.length;
        
        // Optional initial_buy_lamports
        if (initialBuyLamports !== null) {
            data.writeUInt8(1, offset); // Some
            offset += 1;
            data.writeBigUInt64LE(BigInt(initialBuyLamports), offset);
        } else {
            data.writeUInt8(0, offset); // None
        }

        const keys = [
            { pubkey: creator, isSigner: true, isWritable: true },
            { pubkey: curvePda, isSigner: false, isWritable: true },
            { pubkey: mint, isSigner: true, isWritable: true },
            { pubkey: vaultPda, isSigner: false, isWritable: true },
            { pubkey: creatorAta, isSigner: false, isWritable: true },
            { pubkey: this.treasury, isSigner: false, isWritable: true },
            { pubkey: this.systemProgramId, isSigner: false, isWritable: false },
            { pubkey: this.tokenProgramId, isSigner: false, isWritable: false },
            { pubkey: this.associatedTokenProgramId, isSigner: false, isWritable: false },
            { pubkey: this.rentSysvar, isSigner: false, isWritable: false }
        ];

        return new solanaWeb3.TransactionInstruction({
            keys,
            programId: this.programId,
            data
        });
    }

    /**
     * Build Buy instruction
     */
    buildBuyInstruction(user, mint, amountInLamports, minTokensOut) {
        const [curvePda] = this.getCurvePDA(mint);
        const [vaultPda] = this.getVaultPDA(mint);
        const userAta = this.getAssociatedTokenAddress(mint, user);

        const data = Buffer.alloc(8 + 8 + 8);
        Buffer.from(DISCRIMINATORS.buy).copy(data, 0);
        data.writeBigUInt64LE(BigInt(amountInLamports), 8);
        data.writeBigUInt64LE(BigInt(minTokensOut), 16);

        const keys = [
            { pubkey: user, isSigner: true, isWritable: true },
            { pubkey: curvePda, isSigner: false, isWritable: true },
            { pubkey: mint, isSigner: false, isWritable: false },
            { pubkey: vaultPda, isSigner: false, isWritable: true },
            { pubkey: userAta, isSigner: false, isWritable: true },
            { pubkey: this.treasury, isSigner: false, isWritable: true },
            { pubkey: this.tokenProgramId, isSigner: false, isWritable: false },
            { pubkey: this.systemProgramId, isSigner: false, isWritable: false }
        ];

        return new solanaWeb3.TransactionInstruction({
            keys,
            programId: this.programId,
            data
        });
    }

    /**
     * Build Sell instruction
     */
    buildSellInstruction(user, mint, tokenAmountIn, minSolOut) {
        const [curvePda] = this.getCurvePDA(mint);
        const [vaultPda] = this.getVaultPDA(mint);
        const userAta = this.getAssociatedTokenAddress(mint, user);

        const data = Buffer.alloc(8 + 8 + 8);
        Buffer.from(DISCRIMINATORS.sell).copy(data, 0);
        data.writeBigUInt64LE(BigInt(tokenAmountIn), 8);
        data.writeBigUInt64LE(BigInt(minSolOut), 16);

        const keys = [
            { pubkey: user, isSigner: true, isWritable: true },
            { pubkey: curvePda, isSigner: false, isWritable: true },
            { pubkey: mint, isSigner: false, isWritable: false },
            { pubkey: vaultPda, isSigner: false, isWritable: true },
            { pubkey: userAta, isSigner: false, isWritable: true },
            { pubkey: this.treasury, isSigner: false, isWritable: true },
            { pubkey: this.tokenProgramId, isSigner: false, isWritable: false },
            { pubkey: this.systemProgramId, isSigner: false, isWritable: false }
        ];

        return new solanaWeb3.TransactionInstruction({
            keys,
            programId: this.programId,
            data
        });
    }

    // ============================================
    // HIGH-LEVEL TRANSACTION METHODS
    // ============================================

    /**
     * Create a new token with bonding curve
     * @returns {Promise<{signature: string, mint: PublicKey}>}
     */
    async createToken(name, symbol, uri, initialBuyLamports = null) {
        // Generate new mint keypair
        const mintKeypair = solanaWeb3.Keypair.generate();
        const creator = this.wallet.publicKey;

        // Build instruction
        const createIx = this.buildCreateTokenInstruction(
            creator,
            mintKeypair.publicKey,
            name,
            symbol,
            uri,
            initialBuyLamports
        );

        // Create transaction
        const tx = new solanaWeb3.Transaction();
        
        // Get recent blockhash
        const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();
        tx.recentBlockhash = blockhash;
        tx.lastValidBlockHeight = lastValidBlockHeight;
        tx.feePayer = creator;
        
        tx.add(createIx);
        
        // Partial sign with mint keypair (it's a signer for the new account)
        tx.partialSign(mintKeypair);

        // Sign with wallet
        const signedTx = await this.wallet.signTransaction(tx);

        // Send transaction
        const signature = await this.connection.sendRawTransaction(signedTx.serialize(), {
            skipPreflight: false,
            preflightCommitment: 'confirmed'
        });

        // Confirm
        await this.connection.confirmTransaction({
            signature,
            blockhash,
            lastValidBlockHeight
        }, 'confirmed');

        return { signature, mint: mintKeypair.publicKey };
    }

    /**
     * Buy tokens from bonding curve
     * @returns {Promise<string>} transaction signature
     */
    async buy(mint, solAmountLamports, slippagePercent = 1) {
        const user = this.wallet.publicKey;
        const mintPubkey = new solanaWeb3.PublicKey(mint);
        
        // Fetch curve state to calculate expected tokens
        const curveData = await this.fetchCurveState(mintPubkey);
        const expectedTokens = this.calculateTokensOut(
            curveData.virtualSolReserves,
            curveData.virtualTokenReserves,
            solAmountLamports
        );
        
        // Apply slippage tolerance
        const minTokensOut = expectedTokens * BigInt(100 - slippagePercent) / 100n;

        // Build instruction
        const buyIx = this.buildBuyInstruction(user, mintPubkey, solAmountLamports, minTokensOut);

        // Possibly need to create ATA if it doesn't exist
        const userAta = this.getAssociatedTokenAddress(mintPubkey, user);
        const ataInfo = await this.connection.getAccountInfo(userAta);
        
        const tx = new solanaWeb3.Transaction();
        
        if (!ataInfo) {
            // Create associated token account
            const createAtaIx = this.createAssociatedTokenAccountInstruction(user, mintPubkey);
            tx.add(createAtaIx);
        }
        
        tx.add(buyIx);

        // Sign and send
        const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();
        tx.recentBlockhash = blockhash;
        tx.lastValidBlockHeight = lastValidBlockHeight;
        tx.feePayer = user;

        const signedTx = await this.wallet.signTransaction(tx);
        const signature = await this.connection.sendRawTransaction(signedTx.serialize());

        await this.connection.confirmTransaction({
            signature,
            blockhash,
            lastValidBlockHeight
        }, 'confirmed');

        return signature;
    }

    /**
     * Sell tokens back to bonding curve
     * @returns {Promise<string>} transaction signature
     */
    async sell(mint, tokenAmount, slippagePercent = 1) {
        const user = this.wallet.publicKey;
        const mintPubkey = new solanaWeb3.PublicKey(mint);
        
        // Fetch curve state to calculate expected SOL
        const curveData = await this.fetchCurveState(mintPubkey);
        const expectedSol = this.calculateSolOut(
            curveData.virtualSolReserves,
            curveData.virtualTokenReserves,
            tokenAmount
        );
        
        // Apply slippage tolerance
        const minSolOut = expectedSol * BigInt(100 - slippagePercent) / 100n;

        const sellIx = this.buildSellInstruction(user, mintPubkey, tokenAmount, minSolOut);

        const tx = new solanaWeb3.Transaction();
        tx.add(sellIx);

        const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();
        tx.recentBlockhash = blockhash;
        tx.lastValidBlockHeight = lastValidBlockHeight;
        tx.feePayer = user;

        const signedTx = await this.wallet.signTransaction(tx);
        const signature = await this.connection.sendRawTransaction(signedTx.serialize());

        await this.connection.confirmTransaction({
            signature,
            blockhash,
            lastValidBlockHeight
        }, 'confirmed');

        return signature;
    }

    // ============================================
    // ACCOUNT FETCHING
    // ============================================

    /**
     * Fetch and decode bonding curve state
     */
    async fetchCurveState(mint) {
        const [curvePda] = this.getCurvePDA(mint);
        const accountInfo = await this.connection.getAccountInfo(curvePda);
        
        if (!accountInfo) {
            throw new Error(`Bonding curve not found for mint ${mint.toBase58()}`);
        }

        // Decode the account data (skip 8-byte discriminator)
        return this.decodeBondingCurve(accountInfo.data);
    }

    /**
     * Decode BondingCurve account data
     */
    decodeBondingCurve(data) {
        let offset = 8; // Skip discriminator
        
        const creator = new solanaWeb3.PublicKey(data.slice(offset, offset + 32));
        offset += 32;
        
        const tokenMint = new solanaWeb3.PublicKey(data.slice(offset, offset + 32));
        offset += 32;
        
        const tokenTotalSupply = data.readBigUInt64LE(offset);
        offset += 8;
        
        const virtualSolReserves = data.readBigUInt64LE(offset);
        offset += 8;
        
        const virtualTokenReserves = data.readBigUInt64LE(offset);
        offset += 8;
        
        const realSolReserves = data.readBigUInt64LE(offset);
        offset += 8;
        
        const realTokenReserves = data.readBigUInt64LE(offset);
        offset += 8;
        
        const complete = data.readUInt8(offset) === 1;
        offset += 1;
        
        const bump = data.readUInt8(offset);
        offset += 1;
        
        const creatorFeeAccumulated = data.readBigUInt64LE(offset);
        offset += 8;
        
        const launchTimestamp = data.readBigInt64LE(offset);
        offset += 8;

        // Read strings (length-prefixed)
        const nameLen = data.readUInt32LE(offset);
        offset += 4;
        const name = data.slice(offset, offset + nameLen).toString('utf8');
        offset += nameLen;

        const symbolLen = data.readUInt32LE(offset);
        offset += 4;
        const symbol = data.slice(offset, offset + symbolLen).toString('utf8');
        offset += symbolLen;

        const uriLen = data.readUInt32LE(offset);
        offset += 4;
        const uri = data.slice(offset, offset + uriLen).toString('utf8');

        return {
            creator,
            tokenMint,
            tokenTotalSupply,
            virtualSolReserves,
            virtualTokenReserves,
            realSolReserves,
            realTokenReserves,
            complete,
            bump,
            creatorFeeAccumulated,
            launchTimestamp,
            name,
            symbol,
            uri
        };
    }

    // ============================================
    // UTILITY METHODS
    // ============================================

    /**
     * Create instruction to create associated token account
     */
    createAssociatedTokenAccountInstruction(owner, mint) {
        const associatedToken = this.getAssociatedTokenAddress(mint, owner);
        
        return new solanaWeb3.TransactionInstruction({
            keys: [
                { pubkey: owner, isSigner: true, isWritable: true },
                { pubkey: associatedToken, isSigner: false, isWritable: true },
                { pubkey: owner, isSigner: false, isWritable: false },
                { pubkey: mint, isSigner: false, isWritable: false },
                { pubkey: this.systemProgramId, isSigner: false, isWritable: false },
                { pubkey: this.tokenProgramId, isSigner: false, isWritable: false }
            ],
            programId: this.associatedTokenProgramId,
            data: Buffer.alloc(0)
        });
    }

    /**
     * Format lamports to SOL
     */
    lamportsToSol(lamports) {
        return Number(lamports) / 1_000_000_000;
    }

    /**
     * Format SOL to lamports
     */
    solToLamports(sol) {
        return BigInt(Math.floor(sol * 1_000_000_000));
    }

    /**
     * Format token amount (6 decimals)
     */
    formatTokens(amount) {
        return Number(amount) / 1_000_000;
    }

    /**
     * Parse token amount to raw (6 decimals)
     */
    parseTokens(amount) {
        return BigInt(Math.floor(amount * 1_000_000));
    }
}

// Export for use
if (typeof window !== 'undefined') {
    window.FuseProgramClient = FuseProgramClient;
    window.FUSE_PROGRAM_ID = FUSE_PROGRAM_ID;
    window.FUSE_CONSTANTS = {
        VIRTUAL_SOL_RESERVES,
        VIRTUAL_TOKEN_RESERVES,
        REAL_TOKEN_RESERVES,
        TOTAL_SUPPLY,
        TOKEN_DECIMALS,
        FEE_BASIS_POINTS
    };
}
