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
npm run solana:demo:preflight
```

The scripts check:

- Node version
- Rust version
- Solana CLI version
- Anchor CLI version
- `.env.app` has no private key material
- `.env.app` has no active EVM/Sepolia contract addresses
- `.env.deploy` targets Devnet
- Devnet RPC is configured
- deployed program id is executable
- demo wallets have the required minimum balance

## Docker App

Use the dedicated demo container, not the legacy app container:

```powershell
docker ps --filter "name=solana-u-estate-ms8-dev"
```

Expected app URL:

```text
http://127.0.0.1:3002
```

The existing `usufruct-protocol-app` / `hacknation-u_estate-app` container is not the active Solana demo container.

## Anchor Commands

```powershell
npm run anchor:build
npm run anchor:test
npm run solana:deploy:devnet
```

`anchor build`, `anchor test`, and `anchor deploy` require the fixed S1 tooling in `PRD_MIGRACAO_SOLANA_INCREMENTADO_V1_5.md`.

## Demo Reset

Prepare the local guided demo cache:

```powershell
npm run solana:demo:reset
```

This command is Devnet-only, backs up lowdb as `*.bak`, seeds the local guided demo through the app API, and does not delete keypairs or deploy artifacts.

## Timed Devnet Smoke

Run a timed on-chain purchase flow:

```powershell
$duration = Measure-Command { npm run solana:demo:preflight; npm run solana:smoke:ms6 }
$duration.TotalSeconds
```

Acceptance target: under 300 seconds. Latest MS9 evidence: `13.1` seconds.

## Fallback Boundaries

Local simulation can explain the product story, but it is not on-chain acceptance. Any final demo acceptance must use Solana Devnet transactions, real signatures, and on-chain reconciliation.
