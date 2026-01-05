/**
 * FUSE.FUN SDK - TypeScript client for interacting with the FUSE Launchpad
 * 
 * This SDK provides:
 * - Token creation (launch a new coin)
 * - Buy/Sell via bonding curve
 * - Read curve state
 * - Event parsing
 */

import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  TransactionInstruction,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getAccount,
} from '@solana/spl-token';
import * as anchor from '@coral-xyz/anchor';
import { BN } from 'bn.js';

// =====================
// PROGRAM CONSTANTS
// =====================
export const PROGRAM_ID = new PublicKey('CT4bS24PZXLzxuGMiHPLs3tpWYu72aVJ83UMgSNUeKY2');
export const CURVE_SEED = Buffer.from('curve');
export const VAULT_SEED = Buffer.from('vault');
export const USER_SEED = Buffer.from('user');
export const REFERRAL_SEED = Buffer.from('referral');

// IDL Definition
export const IDL: anchor.Idl = {
  "version": "0.1.0",
  "name": "fuse_launchpad",
  "instructions": [
    {
      "name": "initialize",
      "accounts": [
        { "name": "curve", "isMut": true, "isSigner": false },
        { "name": "tokenMint", "isMut": false, "isSigner": false },
        { "name": "admin", "isMut": true, "isSigner": true },
        { "name": "systemProgram", "isMut": false, "isSigner": false },
        { "name": "rent", "isMut": false, "isSigner": false }
      ],
      "args": [
        { "name": "name", "type": "string" },
        { "name": "symbol", "type": "string" },
        { "name": "uri", "type": "string" }
      ]
    },
    {
      "name": "createToken",
      "accounts": [
        { "name": "creator", "isMut": true, "isSigner": true },
        { "name": "curve", "isMut": true, "isSigner": false },
        { "name": "mint", "isMut": true, "isSigner": true },
        { "name": "vault", "isMut": true, "isSigner": false },
        { "name": "creatorTokenAccount", "isMut": true, "isSigner": false },
        { "name": "treasury", "isMut": true, "isSigner": false },
        { "name": "systemProgram", "isMut": false, "isSigner": false },
        { "name": "tokenProgram", "isMut": false, "isSigner": false },
        { "name": "associatedTokenProgram", "isMut": false, "isSigner": false },
        { "name": "rent", "isMut": false, "isSigner": false }
      ],
      "args": [
        { "name": "name", "type": "string" },
        { "name": "symbol", "type": "string" },
        { "name": "uri", "type": "string" },
        { "name": "initialBuyLamports", "type": { "option": "u64" } }
      ]
    },
    {
      "name": "buy",
      "accounts": [
        { "name": "user", "isMut": true, "isSigner": true },
        { "name": "curveConfig", "isMut": true, "isSigner": false },
        { "name": "mint", "isMut": false, "isSigner": false },
        { "name": "vault", "isMut": true, "isSigner": false },
        { "name": "userTokenAccount", "isMut": true, "isSigner": false },
        { "name": "treasury", "isMut": true, "isSigner": false },
        { "name": "userProfile", "isMut": true, "isSigner": false, "isOptional": true },
        { "name": "referrerProfile", "isMut": true, "isSigner": false, "isOptional": true },
        { "name": "tokenProgram", "isMut": false, "isSigner": false },
        { "name": "systemProgram", "isMut": false, "isSigner": false }
      ],
      "args": [
        { "name": "amountIn", "type": "u64" },
        { "name": "minTokensOut", "type": "u64" }
      ]
    },
    {
      "name": "sell",
      "accounts": [
        { "name": "user", "isMut": true, "isSigner": true },
        { "name": "curveConfig", "isMut": true, "isSigner": false },
        { "name": "mint", "isMut": false, "isSigner": false },
        { "name": "vault", "isMut": true, "isSigner": false },
        { "name": "userTokenAccount", "isMut": true, "isSigner": false },
        { "name": "treasury", "isMut": true, "isSigner": false },
        { "name": "userProfile", "isMut": true, "isSigner": false, "isOptional": true },
        { "name": "referrerProfile", "isMut": true, "isSigner": false, "isOptional": true },
        { "name": "tokenProgram", "isMut": false, "isSigner": false },
        { "name": "systemProgram", "isMut": false, "isSigner": false }
      ],
      "args": [
        { "name": "amountIn", "type": "u64" },
        { "name": "minSolOut", "type": "u64" }
      ]
    },
    {
      "name": "registerUser",
      "accounts": [
        { "name": "user", "isMut": true, "isSigner": true },
        { "name": "userProfile", "isMut": true, "isSigner": false },
        { "name": "referralCode", "isMut": true, "isSigner": false },
        { "name": "systemProgram", "isMut": false, "isSigner": false }
      ],
      "args": [
        { "name": "username", "type": "string" }
      ]
    },
    {
      "name": "setReferrer",
      "accounts": [
        { "name": "user", "isMut": true, "isSigner": true },
        { "name": "userProfile", "isMut": true, "isSigner": false },
        { "name": "referralCode", "isMut": false, "isSigner": false },
        { "name": "systemProgram", "isMut": false, "isSigner": false }
      ],
      "args": [
        { "name": "referralCode", "type": "string" }
      ]
    }
  ],
  "accounts": [
    {
      "name": "CurveState",
      "type": {
        "kind": "struct",
        "fields": [
          { "name": "creator", "type": "publicKey" },
          { "name": "tokenMint", "type": "publicKey" },
          { "name": "tokenTotalSupply", "type": "u64" },
          { "name": "virtualSolReserves", "type": "u64" },
          { "name": "virtualTokenReserves", "type": "u64" },
          { "name": "realSolReserves", "type": "u64" },
          { "name": "realTokenReserves", "type": "u64" },
          { "name": "complete", "type": "bool" },
          { "name": "bump", "type": "u8" },
          { "name": "creatorFeeAccumulated", "type": "u64" },
          { "name": "launchTimestamp", "type": "i64" },
          { "name": "name", "type": "string" },
          { "name": "symbol", "type": "string" },
          { "name": "uri", "type": "string" }
        ]
      }
    },
    {
      "name": "UserProfile",
      "type": {
        "kind": "struct",
        "fields": [
          { "name": "authority", "type": "publicKey" },
          { "name": "username", "type": "string" },
          { "name": "referrer", "type": { "option": "publicKey" } },
          { "name": "referralCount", "type": "u64" },
          { "name": "totalReferralFees", "type": "u64" },
          { "name": "bump", "type": "u8" }
        ]
      }
    },
    {
      "name": "ReferralCode",
      "type": {
        "kind": "struct",
        "fields": [
          { "name": "authority", "type": "publicKey" },
          { "name": "code", "type": "string" },
          { "name": "bump", "type": "u8" }
        ]
      }
    }
  ]
};

// Bonding Curve Constants (matching Rust program)
export const VIRTUAL_SOL_RESERVES = 30_000_000_000n; // 30 SOL
export const VIRTUAL_TOKEN_RESERVES = 1_073_000_000_000_000n; // 1.073B tokens
export const TOTAL_SUPPLY = 1_000_000_000_000_000n; // 1B tokens
export const GRADUATION_SOL_THRESHOLD = 1_000_000_000n; // 1 SOL (TESTING ONLY - change back to 85 SOL for production)
export const FEE_BASIS_POINTS = 100n; // 1% (bonding curve fee)

// Platform Fee Configuration
// This is an additional fee charged by the platform on each trade
// 50 basis points = 0.5%
export const PLATFORM_FEE_BPS = 50n; // 0.5% platform fee

// =====================
// TYPES
// =====================
export interface CurveState {
  creator: PublicKey;
  tokenMint: PublicKey;
  tokenTotalSupply: bigint;
  virtualSolReserves: bigint;
  virtualTokenReserves: bigint;
  realSolReserves: bigint;
  realTokenReserves: bigint;
  complete: boolean;
  creatorFeeAccumulated: bigint;
  launchTimestamp: number;
  name: string;
  symbol: string;
  uri: string;
}

export interface TokenInfo {
  mint: PublicKey;
  curve: PublicKey;
  name: string;
  symbol: string;
  uri: string;
  price: number; // Price in SOL per token
  marketCap: number; // In SOL
  volume24h?: number;
  bondingProgress: number; // 0-100%
  isGraduated: boolean;
  creator: PublicKey;
}

export interface TradeQuote {
  tokensOut: bigint;
  solOut: bigint;
  priceImpact: number;
  fee: bigint;
  effectivePrice: number;
}

// =====================
// SDK CLASS
// =====================
export class FuseSDK {
  private connection: Connection;
  private treasury: PublicKey;
  private program: anchor.Program;

  constructor(
    connection: Connection,
    wallet: anchor.Wallet,
    treasuryAddress: string = '4j1591eHGUZvRQgAGKSW2sriMQkDinSDRnA7oXdCHyT1' // Updated treasury to receive fees
  ) {
    this.connection = connection;
    this.treasury = new PublicKey(treasuryAddress);

    const provider = new anchor.AnchorProvider(
      connection,
      wallet,
      anchor.AnchorProvider.defaultOptions()
    );
    this.program = new anchor.Program(IDL, PROGRAM_ID, provider);
  }

  // =====================
  // PDA DERIVATION
  // =====================

  /**
   * Derive the bonding curve PDA for a given mint
   */
  static getCurvePDA(mint: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [CURVE_SEED, mint.toBuffer()],
      PROGRAM_ID
    );
  }

  /**
   * Derive the token vault PDA for a given mint
   */
  static getVaultPDA(mint: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [VAULT_SEED, mint.toBuffer()],
      PROGRAM_ID
    );
  }

  /**
   * Derive the user profile PDA for a given user
   */
  static getUserProfilePDA(user: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [USER_SEED, user.toBuffer()],
      PROGRAM_ID
    );
  }

  /**
   * Derive the referral code PDA for a given code
   */
  static getReferralCodePDA(code: string): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [REFERRAL_SEED, Buffer.from(code)],
      PROGRAM_ID
    );
  }

  // =====================
  // BONDING CURVE MATH
  // =====================

  /**
   * Calculate tokens out for a given SOL input (buy)
   */
  static calculateBuyTokensOut(
    virtualSolReserves: bigint,
    virtualTokenReserves: bigint,
    solIn: bigint
  ): bigint {
    // Apply 1% fee
    const fee = (solIn * FEE_BASIS_POINTS) / 10000n;
    const netSolIn = solIn - fee;

    // AMM formula: tokens_out = (reserves_token * sol_in) / (reserves_sol + sol_in)
    const tokensOut = (virtualTokenReserves * netSolIn) / (virtualSolReserves + netSolIn);
    return tokensOut;
  }

  /**
   * Calculate SOL out for a given token input (sell)
   */
  static calculateSellSolOut(
    virtualSolReserves: bigint,
    virtualTokenReserves: bigint,
    tokensIn: bigint
  ): bigint {
    // AMM formula: sol_out = (reserves_sol * tokens_in) / (reserves_token + tokens_in)
    const solOut = (virtualSolReserves * tokensIn) / (virtualTokenReserves + tokensIn);

    // Apply 1% fee
    const fee = (solOut * FEE_BASIS_POINTS) / 10000n;
    const netSolOut = solOut - fee;

    return netSolOut;
  }

  /**
   * Calculate current price (SOL per token)
   */
  static calculatePrice(virtualSolReserves: bigint, virtualTokenReserves: bigint): number {
    return Number(virtualSolReserves) / Number(virtualTokenReserves);
  }

  /**
   * Calculate market cap in SOL
   */
  static calculateMarketCap(virtualSolReserves: bigint, virtualTokenReserves: bigint): number {
    const price = this.calculatePrice(virtualSolReserves, virtualTokenReserves);
    return (Number(TOTAL_SUPPLY) * price) / LAMPORTS_PER_SOL;
  }

  /**
   * Calculate bonding curve progress (0-100%)
   */
  static calculateBondingProgress(realSolReserves: bigint): number {
    return (Number(realSolReserves) / Number(GRADUATION_SOL_THRESHOLD)) * 100;
  }

  /**
   * Get a quote for buying tokens
   */
  getQuoteBuy(curveState: CurveState, solAmount: bigint): TradeQuote {
    const tokensOut = FuseSDK.calculateBuyTokensOut(
      curveState.virtualSolReserves,
      curveState.virtualTokenReserves,
      solAmount
    );

    const fee = (solAmount * FEE_BASIS_POINTS) / 10000n;
    const currentPrice = FuseSDK.calculatePrice(
      curveState.virtualSolReserves,
      curveState.virtualTokenReserves
    );

    // Calculate price after trade
    const newVirtualSol = curveState.virtualSolReserves + (solAmount - fee);
    const newVirtualTokens = curveState.virtualTokenReserves - tokensOut;
    const newPrice = FuseSDK.calculatePrice(newVirtualSol, newVirtualTokens);

    const priceImpact = ((newPrice - currentPrice) / currentPrice) * 100;
    const effectivePrice = Number(solAmount) / Number(tokensOut);

    return {
      tokensOut,
      solOut: 0n,
      priceImpact,
      fee,
      effectivePrice,
    };
  }

  /**
   * Get a quote for selling tokens
   */
  getQuoteSell(curveState: CurveState, tokenAmount: bigint): TradeQuote {
    const solOut = FuseSDK.calculateSellSolOut(
      curveState.virtualSolReserves,
      curveState.virtualTokenReserves,
      tokenAmount
    );

    const grossSolOut = (curveState.virtualSolReserves * tokenAmount) /
      (curveState.virtualTokenReserves + tokenAmount);
    const fee = grossSolOut - solOut;

    const currentPrice = FuseSDK.calculatePrice(
      curveState.virtualSolReserves,
      curveState.virtualTokenReserves
    );

    // Calculate price after trade
    const newVirtualSol = curveState.virtualSolReserves - grossSolOut;
    const newVirtualTokens = curveState.virtualTokenReserves + tokenAmount;
    const newPrice = FuseSDK.calculatePrice(newVirtualSol, newVirtualTokens);

    const priceImpact = ((currentPrice - newPrice) / currentPrice) * 100;
    const effectivePrice = Number(solOut) / Number(tokenAmount);

    return {
      tokensOut: 0n,
      solOut,
      priceImpact,
      fee,
      effectivePrice,
    };
  }

  // =====================
  // READ OPERATIONS
  // =====================

  /**
   * Fetch the bonding curve state for a token
   */
  async getCurveState(mint: PublicKey): Promise<CurveState | null> {
    try {
      const [curvePda] = FuseSDK.getCurvePDA(mint);
      const accountInfo = await this.connection.getAccountInfo(curvePda);

      if (!accountInfo) return null;

      // Deserialize account data (simplified - in production use Anchor's IDL)
      // This is a basic example - actual deserialization depends on account layout
      const data = accountInfo.data;

      // Skip discriminator (8 bytes)
      let offset = 8;

      const creator = new PublicKey(data.slice(offset, offset + 32));
      offset += 32;

      const tokenMint = new PublicKey(data.slice(offset, offset + 32));
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

      const complete = data[offset] === 1;
      offset += 1;

      const bump = data[offset];
      offset += 1;

      const creatorFeeAccumulated = data.readBigUInt64LE(offset);
      offset += 8;

      const launchTimestamp = Number(data.readBigInt64LE(offset));
      offset += 8;

      // Read strings (name, symbol, uri) - these have length prefixes
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
        creatorFeeAccumulated,
        launchTimestamp,
        name,
        symbol,
        uri,
      };
    } catch (error) {
      console.error('Error fetching curve state:', error);
      return null;
    }
  }

  /**
   * Get formatted token info for UI display
   */
  async getTokenInfo(mint: PublicKey): Promise<TokenInfo | null> {
    const curveState = await this.getCurveState(mint);
    if (!curveState) return null;

    const [curvePda] = FuseSDK.getCurvePDA(mint);
    const price = FuseSDK.calculatePrice(
      curveState.virtualSolReserves,
      curveState.virtualTokenReserves
    );
    const marketCap = FuseSDK.calculateMarketCap(
      curveState.virtualSolReserves,
      curveState.virtualTokenReserves
    );
    const bondingProgress = FuseSDK.calculateBondingProgress(curveState.realSolReserves);

    return {
      mint,
      curve: curvePda,
      name: curveState.name,
      symbol: curveState.symbol,
      uri: curveState.uri,
      price,
      marketCap,
      bondingProgress: Math.min(bondingProgress, 100),
      isGraduated: curveState.complete,
      creator: curveState.creator,
    };
  }

  /**
   * Get user's token balance
   */
  async getUserBalance(mint: PublicKey, user: PublicKey): Promise<bigint> {
    try {
      const ata = await getAssociatedTokenAddress(mint, user);
      const account = await getAccount(this.connection, ata);
      return account.amount;
    } catch {
      return 0n;
    }
  }

  /**
   * Get user's on-chain profile (for referral stats)
   */
  async getUserProfile(user: PublicKey): Promise<{
    authority: PublicKey;
    username: string;
    referrer: PublicKey | null;
    referralCount: number;
    totalReferralFees: bigint;
  } | null> {
    try {
      const [userProfilePda] = FuseSDK.getUserProfilePDA(user);
      // @ts-ignore - IDL typing
      const account = await this.program.account.userProfile.fetch(userProfilePda);
      return {
        authority: account.authority as PublicKey,
        username: account.username as string,
        referrer: account.referrer as PublicKey | null,
        referralCount: (account.referralCount as any)?.toNumber?.() || Number(account.referralCount) || 0,
        totalReferralFees: BigInt((account.totalReferralFees as any)?.toString?.() || account.totalReferralFees || 0),
      };
    } catch (e) {
      // User not registered yet
      return null;
    }
  }

  // =====================
  // TRANSACTION BUILDERS
  // =====================

  /**
   * Build a create token transaction
   */
  async buildCreateTokenTx(
    creator: PublicKey,
    mint: Keypair,
    name: string,
    symbol: string,
    uri: string,
    initialBuyLamports: number = 0
  ): Promise<Transaction> {
    const [curvePda] = FuseSDK.getCurvePDA(mint.publicKey);
    const [vaultPda] = FuseSDK.getVaultPDA(mint.publicKey);
    const creatorAta = await getAssociatedTokenAddress(mint.publicKey, creator);

    const tx = await this.program.methods
      .createToken(name, symbol, uri, new BN(initialBuyLamports))
      .accounts({
        creator: creator,
        curve: curvePda,
        mint: mint.publicKey,
        vault: vaultPda,
        creatorTokenAccount: creatorAta,
        treasury: this.treasury,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .transaction();

    return tx;
  }

  /**
   * Build a register user transaction
   */
  async buildRegisterUserTx(
    user: PublicKey,
    username: string
  ): Promise<Transaction> {
    const [userProfilePda] = FuseSDK.getUserProfilePDA(user);
    const [referralCodePda] = FuseSDK.getReferralCodePDA(username);

    const tx = await this.program.methods
      .registerUser(username)
      .accounts({
        user: user,
        userProfile: userProfilePda,
        referralCode: referralCodePda,
        systemProgram: SystemProgram.programId,
      })
      .transaction();

    return tx;
  }

  /**
   * Build a set referrer transaction
   */
  async buildSetReferrerTx(
    user: PublicKey,
    referralCode: string
  ): Promise<Transaction> {
    const [userProfilePda] = FuseSDK.getUserProfilePDA(user);
    const [referralCodePda] = FuseSDK.getReferralCodePDA(referralCode);

    const tx = await this.program.methods
      .setReferrer(referralCode)
      .accounts({
        user: user,
        userProfile: userProfilePda,
        referralCode: referralCodePda,
        systemProgram: SystemProgram.programId,
      })
      .transaction();

    return tx;
  }

  /**
   * Resolve a referral code to a wallet address
   */
  async getReferrerFromCode(code: string): Promise<PublicKey | null> {
    try {
      const [referralCodePda] = FuseSDK.getReferralCodePDA(code);
      // @ts-ignore
      const account = await this.program.account.referralCode.fetch(referralCodePda);
      return account.owner as PublicKey;
    } catch (e) {
      console.error('Error resolving referral code:', e);
      return null;
    }
  }

  /**
   * Build a buy transaction
   */
  async buildBuyTx(
    user: PublicKey,
    mint: PublicKey,
    solAmount: bigint,
    minTokensOut: bigint
  ): Promise<Transaction> {
    const [curvePda] = FuseSDK.getCurvePDA(mint);
    const [vaultPda] = FuseSDK.getVaultPDA(mint);
    const userAta = await getAssociatedTokenAddress(mint, user);
    const [userProfilePda] = FuseSDK.getUserProfilePDA(user);

    let referrerProfile = null;
    let referrerWallet = null;

    try {
      // @ts-ignore - dynamic anchor program
      const userProfileAccount = await this.program.account.userProfile.fetchNullable(userProfilePda);
      if (userProfileAccount && userProfileAccount.referrer) {
        referrerWallet = userProfileAccount.referrer as PublicKey;
        const [refProfilePda] = FuseSDK.getUserProfilePDA(referrerWallet);
        referrerProfile = refProfilePda;
      }
    } catch (e) {
      // Ignore error if profile doesn't exist
    }

    const tx = await this.program.methods
      .buy(new BN(solAmount.toString()), new BN(minTokensOut.toString()))
      .accounts({
        user: user,
        curveConfig: curvePda,
        mint: mint,
        vault: vaultPda,
        userTokenAccount: userAta,
        treasury: this.treasury,
        userProfile: userProfilePda,
        referrerProfile: referrerProfile,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .transaction();

    // Add platform fee transfer instruction
    const platformFee = (solAmount * PLATFORM_FEE_BPS) / 10000n;
    if (platformFee > 0n) {
      const feeTransferIx = SystemProgram.transfer({
        fromPubkey: user,
        toPubkey: this.treasury,
        lamports: Number(platformFee),
      });
      // Prepend fee transfer to ensure it's paid first
      tx.instructions.unshift(feeTransferIx);
    }

    return tx;
  }


  /**
   * Build a sell transaction
   */
  async buildSellTx(
    user: PublicKey,
    mint: PublicKey,
    tokenAmount: bigint,
    minSolOut: bigint
  ): Promise<Transaction> {
    const [curvePda] = FuseSDK.getCurvePDA(mint);
    const [vaultPda] = FuseSDK.getVaultPDA(mint);
    const userAta = await getAssociatedTokenAddress(mint, user);
    const [userProfilePda] = FuseSDK.getUserProfilePDA(user);

    let referrerProfile = null;
    let referrerWallet = null;

    try {
      // @ts-ignore - dynamic anchor program
      const userProfileAccount = await this.program.account.userProfile.fetchNullable(userProfilePda);
      if (userProfileAccount && userProfileAccount.referrer) {
        referrerWallet = userProfileAccount.referrer as PublicKey;
        const [refProfilePda] = FuseSDK.getUserProfilePDA(referrerWallet);
        referrerProfile = refProfilePda;
      }
    } catch (e) {
      // Ignore error if profile doesn't exist
    }

    const tx = await this.program.methods
      .sell(new BN(tokenAmount.toString()), new BN(minSolOut.toString()))
      .accounts({
        user: user,
        curveConfig: curvePda,
        mint: mint,
        vault: vaultPda,
        userTokenAccount: userAta,
        treasury: this.treasury,
        userProfile: userProfilePda,
        referrerProfile: referrerProfile,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .transaction();

    // Add platform fee transfer instruction for sells
    // Fee is calculated based on minSolOut (expected output)
    // If minSolOut is 0, we calculate an estimated fee based on a rough price
    const estimatedSolOut = minSolOut > 0n ? minSolOut : tokenAmount / 1_000_000n; // Rough estimate
    const platformFee = (estimatedSolOut * PLATFORM_FEE_BPS) / 10000n;
    if (platformFee > 0n) {
      const feeTransferIx = SystemProgram.transfer({
        fromPubkey: user,
        toPubkey: this.treasury,
        lamports: Number(platformFee),
      });
      // Prepend fee transfer to ensure it's paid first
      tx.instructions.unshift(feeTransferIx);
    }

    return tx;
  }

  // Helper Methods

  /**
   * Format lamports to SOL string
   */
  static formatSol(lamports: bigint | number): string {
    return (Number(lamports) / LAMPORTS_PER_SOL).toFixed(4);
  }

  /**
   * Format token amount with decimals
   */
  static formatTokens(amount: bigint | number, decimals: number = 6): string {
    const divisor = 10 ** decimals;
    const formatted = Number(amount) / divisor;

    if (formatted >= 1_000_000_000) {
      return (formatted / 1_000_000_000).toFixed(2) + 'B';
    } else if (formatted >= 1_000_000) {
      return (formatted / 1_000_000).toFixed(2) + 'M';
    } else if (formatted >= 1_000) {
      return (formatted / 1_000).toFixed(2) + 'K';
    }
    return formatted.toFixed(2);
  }

  /**
   * Parse SOL input to lamports
   */
  static parseSolToLamports(sol: string | number): bigint {
    return BigInt(Math.floor(Number(sol) * LAMPORTS_PER_SOL));
  }
}

// =====================
// EXPORTS
// =====================
export default FuseSDK;
