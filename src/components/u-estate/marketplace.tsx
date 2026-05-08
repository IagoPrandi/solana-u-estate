"use client";

import { useMemo, useState } from "react";
import type { AppActions } from "./app";
import { ethToWei } from "./actions";
import {
  formatBrl,
  formatEth,
  formatUnits,
  formatUsd,
} from "./data";
import { lamportsToSolDecimal } from "@/lib/solana/instructions";
import {
  IconCheck,
  IconCoins,
  IconSearch,
  IconShield,
} from "./icons";
import {
  EmptyState,
  OfferCard,
  PageHeader,
  PropThumbArt,
  TxModal,
  ValueSplit,
} from "./ui";
import { listingIdentity } from "./listing-identity";
import { isTxPending } from "./transaction-guards";
import type {
  Listing,
  Navigate,
  Property,
  TxStep,
} from "./types";

export function MarketplacePage({
  properties,
  listings,
  navigate,
}: {
  properties: Property[];
  listings: Listing[];
  navigate: Navigate;
}) {
  const [city, setCity] = useState("all");
  const [sort, setSort] = useState("recent");
  const [query, setQuery] = useState("");
  const [budget, setBudget] = useState("all");

  const cities = useMemo(
    () => ["all", ...Array.from(new Set(properties.map((p) => p.city)))],
    [properties],
  );

  const enriched = useMemo(() => {
    return listings
      .filter((l) => l.status === "Active")
      .map((l) => ({
        ...l,
        property: properties.find((p) => p.propertyId === l.propertyId),
      }))
      .filter(
        (l): l is Listing & { property: Property } => Boolean(l.property),
      )
      .filter((l) => city === "all" || l.property.city === city)
      .filter((l) => {
        if (budget === "all") return true;
        const min = (Number(l.priceWei) / l.amount) * 1000;
        if (budget === "low") return min < 0.005;
        if (budget === "mid") return min >= 0.005 && min < 0.05;
        return min >= 0.05;
      })
      .filter(
        (l) =>
          !query ||
          l.property.title.toLowerCase().includes(query.toLowerCase()) ||
          l.property.city.toLowerCase().includes(query.toLowerCase()),
      )
      .sort((a, b) => {
        if (sort === "price_asc")
          return (
            Number(a.priceWei) / a.amount - Number(b.priceWei) / b.amount
          );
        if (sort === "price_desc")
          return (
            Number(b.priceWei) / b.amount - Number(a.priceWei) / a.amount
          );
        if (sort === "amount_desc") return b.amount - a.amount;
        return (
          new Date(b.listedAt).getTime() - new Date(a.listedAt).getTime()
        );
      });
  }, [listings, properties, city, sort, query, budget]);

  const totalAvailableEth = enriched.reduce(
    (s, l) => s + Number(l.priceWei),
    0,
  );
  const minTicket =
    enriched.length > 0
      ? Math.min(
          ...enriched.map((l) => (Number(l.priceWei) / l.amount) * 1000),
        )
      : 0;

  return (
    <div className="page">
      <div
        className="card card-pad-lg mb-32"
        style={{
          background:
            "linear-gradient(120deg, var(--color-charcoal) 0%, #1f2120 100%)",
          color: "#fff",
          borderColor: "var(--color-charcoal)",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -80,
            right: -80,
            width: 320,
            height: 320,
            borderRadius: "50%",
            background: "var(--color-orange)",
            opacity: 0.18,
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -60,
            right: 120,
            width: 180,
            height: 180,
            borderRadius: "50%",
            background: "var(--color-orange)",
            opacity: 0.1,
          }}
        />
        <div style={{ position: "relative", maxWidth: 720 }}>
          <div
            className="text-xs"
            style={{
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "var(--color-orange)",
              fontWeight: 700,
            }}
          >
            Investir em imóveis
          </div>
          <h1
            style={{
              fontSize: 44,
              fontWeight: 800,
              marginTop: 16,
              lineHeight: 1.1,
            }}
          >
            Imóveis verificados, a partir de{" "}
            <span style={{ color: "var(--color-orange)" }}>0.001 SOL</span>.
          </h1>
          <p
            style={{
              marginTop: 16,
              fontSize: 16,
              lineHeight: 1.55,
              opacity: 0.8,
              maxWidth: 560,
            }}
          >
            Compre uma participação no valor econômico de imóveis reais. Você
            ganha conforme o imóvel valoriza, sem precisar comprar a casa
            inteira.
          </p>
          <div className="row row-gap-lg mt-24" style={{ flexWrap: "wrap" }}>
            <div>
              <div
                className="text-xs"
                style={{
                  opacity: 0.6,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  fontWeight: 600,
                }}
              >
                Disponível agora
              </div>
              <div className="fw-800 text-2xl mono mt-12">
                {totalAvailableEth.toFixed(2)} SOL
              </div>
            </div>
            <div
              style={{ height: 40, width: 1, background: "rgba(255,255,255,0.2)" }}
            />
            <div>
              <div
                className="text-xs"
                style={{
                  opacity: 0.6,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  fontWeight: 600,
                }}
              >
                A partir de
              </div>
              <div className="fw-800 text-2xl mono mt-12">
                {minTicket.toFixed(4)} SOL
              </div>
            </div>
            <div
              style={{ height: 40, width: 1, background: "rgba(255,255,255,0.2)" }}
            />
            <div>
              <div
                className="text-xs"
                style={{
                  opacity: 0.6,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  fontWeight: 600,
                }}
              >
                Imóveis
              </div>
              <div className="fw-800 text-2xl mt-12">{enriched.length}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="filter-row">
        <div className="search-input">
          <IconSearch size={16} />
          <input
            placeholder="Buscar imóvel ou cidade…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="row row-gap" style={{ flexWrap: "wrap" }}>
          <select
            className="select"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            style={{ minWidth: 160 }}
          >
            {cities.map((c) => (
              <option key={c} value={c}>
                {c === "all" ? "Todas as cidades" : c}
              </option>
            ))}
          </select>
          <select
            className="select"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            style={{ minWidth: 180 }}
          >
            <option value="all">Qualquer ticket</option>
            <option value="low">Up to 0.005 SOL</option>
            <option value="mid">0.005-0.05 SOL</option>
            <option value="high">0.05+ SOL</option>
          </select>
          <select
            className="select"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            style={{ minWidth: 200 }}
          >
            <option value="recent">Mais recentes</option>
            <option value="price_asc">Menor ticket primeiro</option>
            <option value="price_desc">Maior ticket primeiro</option>
            <option value="amount_desc">Maior fração</option>
          </select>
        </div>
      </div>

      <div className="row-between mb-16 mt-24">
        <div className="muted text-sm">
          <strong style={{ color: "var(--color-charcoal)" }}>
            {enriched.length}
          </strong>{" "}
          imóveis disponíveis
        </div>
      </div>

      {enriched.length === 0 ? (
        <EmptyState
          title="Nenhum imóvel encontrado"
          sub="Tente ajustar os filtros ou volte mais tarde."
        />
      ) : (
        <div className="grid-3">
          {enriched.map((l) => (
            <OfferCard
              key={listingIdentity(l)}
              listing={l}
              property={l.property}
              onClick={() => navigate("listing", { id: listingIdentity(l) })}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function ListingDetailPage({
  listing,
  property,
  navigate,
  actions,
  walletAddress,
}: {
  listing: Listing | undefined;
  property: Property | undefined;
  navigate: Navigate;
  actions: AppActions;
  walletAddress?: string;
}) {
  const minUnits = 1000;
  const initialUnits = listing
    ? actions.ready
      ? listing.amount
      : Math.min(5000, Math.max(minUnits, listing.amount))
    : 0;
  const [units, setUnits] = useState(initialUnits);
  const [tx, setTx] = useState<{ open: boolean; step: TxStep }>({
    open: false,
    step: "sign",
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const txPending = isTxPending(tx.open, tx.step);

  if (!listing || !property)
    return (
      <div className="page">
        <h2>Oferta não encontrada</h2>
      </div>
    );

  const TOTAL_VALUE_UNITS = 1_000_000n;
  const marketValueWei = ethToWei(property.marketValueEth);
  const selectedUnits = actions.ready ? listing.amount : units;
  const payWei = actions.ready
    ? ethToWei(listing.priceWei)
    : (marketValueWei * BigInt(selectedUnits)) / TOTAL_VALUE_UNITS;
  const totalPrice = Number(lamportsToSolDecimal(payWei, 9));
  const pricePerUnit =
    listing.amount > 0
      ? Number(listing.priceWei) / listing.amount
      : 0;
  const pctOfProp = (selectedUnits / property.totalValueUnits) * 100;
  const offerPctOfProp = (listing.amount / property.totalValueUnits) * 100;
  const isSellerWallet =
    Boolean(walletAddress) &&
    walletAddress?.toLowerCase() === listing.seller.toLowerCase();
  const isOnchainLinked = Boolean(listing.localPropertyId);
  const buyDisabled =
    isSellerWallet || !actions.ready || (actions.ready && !isOnchainLinked);
  const buyDisabledMessage = isSellerWallet
    ? "Conecte uma carteira compradora diferente da carteira vendedora desta oferta."
    : !actions.ready
      ? "Connect a Solana Devnet wallet with the configured program before buying a listing."
    : actions.ready && !isOnchainLinked
      ? "This listing is not linked to the current local on-chain record. Refresh before buying."
      : null;

  const start = async () => {
    setErrorMessage(null);
    if (txPending) return;
    if (buyDisabledMessage) {
      setErrorMessage(buyDisabledMessage);
      return;
    }
    setTx({ open: true, step: "sign" });
    try {
      await actions.buyListing(
        property.id,
        listing.listingId,
        selectedUnits,
        payWei,
        (s) => setTx({ open: true, step: s }),
      );
    } catch (error) {
      setTx({ open: false, step: "sign" });
      setErrorMessage(
        error instanceof Error ? error.message : "Falha ao concluir compra.",
      );
    }
  };
  const finish = () => {
    setTx({ open: false, step: "sign" });
    navigate("portfolio");
  };

  return (
    <div className="page">
      <PageHeader
        crumb={
          <>
            <a onClick={() => navigate("marketplace")}>Investir</a>
            <span>/</span>
            <span>{property.title}</span>
          </>
        }
        title={property.title}
        subtitle={`${property.city}, ${property.state}`}
      />
      <div className="grid-2-1">
        <div className="col col-gap-lg">
          <div className="card" style={{ overflow: "hidden" }}>
            <div className="prop-thumb" style={{ height: 360 }}>
              <PropThumbArt variant={property.thumbVariant} />
              <div className="prop-thumb-overlay">
                <div className="prop-thumb-tags">
                  <span
                    className="badge"
                    style={{
                      background: "rgba(255,255,255,0.92)",
                      color: "var(--color-charcoal)",
                    }}
                  >
                    <IconShield size={10} /> Verificado
                  </span>
                  <span
                    className="badge"
                    style={{
                      background: "rgba(255,255,255,0.92)",
                      color: "var(--color-charcoal)",
                    }}
                  >
                    {property.documents.length} documentos
                  </span>
                </div>
                <div className="prop-thumb-bottom">
                  <span className="badge badge-orange">
                    <strong>{offerPctOfProp.toFixed(2)}%</strong> deste imóvel
                    disponível
                  </span>
                </div>
              </div>
            </div>
            <div className="card-pad-lg">
              <div className="grid-3">
                <div>
                  <div
                    className="muted text-xs"
                    style={{
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      fontWeight: 600,
                    }}
                  >
                    Avaliação total
                  </div>
                  <div className="fw-800 text-xl mono mt-12">
                    {formatEth(property.marketValueEth)}
                  </div>
                  <div className="muted text-sm">
                    ≈ {formatUsd(property.marketValueEth)}
                  </div>
                </div>
                <div>
                  <div
                    className="muted text-xs"
                    style={{
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      fontWeight: 600,
                    }}
                  >
                    Investimento mínimo
                  </div>
                  <div className="fw-800 text-xl mono mt-12">
                    {(pricePerUnit * minUnits).toFixed(4)} SOL
                  </div>
                  <div className="muted text-sm">
                    ≈ {formatUsd(pricePerUnit * minUnits)}
                  </div>
                </div>
                <div>
                  <div
                    className="muted text-xs"
                    style={{
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      fontWeight: 600,
                    }}
                  >
                    Disponível nesta oferta
                  </div>
                  <div className="fw-800 text-xl mono mt-12">
                    {Number(listing.priceWei).toFixed(3)} SOL
                  </div>
                  <div className="muted text-sm">
                    {formatUnits(listing.amount)} unidades
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card card-pad-lg">
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>
              Sobre o imóvel
            </h3>
            <p
              style={{
                marginTop: 12,
                color: "var(--color-charcoal-soft)",
                lineHeight: 1.6,
              }}
            >
              {property.description}
            </p>
            <div className="grid-2 mt-24">
              <div>
                <div
                  className="muted text-xs"
                  style={{
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    fontWeight: 600,
                  }}
                >
                  Localização
                </div>
                <div className="text-sm mt-12">
                  {property.city}/{property.state}
                  <br />
                  {property.country}
                </div>
              </div>
              <div>
                <div
                  className="muted text-xs"
                  style={{
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    fontWeight: 600,
                  }}
                >
                  Endereço completo
                </div>
                <div className="text-sm mt-12 muted">
                  Disponível após a compra
                </div>
              </div>
            </div>
          </div>

          <div className="card card-pad-lg">
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>
              O que você está comprando
            </h3>
            <div className="muted text-sm mt-12">
              Uma participação econômica no imóvel — não a casa em si.
            </div>
            <div className="grid-2 mt-24">
              <div
                className="card-pad"
                style={{
                  background: "var(--color-success-soft)",
                  borderRadius: "var(--radius-md)",
                }}
              >
                <div
                  className="row row-gap-sm"
                  style={{ color: "var(--color-success)" }}
                >
                  <IconCheck size={16} />
                  <strong className="text-sm">Você compra</strong>
                </div>
                <ul
                  className="text-sm mt-12"
                  style={{
                    paddingLeft: 20,
                    margin: 0,
                    lineHeight: 1.7,
                    color: "var(--color-charcoal-soft)",
                  }}
                >
                  <li>Participação no valor econômico</li>
                  <li>Direito a valorização do imóvel</li>
                  <li>Possibilidade de revender no marketplace</li>
                </ul>
              </div>
              <div
                className="card-pad"
                style={{
                  background: "var(--color-surface-soft)",
                  borderRadius: "var(--radius-md)",
                }}
              >
                <div className="row row-gap-sm muted">
                  <IconShield size={16} />
                  <strong
                    className="text-sm"
                    style={{ color: "var(--color-charcoal)" }}
                  >
                    Você não compra
                  </strong>
                </div>
                <ul
                  className="text-sm mt-12 muted"
                  style={{ paddingLeft: 20, margin: 0, lineHeight: 1.7 }}
                >
                  <li>Direito de morar ou usar o imóvel</li>
                  <li>Posse física ou chaves</li>
                  <li>Decisões sobre o imóvel</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="card card-pad-lg">
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>
              Como o imóvel está dividido
            </h3>
            <div className="mt-24">
              <ValueSplit p={property} />
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
            <div className="row row-gap mb-12">
              <IconShield size={18} style={{ color: "var(--color-orange)" }} />
              <div className="fw-700">Por que esta oferta é confiável</div>
            </div>
            <ul
              className="text-sm"
              style={{ opacity: 0.8, paddingLeft: 16, margin: 0, lineHeight: 1.7 }}
            >
              <li>Documentos do imóvel validados pela equipe u-estate</li>
              <li>Hashes registrados publicamente, auditáveis</li>
              <li>Preço calculado automaticamente pela avaliação</li>
              <li>Operações registradas em blockchain</li>
            </ul>
          </div>
        </div>

        <div
          className="col col-gap-lg"
          style={{ position: "sticky", top: 24, alignSelf: "start" }}
        >
          <div className="card card-pad-lg">
            <div
              className="muted text-xs"
              style={{
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                fontWeight: 600,
              }}
            >
              Investir neste imóvel
            </div>
            <div className="fw-800 text-2xl mt-12">
              Quanto você quer investir?
            </div>

            <div className="field mt-24">
              <label className="field-label">
                Tamanho da sua participação
              </label>
              <input
                type="range"
                className="range-orange"
                min={Math.min(minUnits, listing.amount)}
                max={listing.amount}
                step="1000"
                value={selectedUnits}
                disabled={actions.ready || txPending}
                onChange={(e) => setUnits(Number(e.target.value))}
              />
              <div className="row-between text-xs muted mt-12">
                <span>Mínimo</span>
                <strong
                  style={{
                    color: "var(--color-charcoal)",
                    fontSize: 18,
                    fontWeight: 800,
                  }}
                >
                  {pctOfProp.toFixed(3)}%
                </strong>
                <span>Máximo desta oferta</span>
              </div>
            </div>

            <div
              className="card-pad"
              style={{
                background: "var(--color-orange-soft)",
                borderRadius: "var(--radius-md)",
                marginTop: 16,
              }}
            >
              <div
                className="text-xs muted"
                style={{
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  fontWeight: 600,
                  color: "var(--color-orange-muted)",
                }}
              >
                Você pagará
              </div>
              <div
                className="fw-800 mono text-3xl mt-12"
                style={{ color: "var(--color-charcoal)" }}
              >
                {totalPrice.toFixed(6)} SOL
              </div>
              <div
                className="text-sm mt-12"
                style={{ color: "var(--color-charcoal-soft)" }}
              >
                ≈ {formatUsd(totalPrice)} · {formatBrl(totalPrice)}
              </div>
            </div>

            <div className="col col-gap-sm mt-24">
              <div className="row-between">
                <span className="muted text-sm">
                  Sua participação no imóvel
                </span>
                <strong>{pctOfProp.toFixed(3)}%</strong>
              </div>
              <div className="row-between">
                <span className="muted text-sm">Unidades</span>
                <strong>{formatUnits(selectedUnits)}</strong>
              </div>
            </div>

            <button
              className="btn btn-primary btn-lg w-100 mt-24"
              disabled={buyDisabled || txPending}
              onClick={() => {
                void start();
              }}
            >
              <IconCoins size={16} /> Investir agora
            </button>
            {buyDisabledMessage && (
              <div
                className="card-pad mt-16"
                style={{
                  background: "var(--color-warning-soft)",
                  borderRadius: "var(--radius-md)",
                  color: "var(--color-warning)",
                }}
              >
                <div className="text-sm fw-700">Compra indisponivel</div>
                <div className="text-sm mt-12">{buyDisabledMessage}</div>
              </div>
            )}
            <div
              className="text-xs muted mt-12"
              style={{ textAlign: "center" }}
            >
              Você confirma na sua carteira antes de pagar.
            </div>
            {errorMessage && (
              <div
                className="card-pad mt-16"
                style={{
                  background: "var(--color-danger-soft)",
                  borderRadius: "var(--radius-md)",
                  color: "var(--color-danger)",
                }}
              >
                <div className="text-sm fw-700">Falha na compra</div>
                <div className="text-sm mt-12">{errorMessage}</div>
              </div>
            )}
          </div>
        </div>
      </div>
      <TxModal
        open={tx.open}
        step={tx.step}
        title="Concluindo investimento"
        successLabel="Ver portfólio"
        onClose={
          tx.step === "done"
            ? finish
            : () => setTx({ open: false, step: "sign" })
        }
      />
    </div>
  );
}
