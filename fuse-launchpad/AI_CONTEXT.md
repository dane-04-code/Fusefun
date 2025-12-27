# Project State: FUSE Launchpad

## Current Phase: Phase 2 (Production-Ready Smart Contracts)

## Architecture Overview

### Smart Contract Structure (`anchor/programs/fuse/src/`)
```
├── lib.rs              # Program entry point, instruction definitions
├── state.rs            # Account structures (BondingCurve, ProtocolState, UserProfile)
├── constants.rs        # Configuration constants (reserves, thresholds, fees)
├── errors.rs           # Custom error codes
├── events.rs           # On-chain events for indexing
└── instructions/
    ├── mod.rs          # Module exports
    ├── create_token.rs # Launch new token with bonding curve
    ├── buy.rs          # Buy tokens (with sniper protection)
    ├── sell.rs         # Sell tokens back to curve
    └── migrate.rs      # Graduate to DEX (Raydium/Meteora)
```

## Key Features Implemented

### 1. Token Creation (`create_token`)
- Creates SPL token mint with curve as authority
- Initializes bonding curve PDA with virtual reserves
- Mints total supply to vault
- Optional initial buy on launch
- Stores metadata (name, symbol, URI)

### 2. Bonding Curve Math (x * y = k)
- **Virtual Reserves**: 30 SOL + 1.073B tokens (phantom liquidity)
- **Real Reserves**: Actual SOL/tokens in the curve
- **Price Formula**: `price = virtual_sol / virtual_tokens`
- **Buy**: `tokens_out = (virtual_tokens * sol_in) / (virtual_sol + sol_in)`
- **Sell**: `sol_out = (virtual_sol * tokens_in) / (virtual_tokens + tokens_in)`

### 3. Fee Structure (1% total)
- 80% → Protocol Treasury
- 20% → Token Creator (accumulated, paid on graduation)

### 4. Sniper Protection
- First 30 seconds after launch: max 1 SOL per buy
- Prevents bots from sniping entire supply

### 5. Graduation/Migration
- Threshold: ~85 SOL in real reserves (~$69K market cap)
- Pays out accumulated creator fees
- Transfers liquidity to migration authority for DEX listing
- Marks curve as complete (trading disabled)

### 6. Slippage Protection
- Buy: `min_tokens_out` parameter
- Sell: `min_sol_out` parameter

## Constants (constants.rs)
```rust
VIRTUAL_SOL_RESERVES: 30 SOL
VIRTUAL_TOKEN_RESERVES: 1.073B tokens
TOTAL_SUPPLY: 1B tokens
GRADUATION_SOL_THRESHOLD: 85 SOL
SNIPER_PROTECTION_DURATION: 30 seconds
SNIPER_MAX_BUY: 1 SOL
FEE: 1% (80% protocol, 20% creator)
```

## Events (for indexing)
- `CurveInitialized`: Token launched
- `TradeEvent`: Buy/Sell with price, reserves, market cap
- `GraduationTriggered`: Threshold reached
- `CurveCompleted`: Migration complete

## Frontend SDK (`web/sdk/fuse-sdk.ts`)
- PDA derivation utilities
- Bonding curve math (JS implementation)
- Trade quotes with price impact
- Transaction builders
- Balance/state readers

## Next Steps
1. [ ] Integrate Anchor IDL for proper instruction encoding
2. [ ] Add Raydium/Meteora CPI for automated DEX listing
3. [ ] Implement referral system
4. [ ] Add creator token vesting
5. [ ] Deploy to devnet for testing
