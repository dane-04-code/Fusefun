# README_AI.md

This is the AI context file for the FUSE.FUN project.

## Project Goal
**FUSE.FUN**: A high-performance Solana launchpad built with strict engineering standards.

## Engineering Standards (Master Dev)
- **Quality**: 10/10 product delivery.
- **Architecture**: Clean, modular, and secure Anchor (Rust) smart contracts.
- **Frontend**: Responsive, type-safe Next.js web interface.
- **Testing**: Comprehensive test coverage.

## Installed Tools


- **Rust**: `rustc 1.92.0`
- **Solana CLI**: `solana-cli 1.18.18`
- **Anchor**: `anchor-cli 0.32.1`
- **Node.js**: `v20.17.0`
- **npm**: `10.8.2`
- **Yarn**: `1.22.22`

## Getting Started

To verify installations, run:

```bash
rustc --version
solana --version
anchor --version
node --version
npm --version
yarn --version
```

## Project Structure

- `fuse-launchpad/`: Main project directory
- `AI_CONTEXT.md`: This file contains AI-related context

## Next Steps

- Initialize a new Solana project with Anchor
- Build and deploy smart contracts

# FUSE: The Anti-Rug Solana Launchpad

## 1. Project Overview
FUSE is a next-generation Solana launchpad designed to combat the "liquidity drought" by mandating creator commitment and protecting retail traders from snipers.

## 2. Core Mechanics
- **Locked Dev Buy:** Creators must purchase a minimum amount of their own token (e.g., 0.5 SOL) at launch. These tokens are minted into a locked PDA vault, not the creator's wallet.
- **Vesting Vault:** Creator tokens are only released if the token "graduates" (reaches a 100% bonding curve/Raydium migration).
- **Sticky Referral Engine:** An on-chain registry links users to referrers. Fees (1%) are split 50/50 between the platform and the referrer, even if the user trades via external aggregators (Photon/Axiom).
- **Bonding Curve:** Uses the Constant Product Formula ($x \cdot y = k$) with Virtual Reserves to establish an initial price floor.

## 3. Technical Stack
- **Smart Contract:** Anchor Framework (Rust), Solana SPL Token Program.
- **Frontend:** Next.js (App Router), TailwindCSS, ShadcnUI.
- **Provider:** Dynamic.xyz (Embedded Wallets).
- **Indexer:** Helius (Webhooks for real-time trade updates).

## 4. Security Constraints (AI MUST FOLLOW)
1. **No Admin Backdoors:** The contract must be trustless.
2. **PDA Validation:** All accounts must be derived from strict seeds: `[b"curve", mint_pubkey]` or `[b"referral", user_pubkey]`.
3. **Integer Safety:** Use `checked_add`, `checked_mul`, etc., for all math to prevent overflows.