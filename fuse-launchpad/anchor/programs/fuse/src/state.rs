use anchor_lang::prelude::*;

// 1. THE BONDING CURVE (The Math)
#[account]
#[derive(InitSpace)]
pub struct BondingCurve {
    pub creator: Pubkey,            // Who launched this?
    pub token_mint: Pubkey,         // The token address
    pub token_total_supply: u64,    // How many tokens exist?
    
    // The "Virtual" Reserves (The secret sauce for x*y=k)
    pub virtual_sol_reserves: u64,  
    pub virtual_token_reserves: u64,
    
    // The "Real" Reserves (What is actually in the vault)
    pub real_sol_reserves: u64,
    pub real_token_reserves: u64,
    
    // Graduation Logic
    pub complete: bool,             // True if we hit market cap target
    pub bump: u8,                   // Security seed
    
    // Creator Fee Accumulator
    pub creator_fee_accumulated: u64, // Stores the 20% cut of fees
    
    // Sniper Protection
    pub launch_timestamp: i64,      // Unix timestamp of curve creation
    
    // Token Metadata
    #[max_len(32)]
    pub name: String,               // Token name
    #[max_len(10)]
    pub symbol: String,             // Token symbol/ticker
    #[max_len(200)]
    pub uri: String,                // Metadata URI (IPFS/Arweave)
}

// 2. GLOBAL PROTOCOL STATE
#[account]
#[derive(InitSpace)]
pub struct ProtocolState {
    pub authority: Pubkey,          // Protocol admin
    pub treasury: Pubkey,           // Where protocol fees go
    pub total_tokens_launched: u64, // Counter
    pub total_volume_sol: u64,      // Lifetime volume
    pub total_graduated: u64,       // How many reached graduation
    pub is_paused: bool,            // Emergency pause
    pub bump: u8,
}

// 3. USER PROFILE (Optional - for referrals/rewards)
#[account]
#[derive(InitSpace)]
pub struct UserProfile {
    pub authority: Pubkey,          // Renamed from wallet to match standard
    #[max_len(20)]
    pub username: String,           // Store username in profile too
    pub referrer: Option<Pubkey>,   // Who referred this user?
    pub referral_count: u64,        // How many users they referred
    pub total_referral_fees: u64,   // Earnings from referrals
    pub bump: u8,
}

// 4. REFERRAL CODE MAPPING
#[account]
#[derive(InitSpace)]
pub struct ReferralCode {
    pub owner: Pubkey,
    #[max_len(20)]
    pub code: String,
    pub bump: u8,
}
