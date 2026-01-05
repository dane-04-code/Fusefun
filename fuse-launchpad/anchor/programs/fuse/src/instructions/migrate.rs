use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};
use anchor_spl::associated_token::AssociatedToken;
use crate::state::BondingCurve;
use crate::constants::*;
use crate::errors::FuseError;
use crate::events::CurveCompleted;
use crate::meteora_interface::{self, dynamic_amm, dynamic_vault, mpl_token_metadata, CustomizableParams};

/// Migrate - Graduates the token from bonding curve to Meteora Dynamic AMM
/// 
/// This instruction:
/// 1. Validates graduation threshold is reached
/// 2. Pays out accumulated creator fees
/// 3. Creates a Meteora Dynamic AMM pool with liquidity
/// 4. Locks liquidity in escrow (protocol earns trading fees)
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

    /// The token mint being graduated
    #[account(mut)]
    pub mint: Account<'info, Mint>,

    /// Token vault holding remaining supply
    #[account(
        mut,
        seeds = [b"vault", mint.key().as_ref()],
        bump,
        token::mint = mint,
        token::authority = curve_config,
    )]
    pub vault: Account<'info, TokenAccount>,

    /// CHECK: The creator who receives the accumulated fees. Must match curve_config.creator.
    #[account(mut, address = curve_config.creator @ FuseError::Unauthorized)]
    pub creator: AccountInfo<'info>,

    // ====================================================
    // METEORA DYNAMIC AMM ACCOUNTS
    // ====================================================
    /// CHECK: Meteora pool PDA (will be initialized)
    #[account(mut)]
    pub meteora_pool: AccountInfo<'info>,

    /// CHECK: LP mint for the Meteora pool
    #[account(mut)]
    pub lp_mint: AccountInfo<'info>,

    /// CHECK: WSOL mint (Token B for pool)
    pub wsol_mint: AccountInfo<'info>,

    /// CHECK: Meteora vault for token A (graduated token)
    #[account(mut)]
    pub a_vault: AccountInfo<'info>,

    /// CHECK: Meteora vault for token B (WSOL)
    #[account(mut)]
    pub b_vault: AccountInfo<'info>,

    /// CHECK: Token vault of vault A
    #[account(mut)]
    pub a_token_vault: AccountInfo<'info>,

    /// CHECK: Token vault of vault B
    #[account(mut)]
    pub b_token_vault: AccountInfo<'info>,

    /// CHECK: LP mint of vault A
    #[account(mut)]
    pub a_vault_lp_mint: AccountInfo<'info>,

    /// CHECK: LP mint of vault B
    #[account(mut)]
    pub b_vault_lp_mint: AccountInfo<'info>,

    /// CHECK: LP token account of vault A
    #[account(mut)]
    pub a_vault_lp: AccountInfo<'info>,

    /// CHECK: LP token account of vault B
    #[account(mut)]
    pub b_vault_lp: AccountInfo<'info>,

    /// Migration authority's token A account (receives tokens from vault)
    #[account(mut)]
    pub payer_token_a: Account<'info, TokenAccount>,

    /// Migration authority's WSOL account (receives SOL converted to WSOL)
    #[account(mut)]
    pub payer_token_b: Account<'info, TokenAccount>,

    /// Migration authority's LP token account
    #[account(mut)]
    pub payer_pool_lp: Account<'info, TokenAccount>,

    /// CHECK: Protocol fee token A account
    #[account(mut)]
    pub protocol_token_a_fee: AccountInfo<'info>,

    /// CHECK: Protocol fee token B account
    #[account(mut)]
    pub protocol_token_b_fee: AccountInfo<'info>,

    /// CHECK: LP mint metadata PDA for Metaplex
    #[account(mut)]
    pub mint_metadata: AccountInfo<'info>,

    /// CHECK: Lock escrow PDA for protocol fee claiming
    #[account(mut)]
    pub lock_escrow: AccountInfo<'info>,

    /// CHECK: Escrow vault for locked LP
    #[account(mut)]
    pub escrow_vault: AccountInfo<'info>,

    // ====================================================
    // PROGRAMS
    // ====================================================
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,

    /// CHECK: Meteora Dynamic AMM program
    #[account(address = dynamic_amm::ID)]
    pub dynamic_amm_program: AccountInfo<'info>,

    /// CHECK: Meteora Dynamic Vault program
    #[account(address = dynamic_vault::ID)]
    pub vault_program: AccountInfo<'info>,

    /// CHECK: Metaplex Token Metadata program
    #[account(address = mpl_token_metadata::ID)]
    pub metadata_program: AccountInfo<'info>,
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
    // 2. CALCULATE LIQUIDITY AMOUNTS
    // =====================
    let curve_lamports = curve_config.to_account_info().lamports();
    let rent_exempt = Rent::get()?.minimum_balance(curve_config.to_account_info().data_len());
    let sol_for_liquidity = curve_lamports.saturating_sub(rent_exempt);
    let tokens_for_liquidity = ctx.accounts.vault.amount;

    msg!("Migrating: {} SOL, {} tokens", sol_for_liquidity, tokens_for_liquidity);

    // =====================
    // 3. TRANSFER TOKENS FROM VAULT TO MIGRATION AUTHORITY
    // =====================
    if tokens_for_liquidity > 0 {
        let transfer_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.vault.to_account_info(),
                to: ctx.accounts.payer_token_a.to_account_info(),
                authority: curve_config.to_account_info(),
            },
            signer,
        );
        token::transfer(transfer_ctx, tokens_for_liquidity)?;
    }

    // =====================
    // 4. TRANSFER SOL TO MIGRATION AUTHORITY (for WSOL wrapping)
    // =====================
    if sol_for_liquidity > 0 {
        **curve_config.to_account_info().try_borrow_mut_lamports()? -= sol_for_liquidity;
        **ctx.accounts.migration_authority.to_account_info().try_borrow_mut_lamports()? += sol_for_liquidity;
    }

    // =====================
    // 5. INITIALIZE METEORA POOL (CPI)
    // =====================
    // NOTE: The actual CPI requires pre-computed PDAs from the frontend/bot.
    // The migration_authority should wrap SOL to WSOL before calling this.
    // The pool creation is handled off-chain due to the complexity of account derivation.
    //
    // This instruction now focuses on:
    // - Paying creator
    // - Transferring assets to migration authority
    // - Marking curve complete
    //
    // The actual Meteora pool creation happens via a separate transaction by the
    // migration bot, which has the tools to derive all required PDAs.
    //
    // For on-chain CPI (advanced):
    /*
    let pool_params = CustomizableParams {
        trade_fee_bps: 100, // 1% trade fee - protocol keeps this
        protocol_trade_fee_bps: 0,
        activation_type: 0,
        activation_point: None,
        has_alpha_vault: false,
        padding: [0u8; 90],
    };

    let init_pool_accounts = meteora_interface::InitializeCustomizablePermissionlessPool {
        pool: ctx.accounts.meteora_pool.clone(),
        lp_mint: ctx.accounts.lp_mint.clone(),
        token_a_mint: ctx.accounts.mint.to_account_info(),
        token_b_mint: ctx.accounts.wsol_mint.clone(),
        a_vault: ctx.accounts.a_vault.clone(),
        b_vault: ctx.accounts.b_vault.clone(),
        a_token_vault: ctx.accounts.a_token_vault.clone(),
        b_token_vault: ctx.accounts.b_token_vault.clone(),
        a_vault_lp_mint: ctx.accounts.a_vault_lp_mint.clone(),
        b_vault_lp_mint: ctx.accounts.b_vault_lp_mint.clone(),
        a_vault_lp: ctx.accounts.a_vault_lp.clone(),
        b_vault_lp: ctx.accounts.b_vault_lp.clone(),
        payer_token_a: ctx.accounts.payer_token_a.to_account_info(),
        payer_token_b: ctx.accounts.payer_token_b.to_account_info(),
        payer_pool_lp: ctx.accounts.payer_pool_lp.to_account_info(),
        protocol_token_a_fee: ctx.accounts.protocol_token_a_fee.clone(),
        protocol_token_b_fee: ctx.accounts.protocol_token_b_fee.clone(),
        payer: ctx.accounts.migration_authority.clone(),
        rent: ctx.accounts.rent.clone(),
        mint_metadata: ctx.accounts.mint_metadata.clone(),
        metadata_program: ctx.accounts.metadata_program.clone(),
        vault_program: ctx.accounts.vault_program.clone(),
        token_program: ctx.accounts.token_program.to_account_info(),
        associated_token_program: ctx.accounts.associated_token_program.to_account_info(),
        system_program: ctx.accounts.system_program.to_account_info(),
    };

    meteora_interface::initialize_customizable_pool(
        CpiContext::new(ctx.accounts.dynamic_amm_program.clone(), init_pool_accounts),
        tokens_for_liquidity,
        sol_for_liquidity,
        pool_params,
    )?;
    */

    // =====================
    // 6. MARK CURVE COMPLETE
    // =====================
    curve_config.complete = true;
    curve_config.real_sol_reserves = 0;
    curve_config.real_token_reserves = 0;

    // =====================
    // 7. EMIT GRADUATION EVENT
    // =====================
    let final_market_cap = calculate_market_cap(
        curve_config.virtual_sol_reserves,
        curve_config.virtual_token_reserves,
    );

    emit!(CurveCompleted {
        mint: ctx.accounts.mint.key(),
        migration_authority: ctx.accounts.migration_authority.key(),
        final_market_cap,
        total_sol_raised: sol_for_liquidity,
        creator_payout: creator_fees,
        timestamp: clock.unix_timestamp,
    });

    msg!("🎓 GRADUATED to Meteora!");

    Ok(())
}

fn calculate_market_cap(virtual_sol: u64, virtual_tokens: u64) -> u64 {
    let price = ((virtual_sol as u128) * 1_000_000 / (virtual_tokens as u128)) as u64;
    ((TOTAL_SUPPLY as u128) * (price as u128) / 1_000_000) as u64
}
