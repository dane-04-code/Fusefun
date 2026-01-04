import { useState, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import {
    Keypair,
    PublicKey,
    SystemProgram,
    Transaction,
    TransactionInstruction,
    SYSVAR_RENT_PUBKEY,
    ComputeBudgetProgram
} from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

// Program ID from your existing configuration
const PROGRAM_ID = new PublicKey('CT4bS24PZXLzxuGMiHPLs3tpWYu72aVJ83UMgSNUeKY2');
const TREASURY_WALLET = new PublicKey('4j1591eHGUZvRQgAGKSW2sriMQkDinSDRnA7oXdCHyT1');
const CURVE_SEED = 'curve';
const VAULT_SEED = 'vault';

// Priority fee in microlamports (higher = faster inclusion)
const PRIORITY_FEE = 50000; // 0.00005 SOL per compute unit

interface UploadResult {
    imageUrl: string;
    metadataUri: string;
}

export const useLaunchToken = () => {
    const { connection } = useConnection();
    const { publicKey, signTransaction } = useWallet();
    const [isLaunching, setIsLaunching] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<string>('');

    // Step 1: Upload image and metadata (can take time - no blockhash involved)
    const uploadAssets = useCallback(async (
        name: string,
        symbol: string,
        description: string,
        imageFile: File | string,
        twitter: string,
        telegram: string,
        website: string
    ): Promise<UploadResult> => {
        setIsUploading(true);
        setStatus('Uploading image...');

        try {
            let imageUrl = '';
            if (typeof imageFile === 'string') {
                imageUrl = imageFile;
            } else {
                const formData = new FormData();
                formData.append('file', imageFile);

                const uploadRes = await fetch('/api/pinata/upload-image', {
                    method: 'POST',
                    body: formData,
                });

                if (!uploadRes.ok) {
                    const err = await uploadRes.json();
                    throw new Error(err.error || 'Image upload failed');
                }

                const data = await uploadRes.json();
                imageUrl = data.url;
            }

            setStatus('Uploading metadata...');

            const metadata = { name, symbol, description, imageUrl, twitter, telegram, website };

            const metadataRes = await fetch('/api/pinata/upload-metadata', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(metadata),
            });

            if (!metadataRes.ok) {
                const err = await metadataRes.json();
                throw new Error(err.error || 'Metadata upload failed');
            }

            const { url: metadataUri } = await metadataRes.json();

            return { imageUrl, metadataUri };
        } finally {
            setIsUploading(false);
        }
    }, []);

    // Step 2: Create and send transaction with retry logic
    const createToken = useCallback(async (
        name: string,
        symbol: string,
        metadataUri: string,
        initialBuyAmount: number
    ): Promise<{ signature: string; mint: string }> => {
        if (!publicKey || !signTransaction) throw new Error('Wallet not connected');

        const mintKeypair = Keypair.generate();

        const [curvePda] = PublicKey.findProgramAddressSync(
            [Buffer.from(CURVE_SEED), mintKeypair.publicKey.toBuffer()],
            PROGRAM_ID
        );

        const [vaultPda] = PublicKey.findProgramAddressSync(
            [Buffer.from(VAULT_SEED), mintKeypair.publicKey.toBuffer()],
            PROGRAM_ID
        );

        // Build Instruction Data
        const discriminator = Buffer.from([84, 52, 204, 228, 24, 140, 234, 75]);

        const nameBytes = new TextEncoder().encode(name);
        const nameBuffer = Buffer.alloc(4 + nameBytes.length);
        nameBuffer.writeUInt32LE(nameBytes.length, 0);
        nameBuffer.set(nameBytes, 4);

        const symbolBytes = new TextEncoder().encode(symbol);
        const symbolBuffer = Buffer.alloc(4 + symbolBytes.length);
        symbolBuffer.writeUInt32LE(symbolBytes.length, 0);
        symbolBuffer.set(symbolBytes, 4);

        const uriBytes = new TextEncoder().encode(metadataUri);
        const uriBuffer = Buffer.alloc(4 + uriBytes.length);
        uriBuffer.writeUInt32LE(uriBytes.length, 0);
        uriBuffer.set(uriBytes, 4);

        const initialBuyLamports = BigInt(Math.floor(initialBuyAmount * 1e9));
        const initialBuyBuffer = Buffer.alloc(9);
        if (initialBuyLamports > 0n) {
            initialBuyBuffer.writeUInt8(1, 0);
            initialBuyBuffer.writeBigUInt64LE(initialBuyLamports, 1);
        } else {
            initialBuyBuffer.writeUInt8(0, 0);
        }

        const data = Buffer.concat([
            discriminator,
            nameBuffer,
            symbolBuffer,
            uriBuffer,
            initialBuyBuffer
        ]);

        const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
        const [creatorAta] = PublicKey.findProgramAddressSync(
            [
                publicKey.toBuffer(),
                TOKEN_PROGRAM_ID.toBuffer(),
                mintKeypair.publicKey.toBuffer(),
            ],
            ASSOCIATED_TOKEN_PROGRAM_ID
        );

        const instruction = new TransactionInstruction({
            keys: [
                { pubkey: publicKey, isSigner: true, isWritable: true },
                { pubkey: curvePda, isSigner: false, isWritable: true },
                { pubkey: mintKeypair.publicKey, isSigner: true, isWritable: true },
                { pubkey: vaultPda, isSigner: false, isWritable: true },
                { pubkey: creatorAta, isSigner: false, isWritable: true },
                { pubkey: TREASURY_WALLET, isSigner: false, isWritable: true },
                { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
                { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
                { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
                { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
            ],
            programId: PROGRAM_ID,
            data
        });

        // Create transaction with priority fee for faster inclusion
        const transaction = new Transaction();

        // Add priority fee instruction
        transaction.add(
            ComputeBudgetProgram.setComputeUnitPrice({
                microLamports: PRIORITY_FEE,
            })
        );

        // Add main instruction
        transaction.add(instruction);

        // Retry loop - try up to 3 times with fresh blockhash each time
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                setStatus(`Attempt ${attempt}/3: Getting fresh blockhash...`);

                // Get FRESH blockhash for each attempt
                const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
                transaction.recentBlockhash = blockhash;
                transaction.feePayer = publicKey;

                // Clear any previous signatures and re-sign
                transaction.signatures = [];
                transaction.partialSign(mintKeypair);

                setStatus(`Attempt ${attempt}/3: Please approve in wallet...`);
                const signedTx = await signTransaction(transaction);

                setStatus(`Attempt ${attempt}/3: Sending transaction...`);
                const signature = await connection.sendRawTransaction(signedTx.serialize(), {
                    skipPreflight: false,
                    maxRetries: 3,
                    preflightCommitment: 'confirmed',
                });

                setStatus(`Attempt ${attempt}/3: Confirming...`);

                // Use a timeout for confirmation
                const confirmPromise = connection.confirmTransaction({
                    signature,
                    blockhash,
                    lastValidBlockHeight
                }, 'confirmed');

                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Confirmation timeout')), 60000);
                });

                await Promise.race([confirmPromise, timeoutPromise]);

                return { signature, mint: mintKeypair.publicKey.toString() };

            } catch (err: any) {
                console.error(`Attempt ${attempt} failed:`, err);
                lastError = err;

                // If user rejected, don't retry
                if (err.message?.includes('User rejected') || err.message?.includes('cancelled')) {
                    throw err;
                }

                // Wait a bit before retrying
                if (attempt < 3) {
                    setStatus(`Attempt ${attempt} failed, retrying...`);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
        }

        throw lastError || new Error('Failed after 3 attempts');
    }, [publicKey, signTransaction, connection]);

    // Combined function
    const launchToken = async (
        name: string,
        symbol: string,
        description: string,
        imageFile: File | string,
        twitter: string,
        telegram: string,
        website: string,
        initialBuyAmount: number
    ) => {
        setIsLaunching(true);
        setError(null);

        try {
            if (!publicKey) throw new Error('Wallet not connected');

            // Step 1: Upload (takes time, no blockchain interaction)
            const { metadataUri } = await uploadAssets(
                name, symbol, description, imageFile, twitter, telegram, website
            );

            // Step 2: Create token with retry logic
            const result = await createToken(name, symbol, metadataUri, initialBuyAmount);

            setStatus('Token created successfully!');
            return result;

        } catch (err: any) {
            console.error('Launch error:', err);
            setError(err.message || 'Failed to launch token');
            setStatus('');
            throw err;
        } finally {
            setIsLaunching(false);
        }
    };

    return { launchToken, isLaunching, isUploading, error, status };
};
