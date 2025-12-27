use anchor_lang::prelude::*;
use crate::state::*;
use crate::constants::*;
use crate::errors::FuseError;

#[derive(Accounts)]
#[instruction(username: String)]
pub struct RegisterUser<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        init,
        payer = user,
        seeds = [USER_SEED, user.key().as_ref()],
        bump,
        space = 8 + UserProfile::INIT_SPACE
    )]
    pub user_profile: Account<'info, UserProfile>,

    #[account(
        init,
        payer = user,
        seeds = [REFERRAL_SEED, username.as_bytes()],
        bump,
        space = 8 + ReferralCode::INIT_SPACE
    )]
    pub referral_code_mapping: Account<'info, ReferralCode>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<RegisterUser>, username: String) -> Result<()> {
    require!(username.len() <= 20, FuseError::NameTooLong); // Reuse error or make new one

    let user_profile = &mut ctx.accounts.user_profile;
    user_profile.authority = ctx.accounts.user.key();
    user_profile.username = username.clone();
    user_profile.referrer = None;
    user_profile.referral_count = 0;
    user_profile.total_referral_fees = 0;
    user_profile.bump = ctx.bumps.user_profile;

    let referral_code = &mut ctx.accounts.referral_code_mapping;
    referral_code.owner = ctx.accounts.user.key();
    referral_code.code = username;
    referral_code.bump = ctx.bumps.referral_code_mapping;

    Ok(())
}
