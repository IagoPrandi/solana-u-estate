# Usufruct Protocol

Solana migration workspace for the Usufruct Protocol Phase 0 demo.

## What Is Included

- Next.js 16 + TypeScript + Tailwind CSS 4
- Solana Devnet environment wiring
- Anchor workspace scaffold at `programs/usufruct_protocol`
- Server-side `lowdb` persistence in `offchain-db/db.json`
- Server-side OKX SOL fiat pricing with timeout, cache, and stale fallback
- Mock document intake with deterministic stable JSON + `keccak256` hashing
- Legacy Ethereum/Sepolia code archived under `archive/ethereum-sepolia-phase0`

## Local Run

```bash
npm run dev
```

## Docker Run

```bash
docker compose up --build
```

App runtime reads `.env.app`. Deploy-only Solana settings stay in `.env.deploy`; keypairs/private keys must not enter the app container.

## Solana Setup

```powershell
npm run solana:preflight
npm run anchor:build
npm run solana:deploy:devnet
```

Required fixed tooling for milestone S1:

- Rust `1.91.1`
- Solana CLI / Agave CLI `3.0.10`
- Anchor CLI `0.32.1`
- Node.js `24.10.0` or compatible Node 24 runtime

## Fiat Pricing Route

```text
GET /api/fiat-rates
```

The route uses only OKX public endpoints server-side, with no private key. The active base pair is `SOL-USDC`; `USDC-BRL` remains the BRL cross route.

## Required Docs Opened For This Migration Pass

- `PRD_MIGRACAO_SOLANA_INCREMENTADO_V1_5.md`
- `AGENTS.md`
- `skills/best-practices/SKILL.md`
- `skills/best-practices/references/agent-principles.md`
