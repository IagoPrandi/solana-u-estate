# Usufruct Protocol

Milestones `0.1`, `0.2`, and `0.3` establish the local hybrid Web2/Web3 baseline described in `PRD.md`.

## What is included

- Next.js 16 + TypeScript + Tailwind CSS 4
- `wagmi` + `viem` wired to Sepolia
- Server-side `lowdb` persistence in `offchain-db/db.json`
- Server-side OKX fiat pricing with timeout, cache, and fallback
- Mock document intake with deterministic pre-save hashing preview
- Deterministic hashing via stable JSON + `keccak256`
- Dockerfile and `docker-compose.yml`
- Foundry-oriented contract directory scaffold outside the app container

## Local run

```bash
npm run dev
```

## Docker run

```bash
docker compose up --build
```

Local app runtime reads `.env.app`. Deployment secrets stay outside container app in `.env.deploy`.

## Foundry outside app container

```powershell
.\scripts\deploy-sepolia.ps1
```

The wrapper runs `forge script` in dedicated Foundry container, not inside `app`.

## Fiat pricing route

```text
GET /api/fiat-rates
```

The route uses only OKX public endpoints server-side, with no private key. `SPOT` instruments use `GET /api/v5/market/ticker`, while `MARGIN`, `SWAP`, `FUTURES`, `OPTION`, and `EVENTS` instruments use `GET /api/v5/public/mark-price` as documented by OKX. The app ships with `ETH-USDC` and `USDC-BRL` as `SPOT`, stores the last valid snapshot in `lowdb`, and returns cached fallback rates when the provider is temporarily unavailable.

## Demo prep

- Runbook: [DEMO_RUNBOOK.md](./DEMO_RUNBOOK.md)
- Preflight: `.\scripts\demo-preflight.ps1 -SellerAddress 0xSELLER -BuyerAddress 0xBUYER`
- Optional `.env.app` demo addresses: `DEMO_SELLER_ADDRESS=...` and `DEMO_BUYER_ADDRESS=...`
- Optional `.env.deploy` test accounts: `PERSON_A_ADDRESS=...` and `PERSON_B_ADDRESS=...`
