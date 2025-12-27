use anchor_lang::prelude::*;

#[error_code]
pub enum FuseError {
    #[msg("You are trying to buy too many tokens at once (Sniper Protection).")]
    SniperLimitExceeded,

    #[msg("The creator tokens are locked until the curve graduates.")]
    TokensLocked,

    #[msg("Insufficient SOL to pay for the initial buy.")]
    InsufficientFunds,

    #[msg("Slippage tolerance exceeded.")]
    SlippageExceeded,

    #[msg("This user is already linked to a referrer.")]
    ReferralAlreadyExists,

    #[msg("You cannot refer yourself.")]
    CannotReferSelf,
    
    #[msg("Math Overflow in Bonding Curve.")]
    MathOverflow,

    #[msg("The curve has already been migrated.")]
    CurveAlreadyMigrated,

    #[msg("The curve has not reached graduation threshold yet.")]
    GraduationNotReached,

    #[msg("Trading is disabled while migration is in progress.")]
    TradingDisabled,

    #[msg("Protocol is currently paused.")]
    ProtocolPaused,

    #[msg("Token name exceeds maximum length.")]
    NameTooLong,

    #[msg("Token symbol exceeds maximum length.")]
    SymbolTooLong,

    #[msg("Metadata URI exceeds maximum length.")]
    UriTooLong,

    #[msg("Minimum tokens out not met.")]
    MinTokensNotMet,

    #[msg("Insufficient liquidity in the curve.")]
    InsufficientLiquidity,

    #[msg("Invalid fee calculation.")]
    InvalidFee,

    #[msg("Unauthorized access.")]
    Unauthorized,
}