use anchor_lang::prelude::*;

/// Meteora Dynamic AMM Program ID (Mainnet)
/// Dynamic AMM is a constant product AMM with dynamic vault integration
pub mod dynamic_amm {
    use super::*;
    declare_id!("Eo7WjKq67rjJQSZxS6z3YkapzY3eMj6Xy8X5EQVn5UaB");
}

/// Meteora Dynamic Vault Program ID (Mainnet)
/// The vault program manages liquidity deposits with lending integrations
pub mod dynamic_vault {
    use super::*;
    declare_id!("24Uqj9JCLxUeoC3hGfh5W3s9FM9uCHDS2SG3LYwBpyTi");
}

/// Metaplex Token Metadata Program ID
pub mod mpl_token_metadata {
    use super::*;
    declare_id!("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
}

// ============================================
// INSTRUCTION DISCRIMINATORS
// ============================================
// These are the 8-byte Anchor discriminators for Meteora Dynamic AMM instructions

/// Discriminator for `initialize_customizable_permissionless_constant_product_pool`
/// Uses sighash of instruction name
pub const INIT_POOL_DISCRIMINATOR: [u8; 8] = [0x2f, 0x48, 0x59, 0x40, 0xf8, 0x00, 0x7e, 0x3c];

/// Discriminator for `create_lock_escrow`
pub const CREATE_LOCK_ESCROW_DISCRIMINATOR: [u8; 8] = [0x34, 0x9c, 0x9a, 0x79, 0xe4, 0x27, 0x34, 0x3f];

/// Discriminator for `lock`
pub const LOCK_DISCRIMINATOR: [u8; 8] = [0x65, 0xd2, 0x38, 0xf5, 0xb0, 0x3f, 0x7c, 0x5e];

/// Discriminator for `claim_fee`
pub const CLAIM_FEE_DISCRIMINATOR: [u8; 8] = [0xa9, 0x20, 0x4f, 0x8f, 0x5b, 0x3a, 0x7e, 0x9c];

// ============================================
// CUSTOMIZABLE PARAMS STRUCT
// ============================================
/// Parameters for customizing the pool on creation
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct CustomizableParams {
    /// Trade fee in basis points (e.g. 25 = 0.25%)
    pub trade_fee_bps: u16,
    /// Protocol trade fee in basis points
    pub protocol_trade_fee_bps: u16,
    /// Activation type (0 = slot, 1 = timestamp)
    pub activation_type: u8,
    /// Pool activation point (slot or timestamp)
    pub activation_point: Option<u64>,
    /// Whether the pool has an alpha vault
    pub has_alpha_vault: bool,
    /// Padding for future use
    pub padding: [u8; 90],
}

impl Default for CustomizableParams {
    fn default() -> Self {
        Self {
            trade_fee_bps: 25, // 0.25% trade fee
            protocol_trade_fee_bps: 0,
            activation_type: 0,
            activation_point: None,
            has_alpha_vault: false,
            padding: [0u8; 90],
        }
    }
}

// ============================================
// CPI ACCOUNT STRUCTS
// ============================================

/// Accounts required for `initialize_customizable_permissionless_constant_product_pool`
#[derive(Accounts)]
pub struct InitializeCustomizablePermissionlessPool<'info> {
    /// CHECK: Pool account PDA
    #[account(mut)]
    pub pool: AccountInfo<'info>,
    /// CHECK: LP token mint
    #[account(mut)]
    pub lp_mint: AccountInfo<'info>,
    /// CHECK: Token A mint
    pub token_a_mint: AccountInfo<'info>,
    /// CHECK: Token B mint
    pub token_b_mint: AccountInfo<'info>,
    /// CHECK: Vault for token A
    #[account(mut)]
    pub a_vault: AccountInfo<'info>,
    /// CHECK: Vault for token B
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
    /// CHECK: Payer token A account
    #[account(mut)]
    pub payer_token_a: AccountInfo<'info>,
    /// CHECK: Payer token B account
    #[account(mut)]
    pub payer_token_b: AccountInfo<'info>,
    /// CHECK: Payer LP token account
    #[account(mut)]
    pub payer_pool_lp: AccountInfo<'info>,
    /// CHECK: Protocol fee token A
    #[account(mut)]
    pub protocol_token_a_fee: AccountInfo<'info>,
    /// CHECK: Protocol fee token B
    #[account(mut)]
    pub protocol_token_b_fee: AccountInfo<'info>,
    /// Payer/creator of the pool
    #[account(mut)]
    pub payer: Signer<'info>,
    /// Rent sysvar
    pub rent: Sysvar<'info, Rent>,
    /// CHECK: LP mint metadata PDA
    #[account(mut)]
    pub mint_metadata: AccountInfo<'info>,
    /// CHECK: Metaplex metadata program
    pub metadata_program: AccountInfo<'info>,
    /// CHECK: Dynamic vault program
    pub vault_program: AccountInfo<'info>,
    /// CHECK: Token program
    pub token_program: AccountInfo<'info>,
    /// CHECK: Associated token program
    pub associated_token_program: AccountInfo<'info>,
    /// CHECK: System program
    pub system_program: AccountInfo<'info>,
}

/// Accounts required for `create_lock_escrow`
#[derive(Accounts)]
pub struct CreateLockEscrow<'info> {
    /// CHECK: Pool account
    pub pool: AccountInfo<'info>,
    /// CHECK: Lock escrow PDA to create
    #[account(mut)]
    pub lock_escrow: AccountInfo<'info>,
    /// CHECK: Owner of the lock escrow
    pub owner: AccountInfo<'info>,
    /// CHECK: LP mint
    pub lp_mint: AccountInfo<'info>,
    /// Payer for rent
    #[account(mut)]
    pub payer: Signer<'info>,
    /// CHECK: System program
    pub system_program: AccountInfo<'info>,
}

/// Accounts required for `lock` instruction
#[derive(Accounts)]
pub struct Lock<'info> {
    /// CHECK: Pool account
    pub pool: AccountInfo<'info>,
    /// CHECK: Lock escrow account
    #[account(mut)]
    pub lock_escrow: AccountInfo<'info>,
    /// CHECK: LP mint
    pub lp_mint: AccountInfo<'info>,
    /// Owner (signer who holds LP tokens)
    pub owner: Signer<'info>,
    /// CHECK: Source LP tokens to lock
    #[account(mut)]
    pub source_tokens: AccountInfo<'info>,
    /// CHECK: Escrow vault to receive LP
    #[account(mut)]
    pub escrow_vault: AccountInfo<'info>,
    /// CHECK: Token program
    pub token_program: AccountInfo<'info>,
    /// CHECK: Vault A
    pub a_vault: AccountInfo<'info>,
    /// CHECK: Vault B
    pub b_vault: AccountInfo<'info>,
    /// CHECK: A vault LP mint
    pub a_vault_lp_mint: AccountInfo<'info>,
    /// CHECK: B vault LP mint
    pub b_vault_lp_mint: AccountInfo<'info>,
    /// CHECK: A vault LP
    pub a_vault_lp: AccountInfo<'info>,
    /// CHECK: B vault LP
    pub b_vault_lp: AccountInfo<'info>,
}

/// Accounts required for `claim_fee` instruction
#[derive(Accounts)]
pub struct ClaimFee<'info> {
    /// CHECK: Pool account
    #[account(mut)]
    pub pool: AccountInfo<'info>,
    /// CHECK: LP mint
    #[account(mut)]
    pub lp_mint: AccountInfo<'info>,
    /// CHECK: Lock escrow account
    #[account(mut)]
    pub lock_escrow: AccountInfo<'info>,
    /// Owner of the lock escrow
    pub owner: Signer<'info>,
    /// CHECK: Source tokens (escrow vault, for compatibility)
    pub source_tokens: AccountInfo<'info>,
    /// CHECK: Escrow vault
    #[account(mut)]
    pub escrow_vault: AccountInfo<'info>,
    /// CHECK: Token vault A
    #[account(mut)]
    pub a_token_vault: AccountInfo<'info>,
    /// CHECK: Token vault B
    #[account(mut)]
    pub b_token_vault: AccountInfo<'info>,
    /// CHECK: Vault A
    #[account(mut)]
    pub a_vault: AccountInfo<'info>,
    /// CHECK: Vault B
    #[account(mut)]
    pub b_vault: AccountInfo<'info>,
    /// CHECK: A vault LP
    #[account(mut)]
    pub a_vault_lp: AccountInfo<'info>,
    /// CHECK: B vault LP
    #[account(mut)]
    pub b_vault_lp: AccountInfo<'info>,
    /// CHECK: A vault LP mint
    #[account(mut)]
    pub a_vault_lp_mint: AccountInfo<'info>,
    /// CHECK: B vault LP mint
    #[account(mut)]
    pub b_vault_lp_mint: AccountInfo<'info>,
    /// CHECK: User token A to receive fees
    #[account(mut)]
    pub user_a_token: AccountInfo<'info>,
    /// CHECK: User token B to receive fees
    #[account(mut)]
    pub user_b_token: AccountInfo<'info>,
    /// CHECK: Token program
    pub token_program: AccountInfo<'info>,
    /// CHECK: Vault program
    pub vault_program: AccountInfo<'info>,
}

// ============================================
// CPI FUNCTIONS
// ============================================

/// Initialize a customizable permissionless constant product pool on Meteora Dynamic AMM
pub fn initialize_customizable_pool<'info>(
    ctx: CpiContext<'_, '_, '_, 'info, InitializeCustomizablePermissionlessPool<'info>>,
    token_a_amount: u64,
    token_b_amount: u64,
    params: CustomizableParams,
) -> Result<()> {
    let mut data = INIT_POOL_DISCRIMINATOR.to_vec();
    data.extend_from_slice(&token_a_amount.to_le_bytes());
    data.extend_from_slice(&token_b_amount.to_le_bytes());
    data.extend_from_slice(&params.try_to_vec()?);

    let accounts = vec![
        AccountMeta::new(*ctx.accounts.pool.key, false),
        AccountMeta::new_readonly(*ctx.accounts.token_a_mint.key, false),
        AccountMeta::new_readonly(*ctx.accounts.token_b_mint.key, false),
        AccountMeta::new(*ctx.accounts.a_vault.key, false),
        AccountMeta::new(*ctx.accounts.b_vault.key, false),
        AccountMeta::new(*ctx.accounts.a_token_vault.key, false),
        AccountMeta::new(*ctx.accounts.b_token_vault.key, false),
        AccountMeta::new(*ctx.accounts.a_vault_lp_mint.key, false),
        AccountMeta::new(*ctx.accounts.b_vault_lp_mint.key, false),
        AccountMeta::new(*ctx.accounts.a_vault_lp.key, false),
        AccountMeta::new(*ctx.accounts.b_vault_lp.key, false),
        AccountMeta::new(*ctx.accounts.payer_token_a.key, false),
        AccountMeta::new(*ctx.accounts.payer_token_b.key, false),
        AccountMeta::new(*ctx.accounts.payer_pool_lp.key, false),
        AccountMeta::new(*ctx.accounts.protocol_token_a_fee.key, false),
        AccountMeta::new(*ctx.accounts.protocol_token_b_fee.key, false),
        AccountMeta::new(*ctx.accounts.payer.key, true),
        AccountMeta::new_readonly(*ctx.accounts.rent.to_account_info().key, false),
        AccountMeta::new(*ctx.accounts.mint_metadata.key, false),
        AccountMeta::new_readonly(*ctx.accounts.metadata_program.key, false),
        AccountMeta::new_readonly(*ctx.accounts.vault_program.key, false),
        AccountMeta::new_readonly(*ctx.accounts.token_program.key, false),
        AccountMeta::new_readonly(*ctx.accounts.associated_token_program.key, false),
        AccountMeta::new(*ctx.accounts.lp_mint.key, false),
        AccountMeta::new_readonly(*ctx.accounts.system_program.key, false),
    ];

    let ix = anchor_lang::solana_program::instruction::Instruction {
        program_id: dynamic_amm::ID,
        accounts,
        data,
    };

    anchor_lang::solana_program::program::invoke_signed(
        &ix,
        &[
            ctx.accounts.pool.clone(),
            ctx.accounts.token_a_mint.clone(),
            ctx.accounts.token_b_mint.clone(),
            ctx.accounts.a_vault.clone(),
            ctx.accounts.b_vault.clone(),
            ctx.accounts.a_token_vault.clone(),
            ctx.accounts.b_token_vault.clone(),
            ctx.accounts.a_vault_lp_mint.clone(),
            ctx.accounts.b_vault_lp_mint.clone(),
            ctx.accounts.a_vault_lp.clone(),
            ctx.accounts.b_vault_lp.clone(),
            ctx.accounts.payer_token_a.clone(),
            ctx.accounts.payer_token_b.clone(),
            ctx.accounts.payer_pool_lp.clone(),
            ctx.accounts.protocol_token_a_fee.clone(),
            ctx.accounts.protocol_token_b_fee.clone(),
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.rent.to_account_info(),
            ctx.accounts.mint_metadata.clone(),
            ctx.accounts.metadata_program.clone(),
            ctx.accounts.vault_program.clone(),
            ctx.accounts.token_program.clone(),
            ctx.accounts.associated_token_program.clone(),
            ctx.accounts.lp_mint.clone(),
            ctx.accounts.system_program.clone(),
        ],
        ctx.signer_seeds,
    )?;

    Ok(())
}

/// Create a lock escrow for locked liquidity fee claiming
pub fn create_lock_escrow<'info>(
    ctx: CpiContext<'_, '_, '_, 'info, CreateLockEscrow<'info>>,
) -> Result<()> {
    let data = CREATE_LOCK_ESCROW_DISCRIMINATOR.to_vec();

    let accounts = vec![
        AccountMeta::new_readonly(*ctx.accounts.pool.key, false),
        AccountMeta::new(*ctx.accounts.lock_escrow.key, false),
        AccountMeta::new_readonly(*ctx.accounts.owner.key, false),
        AccountMeta::new_readonly(*ctx.accounts.lp_mint.key, false),
        AccountMeta::new(*ctx.accounts.payer.key, true),
        AccountMeta::new_readonly(*ctx.accounts.system_program.key, false),
    ];

    let ix = anchor_lang::solana_program::instruction::Instruction {
        program_id: dynamic_amm::ID,
        accounts,
        data,
    };

    anchor_lang::solana_program::program::invoke_signed(
        &ix,
        &[
            ctx.accounts.pool.clone(),
            ctx.accounts.lock_escrow.clone(),
            ctx.accounts.owner.clone(),
            ctx.accounts.lp_mint.clone(),
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.system_program.clone(),
        ],
        ctx.signer_seeds,
    )?;

    Ok(())
}

/// Lock LP tokens in escrow for fee claiming
pub fn lock<'info>(
    ctx: CpiContext<'_, '_, '_, 'info, Lock<'info>>,
    lp_amount: u64,
) -> Result<()> {
    let mut data = LOCK_DISCRIMINATOR.to_vec();
    data.extend_from_slice(&lp_amount.to_le_bytes());

    let accounts = vec![
        AccountMeta::new_readonly(*ctx.accounts.pool.key, false),
        AccountMeta::new(*ctx.accounts.lock_escrow.key, false),
        AccountMeta::new_readonly(*ctx.accounts.lp_mint.key, false),
        AccountMeta::new_readonly(*ctx.accounts.owner.key, true),
        AccountMeta::new(*ctx.accounts.source_tokens.key, false),
        AccountMeta::new(*ctx.accounts.escrow_vault.key, false),
        AccountMeta::new_readonly(*ctx.accounts.token_program.key, false),
        AccountMeta::new_readonly(*ctx.accounts.a_vault.key, false),
        AccountMeta::new_readonly(*ctx.accounts.b_vault.key, false),
        AccountMeta::new_readonly(*ctx.accounts.a_vault_lp_mint.key, false),
        AccountMeta::new_readonly(*ctx.accounts.b_vault_lp_mint.key, false),
        AccountMeta::new_readonly(*ctx.accounts.a_vault_lp.key, false),
        AccountMeta::new_readonly(*ctx.accounts.b_vault_lp.key, false),
    ];

    let ix = anchor_lang::solana_program::instruction::Instruction {
        program_id: dynamic_amm::ID,
        accounts,
        data,
    };

    anchor_lang::solana_program::program::invoke_signed(
        &ix,
        &[
            ctx.accounts.pool.clone(),
            ctx.accounts.lock_escrow.clone(),
            ctx.accounts.lp_mint.clone(),
            ctx.accounts.owner.to_account_info(),
            ctx.accounts.source_tokens.clone(),
            ctx.accounts.escrow_vault.clone(),
            ctx.accounts.token_program.clone(),
            ctx.accounts.a_vault.clone(),
            ctx.accounts.b_vault.clone(),
            ctx.accounts.a_vault_lp_mint.clone(),
            ctx.accounts.b_vault_lp_mint.clone(),
            ctx.accounts.a_vault_lp.clone(),
            ctx.accounts.b_vault_lp.clone(),
        ],
        ctx.signer_seeds,
    )?;

    Ok(())
}

/// Claim accumulated trading fees from locked liquidity
pub fn claim_fee<'info>(
    ctx: CpiContext<'_, '_, '_, 'info, ClaimFee<'info>>,
    max_amount: u64,
) -> Result<()> {
    let mut data = CLAIM_FEE_DISCRIMINATOR.to_vec();
    data.extend_from_slice(&max_amount.to_le_bytes());

    let accounts = vec![
        AccountMeta::new(*ctx.accounts.pool.key, false),
        AccountMeta::new(*ctx.accounts.lp_mint.key, false),
        AccountMeta::new(*ctx.accounts.lock_escrow.key, false),
        AccountMeta::new_readonly(*ctx.accounts.owner.key, true),
        AccountMeta::new_readonly(*ctx.accounts.source_tokens.key, false),
        AccountMeta::new(*ctx.accounts.a_vault.key, false),
        AccountMeta::new(*ctx.accounts.b_vault.key, false),
        AccountMeta::new(*ctx.accounts.a_vault_lp.key, false),
        AccountMeta::new(*ctx.accounts.b_vault_lp.key, false),
        AccountMeta::new(*ctx.accounts.a_vault_lp_mint.key, false),
        AccountMeta::new(*ctx.accounts.b_vault_lp_mint.key, false),
        AccountMeta::new(*ctx.accounts.user_a_token.key, false),
        AccountMeta::new(*ctx.accounts.user_b_token.key, false),
        AccountMeta::new_readonly(*ctx.accounts.vault_program.key, false),
        AccountMeta::new(*ctx.accounts.escrow_vault.key, false),
        AccountMeta::new_readonly(*ctx.accounts.token_program.key, false),
        AccountMeta::new(*ctx.accounts.a_token_vault.key, false),
        AccountMeta::new(*ctx.accounts.b_token_vault.key, false),
    ];

    let ix = anchor_lang::solana_program::instruction::Instruction {
        program_id: dynamic_amm::ID,
        accounts,
        data,
    };

    anchor_lang::solana_program::program::invoke_signed(
        &ix,
        &[
            ctx.accounts.pool.clone(),
            ctx.accounts.lp_mint.clone(),
            ctx.accounts.lock_escrow.clone(),
            ctx.accounts.owner.to_account_info(),
            ctx.accounts.source_tokens.clone(),
            ctx.accounts.a_vault.clone(),
            ctx.accounts.b_vault.clone(),
            ctx.accounts.a_vault_lp.clone(),
            ctx.accounts.b_vault_lp.clone(),
            ctx.accounts.a_vault_lp_mint.clone(),
            ctx.accounts.b_vault_lp_mint.clone(),
            ctx.accounts.user_a_token.clone(),
            ctx.accounts.user_b_token.clone(),
            ctx.accounts.vault_program.clone(),
            ctx.accounts.escrow_vault.clone(),
            ctx.accounts.token_program.clone(),
            ctx.accounts.a_token_vault.clone(),
            ctx.accounts.b_token_vault.clone(),
        ],
        ctx.signer_seeds,
    )?;

    Ok(())
}
