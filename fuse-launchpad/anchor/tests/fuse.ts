import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { FuseLaunchpad } from "../target/types/fuse_launchpad";
import { assert } from "chai";
import { BN } from "bn.js";

describe("fuse-launchpad", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.FuseLaunchpad as Program<FuseLaunchpad>;

  // Accounts
  const creator = anchor.web3.Keypair.generate();
  const buyer = anchor.web3.Keypair.generate();
  const treasury = anchor.web3.Keypair.generate();
  const migrationAuthority = anchor.web3.Keypair.generate();
  const mint = anchor.web3.Keypair.generate();

  // PDAs
  let curveConfig: anchor.web3.PublicKey;
  let vault: anchor.web3.PublicKey;

  const SEED = Buffer.from("curve");

  before(async () => {
    // Airdrop SOL to users
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(creator.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL),
      "confirmed"
    );
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(buyer.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL),
      "confirmed"
    );

    // Derive PDAs
    [curveConfig] = anchor.web3.PublicKey.findProgramAddressSync(
      [SEED, mint.publicKey.toBuffer()],
      program.programId
    );

    [vault] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("token_vault"), mint.publicKey.toBuffer()],
      program.programId
    );
  });

  it("Is initialized!", async () => {
    const tx = await program.methods
      .initialize()
      .accounts({
        creator: creator.publicKey,
        curveConfig: curveConfig,
        mint: mint.publicKey,
        vault: vault,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([creator, mint])
      .rpc();

    console.log("Your transaction signature", tx);

    const curveAccount = await program.account.bondingCurve.fetch(curveConfig);
    assert.ok(curveAccount.creator.equals(creator.publicKey));
    assert.ok(curveAccount.complete === false);
    assert.ok(curveAccount.creatorFeeAccumulated.eqn(0));
  });

  it("Buys tokens (80/20 Split Check)", async () => {
    const amountIn = new BN(1 * anchor.web3.LAMPORTS_PER_SOL); // 1 SOL

    // Get user token account
    const userTokenAccount = await anchor.utils.token.associatedAddress({
      mint: mint.publicKey,
      owner: buyer.publicKey,
    });

    // Create ATA instruction if needed (usually client side does this, but we do it here)
    // For simplicity in test, we assume the instruction handles it or we create it beforehand?
    // The contract expects `user_token_account` to exist.
    // Let's create it.
    const createAtaTx = new anchor.web3.Transaction().add(
      anchor.utils.token.createAssociatedTokenAccountInstruction(
        buyer.publicKey,
        userTokenAccount,
        buyer.publicKey,
        mint.publicKey
      )
    );
    await provider.sendAndConfirm(createAtaTx, [buyer]);

    const tx = await program.methods
      .buy(amountIn)
      .accounts({
        user: buyer.publicKey,
        curveConfig: curveConfig,
        mint: mint.publicKey,
        vault: vault,
        userTokenAccount: userTokenAccount,
        treasury: treasury.publicKey,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([buyer])
      .rpc();

    console.log("Buy tx:", tx);

    const curveAccount = await program.account.bondingCurve.fetch(curveConfig);
    
    // Math Check:
    // 1 SOL In.
    // Fee = 0.01 SOL.
    // Protocol = 0.008 SOL.
    // Creator = 0.002 SOL.
    // Net = 0.99 SOL.
    
    // Check Creator Fee Accumulation
    console.log("Creator Fee Accumulated:", curveAccount.creatorFeeAccumulated.toString());
    assert.ok(curveAccount.creatorFeeAccumulated.eq(new BN(0.002 * anchor.web3.LAMPORTS_PER_SOL)));

    // Check Treasury Balance
    const treasuryBalance = await provider.connection.getBalance(treasury.publicKey);
    console.log("Treasury Balance:", treasuryBalance);
    assert.equal(treasuryBalance, 0.008 * anchor.web3.LAMPORTS_PER_SOL);
  });

  it("Sells tokens (80/20 Split Check)", async () => {
    // Sell half the tokens we bought
    const userTokenAccount = await anchor.utils.token.associatedAddress({
      mint: mint.publicKey,
      owner: buyer.publicKey,
    });
    
    const balance = await provider.connection.getTokenAccountBalance(userTokenAccount);
    const amountToSell = new BN(balance.value.amount).div(new BN(2));

    const tx = await program.methods
      .sell(amountToSell, new BN(0)) // 0 min sol out for test
      .accounts({
        user: buyer.publicKey,
        curveConfig: curveConfig,
        mint: mint.publicKey,
        vault: vault,
        userTokenAccount: userTokenAccount,
        treasury: treasury.publicKey,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([buyer])
      .rpc();

    console.log("Sell tx:", tx);

    const curveAccount = await program.account.bondingCurve.fetch(curveConfig);
    
    // Check Creator Fee Accumulation increased
    console.log("Creator Fee Accumulated (After Sell):", curveAccount.creatorFeeAccumulated.toString());
    assert.ok(curveAccount.creatorFeeAccumulated.gt(new BN(0.002 * anchor.web3.LAMPORTS_PER_SOL)));
  });

  it("Migrates and Pays Creator", async () => {
    // Create migration token account
    const migrationTokenAccount = await anchor.utils.token.associatedAddress({
      mint: mint.publicKey,
      owner: migrationAuthority.publicKey,
    });

    const createAtaTx = new anchor.web3.Transaction().add(
      anchor.utils.token.createAssociatedTokenAccountInstruction(
        provider.wallet.publicKey, // Payer
        migrationTokenAccount,
        migrationAuthority.publicKey,
        mint.publicKey
      )
    );
    await provider.sendAndConfirm(createAtaTx);

    const preCreatorBalance = await provider.connection.getBalance(creator.publicKey);

    const tx = await program.methods
      .migrate()
      .accounts({
        migrationAuthority: migrationAuthority.publicKey,
        curveConfig: curveConfig,
        mint: mint.publicKey,
        vault: vault,
        migrationTokenAccount: migrationTokenAccount,
        creator: creator.publicKey,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([migrationAuthority])
      .rpc();

    console.log("Migrate tx:", tx);

    const curveAccount = await program.account.bondingCurve.fetch(curveConfig);
    assert.ok(curveAccount.complete === true);

    // Check Creator got paid
    const postCreatorBalance = await provider.connection.getBalance(creator.publicKey);
    console.log("Creator Balance Change:", postCreatorBalance - preCreatorBalance);
    assert.ok(postCreatorBalance > preCreatorBalance);
  });
});
