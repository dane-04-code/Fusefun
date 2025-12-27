use anchor_lang::prelude::*;

declare_id!("675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8");

#[derive(Accounts)]
pub struct Initialize2<'info> {
    /// CHECK: Safe
    pub token_program: AccountInfo<'info>,
    /// CHECK: Safe
    pub system_program: AccountInfo<'info>,
    /// CHECK: Safe
    pub rent: AccountInfo<'info>,
    /// CHECK: Safe
    #[account(mut)]
    pub amm: AccountInfo<'info>,
    /// CHECK: Safe
    #[account(mut)]
    pub amm_authority: AccountInfo<'info>,
    /// CHECK: Safe
    #[account(mut)]
    pub amm_open_orders: AccountInfo<'info>,
    /// CHECK: Safe
    #[account(mut)]
    pub lp_mint: AccountInfo<'info>,
    /// CHECK: Safe
    pub coin_mint: AccountInfo<'info>,
    /// CHECK: Safe
    pub pc_mint: AccountInfo<'info>,
    /// CHECK: Safe
    #[account(mut)]
    pub pool_coin_token_account: AccountInfo<'info>,
    /// CHECK: Safe
    #[account(mut)]
    pub pool_pc_token_account: AccountInfo<'info>,
    /// CHECK: Safe
    #[account(mut)]
    pub pool_withdraw_queue: AccountInfo<'info>,
    /// CHECK: Safe
    #[account(mut)]
    pub amm_target_orders: AccountInfo<'info>,
    /// CHECK: Safe
    #[account(mut)]
    pub pool_temp_lp: AccountInfo<'info>,
    /// CHECK: Safe
    pub open_book_program: AccountInfo<'info>,
    /// CHECK: Safe
    pub open_book_market: AccountInfo<'info>,
    /// CHECK: Safe
    #[account(mut)]
    pub user_wallet: AccountInfo<'info>,
    /// CHECK: Safe
    #[account(mut)]
    pub user_token_coin: AccountInfo<'info>,
    /// CHECK: Safe
    #[account(mut)]
    pub user_token_pc: AccountInfo<'info>,
    /// CHECK: Safe
    #[account(mut)]
    pub user_lp_token: AccountInfo<'info>,
}

pub fn initialize2<'info>(
    ctx: CpiContext<'_, '_, '_, 'info, Initialize2<'info>>,
    nonce: u8,
    open_time: u64,
    init_pc_amount: u64,
    init_coin_amount: u64,
) -> Result<()> {
    let ix = anchor_lang::solana_program::instruction::Instruction {
        program_id: *ctx.program.key,
        accounts: vec![
            AccountMeta::new_readonly(*ctx.accounts.token_program.key, false),
            AccountMeta::new_readonly(*ctx.accounts.system_program.key, false),
            AccountMeta::new_readonly(*ctx.accounts.rent.key, false),
            AccountMeta::new(*ctx.accounts.amm.key, false),
            AccountMeta::new_readonly(*ctx.accounts.amm_authority.key, false),
            AccountMeta::new(*ctx.accounts.amm_open_orders.key, false),
            AccountMeta::new(*ctx.accounts.lp_mint.key, false),
            AccountMeta::new_readonly(*ctx.accounts.coin_mint.key, false),
            AccountMeta::new_readonly(*ctx.accounts.pc_mint.key, false),
            AccountMeta::new(*ctx.accounts.pool_coin_token_account.key, false),
            AccountMeta::new(*ctx.accounts.pool_pc_token_account.key, false),
            AccountMeta::new(*ctx.accounts.pool_withdraw_queue.key, false),
            AccountMeta::new(*ctx.accounts.amm_target_orders.key, false),
            AccountMeta::new(*ctx.accounts.pool_temp_lp.key, false),
            AccountMeta::new_readonly(*ctx.accounts.open_book_program.key, false),
            AccountMeta::new_readonly(*ctx.accounts.open_book_market.key, false),
            AccountMeta::new(*ctx.accounts.user_wallet.key, true),
            AccountMeta::new(*ctx.accounts.user_token_coin.key, false),
            AccountMeta::new(*ctx.accounts.user_token_pc.key, false),
            AccountMeta::new(*ctx.accounts.user_lp_token.key, false),
        ],
        data: get_ix_data(nonce, open_time, init_pc_amount, init_coin_amount),
    };

    anchor_lang::solana_program::program::invoke_signed(
        &ix,
        &[
            ctx.accounts.token_program.clone(),
            ctx.accounts.system_program.clone(),
            ctx.accounts.rent.clone(),
            ctx.accounts.amm.clone(),
            ctx.accounts.amm_authority.clone(),
            ctx.accounts.amm_open_orders.clone(),
            ctx.accounts.lp_mint.clone(),
            ctx.accounts.coin_mint.clone(),
            ctx.accounts.pc_mint.clone(),
            ctx.accounts.pool_coin_token_account.clone(),
            ctx.accounts.pool_pc_token_account.clone(),
            ctx.accounts.pool_withdraw_queue.clone(),
            ctx.accounts.amm_target_orders.clone(),
            ctx.accounts.pool_temp_lp.clone(),
            ctx.accounts.open_book_program.clone(),
            ctx.accounts.open_book_market.clone(),
            ctx.accounts.user_wallet.clone(),
            ctx.accounts.user_token_coin.clone(),
            ctx.accounts.user_token_pc.clone(),
            ctx.accounts.user_lp_token.clone(),
            ctx.program.clone(),
        ],
        ctx.signer_seeds,
    )?;

    Ok(())
}

fn get_ix_data(nonce: u8, open_time: u64, init_pc_amount: u64, init_coin_amount: u64) -> Vec<u8> {
    let mut data = vec![1u8]; // Discriminator for Initialize2 is 1
    data.push(nonce);
    data.extend_from_slice(&open_time.to_le_bytes());
    data.extend_from_slice(&init_pc_amount.to_le_bytes());
    data.extend_from_slice(&init_coin_amount.to_le_bytes());
    data
}
