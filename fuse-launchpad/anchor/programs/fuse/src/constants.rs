use anchor_lang::prelude::*;

#[constant]
pub const SEED: &[u8] = b"curve";
pub const USER_SEED: &[u8] = b"user";
pub const REFERRAL_SEED: &[u8] = b"referral";

pub const VIRTUAL_SOL_RESERVES: u64 = 30_000_000_000; // 30 SOL
pub const VIRTUAL_TOKEN_RESERVES: u64 = 1_073_000_000_000_000; // 1.073B tokens (6 decimals)
pub const REAL_TOKEN_RESERVES: u64 = 793_100_000_000_000; // 793.1M tokens (6 decimals)
pub const TOTAL_SUPPLY: u64 = 1_000_000_000_000_000; // 1B tokens (6 decimals)
pub const INITIAL_PRICE_LAMPORTS: u64 = 28; // ~0.000000028 SOL

// =====================
// GRADUATION THRESHOLDS
// =====================
pub const GRADUATION_MCAP_LAMPORTS: u64 = 69_000_000_000_000; // $69K at ~$150/SOL = ~460 SOL in lamports
pub const GRADUATION_SOL_THRESHOLD: u64 = 85_000_000_000; // ~85 SOL in real reserves triggers graduation

// =====================
// FEE CONFIGURATION
// =====================
pub const FEE_BASIS_POINTS: u64 = 100; // 1% total fee
pub const PROTOCOL_FEE_SHARE: u64 = 80; // 80% of fee goes to protocol
pub const CREATOR_FEE_SHARE: u64 = 20; // 20% of fee goes to creator

// =====================
// TOKEN CREATION FEE
// =====================
pub const CREATION_FEE_LAMPORTS: u64 = 75_000_000; // 0.075 SOL to launch a token

// =====================
// TOKEN METADATA
// =====================
pub const TOKEN_DECIMALS: u8 = 6;
pub const MAX_NAME_LENGTH: usize = 32;
pub const MAX_SYMBOL_LENGTH: usize = 10;
pub const MAX_URI_LENGTH: usize = 200;