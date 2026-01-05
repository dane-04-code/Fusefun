#!/bin/bash
export PATH="$HOME/.cargo/bin:$HOME/.local/share/solana/install/active_release/bin:$PATH"
cd ~/anchor-build
# Build with no-idl feature to remove embedded IDL
anchor build -- --features no-idl
