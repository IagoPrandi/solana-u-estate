#!/usr/bin/env bash
set -euo pipefail

export CARGO_HOME=/tmp/cargo
export RUSTUP_HOME=/tmp/rustup
export PATH=/tmp/anchor/bin:/tmp/agave/bin:$CARGO_HOME/bin:$PATH

if ! command -v rustup >/dev/null 2>&1; then
  curl -fsSL https://sh.rustup.rs | sh -s -- -y --profile minimal --default-toolchain 1.91.1
else
  rustup toolchain install 1.91.1 --profile minimal
  rustup default 1.91.1
fi

if [ ! -x /tmp/agave/bin/solana ]; then
  mkdir -p /tmp/agave
  curl -fsSL -o /tmp/agave-release.tar.bz2 https://github.com/anza-xyz/agave/releases/download/v3.0.10/solana-release-x86_64-unknown-linux-gnu.tar.bz2
  tar -xjf /tmp/agave-release.tar.bz2 -C /tmp/agave --strip-components=1
fi

if [ ! -x /tmp/anchor/bin/anchor ]; then
  mkdir -p /tmp/anchor/bin
  curl -fsSL -o /tmp/anchor/bin/anchor https://github.com/solana-foundation/anchor/releases/download/v0.32.1/anchor-0.32.1-x86_64-unknown-linux-gnu
  chmod +x /tmp/anchor/bin/anchor
fi

cd /work

case "$ANCHOR_TOOL_COMMAND" in
  build)
    anchor build
    ;;
  test)
    if [ ! -x node_modules/.bin/ts-mocha ]; then
      npm ci
    fi
    if [ ! -f /tmp/anchor-wallet.json ]; then
      solana-keygen new --no-bip39-passphrase --outfile /tmp/anchor-wallet.json --force >/dev/null
    fi
    export ANCHOR_WALLET=/tmp/anchor-wallet.json
    anchor test --provider.cluster localnet --provider.wallet /tmp/anchor-wallet.json
    ;;
  deploy-devnet)
    if [ -z "${ANCHOR_WALLET:-}" ]; then
      echo "ANCHOR_WALLET is required for Devnet deploy." >&2
      exit 1
    fi
    if [ ! -f "$ANCHOR_WALLET" ]; then
      echo "ANCHOR_WALLET file not found: $ANCHOR_WALLET" >&2
      exit 1
    fi
    export ANCHOR_PROVIDER_URL="${ANCHOR_PROVIDER_URL:-https://api.devnet.solana.com}"
    anchor build
    anchor deploy --provider.cluster devnet --provider.wallet "$ANCHOR_WALLET"
    ;;
  *)
    echo "Unknown command: $ANCHOR_TOOL_COMMAND" >&2
    exit 1
    ;;
esac
