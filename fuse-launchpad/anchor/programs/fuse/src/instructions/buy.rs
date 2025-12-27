use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};
use anchor_lang::system_program::{transfer, Transfer as SolTransfer};
use crate::state::{BondingCurve, UserProfile};
use crate::constants::*;
use crate::errors::FuseError;
use crate::events::{TradeEvent, GraduationTriggered};

#[derive(Accounts)]
pub struct Buy<'info> {
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

pub fn handler(ctx: Context<Buy>, amount_in: u64, min_tokens_out: u64) -> Result<()> {
    let curve_config = &mut ctx.accounts.curve_config;
    let clock = Clock::get()?;

    // =====================
    // SNIPER PROTECTION
    // =====================
    let time_since_launch = clock.unix_timestamp - curve_config.launch_timestamp;
    if time_since_launch < SNIPER_PROTECTION_DURATION {
        require!(
            amount_in <= SNIPER_MAX_BUY_LAMPORTS,
            FuseError::SniperLimitExceeded
        );
    }

    // =====================
    // CALCULATE FEES (1%)
    // =====================
    let total_fee = amount_in
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

    let net_amount = amount_in
        .checked_sub(total_fee)
        .ok_or(FuseError::MathOverflow)?;

    // =====================
    // BONDING CURVE MATH
    // =====================
    // tokens_out = (virtual_token_reserves * net_amount) / (virtual_sol_reserves + net_amount)
    let tokens_out = (curve_config.virtual_token_reserves as u128)
        .checked_mul(net_amount as u128)
        .ok_or(FuseError::MathOverflow)?
        .checked_div(
            (curve_config.virtual_sol_reserves as u128)
                .checked_add(net_amount as u128)
                .ok_or(FuseError::MathOverflow)?
        )
        .ok_or(FuseError::MathOverflow)? as u64;

    // =====================
    // SLIPPAGE CHECK
    // =====================
    require!(tokens_out >= min_tokens_out, FuseError::MinTokensNotMet);

    // Ensure we have enough tokens in the vault
    require!(
        curve_config.real_token_reserves >= tokens_out,
        FuseError::InsufficientLiquidity
    );

    // =====================
    // UPDATE RESERVES
    // =====================
    curve_config.virtual_sol_reserves = curve_config.virtual_sol_reserves
        .checked_add(net_amount)
        .ok_or(FuseError::MathOverflow)?;
    curve_config.virtual_token_reserves = curve_config.virtual_token_reserves
        .checked_sub(tokens_out)
        .ok_or(FuseError::MathOverflow)?;
    curve_config.real_sol_reserves = curve_config.real_sol_reserves
        .checked_add(net_amount)
        .ok_or(FuseError::MathOverflow)?;
    curve_config.real_token_reserves = curve_config.real_token_reserves
        .checked_sub(tokens_out)
        .ok_or(FuseError::MathOverflow)?;

    // Accumulate creator fee
    curve_config.creator_fee_accumulated = curve_config.creator_fee_accumulated
        .checked_add(creator_fee)
        .ok_or(FuseError::MathOverflow)?;

    // =====================
    // TRANSFER PROTOCOL FEE TO TREASURY (AND REFERRER)
    // =====================
    let mut final_protocol_fee = protocol_fee;
    let mut referral_fee = 0;

    // Determine the referrer key
    let mut active_referrer = None;
    let mut should_bind_referrer = false;

    // 1. Check if user is already bound to a referrer
    if let Some(user_profile) = &ctx.accounts.user_profile {
        if let Some(stored_ref) = user_profile.referrer {
            active_referrer = Some(stored_ref);
        }
    }

    // 2. If not bound, check if a valid referrer is provided in accounts
    if active_referrer.is_none() {
        if let Some(referrer_profile) = &ctx.accounts.referrer_profile {
            // Use the authority from the provided profile
            active_referrer = Some(referrer_profile.authority);
            should_bind_referrer = true;
        }
    }

    // 3. Process Referral
    if let Some(referrer_key) = active_referrer {
        // We need both the profile and the wallet to be present and match the key
        if let Some(referrer_profile) = &mut ctx.accounts.referrer_profile {
            if let Some(referrer_wallet) = &ctx.accounts.referrer_wallet {
                
                // Validate that the provided accounts match the active referrer key
                if referrer_profile.authority == referrer_key && referrer_wallet.key() == referrer_key {
                    
                    // Bind the user if needed (and if they have a profile)
                    if should_bind_referrer {
                        if let Some(user_profile) = &mut ctx.accounts.user_profile {
                            if user_profile.referrer.is_none() {
                                user_profile.referrer = Some(referrer_key);
                                // Increment referral count for the referrer
                                referrer_profile.referral_count = referrer_profile.referral_count.checked_add(1).unwrap_or(referrer_profile.referral_count);
                            }
                        }
                    }

                    // Calculate 10% of protocol fee
                    referral_fee = protocol_fee / 10;
                    final_protocol_fee = protocol_fee.checked_sub(referral_fee).ok_or(FuseError::MathOverflow)?;

                    // Transfer to referrer
                    let referrer_transfer = SolTransfer {
                        from: ctx.accounts.user.to_account_info(),
                        to: referrer_wallet.to_account_info(),
                    };
                    let referrer_ctx = CpiContext::new(
                        ctx.accounts.system_program.to_account_info(),
                        referrer_transfer,
                    );
                    transfer(referrer_ctx, referral_fee)?;
                    
                    // Update referrer stats
                    referrer_profile.total_referral_fees = referrer_profile.total_referral_fees.checked_add(referral_fee).unwrap_or(referrer_profile.total_referral_fees);
                    
                    msg!("Referral fee paid: {} lamports to {}", referral_fee, referrer_key);
                }
            }
        }
    }

    if final_protocol_fee > 0 {
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            SolTransfer {
                from: ctx.accounts.user.to_account_info(),
                to: ctx.accounts.treasury.to_account_info(),
            },
        );
        transfer(cpi_context, final_protocol_fee)?;
    }

    // =====================
    // TRANSFER SOL TO CURVE (net + creator fee)
    // =====================
    let amount_to_curve = net_amount.checked_add(creator_fee).ok_or(FuseError::MathOverflow)?;
    let cpi_context_sol = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        SolTransfer {
            from: ctx.accounts.user.to_account_info(),
            to: curve_config.to_account_info(),
        },
    );
    transfer(cpi_context_sol, amount_to_curve)?;

    // =====================
    // TRANSFER TOKENS TO USER
    // =====================
    let mint_key = ctx.accounts.mint.key();
    let seeds = &[SEED, mint_key.as_ref(), &[curve_config.bump]];
    let signer = &[&seeds[..]];

    let cpi_context_token = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.vault.to_account_info(),
            to: ctx.accounts.user_token_account.to_account_info(),
            authority: curve_config.to_account_info(),
        },
        signer,
    );
    token::transfer(cpi_context_token, tokens_out)?;

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
        .checked_div(1_000_000) // Adjust for token decimals
        .ok_or(FuseError::MathOverflow)? as u64;

    // =====================
    // CHECK GRADUATION THRESHOLD
    // =====================
    if curve_config.real_sol_reserves >= GRADUATION_SOL_THRESHOLD && !curve_config.complete {
        emit!(GraduationTriggered {
            mint: ctx.accounts.mint.key(),
            real_sol_reserves: curve_config.real_sol_reserves,
            market_cap,
            timestamp: clock.unix_timestamp,
        });
        msg!("🎓 GRADUATION THRESHOLD REACHED! Ready for migration.");
    }

    // =====================
    // EMIT TRADE EVENT
    // =====================
    emit!(TradeEvent {
        mint: ctx.accounts.mint.key(),
        user: ctx.accounts.user.key(),
        is_buy: true,
        sol_amount: net_amount,
        token_amount: tokens_out,
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
    // price = virtual_sol / virtual_tokens * 1_000_000 (for precision)
    ((virtual_sol as u128) * 1_000_000 / (virtual_tokens as u128)) as u64
}
