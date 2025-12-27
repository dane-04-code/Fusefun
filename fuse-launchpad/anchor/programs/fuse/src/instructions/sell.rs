use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};
use crate::state::{BondingCurve, UserProfile};
use crate::constants::*;
use crate::errors::FuseError;
use crate::events::TradeEvent;

#[derive(Accounts)]
pub struct Sell<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [SEED, mint.key().as_ref()],
        bump = curve_config.bump,
        constraint = !curve_config.complete @ FuseError::TradingDisabled,
    )]
    pub curve_config: Account<'info, BondingCurve>,

    pub mint: Account<'info, Mint>,

    #[account(
        mut,
        seeds = [b"vault", mint.key().as_ref()],
        bump,
        token::mint = mint,
        token::authority = curve_config,
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        token::mint = mint,
        token::authority = user,
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    /// CHECK: Treasury wallet - validated by protocol
    #[account(mut)]
    pub treasury: AccountInfo<'info>,

    // REFERRAL ACCOUNTS
    #[account(
        mut,
        seeds = [USER_SEED, user.key().as_ref()],
        bump,
    )]
    pub user_profile: Option<Account<'info, UserProfile>>,

    #[account(mut)]
    pub referrer_profile: Option<Account<'info, UserProfile>>,

    /// CHECK: Referrer wallet
    #[account(mut)]
    pub referrer_wallet: Option<AccountInfo<'info>>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<Sell>, amount_in: u64, min_sol_out: u64) -> Result<()> {
    let curve_config = &mut ctx.accounts.curve_config;
    let clock = Clock::get()?;

    // =====================
    // BONDING CURVE MATH (Inverse)
    // =====================
    // sol_out = (virtual_sol_reserves * amount_in) / (virtual_token_reserves + amount_in)
    let sol_out = (curve_config.virtual_sol_reserves as u128)
        .checked_mul(amount_in as u128)
        .ok_or(FuseError::MathOverflow)?
        .checked_div(
            (curve_config.virtual_token_reserves as u128)
                .checked_add(amount_in as u128)
                .ok_or(FuseError::MathOverflow)?
        )
        .ok_or(FuseError::MathOverflow)? as u64;

    // Ensure we have enough SOL in the curve
    require!(
        curve_config.real_sol_reserves >= sol_out,
        FuseError::InsufficientLiquidity
    );

    // =====================
    // CALCULATE FEES (1%)
    // =====================
    let total_fee = sol_out
        .checked_mul(FEE_BASIS_POINTS)
        .ok_or(FuseError::MathOverflow)?
        .checked_div(10000)
        .ok_or(FuseError::MathOverflow)?;

    let protocol_fee = total_fee
        .checked_mul(PROTOCOL_FEE_SHARE)
        .ok_or(FuseError::MathOverflow)?
        .checked_div(100)
        .ok_or(FuseError::MathOverflow)?;

    let creator_fee = total_fee
        .checked_sub(protocol_fee)
        .ok_or(FuseError::MathOverflow)?;

    let user_receives = sol_out
        .checked_sub(total_fee)
        .ok_or(FuseError::MathOverflow)?;

    // =====================
    // SLIPPAGE CHECK
    // =====================
    require!(user_receives >= min_sol_out, FuseError::SlippageExceeded);

    // =====================
    // UPDATE RESERVES
    // =====================
    curve_config.virtual_sol_reserves = curve_config.virtual_sol_reserves
        .checked_sub(sol_out)
        .ok_or(FuseError::MathOverflow)?;
    curve_config.virtual_token_reserves = curve_config.virtual_token_reserves
        .checked_add(amount_in)
        .ok_or(FuseError::MathOverflow)?;
    curve_config.real_sol_reserves = curve_config.real_sol_reserves
        .checked_sub(sol_out)
        .ok_or(FuseError::MathOverflow)?;
    curve_config.real_token_reserves = curve_config.real_token_reserves
        .checked_add(amount_in)
        .ok_or(FuseError::MathOverflow)?;

    // Accumulate creator fee
    curve_config.creator_fee_accumulated = curve_config.creator_fee_accumulated
        .checked_add(creator_fee)
        .ok_or(FuseError::MathOverflow)?;

    // =====================
    // TRANSFER TOKENS FROM USER TO VAULT
    // =====================
    let cpi_context_token = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.user_token_account.to_account_info(),
            to: ctx.accounts.vault.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        },
    );
    token::transfer(cpi_context_token, amount_in)?;

    // Prepare PDA signer
    let mint_key = ctx.accounts.mint.key();
    let seeds = &[SEED, mint_key.as_ref(), &[curve_config.bump]];
    let signer = &[&seeds[..]];

    // =====================
    // TRANSFER SOL TO USER
    // =====================
    **curve_config.to_account_info().try_borrow_mut_lamports()? -= user_receives;
    **ctx.accounts.user.to_account_info().try_borrow_mut_lamports()? += user_receives;

    // =====================
    // TRANSFER PROTOCOL FEE TO TREASURY (AND REFERRER)
    // =====================
    let mut final_protocol_fee = protocol_fee;
    let mut referral_fee = 0;

    // Check for referral
    if let Some(user_profile) = &ctx.accounts.user_profile {
        if let Some(referrer_key) = user_profile.referrer {
            // Validate referrer accounts are passed correctly
            if let Some(referrer_profile) = &ctx.accounts.referrer_profile {
                if let Some(referrer_wallet) = &ctx.accounts.referrer_wallet {
                    if referrer_profile.authority == referrer_key && referrer_wallet.key() == referrer_key {
                        // Calculate 10% of protocol fee
                        referral_fee = protocol_fee / 10;
                        final_protocol_fee = protocol_fee.checked_sub(referral_fee).ok_or(FuseError::MathOverflow)?;

                        // Transfer to referrer (from curve PDA)
                        **curve_config.to_account_info().try_borrow_mut_lamports()? -= referral_fee;
                        **referrer_wallet.try_borrow_mut_lamports()? += referral_fee;
                        
                        // Update referrer stats
                        referrer_profile.total_referral_fees = referrer_profile.total_referral_fees.checked_add(referral_fee).unwrap_or(referrer_profile.total_referral_fees);

                        msg!("Referral fee paid: {} lamports to {}", referral_fee, referrer_key);
                    }
                }
            }
        }
    }

    if final_protocol_fee > 0 {
        **curve_config.to_account_info().try_borrow_mut_lamports()? -= final_protocol_fee;
        **ctx.accounts.treasury.try_borrow_mut_lamports()? += final_protocol_fee;
    }

    // Note: Creator fee stays in curve account (accounted for in creator_fee_accumulated)

    // =====================
    // CALCULATE MARKET CAP
    // =====================
    let current_price = calculate_current_price(
        curve_config.virtual_sol_reserves,
        curve_config.virtual_token_reserves,
    );
    let market_cap = (TOTAL_SUPPLY as u128)
        .checked_mul(current_price as u128)
        .ok_or(FuseError::MathOverflow)?
        .checked_div(1_000_000)
        .ok_or(FuseError::MathOverflow)? as u64;

    // =====================
    // EMIT TRADE EVENT
    // =====================
    emit!(TradeEvent {
        mint: ctx.accounts.mint.key(),
        user: ctx.accounts.user.key(),
        is_buy: false,
        sol_amount: sol_out,
        token_amount: amount_in,
        price: current_price,
        virtual_sol_reserves: curve_config.virtual_sol_reserves,
        virtual_token_reserves: curve_config.virtual_token_reserves,
        real_sol_reserves: curve_config.real_sol_reserves,
        market_cap_lamports: market_cap,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Calculate current price in lamports per token (scaled by 1e6 for precision)
fn calculate_current_price(virtual_sol: u64, virtual_tokens: u64) -> u64 {
    ((virtual_sol as u128) * 1_000_000 / (virtual_tokens as u128)) as u64
}
