import { useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

// Program ID from your existing configuration
const PROGRAM_ID = new PublicKey('63mGs2kvQNm1g5S31WbYVq9mTgnfHKzD9iJB3ZWvQN1d');
const TREASURY_WALLET = new PublicKey('4j1591eHGUZvRQgAGKSW2sriMQkDinSDRnA7oXdCHyT1');
const CURVE_SEED = 'curve';
const VAULT_SEED = 'vault';

export const useLaunchToken = () => {
    const { connection } = useConnection();
    const { publicKey, sendTransaction } = useWallet();
    const [isLaunching, setIsLaunching] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const launchToken = async (
        name: string,
        symbol: string,
        description: string,
        imageFile: File | string, // Can be File or already uploaded URL
        twitter: string,
        telegram: string,
        website: string,
        initialBuyAmount: number
    ) => {
        setIsLaunching(true);
        setError(null);

        try {
            if (!publicKey) throw new Error('Wallet not connected');

            let imageUrl = '';
            if (typeof imageFile === 'string') {
                imageUrl = imageFile;
            } else {
                // Step 1: Upload Image to Pinata via Backend
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

            // Step 2: Upload Metadata to Pinata via Backend
            const metadata = {
                name,
                symbol,
                description,
                imageUrl,
                twitter,
                telegram,
                website
            };

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

            // Step 3: Call Smart Contract
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
            // Anchor instruction discriminator: sha256("global:create_token")[..8]
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

            // initial_buy_lamports is Option<u64>
            // Option<u64> layout: [1 (Some) or 0 (None)] + [u64 data if Some]
            const initialBuyLamports = BigInt(Math.floor(initialBuyAmount * 1e9));
            const initialBuyBuffer = Buffer.alloc(9);
            if (initialBuyLamports > 0n) {
                initialBuyBuffer.writeUInt8(1, 0); // Some
                initialBuyBuffer.writeBigUInt64LE(initialBuyLamports, 1);
            } else {
                initialBuyBuffer.writeUInt8(0, 0); // None
            }

            const data = Buffer.concat([
                discriminator,
                nameBuffer,
                symbolBuffer,
                uriBuffer,
                initialBuyBuffer
            ]);

            // Deriving ATA for creator
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

            const transaction = new Transaction().add(instruction);

            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = publicKey;

            const signature = await sendTransaction(transaction, connection, {
                signers: [mintKeypair]
            });

            await connection.confirmTransaction({
                signature,
                blockhash,
                lastValidBlockHeight
            }, 'confirmed');

            return { signature, mint: mintKeypair.publicKey.toString() };

        } catch (err: any) {
            console.error('Launch error:', err);
            setError(err.message || 'Failed to launch token');
            throw err;
        } finally {
            setIsLaunching(false);
        }
    };

    return { launchToken, isLaunching, error };
};
