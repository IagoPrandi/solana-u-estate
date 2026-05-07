# Demo Runbook

This runbook is the operational guide for milestone `0.13`.

## Goal

Present the full Usufruct Protocol demo in under five minutes while keeping a safe fallback if live Sepolia or OKX data is unavailable.

## Roles

- `Person A`: resident owner, keeps usufruct and linked value.
- `Person B`: buyer, receives only the free-value economic slice.
- `Committee`: neutral narrator mode already available in the frontend.

## Demo preflight

Run this before the presentation:

```powershell
.\scripts\demo-preflight.ps1 -SellerAddress 0xSELLER -BuyerAddress 0xBUYER
```

You can also persist them in `.env.app` as:

```text
DEMO_SELLER_ADDRESS=0xSELLER
DEMO_BUYER_ADDRESS=0xBUYER
```

Or in `.env.deploy` as:

```text
PERSON_A_ADDRESS=0xSELLER
PERSON_B_ADDRESS=0xBUYER
```

The script checks:

- contract addresses configured in `.env.app`
- Sepolia RPC configured in `.env.deploy`
- deploy key availability for fresh deployment
- Foundry `cast` availability
- Docker CLI availability
- seller and buyer Sepolia ETH balances
- seller and buyer wallet separation

## Five-minute script

1. Start on the home section.
Explain that one house becomes three rights: usufruct, linked value, and free value.

2. Open guided demo mode.
Switch between `Committee`, `Person A`, and `Person B` to frame the same flow from the correct perspective.

Optional accelerator:
Use `Load section 32 simulation` on the home panel to seed the exact PRD end-state with a `0.2 ETH` property, `300000` sold units, and the final `70/30` split.

3. Show `Tokenize my house`.
Point at the mock upload, deterministic hashes, and the mock verification stage.

4. Show the tokenized property dashboard.
Make the committee read the three-rights section and the guided lifecycle rail.

5. Show the sale form and marketplace.
Stress that only free-value units are listed and priced proportionally in ETH and fiat.

6. Show the economic distribution visual.
Close by explaining that Person A keeps usufruct and linked value while Person B only acquires free-value units.

## Required live conditions

- `.env.app` contains deployed Sepolia addresses.
- seller and buyer wallets are funded with Sepolia ETH.
- the app starts locally or through Docker.
- `/api/fiat-rates` responds with either live or cached data.
- the lowdb file already contains at least one property draft for the guided flow.

## Fallback plan

If Sepolia transactions are unavailable:

- stay in guided demo mode
- load the built-in `Load section 32 simulation` fallback
- use the lifecycle rail and the existing persisted property record
- explain the transaction feedback banners and marketplace states using the saved local data

If OKX pricing is unavailable:

- use the built-in ETH-only fallback state
- explicitly tell the committee that fiat conversion is temporarily unavailable
- continue the explanation using ETH values only

If Docker is unavailable:

- run the app locally with `npm run dev`
- keep the same presentation script and use the same property record

## Demo wallet checklist

- seller wallet address confirmed
- buyer wallet address confirmed
- both wallets connected to Sepolia
- both wallets have visible ETH balances
- seller wallet owns the property actions
- buyer wallet is different from the seller wallet

## Final presenter reminder

The most important sentence in the room is:

`Person A keeps usufruct and linked value. Person B buys only free economic value.`
