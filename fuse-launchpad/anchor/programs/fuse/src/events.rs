use anchor_lang::prelude::*;

#[event]
pub struct CurveInitialized {
    pub mint: Pubkey,
    pub creator: Pubkey,
    pub name: String,
    pub symbol: String,
    pub uri: String,
    pub timestamp: i64,
}

#[event]
pub struct TradeEvent {
    pub mint: Pubkey,
    pub user: Pubkey,
    pub is_buy: bool,
    pub sol_amount: u64,
    pub token_amount: u64,
    pub price: u64, // Price in lamports per token (scaled if needed, or just implied)
    pub virtual_sol_reserves: u64,
    pub virtual_token_reserves: u64,
    pub real_sol_reserves: u64,
    pub market_cap_lamports: u64, // Current market cap
    pub timestamp: i64,
}

#[event]
pub struct CurveCompleted {
    pub mint: Pubkey,
    pub migration_authority: Pubkey,
    pub final_market_cap: u64,
    pub total_sol_raised: u64,
    pub creator_payout: u64,
    pub timestamp: i64,
}

#[event]
pub struct GraduationTriggered {
    pub mint: Pubkey,
    pub real_sol_reserves: u64,
    pub market_cap: u64,
    pub timestamp: i64,
}
