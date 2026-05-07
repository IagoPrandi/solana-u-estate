# Demo Runbook

This runbook now tracks the Solana Devnet migration path.

## Goal

Present the full Usufruct Protocol Phase 0 flow on Solana Devnet once milestones S2-S10 are implemented. Until then, local guided demo data remains available, but it is not counted as on-chain acceptance.

## Roles

- `Person A`: resident owner, keeps usufruct and linked value.
- `Person B`: buyer, receives only the free-value economic slice.
- `Committee`: neutral narrator mode in the frontend.

## Solana Preflight

Run before deploy or demo work:

```powershell
npm run solana:preflight
```

The script checks:

- Node version
- Rust version
- Solana CLI version
- Anchor CLI version
- `.env.app` has no private key material
- `.env.app` has no active EVM/Sepolia contract addresses
- `.env.deploy` targets Devnet

## Anchor Commands

```powershell
npm run anchor:build
npm run anchor:test
npm run solana:deploy:devnet
```

`anchor build`, `anchor test`, and `anchor deploy` require the fixed S1 tooling in `PRD_MIGRACAO_SOLANA_INCREMENTADO_V1_5.md`.

## Fallback Boundaries

Local simulation can explain the product story, but it is not on-chain acceptance. Any final demo acceptance must use Solana Devnet transactions, real signatures, and on-chain reconciliation.
