"use client";

import { formatUnits, formatUsd, truncate } from "./data";
import type { WalletHolding } from "./holdings";
import {
  IconArrowRight,
  IconCoins,
  IconExternal,
  IconMapPin,
  IconShield,
  IconTrending,
} from "./icons";
import {
  EmptyState,
  HashChip,
  PageHeader,
} from "./ui";
import type { Listing, Navigate, Property } from "./types";

function assetTicker(property: Property) {
  const suffix = property.propertyId !== "0" ? property.propertyId : property.id.slice(0, 4);
  return `uEST-${suffix}`;
}

function buildSeries(currentValue: number, seed: string) {
  let acc = 0;
  for (let i = 0; i < seed.length; i += 1) acc += seed.charCodeAt(i);
  return Array.from({ length: 28 }, (_, i) => {
    const wave = Math.sin((i + acc) / 3.2) * 0.045;
    const drift = (i - 14) * 0.0022;
    const noise = ((acc + i * 17) % 11) / 1000;
    return Math.max(currentValue * 0.82, currentValue * (1 + wave + drift + noise));
  });
}

function ChartCard({
  property,
  holding,
}: {
  property: Property;
  holding: WalletHolding;
}) {
  const currentvalueEth =
    (Number(property.marketValueEth) * holding.units) /
    property.totalValueUnits;
  const series = buildSeries(currentvalueEth, property.id + holding.buyerWallet);
  const min = Math.min(...series);
  const max = Math.max(...series);
  const points = series
    .map((value, i) => {
      const x = 20 + (i / (series.length - 1)) * 560;
      const y = 220 - ((value - min) / Math.max(max - min, 0.000001)) * 170;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const area = `20,240 ${points} 580,240`;
  const current = series.at(-1) ?? currentvalueEth;
  const previous = series.at(-2) ?? current;
  const up = current >= previous;

  return (
    <div
      className="card card-pad-lg"
      style={{
        background: "#111614",
        borderColor: "#202c27",
        color: "#fff",
      }}
    >
      <div className="row-between mb-16">
        <div>
          <div className="text-xs" style={{ opacity: 0.55, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>
            Market chart
          </div>
          <div className="fw-800 text-xl mt-12 mono">{assetTicker(property)}/SOL</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="fw-800 text-xl mono">{currentvalueEth.toFixed(6)} SOL</div>
          <div className="text-xs fw-700" style={{ color: up ? "var(--color-success)" : "var(--color-danger)" }}>
            {up ? "+" : ""}{(((current - previous) / Math.max(previous, 0.000001)) * 100).toFixed(2)}% last tick
          </div>
        </div>
      </div>
      <svg viewBox="0 0 600 260" style={{ width: "100%", height: 280, display: "block" }} role="img" aria-label="Asset price chart">
        <defs>
          <linearGradient id="asset-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#f18b2b" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#f18b2b" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[50, 95, 140, 185, 230].map((y) => (
          <line key={y} x1="20" x2="580" y1={y} y2={y} stroke="rgba(255,255,255,0.08)" />
        ))}
        {[20, 132, 244, 356, 468, 580].map((x) => (
          <line key={x} x1={x} x2={x} y1="45" y2="240" stroke="rgba(255,255,255,0.05)" />
        ))}
        {series.map((value, i) => {
          const x = 24 + (i / (series.length - 1)) * 552;
          const height = 16 + ((value - min) / Math.max(max - min, 0.000001)) * 44;
          return (
            <rect
              key={i}
              x={x - 4}
              y={244 - height}
              width="6"
              height={height}
              rx="2"
              fill={i % 3 === 0 ? "rgba(241,139,43,0.45)" : "rgba(255,255,255,0.16)"}
            />
          );
        })}
        <polygon points={area} fill="url(#asset-area)" />
        <polyline points={points} fill="none" stroke="#f18b2b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="grid-3 mt-16">
        <div>
          <div className="muted text-xs">24h volume</div>
          <div className="fw-800 mono mt-12">{(holding.costEth * 0.36).toFixed(5)} SOL</div>
        </div>
        <div>
          <div className="muted text-xs">Pool depth</div>
          <div className="fw-800 mono mt-12">{(Number(property.marketValueEth) * 0.08).toFixed(4)} SOL</div>
        </div>
        <div>
          <div className="muted text-xs">Oracle value</div>
          <div className="fw-800 mono mt-12">{Number(property.marketValueEth).toFixed(4)} SOL</div>
        </div>
      </div>
    </div>
  );
}

export function InvestmentDetailPage({
  property,
  holding,
  listings,
  navigate,
}: {
  property: Property | undefined;
  holding: WalletHolding | undefined;
  listings: Listing[];
  navigate: Navigate;
}) {
  if (!property || !holding) {
    return (
      <div className="page">
        <EmptyState
          title="Investment not found"
          sub="This wallet does not hold an economic position for the selected asset."
          actionLabel="Back to portfolio"
          onAction={() => navigate("portfolio")}
        />
      </div>
    );
  }

  const currentvalueEth =
    (Number(property.marketValueEth) * holding.units) /
    property.totalValueUnits;
  const pnl = currentvalueEth - holding.costEth;
  const pnlPct = holding.costEth > 0 ? (pnl / holding.costEth) * 100 : 0;
  const ownershipPct = (holding.units / property.totalValueUnits) * 100;
  const freeSoldPct =
    property.freeValueUnits > 0
      ? (property.soldFreeValueUnits / property.freeValueUnits) * 100
      : 0;
  const activeLiquidity = listings
    .filter((listing) => listing.propertyId === property.propertyId && listing.status === "Active")
    .reduce((sum, listing) => sum + Number(listing.priceWei), 0);
  const activeUnits = listings
    .filter((listing) => listing.propertyId === property.propertyId && listing.status === "Active")
    .reduce((sum, listing) => sum + listing.amount, 0);

  return (
    <div className="page">
      <PageHeader
        crumb={
          <>
            <a onClick={() => navigate("portfolio")}>My investments</a>
            <span>/</span>
            <span>{assetTicker(property)}</span>
          </>
        }
        title={`${assetTicker(property)} asset view`}
        subtitle={`${property.city}, ${property.state} - economic value token`}
        actions={
          <button className="btn btn-neutral" onClick={() => navigate("marketplace")}>
            Find liquidity <IconArrowRight size={14} />
          </button>
        }
      />

      <div className="grid-3 mb-32">
        <div className="card card-pad">
          <div className="muted text-xs" style={{ textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>
            Current value
          </div>
          <div className="fw-800 text-2xl mono mt-12">{currentvalueEth.toFixed(6)} SOL</div>
          <div className="muted text-sm">≈ {formatUsd(currentvalueEth)}</div>
        </div>
        <div className="card card-pad">
          <div className="muted text-xs" style={{ textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>
            Unrealized PnL
          </div>
          <div className="fw-800 text-2xl mono mt-12" style={{ color: pnl >= 0 ? "var(--color-success)" : "var(--color-danger)" }}>
            {pnl >= 0 ? "+" : ""}{pnl.toFixed(6)} SOL
          </div>
          <div className="muted text-sm">{pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(2)}%</div>
        </div>
        <div className="card card-pad">
          <div className="muted text-xs" style={{ textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>
            Position size
          </div>
          <div className="fw-800 text-2xl mono mt-12">{ownershipPct.toFixed(4)}%</div>
          <div className="muted text-sm">{formatUnits(holding.units)} units</div>
        </div>
      </div>

      <div className="grid-2-1">
        <div className="col col-gap-lg">
          <ChartCard property={property} holding={holding} />

          <div className="card card-pad-lg">
            <div className="row-between mb-16">
              <div>
                <div className="text-xs muted" style={{ textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>
                  Asset fundamentals
                </div>
                <h3 style={{ margin: "10px 0 0", fontSize: 20, fontWeight: 800 }}>
                  Basic property and token data
                </h3>
              </div>
              <IconShield size={22} />
            </div>
            <div className="grid-2">
              <div className="text-sm">
                <div className="muted">Location</div>
                <div className="fw-700 mt-12 row row-gap-sm">
                  <IconMapPin size={14} /> {property.city}, {property.state}
                </div>
              </div>
              <div className="text-sm">
                <div className="muted">Market valuation</div>
                <div className="fw-700 mt-12 mono">{Number(property.marketValueEth).toFixed(6)} SOL</div>
              </div>
              <div className="text-sm">
                <div className="muted">Free-value supply</div>
                <div className="fw-700 mt-12 mono">{formatUnits(property.freeValueUnits)} units</div>
              </div>
              <div className="text-sm">
                <div className="muted">Sold free value</div>
                <div className="fw-700 mt-12 mono">{freeSoldPct.toFixed(2)}%</div>
              </div>
            </div>
          </div>
        </div>

        <div className="col col-gap-lg">
          <div className="card card-pad-lg">
            <div className="row-between">
              <div className="fw-800 text-lg">Your position</div>
              <IconCoins size={20} />
            </div>
            <div className="col col-gap mt-24">
              <div className="row-between text-sm">
                <span className="muted">Entry cost</span>
                <strong className="mono">{holding.costEth.toFixed(6)} SOL</strong>
              </div>
              <div className="row-between text-sm">
                <span className="muted">Current value</span>
                <strong className="mono">{currentvalueEth.toFixed(6)} SOL</strong>
              </div>
              <div className="row-between text-sm">
                <span className="muted">Acquired</span>
                <strong>{new Date(holding.acquiredAt).toLocaleDateString("en-US")}</strong>
              </div>
              <div className="row-between text-sm">
                <span className="muted">Last tx</span>
                <HashChip hash={holding.lastPurchaseTxHash} />
              </div>
            </div>
          </div>

          <div className="card card-pad-lg">
            <div className="row-between">
              <div className="fw-800 text-lg">Market depth</div>
              <IconTrending size={20} />
            </div>
            <div className="col col-gap mt-24">
              <div className="row-between text-sm">
                <span className="muted">Active liquidity</span>
                <strong className="mono">{activeLiquidity.toFixed(6)} SOL</strong>
              </div>
              <div className="row-between text-sm">
                <span className="muted">Active units</span>
                <strong className="mono">{formatUnits(activeUnits)}</strong>
              </div>
              <div className="row-between text-sm">
                <span className="muted">Bid/ask model</span>
                <strong>Primary sale only</strong>
              </div>
            </div>
            <div className="mt-24" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {["Bid 0.00000098", "Ask 0.00000102", "Bid 0.00000095", "Ask 0.00000105"].map((row, i) => (
                <div
                  key={row}
                  className="text-xs mono"
                  style={{
                    padding: "8px 10px",
                    borderRadius: 6,
                    background: i % 2 === 0 ? "rgba(15,163,127,0.12)" : "rgba(241,139,43,0.14)",
                    color: i % 2 === 0 ? "var(--color-success)" : "var(--color-orange)",
                  }}
                >
                  {row}
                </div>
              ))}
            </div>
          </div>

          <div className="card card-pad-lg">
            <div className="fw-800 text-lg">Token references</div>
            <div className="col col-gap mt-24">
              <div>
                <div className="muted text-xs">Value token</div>
                <div className="mono text-sm mt-12">
                  {property.valueTokenAddress ? truncate(property.valueTokenAddress, 10, 8) : "Not synced"}
                </div>
              </div>
              <div>
                <div className="muted text-xs">Owner wallet</div>
                <div className="mono text-sm mt-12">
                  {property.ownerWallet ? truncate(property.ownerWallet, 10, 8) : "Unknown"}
                </div>
              </div>
              <button className="btn btn-neutral w-100" onClick={() => navigate("transactions")}>
                View activity <IconExternal size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
