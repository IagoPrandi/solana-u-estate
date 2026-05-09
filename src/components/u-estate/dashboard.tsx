"use client";

import { formatUnits } from "./data";
import { formatUsdFromFiatRates } from "./fiat-rates";
import { getWalletHoldings } from "./holdings";
import { listingIdentity } from "./listing-identity";
import { useFiatRates } from "./use-fiat-rates";
import {
  IconArrowRight,
  IconCheck,
  IconClock,
  IconMapPin,
  IconPlus,
  IconSparkles,
  IconStore,
} from "./icons";
import {
  HashChip,
  OfferCard,
  PageHeader,
  PropertyCard,
  PropThumbArt,
} from "./ui";
import type {
  Listing,
  Navigate,
  Property,
  Role,
  Transaction,
  User,
} from "./types";

function OwnerDashboard({
  properties,
  transactions,
  navigate,
}: {
  properties: Property[];
  transactions: Transaction[];
  navigate: Navigate;
}) {
  const fiatRates = useFiatRates();
  const totalProps = properties.length;
  const inReview = properties.filter(
    (p) => p.status === "PendingMockVerification",
  ).length;
  const readyToPublish = properties.filter(
    (p) =>
      p.status === "MockVerified" ||
      p.status === "Tokenized",
  ).length;
  const onSale = properties.filter((p) => p.status === "ActiveSale").length;
  const totalCapturedSOL = properties.reduce(
    (acc, p) =>
      acc +
      Number(p.marketValueEth) *
        (p.soldFreeValueUnits / p.totalValueUnits),
    0,
  );

  const recommended =
    properties.find(
      (p) =>
        p.status === "MockVerified" ||
        p.status === "Tokenized",
    ) ??
    properties.find((p) => p.status === "PendingMockVerification") ??
    properties[0];

  const recommendedAction = (() => {
    if (!recommended) return null;
    if (recommended.status === "PendingMockVerification") {
      return {
        title: `${recommended.title} está em análise`,
        body: "Document validation is required before this property can be tokenized.",
        cta: "Ver detalhes",
        go: () => navigate("property", { id: recommended.id }),
        muted: true,
      };
    }
    if (recommended.status === "MockVerified") {
      return {
        title: `Tokenize ${recommended.title}`,
        body: "Your property registration was validated. Tokenize it to generate the use right and value right.",
        cta: "Tokenizar imóvel",
        go: () => navigate("property", { id: recommended.id }),
        muted: false,
      };
    }
    if (recommended.status === "Tokenized") {
      return {
        title: `Disponibilize ${recommended.title}`,
        body: `Seu imóvel já está tokenizado. Você pode captar até ${(
          Number(recommended.marketValueEth) *
          (recommended.freeValueUnits / recommended.totalValueUnits)
        ).toFixed(3)} SOL liberando uma parte do imóvel.`,
        cta: "Disponibilizar agora",
        go: () => navigate("property-publish", { id: recommended.id }),
        muted: false,
      };
    }
    return null;
  })();

  return (
    <div className="page">
      <PageHeader
        title="Bem-vinda de volta"
        subtitle="Acompanhe seus imóveis e quanto cada um já captou."
        actions={
          <button
            className="btn btn-primary"
            onClick={() => navigate("property-new")}
          >
            <IconPlus size={16} /> Cadastrar imóvel
          </button>
        }
      />

      <div className="grid-4 mb-32">
        <div className="stat">
          <div className="blob" />
          <div className="stat-label">Imóveis</div>
          <div className="stat-value">{totalProps}</div>
          <div className="stat-delta" style={{ color: "var(--color-muted)" }}>
            {onSale} disponíveis
          </div>
        </div>
        <div className="stat">
          <div className="stat-label">Em análise</div>
          <div className="stat-value">{inReview}</div>
          <div className="stat-delta" style={{ color: "var(--color-muted)" }}>
            até 24h
          </div>
        </div>
        <div className="stat">
          <div className="stat-label">Prontos para publicar</div>
          <div className="stat-value">{readyToPublish}</div>
          <div className="stat-delta" style={{ color: "var(--color-orange)" }}>
            aguardando você
          </div>
        </div>
        <div className="stat">
          <div className="stat-label">Já captado</div>
          <div className="stat-value mono">{totalCapturedSOL.toFixed(3)}</div>
          <div className="stat-delta" style={{ color: "var(--color-muted)" }}>
            SOL · ≈ {formatUsdFromFiatRates(totalCapturedSOL, fiatRates)}
          </div>
        </div>
      </div>

      {recommendedAction && !recommendedAction.muted && (
        <div
          className="card mb-32"
          style={{
            padding: 28,
            background:
              "linear-gradient(135deg, #fff0e5 0%, #ffffff 60%)",
            border: "1px solid var(--color-orange)",
          }}
        >
          <div
            className="row-between"
            style={{
              alignItems: "flex-start",
              flexWrap: "wrap",
              gap: 16,
            }}
          >
            <div
              className="col col-gap-sm"
              style={{ flex: 1, minWidth: 280 }}
            >
              <div
                className="row row-gap-sm"
                style={{
                  color: "var(--color-orange-muted)",
                  fontWeight: 700,
                  fontSize: 13,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                <IconSparkles size={14} /> Próximo passo
              </div>
              <div className="text-2xl fw-800">{recommendedAction.title}</div>
              <div
                className="muted text-sm"
                style={{ maxWidth: 540, lineHeight: 1.55 }}
              >
                {recommendedAction.body}
              </div>
            </div>
            <button
              className="btn btn-primary btn-lg"
              onClick={recommendedAction.go}
            >
              {recommendedAction.cta} <IconArrowRight size={16} />
            </button>
          </div>
        </div>
      )}
      {recommendedAction && recommendedAction.muted && (
        <div
          className="card card-pad-lg mb-32"
          style={{ borderLeft: "4px solid var(--color-orange)" }}
        >
          <div className="row-between" style={{ flexWrap: "wrap", gap: 16 }}>
            <div
              className="col col-gap-sm"
              style={{ flex: 1, minWidth: 280 }}
            >
              <div
                className="row row-gap-sm"
                style={{
                  color: "var(--color-orange-muted)",
                  fontWeight: 700,
                  fontSize: 13,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                <IconClock size={14} /> Em análise
              </div>
              <div className="text-xl fw-800">{recommendedAction.title}</div>
              <div className="muted text-sm" style={{ maxWidth: 540 }}>
                {recommendedAction.body}
              </div>
            </div>
            <button
              className="btn btn-neutral"
              onClick={recommendedAction.go}
            >
              {recommendedAction.cta}
            </button>
          </div>
        </div>
      )}

      <div className="grid-2-1">
        <div>
          <div className="row-between mb-16">
            <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>
              Seus imóveis
            </h2>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => navigate("properties")}
            >
              Ver todos <IconArrowRight size={14} />
            </button>
          </div>
          <div className="grid-2">
            {properties.slice(0, 4).map((p) => (
              <PropertyCard
                key={p.id}
                p={p}
                onClick={() => navigate("property", { id: p.id })}
              />
            ))}
          </div>
        </div>

        <div className="col col-gap">
          <div className="card card-pad">
            <div className="row-between mb-16">
              <div className="fw-800 text-lg">Atividade recente</div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => navigate("transactions")}
              >
                Tudo
              </button>
            </div>
            <div className="col col-gap">
              {transactions.slice(0, 5).map((t) => (
                <div
                  key={t.id}
                  className="row row-gap"
                  style={{
                    paddingBottom: 12,
                    borderBottom: "1px dashed var(--color-border)",
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 12,
                      background: "var(--color-orange-soft)",
                      display: "grid",
                      placeItems: "center",
                      color: "var(--color-orange)",
                    }}
                  >
                    <IconCheck size={16} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="fw-700 text-sm">{t.type}</div>
                    <div
                      className="muted text-xs"
                      style={{
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {t.propertyTitle}
                    </div>
                  </div>
                  <HashChip hash={t.txHash} />
                </div>
              ))}
            </div>
          </div>

          <div
            className="card card-pad"
            style={{
              background: "var(--color-charcoal)",
              color: "#fff",
              borderColor: "var(--color-charcoal)",
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                opacity: 0.6,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              Como funciona
            </div>
            <div className="text-lg fw-800 mt-12">
              Captação sem perder a casa
            </div>
            <div
              className="text-sm mt-12"
              style={{ opacity: 0.75, lineHeight: 1.55 }}
            >
              Você libera uma parte econômica do imóvel para investidores e
              mantém o direito de morar nele.
            </div>
            <button
              className="btn btn-secondary mt-16"
              style={{ background: "#fff", borderColor: "#fff" }}
              onClick={() => navigate("learn")}
            >
              Saber mais <IconArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BuyerDashboard({
  properties,
  listings,
  transactions,
  navigate,
  user,
}: {
  properties: Property[];
  listings: Listing[];
  transactions: Transaction[];
  navigate: Navigate;
  user: User;
}) {
  const fiatRates = useFiatRates();
  void transactions;
  const activeListings = listings.filter((l) => l.status === "Active");
  const enriched = activeListings
    .map((l) => ({
      ...l,
      property: properties.find((p) => p.propertyId === l.propertyId),
    }))
    .filter(
      (l): l is Listing & { property: Property } => Boolean(l.property),
    );
  const featured = enriched.slice(0, 3);

  const holdings = getWalletHoldings(properties, user.wallet);
  const totalInvested = holdings.reduce((s, h) => s + h.costEth, 0);
  const totalValue = holdings.reduce(
    (s, h) =>
      s +
      (Number(h.property.marketValueEth) * h.units) /
        h.property.totalValueUnits,
    0,
  );
  const pnl = totalValue - totalInvested;
  const pnlPct = totalInvested > 0 ? (pnl / totalInvested) * 100 : 0;

  return (
    <div className="page">
      <PageHeader
        title="Olá!"
        subtitle="Descubra imóveis disponíveis para investimento e acompanhe seu portfólio."
        actions={
          <button
            className="btn btn-primary"
            onClick={() => navigate("marketplace")}
          >
            <IconStore size={16} /> Explorar imóveis
          </button>
        }
      />

      <div className="grid-3 mb-32">
        <div className="card card-pad">
          <div
            className="muted text-xs"
            style={{
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              fontWeight: 600,
            }}
          >
            Investido
          </div>
          <div className="fw-800 text-2xl mono mt-12">
            {totalInvested.toFixed(3)} SOL
          </div>
          <div className="muted text-sm">
            ≈ {formatUsdFromFiatRates(totalInvested, fiatRates)}
          </div>
          <div
            className="text-xs mt-12"
            style={{ color: "var(--color-muted)" }}
          >
            {holdings.length} imóveis
          </div>
        </div>
        <div className="card card-pad">
          <div
            className="muted text-xs"
            style={{
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              fontWeight: 600,
            }}
          >
            Valor atual
          </div>
          <div className="fw-800 text-2xl mono mt-12">
            {totalValue.toFixed(3)} SOL
          </div>
          <div className="muted text-sm">
            ≈ {formatUsdFromFiatRates(totalValue, fiatRates)}
          </div>
          <div
            className="text-xs mt-12"
            style={{
              color:
                pnl >= 0 ? "var(--color-success)" : "var(--color-danger)",
              fontWeight: 700,
            }}
          >
            {pnl >= 0 ? "+" : ""}
            {pnl.toFixed(4)} SOL ({pnlPct >= 0 ? "+" : ""}
            {pnlPct.toFixed(1)}%)
          </div>
        </div>
        <div
          className="card card-pad"
          style={{
            background: "var(--color-charcoal)",
            color: "#fff",
            borderColor: "var(--color-charcoal)",
          }}
        >
          <div
            className="text-xs"
            style={{
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              fontWeight: 600,
              color: "rgba(255,255,255,0.5)",
            }}
          >
            Disponível agora
          </div>
          <div className="fw-800 text-2xl mt-12">
            {enriched.length}{" "}
            <span
              style={{ fontSize: 16, opacity: 0.7, fontWeight: 500 }}
            >
              imóveis
            </span>
          </div>
          <div className="text-sm" style={{ opacity: 0.7 }}>
            aceitando investimentos
          </div>
          <button
            className="btn btn-secondary mt-16"
            style={{
              background: "var(--color-orange)",
              color: "#fff",
              borderColor: "var(--color-orange)",
            }}
            onClick={() => navigate("marketplace")}
          >
            Ver tudo <IconArrowRight size={14} />
          </button>
        </div>
      </div>

      <div className="row-between mb-16">
        <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>
          Imóveis para investir
        </h2>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => navigate("marketplace")}
        >
          Ver todos <IconArrowRight size={14} />
        </button>
      </div>
      <div className="grid-3 mb-32">
        {featured.map((l) => (
          <OfferCard
            key={listingIdentity(l)}
            listing={l}
            property={l.property}
            onClick={() => navigate("listing", { id: listingIdentity(l) })}
          />
        ))}
      </div>

      <div className="grid-2-1">
        <div className="card card-pad-lg">
          <div className="row-between mb-16">
            <div className="fw-800 text-lg">Seus investimentos</div>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => navigate("portfolio")}
            >
              Tudo <IconArrowRight size={14} />
            </button>
          </div>
          <div className="col col-gap">
            {holdings.map((h, i) => {
              const valueEth =
                (Number(h.property.marketValueEth) * h.units) /
                h.property.totalValueUnits;
              const hpnl = valueEth - h.costEth;
              const hpnlPct = h.costEth > 0 ? (hpnl / h.costEth) * 100 : 0;
              return (
                <div
                  key={i}
                  className="row row-gap"
                  style={{
                    padding: 12,
                    borderRadius: "var(--radius-md)",
                    cursor: "pointer",
                  }}
                  onClick={() =>
                    navigate("investment", { id: h.property.id })
                  }
                >
                  <div
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: 12,
                      overflow: "hidden",
                      position: "relative",
                      flexShrink: 0,
                    }}
                  >
                    <PropThumbArt variant={h.property.thumbVariant} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="fw-700 text-sm">{h.property.title}</div>
                    <div
                      className="muted text-xs row row-gap-sm"
                      style={{ marginTop: 2 }}
                    >
                      <IconMapPin size={11} />
                      {h.property.city}, {h.property.state}
                    </div>
                    <div className="text-xs mt-12 muted">
                      {((h.units / h.property.totalValueUnits) * 100).toFixed(
                        2,
                      )}
                      % · {formatUnits(h.units)} unidades
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="mono fw-700 text-base">
                      {valueEth.toFixed(4)} SOL
                    </div>
                    <div
                      className="text-xs fw-700"
                      style={{
                        color:
                          hpnl >= 0
                            ? "var(--color-success)"
                            : "var(--color-danger)",
                      }}
                    >
                      {hpnl >= 0 ? "+" : ""}
                      {hpnlPct.toFixed(1)}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div
          className="card card-pad"
          style={{
            background: "var(--color-charcoal)",
            color: "#fff",
            borderColor: "var(--color-charcoal)",
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              opacity: 0.6,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Para investidores
          </div>
          <div className="text-lg fw-800 mt-12">Como funciona</div>
          <div
            className="text-sm mt-12"
            style={{ opacity: 0.75, lineHeight: 1.55 }}
          >
            Você compra uma participação econômica em imóveis verificados.
            Quando o imóvel valoriza, sua participação valoriza junto.
          </div>
          <button
            className="btn btn-secondary mt-16"
            style={{ background: "#fff", borderColor: "#fff" }}
            onClick={() => navigate("learn")}
          >
            Saber mais <IconArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function DashboardPage({
  properties,
  listings,
  transactions,
  navigate,
  role,
  user,
}: {
  properties: Property[];
  listings: Listing[];
  transactions: Transaction[];
  navigate: Navigate;
  role: Role;
  user: User;
}) {
  if (role === "buyer")
    return (
      <BuyerDashboard
        properties={properties}
        listings={listings}
        transactions={transactions}
        navigate={navigate}
        user={user}
      />
    );
  return (
    <OwnerDashboard
      properties={properties}
      transactions={transactions}
      navigate={navigate}
    />
  );
}
