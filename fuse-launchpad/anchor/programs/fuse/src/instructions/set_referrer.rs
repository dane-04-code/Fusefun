use anchor_lang::prelude::*;
use crate::state::*;
use crate::constants::*;
use crate::errors::FuseError;

#[derive(Accounts)]
#[instruction(referral_code: String)]
pub struct SetReferrer<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [USER_SEED, user.key().as_ref()],
        bump = user_profile.bump,
        constraint = user_profile.referrer.is_none() @ FuseError::ReferralAlreadyExists
    )]
    pub user_profile: Account<'info, UserProfile>,

    #[account(
        seeds = [REFERRAL_SEED, referral_code.as_bytes()],
        bump = referral_code_account.bump,
        constraint = referral_code_account.owner != user.key() @ FuseError::CannotReferSelf
    )]
    pub referral_code_account: Account<'info, ReferralCode>,

    // We need to update the referrer's profile to increment count
    #[account(
        mut,
        seeds = [USER_SEED, referral_code_account.owner.as_ref()],
        bump
    )]
    pub referrer_profile: Account<'info, UserProfile>,
}

pub fn handler(ctx: Context<SetReferrer>, _referral_code: String) -> Result<()> {
    let user_profile = &mut ctx.accounts.user_profile;
    let referrer_key = ctx.accounts.referral_code_account.owner;
    
    user_profile.referrer = Some(referrer_key);

    let referrer_profile = &mut ctx.accounts.referrer_profile;
    referrer_profile.referral_count = referrer_profile.referral_count.checked_add(1).unwrap();

    Ok(())
}
