/**
 * FUSE.FUN Token Creation Service
 * 
 * Handles creating new tokens on the bonding curve
 * Integrates with wallet manager and smart contract
 * 
 * Depends on: fuse-program-client.js (FuseProgramClient)
 */

const PROGRAM_ID = 'Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS';
const METADATA_PROGRAM_ID = 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s';
const CURVE_SEED = 'curve';
const VAULT_SEED = 'vault';

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

class FuseTokenCreationService {
    constructor(network = 'devnet') {
        this.network = network;
        this.connection = new solanaWeb3.Connection(NETWORKS[network], 'confirmed');
        this.programId = new solanaWeb3.PublicKey(PROGRAM_ID);
        
        // Program client (will be initialized on first use with wallet)
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
            // Create a wallet adapter compatible with FuseProgramClient
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
     * Create a new token on the bonding curve
     * @param {Object} tokenData - Token creation parameters
     * @param {string} tokenData.name - Token name (max 32 chars)
     * @param {string} tokenData.symbol - Token symbol (max 10 chars)
     * @param {string} tokenData.description - Token description
     * @param {string} tokenData.image - Image URL or data URI
     * @param {string} tokenData.twitter - Twitter URL (optional)
     * @param {string} tokenData.telegram - Telegram URL (optional)
     * @param {string} tokenData.website - Website URL (optional)
     * @param {number} tokenData.initialBuyAmount - Initial buy in SOL (optional)
     * @param {string} tokenData.referralCode - Referral code (optional)
     */
    async createToken(tokenData) {
        if (!window.fuseWallet?.isConnected()) {
            throw new Error('Wallet not connected');
        }

        const creator = window.fuseWallet.publicKey;
        const programClient = this.getProgramClient();

        // Validate inputs
        this.validateTokenData(tokenData);

        console.log('Creating token:', tokenData.name, '(' + tokenData.symbol + ')');

        // Convert initial buy amount from SOL to lamports
        const initialBuyLamports = tokenData.initialBuyAmount 
            ? programClient.solToLamports(tokenData.initialBuyAmount)
            : null;

        // Metadata URI (will be constructed after we have the mint address)
        // The program client will handle building the transaction

        // Get referral code (from param or active referral)
        const referralCode = tokenData.referralCode || 
                            window.fuseReferralService?.getActiveReferralCode() || 
                            null;

        try {
            // Use the FuseProgramClient to create the token on-chain
            // First, generate mint and build the metadata URI
            const mintKeypair = solanaWeb3.Keypair.generate();
            const mint = mintKeypair.publicKey;
            
            // Build metadata URI pointing to our backend
            const metadataUri = await this.uploadMetadata(tokenData, mint.toString());

            // Build the create token instruction using our client
            const createIx = programClient.buildCreateTokenInstruction(
                new solanaWeb3.PublicKey(creator),
                mint,
                tokenData.name,
                tokenData.symbol,
                metadataUri,
                initialBuyLamports
            );

            // Create and configure transaction
            const tx = new solanaWeb3.Transaction();
            const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();
            tx.recentBlockhash = blockhash;
            tx.lastValidBlockHeight = lastValidBlockHeight;
            tx.feePayer = new solanaWeb3.PublicKey(creator);
            tx.add(createIx);

            // Partial sign with mint keypair (it's a signer for the new account)
            tx.partialSign(mintKeypair);

            // Sign and send with wallet
            const signature = await window.fuseWallet.signAndSendTransaction(tx, this.connection);

            console.log('Token created on-chain:', mint.toString());
            console.log('Transaction signature:', signature);

            // Register token with backend (includes referral tracking)
            await this.registerWithBackend(mint.toString(), tokenData, metadataUri, referralCode);

            // Track referral earning if referral code was used
            if (referralCode && window.fuseReferralService) {
                await this.recordReferralEarning(referralCode, tokenData.initialBuyAmount || 0, mint.toString(), creator);
            }

            return {
                mint: mint.toString(),
                signature,
                name: tokenData.name,
                symbol: tokenData.symbol,
                referralCode: referralCode
            };
        } catch (error) {
            console.error('Token creation failed:', error);
            throw error;
        }
    }

    /**
     * Validate token creation data
     */
    validateTokenData(data) {
        if (!data.name || data.name.length === 0 || data.name.length > 32) {
            throw new Error('Token name must be 1-32 characters');
        }
        if (!data.symbol || data.symbol.length === 0 || data.symbol.length > 10) {
            throw new Error('Token symbol must be 1-10 characters');
        }
        if (data.initialBuyAmount && data.initialBuyAmount < 0) {
            throw new Error('Initial buy amount cannot be negative');
        }
        if (data.initialBuyAmount && data.initialBuyAmount > 10) {
            throw new Error('Initial buy cannot exceed 10 SOL');
        }
    }

    /**
     * Upload metadata to storage
     * Uses Pinata IPFS for decentralized storage
     */
    async uploadMetadata(tokenData, mint) {
        try {
            const baseUrl = window.fuseAPI?.baseUrl || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
            let imageUrl = tokenData.image || '';
            
            // If image is provided and looks like a data URI or File object, upload it to Pinata
            if (tokenData.imageFile) {
                console.log('[Pinata] Uploading image to IPFS...');
                imageUrl = await this.uploadImageToPinata(tokenData.imageFile, baseUrl);
            }
            
            // Now upload metadata to Pinata
            console.log('[Pinata] Uploading metadata to IPFS...');
            const metadataUrl = await this.uploadMetadataToPinata({
                name: tokenData.name,
                symbol: tokenData.symbol,
                description: tokenData.description || '',
                imageUrl: imageUrl
            }, baseUrl);
            
            return metadataUrl;
            
        } catch (error) {
            console.error('[Pinata] Upload failed, using fallback:', error);
            // Fallback to backend metadata endpoint if Pinata fails
            const baseUrl = window.fuseAPI?.baseUrl || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
            return `${baseUrl}/api/metadata/${mint}.json`;
        }
    }
    
    /**
     * Upload image file to Pinata IPFS
     */
    async uploadImageToPinata(file, baseUrl) {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch(`${baseUrl}/api/pinata/upload-image`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Image upload failed');
        }
        
        const result = await response.json();
        console.log('[Pinata] Image uploaded:', result.url);
        return result.url;
    }
    
    /**
     * Upload metadata JSON to Pinata IPFS
     */
    async uploadMetadataToPinata(metadata, baseUrl) {
        const response = await fetch(`${baseUrl}/api/pinata/upload-metadata`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(metadata)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Metadata upload failed');
        }
        
        const result = await response.json();
        console.log('[Pinata] Metadata uploaded:', result.url);
        return result.url;
    }

    /**
     * Build the create_token transaction
     */
    async buildCreateTokenTransaction(creator, mint, name, symbol, uri, initialBuyAmount) {
        const { pda: curvePda } = this.getCurvePDA(mint);
        const { pda: vaultPda } = this.getVaultPDA(mint);
        
        const transaction = new solanaWeb3.Transaction();
        
        // Add create_token instruction
        const createInstruction = this.buildCreateTokenInstruction(
            new solanaWeb3.PublicKey(creator),
            mint,
            curvePda,
            vaultPda,
            name,
            symbol,
            uri,
            initialBuyAmount
        );
        
        transaction.add(createInstruction);
        
        // Set recent blockhash and fee payer
        const { blockhash } = await this.connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = new solanaWeb3.PublicKey(creator);
        
        return transaction;
    }

    /**
     * Build create_token instruction
     */
    buildCreateTokenInstruction(creator, mint, curve, vault, name, symbol, uri, initialBuyAmount) {
        // Instruction discriminator for "create_token" (first 8 bytes of sha256("global:create_token"))
        const discriminator = Buffer.from([84, 52, 204, 228, 24, 140, 234, 75]);
        
        // Encode name (length-prefixed string)
        const nameBytes = new TextEncoder().encode(name);
        const nameBuffer = Buffer.alloc(4 + nameBytes.length);
        nameBuffer.writeUInt32LE(nameBytes.length, 0);
        nameBuffer.set(nameBytes, 4);
        
        // Encode symbol (length-prefixed string)
        const symbolBytes = new TextEncoder().encode(symbol);
        const symbolBuffer = Buffer.alloc(4 + symbolBytes.length);
        symbolBuffer.writeUInt32LE(symbolBytes.length, 0);
        symbolBuffer.set(symbolBytes, 4);
        
        // Encode uri (length-prefixed string)
        const uriBytes = new TextEncoder().encode(uri);
        const uriBuffer = Buffer.alloc(4 + uriBytes.length);
        uriBuffer.writeUInt32LE(uriBytes.length, 0);
        uriBuffer.set(uriBytes, 4);
        
        // Encode initial_buy_lamports (u64)
        const initialBuyLamports = BigInt(Math.floor(initialBuyAmount * 1e9));
        const initialBuyBuffer = Buffer.alloc(8);
        initialBuyBuffer.writeBigUInt64LE(initialBuyLamports);
        
        const data = Buffer.concat([
            discriminator,
            nameBuffer,
            symbolBuffer,
            uriBuffer,
            initialBuyBuffer
        ]);
        
        const TOKEN_PROGRAM_ID = new solanaWeb3.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
        
        const keys = [
            { pubkey: creator, isSigner: true, isWritable: true },
            { pubkey: mint, isSigner: true, isWritable: true },
            { pubkey: curve, isSigner: false, isWritable: true },
            { pubkey: vault, isSigner: false, isWritable: true },
            { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
            { pubkey: solanaWeb3.SystemProgram.programId, isSigner: false, isWritable: false },
            { pubkey: solanaWeb3.SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
        ];
        
        return new solanaWeb3.TransactionInstruction({
            keys,
            programId: this.programId,
            data
        });
    }

    /**
     * Derive bonding curve PDA
     */
    getCurvePDA(mint) {
        const [pda, bump] = solanaWeb3.PublicKey.findProgramAddressSync(
            [Buffer.from(CURVE_SEED), mint.toBuffer()],
            this.programId
        );
        return { pda, bump };
    }

    /**
     * Derive vault PDA
     */
    getVaultPDA(mint) {
        const [pda, bump] = solanaWeb3.PublicKey.findProgramAddressSync(
            [Buffer.from(VAULT_SEED), mint.toBuffer()],
            this.programId
        );
        return { pda, bump };
    }

    /**
     * Register token with backend API
     */
    async registerWithBackend(mint, tokenData, metadataUri, referralCode = null) {
        if (!window.fuseAPI) return;
        
        try {
            await window.fuseAPI.registerToken({
                mint,
                name: tokenData.name,
                symbol: tokenData.symbol,
                uri: metadataUri,
                image: tokenData.image || null,
                description: tokenData.description || '',
                twitter: tokenData.twitter || '',
                telegram: tokenData.telegram || '',
                website: tokenData.website || '',
                creator: window.fuseWallet.publicKey,
                referralCode: referralCode
            });
        } catch (error) {
            console.warn('Failed to register with backend:', error);
            // Non-fatal error - token is still created on-chain
        }
    }

    /**
     * Record referral earning for token creation
     * Creator pays ~0.01 SOL fee, referrer gets 10%
     */
    async recordReferralEarning(referralCode, initialBuyAmount, mint, creator) {
        if (!window.fuseReferralService) return;

        // Creation fee is roughly 0.01 SOL + 1% of initial buy
        const creationFee = 0.01 * 1e9; // 0.01 SOL in lamports
        const buyFee = initialBuyAmount * 0.01 * 1e9; // 1% of initial buy
        const totalFee = creationFee + buyFee;

        try {
            await window.fuseReferralService.recordReferralEarning({
                referralCode,
                feeAmount: totalFee,
                action: 'create',
                mint,
                userWallet: creator
            });
            console.log('Referral earning recorded for creation');
        } catch (error) {
            console.warn('Failed to record referral earning:', error);
        }
    }

    /**
     * Estimate creation cost
     */
    estimateCreationCost(initialBuyAmount = 0) {
        // Base costs
        const rentExemption = 0.00203928; // Approximate rent for accounts
        const transactionFee = 0.000005;   // Base transaction fee
        const metadataRent = 0.01;         // Metadata account rent
        
        const total = rentExemption + transactionFee + metadataRent + initialBuyAmount;
        
        return {
            rentExemption,
            transactionFee,
            metadataRent,
            initialBuy: initialBuyAmount,
            total
        };
    }
}

// Create global instance
window.fuseTokenService = new FuseTokenCreationService('devnet');

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FuseTokenCreationService;
}
