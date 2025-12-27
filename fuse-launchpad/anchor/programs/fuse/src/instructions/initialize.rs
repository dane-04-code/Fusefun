use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, MintTo};
use crate::state::BondingCurve;
use crate::constants::*;
use crate::events::CurveInitialized;

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        init,
        payer = creator,
        seeds = [SEED, mint.key().as_ref()],
        bump,
        space = 8 + BondingCurve::INIT_SPACE
    )]
    pub curve_config: Account<'info, BondingCurve>,

    #[account(
        init,
        payer = creator,
        mint::decimals = 6,
        mint::authority = curve_config,
    )]
    pub mint: Account<'info, Mint>,

    #[account(
        init,
        payer = creator,
        seeds = [b"token_vault", mint.key().as_ref()],
        bump,
        token::mint = mint,
        token::authority = curve_config,
    )]
    pub vault: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(ctx: Context<Initialize>, name: String, symbol: String, uri: String) -> Result<()> {
    let curve_config = &mut ctx.accounts.curve_config;
    
    // Set the curve_config values using our constants
    curve_config.creator = ctx.accounts.creator.key();
    curve_config.token_mint = ctx.accounts.mint.key();
    curve_config.token_total_supply = TOTAL_SUPPLY;
    curve_config.virtual_sol_reserves = VIRTUAL_SOL_RESERVES;
    curve_config.virtual_token_reserves = VIRTUAL_TOKEN_RESERVES;
    curve_config.real_sol_reserves = 0;
    curve_config.real_token_reserves = REAL_TOKEN_RESERVES;
    curve_config.complete = false;
    curve_config.creator_fee_accumulated = 0;
    curve_config.bump = ctx.bumps.curve_config;

    // Mint TOTAL_SUPPLY tokens to the vault
    let seeds = &[
        SEED, 
        ctx.accounts.mint.to_account_info().key.as_ref(), 
        &[ctx.bumps.curve_config]
    ];
    let signer = &[&seeds[..]];

    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.vault.to_account_info(),
            authority: ctx.accounts.curve_config.to_account_info(),
        },
        signer
    );

    token::mint_to(cpi_ctx, TOTAL_SUPPLY)?;

    emit!(CurveInitialized {
        mint: ctx.accounts.mint.key(),
        creator: ctx.accounts.creator.key(),
        name,
        symbol,
        uri,
        timestamp: Clock::get()?.unix_timestamp,
    });

    msg!("Curve Initialized");

    Ok(())
}
