"use client";

import { formatUnits, truncate } from "./data";
import { formatUsdFromFiatRates } from "./fiat-rates";
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
import { useFiatRates } from "./use-fiat-rates";

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
            Referência de valor
          </div>
          <div className="fw-800 text-xl mt-12 mono">{assetTicker(property)}/SOL</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="fw-800 text-xl mono">{currentvalueEth.toFixed(6)} SOL</div>
          <div className="text-xs fw-700" style={{ color: "rgba(255,255,255,0.72)" }}>
            Based on registered property valuation
          </div>
        </div>
      </div>
      <svg viewBox="0 0 600 260" style={{ width: "100%", height: 280, display: "block" }} role="img" aria-label="Gráfico de preço do ativo">
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
          <div className="muted text-xs">Custo de entrada</div>
          <div className="fw-800 mono mt-12">{holding.costEth.toFixed(6)} SOL</div>
        </div>
        <div>
          <div className="muted text-xs">Unidades detidas</div>
          <div className="fw-800 mono mt-12">{formatUnits(holding.units)}</div>
        </div>
        <div>
          <div className="muted text-xs">Avaliação cadastrada</div>
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
  const fiatRates = useFiatRates();
  if (!property || !holding) {
    return (
      <div className="page">
        <EmptyState
          title="Investimento não encontrado"
          sub="Esta carteira não possui uma posição econômica para o ativo selecionado."
          actionLabel="Voltar ao portfólio"
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
            <a onClick={() => navigate("portfolio")}>Meus investimentos</a>
            <span>/</span>
            <span>{assetTicker(property)}</span>
          </>
        }
        title={`${assetTicker(property)} visão do ativo`}
        subtitle={`${property.city}, ${property.state} - token de valor econômico`}
        actions={
          <button className="btn btn-neutral" onClick={() => navigate("marketplace")}>
            Encontrar liquidez <IconArrowRight size={14} />
          </button>
        }
      />

      <div className="grid-3 mb-32">
        <div className="card card-pad">
          <div className="muted text-xs" style={{ textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>
            Valor atual
          </div>
          <div className="fw-800 text-2xl mono mt-12">{currentvalueEth.toFixed(6)} SOL</div>
          <div className="muted text-sm">
            ≈ {formatUsdFromFiatRates(currentvalueEth, fiatRates)}
          </div>
        </div>
        <div className="card card-pad">
          <div className="muted text-xs" style={{ textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>
            PnL não realizado
          </div>
          <div className="fw-800 text-2xl mono mt-12" style={{ color: pnl >= 0 ? "var(--color-success)" : "var(--color-danger)" }}>
            {pnl >= 0 ? "+" : ""}{pnl.toFixed(6)} SOL
          </div>
          <div className="muted text-sm">{pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(2)}%</div>
        </div>
        <div className="card card-pad">
          <div className="muted text-xs" style={{ textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>
            Tamanho da posição
          </div>
          <div className="fw-800 text-2xl mono mt-12">{ownershipPct.toFixed(4)}%</div>
          <div className="muted text-sm">{formatUnits(holding.units)} unidades</div>
        </div>
      </div>

      <div className="grid-2-1">
        <div className="col col-gap-lg">
          <ChartCard property={property} holding={holding} />

          <div className="card card-pad-lg">
            <div className="row-between mb-16">
              <div>
                <div className="text-xs muted" style={{ textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>
                  Fundamentos do ativo
                </div>
                <h3 style={{ margin: "10px 0 0", fontSize: 20, fontWeight: 800 }}>
                  Dados básicos do imóvel e do token
                </h3>
              </div>
              <IconShield size={22} />
            </div>
            <div className="grid-2">
              <div className="text-sm">
                <div className="muted">Localização</div>
                <div className="fw-700 mt-12 row row-gap-sm">
                  <IconMapPin size={14} /> {property.city}, {property.state}
                </div>
              </div>
              <div className="text-sm">
                <div className="muted">Avaliação de mercado</div>
                <div className="fw-700 mt-12 mono">{Number(property.marketValueEth).toFixed(6)} SOL</div>
              </div>
              <div className="text-sm">
                <div className="muted">Oferta de valor livre</div>
                <div className="fw-700 mt-12 mono">{formatUnits(property.freeValueUnits)} unidades</div>
              </div>
              <div className="text-sm">
                <div className="muted">Valor livre vendido</div>
                <div className="fw-700 mt-12 mono">{freeSoldPct.toFixed(2)}%</div>
              </div>
            </div>
          </div>
        </div>

        <div className="col col-gap-lg">
          <div className="card card-pad-lg">
            <div className="row-between">
              <div className="fw-800 text-lg">Sua posição</div>
              <IconCoins size={20} />
            </div>
            <div className="col col-gap mt-24">
              <div className="row-between text-sm">
                <span className="muted">Custo de entrada</span>
                <strong className="mono">{holding.costEth.toFixed(6)} SOL</strong>
              </div>
              <div className="row-between text-sm">
                <span className="muted">Valor atual</span>
                <strong className="mono">{currentvalueEth.toFixed(6)} SOL</strong>
              </div>
              <div className="row-between text-sm">
                <span className="muted">Adquirido</span>
                <strong>{new Date(holding.acquiredAt).toLocaleDateString()}</strong>
              </div>
              <div className="row-between text-sm">
                <span className="muted">Última tx</span>
                <HashChip hash={holding.lastPurchaseTxHash} />
              </div>
            </div>
          </div>

          <div className="card card-pad-lg">
            <div className="row-between">
              <div className="fw-800 text-lg">Profundidade de mercado</div>
              <IconTrending size={20} />
            </div>
            <div className="col col-gap mt-24">
              <div className="row-between text-sm">
                <span className="muted">Liquidez ativa</span>
                <strong className="mono">{activeLiquidity.toFixed(6)} SOL</strong>
              </div>
              <div className="row-between text-sm">
                <span className="muted">Unidades ativas</span>
                <strong className="mono">{formatUnits(activeUnits)}</strong>
              </div>
              <div className="row-between text-sm">
                <span className="muted">Modelo bid/ask</span>
                <strong>Apenas venda primária</strong>
              </div>
            </div>
            <div
              className="card-pad mt-24"
              style={{
                background: "var(--color-surface-soft)",
                borderRadius: "var(--radius-md)",
              }}
            >
              <div className="text-sm muted">
                Secondary trading is not implemented in Phase 0. These values
                only reflect active primary-sale liquidity.
              </div>
            </div>
          </div>

          <div className="card card-pad-lg">
            <div className="fw-800 text-lg">Referências do token</div>
            <div className="col col-gap mt-24">
              <div>
                <div className="muted text-xs">Token de valor</div>
                <div className="mono text-sm mt-12">
                  {property.valueTokenAddress ? truncate(property.valueTokenAddress, 10, 8) : "Não sincronizado"}
                </div>
              </div>
              <div>
                <div className="muted text-xs">Carteira do proprietário</div>
                <div className="mono text-sm mt-12">
                  {property.ownerWallet ? truncate(property.ownerWallet, 10, 8) : "Desconhecido"}
                </div>
              </div>
              <button className="btn btn-neutral w-100" onClick={() => navigate("transactions")}>
                Ver atividade <IconExternal size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
