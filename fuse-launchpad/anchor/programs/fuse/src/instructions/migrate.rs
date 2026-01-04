use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer, Burn};
use crate::state::BondingCurve;
use crate::constants::*;
use crate::errors::FuseError;
use crate::events::CurveCompleted;
use crate::raydium_interface::{self, Initialize2};

/// Migrate - Graduates the token from bonding curve to a DEX
/// 
/// This instruction:
/// 1. Validates graduation threshold is reached
/// 2. Pays out accumulated creator fees
/// 3. Transfers remaining SOL + Tokens to migration authority
/// 4. Burns unsold tokens (optional)
/// 5. Marks curve as complete
#[derive(Accounts)]
pub struct Migrate<'info> {
    /// Migration authority (could be protocol admin or automated keeper)
    #[account(mut)]
    pub migration_authority: Signer<'info>,

    #[account(
        mut,
        seeds = [SEED, mint.key().as_ref()],
        bump = curve_config.bump,
        constraint = !curve_config.complete @ FuseError::CurveAlreadyMigrated,
    )]
    pub curve_config: Account<'info, BondingCurve>,

    #[account(mut)]
    pub mint: Account<'info, Mint>,

    #[account(
        mut,
        seeds = [b"vault", mint.key().as_ref()],
        bump,
        token::mint = mint,
        token::authority = curve_config,
    )]
    pub vault: Account<'info, TokenAccount>,

    /// Where the liquidity tokens go (for DEX LP creation)
    #[account(mut)]
    pub migration_token_account: Account<'info, TokenAccount>,

    /// CHECK: The creator who receives the accumulated fees. Must match curve_config.creator.
    #[account(mut, address = curve_config.creator @ FuseError::Unauthorized)]
    pub creator: AccountInfo<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,

    // ====================================================
    // OPTIONAL: RAYDIUM ACCOUNTS (Uncomment to enable CPI)
    // ====================================================
    // /// CHECK: Raydium Program ID
    // pub raydium_program: AccountInfo<'info>,
    // /// CHECK: Raydium AMM ID
    // #[account(mut)]
    // pub amm: AccountInfo<'info>,
    // /// CHECK: Raydium AMM Authority
    // #[account(mut)]
    // pub amm_authority: AccountInfo<'info>,
    // /// CHECK: Raydium Open Orders
    // #[account(mut)]
    // pub amm_open_orders: AccountInfo<'info>,
    // /// CHECK: Raydium LP Mint
    // #[account(mut)]
    // pub lp_mint: AccountInfo<'info>,
    // /// CHECK: Raydium Coin Mint
    // pub coin_mint: AccountInfo<'info>,
    // /// CHECK: Raydium PC Mint
    // pub pc_mint: AccountInfo<'info>,
    // /// CHECK: Raydium Pool Coin Token Account
    // #[account(mut)]
    // pub pool_coin_token_account: AccountInfo<'info>,
    // /// CHECK: Raydium Pool PC Token Account
    // #[account(mut)]
    // pub pool_pc_token_account: AccountInfo<'info>,
    // /// CHECK: Raydium Pool Withdraw Queue
    // #[account(mut)]
    // pub pool_withdraw_queue: AccountInfo<'info>,
    // /// CHECK: Raydium AMM Target Orders
    // #[account(mut)]
    // pub amm_target_orders: AccountInfo<'info>,
    // /// CHECK: Raydium Pool Temp LP
    // #[account(mut)]
    // pub pool_temp_lp: AccountInfo<'info>,
    // /// CHECK: OpenBook Program
    // pub open_book_program: AccountInfo<'info>,
    // /// CHECK: OpenBook Market
    // pub open_book_market: AccountInfo<'info>,
    // /// CHECK: User Wallet (Curve Config Authority)
    // #[account(mut)]
    // pub user_wallet: AccountInfo<'info>,
    // /// CHECK: User Token Coin
    // #[account(mut)]
    // pub user_token_coin: AccountInfo<'info>,
    // /// CHECK: User Token PC
    // #[account(mut)]
    // pub user_token_pc: AccountInfo<'info>,
    // /// CHECK: User LP Token
    // #[account(mut)]
    // pub user_lp_token: AccountInfo<'info>,
}

pub fn handler(ctx: Context<Migrate>) -> Result<()> {
    let curve_config = &mut ctx.accounts.curve_config;
    let clock = Clock::get()?;

    // =====================
    // VALIDATE GRADUATION THRESHOLD
    // =====================
    require!(
        curve_config.real_sol_reserves >= GRADUATION_SOL_THRESHOLD,
        FuseError::GraduationNotReached
    );

    let mint_key = ctx.accounts.mint.key();
    let seeds = &[SEED, mint_key.as_ref(), &[curve_config.bump]];
    let signer = &[&seeds[..]];

    // =====================
    // 1. PAY CREATOR FEES
    // =====================
    let creator_fees = curve_config.creator_fee_accumulated;
    if creator_fees > 0 {
        **curve_config.to_account_info().try_borrow_mut_lamports()? -= creator_fees;
        **ctx.accounts.creator.try_borrow_mut_lamports()? += creator_fees;
        
        msg!("Creator Paid: {}", creator_fees);
        curve_config.creator_fee_accumulated = 0;
    }

    // =====================
    // 2. TRANSFER SOL LIQUIDITY
    // =====================
    let curve_lamports = curve_config.to_account_info().lamports();
    let rent_exempt = Rent::get()?.minimum_balance(curve_config.to_account_info().data_len());
    let sol_to_transfer = curve_lamports.saturating_sub(rent_exempt);

    if sol_to_transfer > 0 {
        **curve_config.to_account_info().try_borrow_mut_lamports()? -= sol_to_transfer;
        **ctx.accounts.migration_authority.to_account_info().try_borrow_mut_lamports()? += sol_to_transfer;
        
        msg!("SOL Liq: {}", sol_to_transfer);
    }

    // =====================
    // 3. TRANSFER TOKEN LIQUIDITY
    // =====================
    let tokens_in_vault = ctx.accounts.vault.amount;
    
    // Calculate how many tokens should go to LP vs burn
    // Typically: 20% of remaining tokens go to LP, 80% burned (or all to LP - design choice)
    let tokens_for_lp = tokens_in_vault; // Sending all remaining to LP
    
    if tokens_for_lp > 0 {
        let transfer_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.vault.to_account_info(),
                to: ctx.accounts.migration_token_account.to_account_info(),
                authority: curve_config.to_account_info(),
            },
            signer,
        );
        token::transfer(transfer_ctx, tokens_for_lp)?;
        
        msg!("Token Liq: {}", tokens_for_lp);
    }

    // =====================
    // 4. RAYDIUM CPI (Optional)
    // =====================
    // To enable Raydium CPI, uncomment the accounts in the struct and the code below.
    // Note: This requires the OpenBook market to be created beforehand.
    /*
    let cpi_accounts = Initialize2 {
        token_program: ctx.accounts.token_program.to_account_info(),
        system_program: ctx.accounts.system_program.to_account_info(),
        rent: ctx.accounts.rent.to_account_info(),
        amm: ctx.accounts.amm.to_account_info(),
        amm_authority: ctx.accounts.amm_authority.to_account_info(),
        amm_open_orders: ctx.accounts.amm_open_orders.to_account_info(),
        lp_mint: ctx.accounts.lp_mint.to_account_info(),
        coin_mint: ctx.accounts.coin_mint.to_account_info(),
        pc_mint: ctx.accounts.pc_mint.to_account_info(),
        pool_coin_token_account: ctx.accounts.pool_coin_token_account.to_account_info(),
        pool_pc_token_account: ctx.accounts.pool_pc_token_account.to_account_info(),
        pool_withdraw_queue: ctx.accounts.pool_withdraw_queue.to_account_info(),
        amm_target_orders: ctx.accounts.amm_target_orders.to_account_info(),
        pool_temp_lp: ctx.accounts.pool_temp_lp.to_account_info(),
        open_book_program: ctx.accounts.open_book_program.to_account_info(),
        open_book_market: ctx.accounts.open_book_market.to_account_info(),
        user_wallet: ctx.accounts.curve_config.to_account_info(), // Curve is the user/authority
        user_token_coin: ctx.accounts.vault.to_account_info(),
        user_token_pc: ctx.accounts.curve_config.to_account_info(), // Curve holds SOL (needs wrapping)
        user_lp_token: ctx.accounts.migration_token_account.to_account_info(), // Where LP tokens go
    };
    
    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.raydium_program.to_account_info(),
        cpi_accounts,
        signer
    );

    raydium_interface::initialize2(
        cpi_ctx,
        255, // nonce
        clock.unix_timestamp as u64, // open_time
        sol_to_transfer, // init_pc_amount
        tokens_for_lp, // init_coin_amount
    )?;
    */

    // =====================
    // 5. MARK CURVE COMPLETE
    // =====================
    curve_config.complete = true;
    curve_config.real_sol_reserves = 0;
    curve_config.real_token_reserves = 0;

    // =====================
    // 6. EMIT GRADUATION EVENT
    // =====================
    let final_market_cap = calculate_market_cap(
        curve_config.virtual_sol_reserves,
        curve_config.virtual_token_reserves,
    );

    emit!(CurveCompleted {
        mint: ctx.accounts.mint.key(),
        migration_authority: ctx.accounts.migration_authority.key(),
        final_market_cap,
        total_sol_raised: sol_to_transfer,
        creator_payout: creator_fees,
        timestamp: clock.unix_timestamp,
    });

    msg!("GRADUATED!");

    Ok(())
}

fn calculate_market_cap(virtual_sol: u64, virtual_tokens: u64) -> u64 {
    let price = ((virtual_sol as u128) * 1_000_000 / (virtual_tokens as u128)) as u64;
    ((TOTAL_SUPPLY as u128) * (price as u128) / 1_000_000) as u64
}
