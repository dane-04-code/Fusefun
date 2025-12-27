use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, MintTo};
use anchor_spl::associated_token::AssociatedToken;
use crate::state::BondingCurve;
use crate::constants::*;
use crate::errors::FuseError;
use crate::events::CurveInitialized;

/// CreateToken - The main entry point for launching a new token
/// 
/// This instruction:
/// 1. Creates a new SPL token mint
/// 2. Initializes the bonding curve PDA with virtual reserves
/// 3. Mints the total supply to the curve's vault
/// 4. Optionally performs an initial buy for the creator
#[derive(Accounts)]
#[instruction(name: String, symbol: String, uri: String)]
pub struct CreateToken<'info> {
    /// The creator launching the token (pays for account creation)
    #[account(mut)]
    pub creator: Signer<'info>,

    /// The bonding curve PDA - holds all state for this token
    #[account(
        init,
        payer = creator,
        seeds = [SEED, mint.key().as_ref()],
        bump,
        space = 8 + BondingCurve::INIT_SPACE
    )]
    pub curve: Account<'info, BondingCurve>,

    /// The new token mint (created by this instruction)
    #[account(
        init,
        payer = creator,
        mint::decimals = TOKEN_DECIMALS,
        mint::authority = curve,
        mint::freeze_authority = curve,
    )]
    pub mint: Account<'info, Mint>,

    /// The vault that holds the token supply on the curve
    #[account(
        init,
        payer = creator,
        seeds = [b"vault", mint.key().as_ref()],
        bump,
        token::mint = mint,
        token::authority = curve,
    )]
    pub vault: Account<'info, TokenAccount>,

    /// Creator's token account (for optional initial buy)
    #[account(
        init_if_needed,
        payer = creator,
        associated_token::mint = mint,
        associated_token::authority = creator,
    )]
    pub creator_token_account: Account<'info, TokenAccount>,

    /// Treasury wallet for protocol fees
    /// CHECK: Validated by program logic
    #[account(mut)]
    pub treasury: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

/// Arguments for creating a new token
#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct CreateTokenArgs {
    pub name: String,
    pub symbol: String,
    pub uri: String,
    pub initial_buy_lamports: Option<u64>, // Optional: Creator can buy on launch
}

pub fn handler(
    ctx: Context<CreateToken>,
    name: String,
    symbol: String,
    uri: String,
    initial_buy_lamports: Option<u64>,
) -> Result<()> {
    // =====================
    // VALIDATION
    // =====================
    require!(name.len() <= MAX_NAME_LENGTH, FuseError::NameTooLong);
    require!(symbol.len() <= MAX_SYMBOL_LENGTH, FuseError::SymbolTooLong);
    require!(uri.len() <= MAX_URI_LENGTH, FuseError::UriTooLong);

    let clock = Clock::get()?;
    let curve = &mut ctx.accounts.curve;
    let bump = ctx.bumps.curve;

    // =====================
    // INITIALIZE CURVE STATE
    // =====================
    curve.creator = ctx.accounts.creator.key();
    curve.token_mint = ctx.accounts.mint.key();
    curve.token_total_supply = TOTAL_SUPPLY;
    curve.virtual_sol_reserves = VIRTUAL_SOL_RESERVES;
    curve.virtual_token_reserves = VIRTUAL_TOKEN_RESERVES;
    curve.real_sol_reserves = 0;
    curve.real_token_reserves = REAL_TOKEN_RESERVES;
    curve.complete = false;
    curve.bump = bump;
    curve.creator_fee_accumulated = 0;
    curve.launch_timestamp = clock.unix_timestamp;
    curve.name = name.clone();
    curve.symbol = symbol.clone();
    curve.uri = uri.clone();

    // =====================
    // MINT TOTAL SUPPLY TO VAULT
    // =====================
    let mint_key = ctx.accounts.mint.key();
    let seeds = &[SEED, mint_key.as_ref(), &[bump]];
    let signer_seeds = &[&seeds[..]];

    let mint_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.vault.to_account_info(),
            authority: curve.to_account_info(),
        },
        signer_seeds,
    );
    token::mint_to(mint_ctx, TOTAL_SUPPLY)?;

    msg!("🚀 Token Created: {} ({})", name, symbol);
    msg!("   Mint: {}", ctx.accounts.mint.key());
    msg!("   Curve: {}", curve.key());

    // =====================
    // OPTIONAL: INITIAL BUY
    // =====================
    if let Some(lamports) = initial_buy_lamports {
        if lamports > 0 {
            // Calculate tokens out using bonding curve formula
            let tokens_out = calculate_tokens_out(
                curve.virtual_sol_reserves,
                curve.virtual_token_reserves,
                lamports,
            )?;

            // Update reserves
            curve.virtual_sol_reserves = curve.virtual_sol_reserves
                .checked_add(lamports)
                .ok_or(FuseError::MathOverflow)?;
            curve.virtual_token_reserves = curve.virtual_token_reserves
                .checked_sub(tokens_out)
                .ok_or(FuseError::MathOverflow)?;
            curve.real_sol_reserves = lamports;
            curve.real_token_reserves = curve.real_token_reserves
                .checked_sub(tokens_out)
                .ok_or(FuseError::MathOverflow)?;

            // Transfer SOL from creator to curve
            anchor_lang::system_program::transfer(
                CpiContext::new(
                    ctx.accounts.system_program.to_account_info(),
                    anchor_lang::system_program::Transfer {
                        from: ctx.accounts.creator.to_account_info(),
                        to: curve.to_account_info(),
                    },
                ),
                lamports,
            )?;

            // Transfer tokens to creator
            let transfer_ctx = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.creator_token_account.to_account_info(),
                    authority: curve.to_account_info(),
                },
                signer_seeds,
            );
            token::transfer(transfer_ctx, tokens_out)?;

            msg!("   Initial Buy: {} lamports → {} tokens", lamports, tokens_out);
        }
    }

    // =====================
    // EMIT EVENT
    // =====================
    emit!(CurveInitialized {
        mint: ctx.accounts.mint.key(),
        creator: ctx.accounts.creator.key(),
        name,
        symbol,
        uri,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Calculate tokens out using constant product formula
/// tokens_out = (virtual_token_reserves * sol_in) / (virtual_sol_reserves + sol_in)
fn calculate_tokens_out(
    virtual_sol_reserves: u64,
    virtual_token_reserves: u64,
    sol_in: u64,
) -> Result<u64> {
    let numerator = (virtual_token_reserves as u128)
        .checked_mul(sol_in as u128)
        .ok_or(FuseError::MathOverflow)?;
    
    let denominator = (virtual_sol_reserves as u128)
        .checked_add(sol_in as u128)
        .ok_or(FuseError::MathOverflow)?;
    
    let tokens_out = numerator
        .checked_div(denominator)
        .ok_or(FuseError::MathOverflow)? as u64;
    
    Ok(tokens_out)
}
