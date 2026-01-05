use anchor_lang::prelude::*;

// IMPORT YOUR MODULES
pub mod state;
pub mod errors;
pub mod constants;
pub mod instructions;
pub mod events;
pub mod meteora_interface;

use state::*;
use errors::*;
use constants::*;
use instructions::*;
use events::*;
use meteora_interface::*;

declare_id!("CT4bS24PZXLzxuGMiHPLs3tpWYu72aVJ83UMgSNUeKY2");

#[program]
pub mod fuse_launchpad {
    use super::*;

    /// Initialize the protocol (admin only, run once)
    pub fn initialize(ctx: Context<Initialize>, name: String, symbol: String, uri: String) -> Result<()> {
        instructions::initialize::handler(ctx, name, symbol, uri)
    }

    /// Create a new token with bonding curve
    /// 
    /// # Arguments
    /// * `name` - Token name (max 32 chars)
    /// * `symbol` - Token symbol/ticker (max 10 chars)
    /// * `uri` - Metadata URI (IPFS/Arweave, max 200 chars)
    /// * `initial_buy_lamports` - Optional initial buy amount in lamports
    pub fn create_token(
        ctx: Context<CreateToken>,
        name: String,
        symbol: String,
        uri: String,
        initial_buy_lamports: Option<u64>,
    ) -> Result<()> {
        instructions::create_token::handler(ctx, name, symbol, uri, initial_buy_lamports)
    }

    /// Buy tokens from the bonding curve
    /// 
    /// # Arguments
    /// * `amount_in` - SOL amount in lamports to spend
    /// * `min_tokens_out` - Minimum tokens expected (slippage protection)
    pub fn buy(ctx: Context<Buy>, amount_in: u64, min_tokens_out: u64) -> Result<()> {
        instructions::buy::handler(ctx, amount_in, min_tokens_out)
    }

    /// Sell tokens back to the bonding curve
    /// 
    /// # Arguments
    /// * `amount_in` - Token amount to sell
    /// * `min_sol_out` - Minimum SOL expected (slippage protection)
    pub fn sell(ctx: Context<Sell>, amount_in: u64, min_sol_out: u64) -> Result<()> {
        instructions::sell::handler(ctx, amount_in, min_sol_out)
    }

    /// Migrate/Graduate the token to a DEX (Raydium/Meteora)
    /// 
    /// Only callable when graduation threshold is reached
    pub fn migrate(ctx: Context<Migrate>) -> Result<()> {
        instructions::migrate::handler(ctx)
    }

    /// Register a new user profile with a unique username
    pub fn register_user(ctx: Context<RegisterUser>, username: String) -> Result<()> {
        instructions::register_user::handler(ctx, username)
    }

    /// Set a referrer for the user
    pub fn set_referrer(ctx: Context<SetReferrer>, referral_code: String) -> Result<()> {
        instructions::set_referrer::handler(ctx, referral_code)
    }
}