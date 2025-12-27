const anchor = require("@coral-xyz/anchor");
const { Program } = require("@coral-xyz/anchor");
const { PublicKey, Keypair, SystemProgram, SYSVAR_RENT_PUBKEY, Transaction, TransactionInstruction } = anchor.web3;
const { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress } = require("@solana/spl-token");
const fs = require("fs");
const path = require("path");

// Load the IDL manually since we didn't generate it
const idl = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../target/idl/fuse.json"), "utf8"));

async function main() {
    // Configure the client to use the devnet cluster.
    process.env.ANCHOR_PROVIDER_URL = "https://api.devnet.solana.com";
    process.env.ANCHOR_WALLET = process.env.HOME + "/.config/solana/id.json";
    
    const provider = anchor.AnchorProvider.env();
    console.log("Provider:", provider);
    anchor.setProvider(provider);

    // Use the deployed program ID
    const programId = "63mGs2kvQNm1g5S31WbYVq9mTgnfHKzD9iJB3ZWvQN1d";
    idl.address = programId;
    
    const createTokenInstr = idl.instructions.find(i => i.name === 'createToken');
    console.log("createToken IDL:", JSON.stringify(createTokenInstr, null, 2));

    const program = new Program(idl, provider);

    console.log("Wallet Public Key:", provider.wallet.publicKey.toString());

    // Generate a new mint keypair for the token
    const mint = Keypair.generate();
    console.log("New Token Mint:", mint.publicKey.toString());

    const SEED = Buffer.from("curve");

    // Derive PDAs
    const [curveConfig] = PublicKey.findProgramAddressSync(
        [SEED, mint.publicKey.toBuffer()],
        program.programId
    );

    const [vault] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), mint.publicKey.toBuffer()],
        program.programId
    );

    console.log("Creating Token...");
    
    const creatorTokenAccount = await getAssociatedTokenAddress(mint.publicKey, provider.wallet.publicKey);

    try {
        const txBuilder = program.methods
            .createToken(
                "Test Coin", // Name
                "TEST",      // Symbol
                "https://example.com/metadata.json", // URI
                new anchor.BN(0)         // No initial buy
            )
            .accounts({
                creator: provider.wallet.publicKey,
                curve: curveConfig,
                mint: mint.publicKey,
                vault: vault,
                creatorTokenAccount: creatorTokenAccount,
                treasury: provider.wallet.publicKey,
                systemProgram: SystemProgram.programId,
                tokenProgram: TOKEN_PROGRAM_ID,
                associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                rent: SYSVAR_RENT_PUBKEY,
            })
            .signers([mint]);
        
        const tx = await txBuilder.transaction();
        
        // Manually fix isSigner for mint (workaround for IDL issue)
        const mintKeyIndex = tx.instructions[0].keys.findIndex(k => k.pubkey.equals(mint.publicKey));
        if (mintKeyIndex !== -1) {
            console.log("Fixing isSigner for mint");
            tx.instructions[0].keys[mintKeyIndex].isSigner = true;
        }

        const txSig = await provider.sendAndConfirm(tx, [mint]);
        
        console.log("Token Created! Tx:", txSig);
    } catch (e) {
        console.error("Error creating token:", e);
        return;
    }

    // Now let's buy some tokens to simulate activity
    console.log("Buying tokens...");
    
    const userTokenAccount = await getAssociatedTokenAddress(
        mint.publicKey,
        provider.wallet.publicKey
    );

    // Amount to buy in SOL (e.g., 0.1 SOL)
    const buyAmountSol = new anchor.BN(0.1 * anchor.web3.LAMPORTS_PER_SOL);
    
    // Minimum tokens to receive (slippage protection - set low for test)
    const minTokensOut = new anchor.BN(0);

    try {
        const tx = await program.methods
            .buy(buyAmountSol, minTokensOut)
            .accounts({
                user: provider.wallet.publicKey,
                curveConfig: curveConfig,
                mint: mint.publicKey,
                vault: vault,
                userTokenAccount: userTokenAccount,
                treasury: provider.wallet.publicKey, // Using wallet as treasury for test
                tokenProgram: TOKEN_PROGRAM_ID,
                associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
            })
            .rpc();
            
        console.log("Bought tokens! Tx:", tx);
    } catch (e) {
        console.error("Error buying tokens:", e);
        return;
    }

    // Now let's sell them back
    console.log("Selling tokens...");

    // Get token balance
    const tokenBalance = await provider.connection.getTokenAccountBalance(userTokenAccount);
    const sellAmount = new anchor.BN(tokenBalance.value.amount);
    const minSolOut = new anchor.BN(0);

    try {
        const tx = await program.methods
            .sell(sellAmount, minSolOut)
            .accounts({
                user: provider.wallet.publicKey,
                curveConfig: curveConfig,
                mint: mint.publicKey,
                vault: vault,
                userTokenAccount: userTokenAccount,
                treasury: provider.wallet.publicKey,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
            })
            .rpc();
            
        console.log("Sold tokens! Tx:", tx);
        console.log("Funds returned to wallet.");
    } catch (e) {
        console.error("Error selling tokens:", e);
    }
}

main().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});