# Usufruct Protocol

A real estate tokenization protocol on Solana that separates property ownership into two independent economic positions:

- **Usufruct rights** — the right to use and benefit from the property, held by the original owner
- **Free value units** — tokens representing the property's economic value, which can be sold to investors independently

This allows property owners to unlock liquidity from real estate without giving up occupancy or usage rights, while investors gain fractional exposure to property appreciation.

## Architecture

### On-Chain Program (`programs/usufruct_protocol`)

The Anchor program manages the full lifecycle of a tokenized property:

| Instruction | Description |
|---|---|
| `initialize_protocol` | One-time admin setup |
| `register_property` | Owner submits property with value, linked-value %, and document hashes |
| `mock_verify_property` | Verifier approves the property registration |
| `tokenize_property` | Creates an SPL token mint and mints free value units to the owner |
| `create_primary_sale_listing` | Owner lists value units for sale; tokens are escrowed on-chain |
| `buy_primary_sale_listing` | Investor purchases units; SOL sent to seller, tokens sent to buyer |
| `cancel_primary_sale_listing` | Seller cancels a listing and reclaims escrowed tokens |

**Property status flow:**

```
PendingMockVerification → MockVerified → Tokenized → ActiveSale ↔ SoldOut
```

### Off-Chain Layer

- **`offchain-db/db.json`** — lowdb JSON persistence for draft properties and off-chain state
- **`/api/fiat-rates`** — server-side OKX rate fetching (`SOL-USDC`, `USDC-BRL`) with cache and stale fallback; no private keys
- **`/api/validator`** — mock verification endpoint
- **`/api/properties`** — property draft CRUD

### Frontend (`app/`)

Next.js 16 + React 19 + TypeScript + Tailwind CSS 4 + Solana Wallet Adapter.

**Owner flow:** Create property draft → hash documents deterministically (keccak256) → register on-chain → request verification → tokenize → list free value units on the marketplace.

**Investor flow:** Browse marketplace (filter by city, budget) → view listing detail with investment quote → connect wallet → purchase value units → track portfolio.

Other features: multi-language (PT/EN), real-time fiat pricing display, transaction history.

## Local Development

```bash
npm run dev
```

## Docker

```bash
docker compose up --build
```

App runtime reads `.env.app`. Deploy-only Solana settings go in `.env.deploy`; keypairs and private keys must not enter the app container.

## Solana / Anchor Setup

```powershell
npm run solana:preflight
npm run anchor:build
npm run solana:deploy:devnet
```

Required tooling versions:

| Tool | Version |
|---|---|
| Rust | `1.91.1` |
| Solana / Agave CLI | `3.0.10` |
| Anchor CLI | `0.32.1` |
| Node.js | `24.10.0` |
