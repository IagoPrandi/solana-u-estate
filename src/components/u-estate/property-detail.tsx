"use client";

import { useState } from "react";
import type { AppActions } from "./app";
import { formatBrl, formatEth, formatUnits, formatUsd } from "./data";
import { listingIdentity } from "./listing-identity";
import {
  IconArrowRight,
  IconCheck,
  IconChevronRight,
  IconClock,
  IconEye,
  IconFile,
  IconLayers,
  IconMapPin,
  IconShield,
  IconSparkles,
} from "./icons";
import {
  HashChip,
  PageHeader,
  PropThumbArt,
  StatusPill,
  TxModal,
  ValueSplit,
} from "./ui";
import type {
  Listing,
  Navigate,
  Property,
  PropertyStatus,
  TxStep,
} from "./types";
import type { WalletState } from "./wallet";

function ownerJourney(p: Property) {
  return [
    {
      key: "register",
      label: "Imóvel cadastrado",
      sub: "Documentos enviados.",
      done: true,
      active: false,
    },
    {
      key: "review",
      label: p.status === "Rejected" ? "Análise reprovada" : "Análise",
      sub:
        p.status === "Rejected"
          ? p.rejection?.reason ?? "Documentação rejeitada pelo validador."
          : p.status === "PendingMockVerification"
            ? "Validando documentos com a equipe…"
            : "Documentos validados.",
      done: (
        ["MockVerified", "Tokenized", "ActiveSale", "SoldOut"] as PropertyStatus[]
      ).includes(p.status),
      active:
        p.status === "PendingMockVerification" || p.status === "Rejected",
    },
    {
      key: "publish",
      label: "Publicar",
      sub:
        p.status === "ActiveSale"
          ? "Oferta no ar."
          : p.status === "SoldOut"
            ? "Oferta concluída."
            : "Defina quanto quer captar.",
      done: (["ActiveSale", "SoldOut"] as PropertyStatus[]).includes(p.status),
      active: (["MockVerified", "Tokenized"] as PropertyStatus[]).includes(
        p.status,
      ),
    },
    {
      key: "capture",
      label: "Captação",
      sub:
        p.status === "SoldOut"
          ? "100% captado."
          : "Investidores adquirem participação.",
      done: p.status === "SoldOut",
      active: p.status === "ActiveSale",
    },
  ];
}

export function PropertyDetailPage({
  property,
  navigate,
  listings,
  actions,
  wallet,
  chainMode,
}: {
  property: Property | undefined;
  navigate: Navigate;
  listings: Listing[];
  actions: AppActions;
  wallet: WalletState;
  chainMode: boolean;
}) {
  const [showTech, setShowTech] = useState(false);
  const [tx, setTx] = useState<{
    open: boolean;
    step: TxStep;
    title: string;
  }>({ open: false, step: "sign", title: "" });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  void chainMode;

  const runChainAction = async (
    title: string,
    fn: (onStep: (s: TxStep) => void) => Promise<unknown>,
  ) => {
    setErrorMessage(null);
    setTx({ open: true, step: "sign", title });
    try {
      await fn((s) => setTx((prev) => ({ ...prev, step: s })));
    } catch (error) {
      setTx({ open: false, step: "sign", title });
      setErrorMessage(
        error instanceof Error ? error.message : "Operação falhou.",
      );
    }
  };
  if (!property)
    return (
      <div className="page">
        <h2>Imóvel não encontrado</h2>
      </div>
    );
  const p = property;
  const isOwner =
    !p.ownerWallet ||
    !wallet.address ||
    p.ownerWallet.toLowerCase() === wallet.address.toLowerCase();
  const journey = ownerJourney(p);
  const propListings = (listings ?? []).filter(
    (l) => l.propertyId === p.propertyId,
  );
  const soldPct = (p.soldFreeValueUnits / p.freeValueUnits) * 100 || 0;
  const availUnits = p.freeValueUnits - p.soldFreeValueUnits;
  const capturedEth =
    Number(p.marketValueEth) * (p.soldFreeValueUnits / p.totalValueUnits);
  const primary = (() => {
    if (p.status === "PendingMockVerification")
      return null;
    if (p.status === "MockVerified")
      return {
        label: "Tokenizar imóvel",
        go: () =>
          runChainAction("Tokenizando imóvel", (onStep) =>
            actions.tokenizeProperty(p.id, p.propertyId, onStep),
          ),
        disabled: false,
        primary: true,
      };
    if (p.status === "Tokenized")
      return {
        label: "Disponibilizar imóvel",
        go: () => navigate("property-publish", { id: p.id }),
        disabled: false,
        primary: true,
      };
    if (p.status === "ActiveSale")
      return {
        label: "Aumentar oferta",
        go: () => navigate("property-publish", { id: p.id }),
        disabled: false,
        primary: false,
      };
    return null;
  })();

  return (
    <div className="page">
      <PageHeader
        crumb={
          <>
            <a onClick={() => navigate("properties")}>Meus imóveis</a>
            <span>/</span>
            <span>{p.title}</span>
          </>
        }
        title={p.title}
        subtitle={`${p.street}, ${p.number} · ${p.city}/${p.state}`}
        actions={
          <>
            <StatusPill status={p.status} />
            {isOwner && primary &&
              (primary.disabled ? (
                <button className="btn btn-neutral" disabled>
                  <IconClock size={14} /> {primary.label}
                </button>
              ) : (
                <button
                  className={primary.primary ? "btn btn-primary" : "btn btn-neutral"}
                  onClick={primary.go ?? undefined}
                >
                  {primary.label} <IconArrowRight size={14} />
                </button>
              ))}
          </>
        }
      />

      {p.status === "Rejected" && p.rejection && (
        <div
          className="card card-pad mb-24"
          style={{
            background: "var(--color-danger-soft)",
            borderColor: "var(--color-danger)",
            borderLeft: "4px solid var(--color-danger)",
          }}
        >
          <div
            className="row row-gap fw-700 text-sm"
            style={{ color: "var(--color-danger)" }}
          >
            Análise reprovada pelo validador
          </div>
          <div
            className="text-sm mt-12"
            style={{ color: "var(--color-charcoal)", lineHeight: 1.55 }}
          >
            {p.rejection.reason}
          </div>
          <div className="muted text-xs" style={{ marginTop: 8 }}>
            Reprovado em{" "}
            {new Date(p.rejection.rejectedAt).toLocaleString("pt-BR")}
          </div>
        </div>
      )}

      <div className="grid-2-1">
        <div className="col col-gap-lg">
          <div className="card" style={{ overflow: "hidden" }}>
            <div className="prop-thumb" style={{ height: 280 }}>
              <PropThumbArt variant={p.thumbVariant} />
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
                    Avaliação do imóvel
                  </div>
                  <div className="fw-800 text-2xl mono mt-12">
                    {formatEth(p.marketValueEth)}
                  </div>
                  <div className="muted text-sm">
                    ≈ {formatUsd(p.marketValueEth)}
                  </div>
                </div>
                {p.status === "ActiveSale" || p.status === "SoldOut" ? (
                  <>
                    <div>
                      <div
                        className="muted text-xs"
                        style={{
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          fontWeight: 600,
                        }}
                      >
                        Já captado
                      </div>
                      <div
                        className="fw-800 text-2xl mono mt-12"
                        style={{ color: "var(--color-success)" }}
                      >
                        {capturedEth.toFixed(3)} ETH
                      </div>
                      <div className="muted text-sm">
                        {soldPct.toFixed(0)}% da oferta
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
                        Disponível
                      </div>
                      <div className="fw-800 text-2xl mt-12">
                        {((availUnits / p.totalValueUnits) * 100).toFixed(0)}%
                      </div>
                      <div className="muted text-sm">
                        {formatUnits(availUnits)} unidades
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <div
                        className="muted text-xs"
                        style={{
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          fontWeight: 600,
                        }}
                      >
                        Reservado pra você
                      </div>
                      <div className="fw-800 text-2xl mt-12">
                        {((p.linkedValueUnits / p.totalValueUnits) * 100).toFixed(
                          0,
                        )}
                        %
                      </div>
                      <div className="muted text-sm">
                        incluindo direito de morar
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
                        Pode ofertar até
                      </div>
                      <div className="fw-800 text-2xl mono mt-12">
                        {(
                          Number(p.marketValueEth) *
                          (p.freeValueUnits / p.totalValueUnits)
                        ).toFixed(3)}{" "}
                        ETH
                      </div>
                      <div className="muted text-sm">
                        {((p.freeValueUnits / p.totalValueUnits) * 100).toFixed(
                          0,
                        )}
                        % do imóvel
                      </div>
                    </div>
                  </>
                )}
              </div>
              {p.description && (
                <div
                  style={{
                    marginTop: 24,
                    paddingTop: 24,
                    borderTop: "1px dashed var(--color-border)",
                  }}
                >
                  <div
                    className="muted text-xs"
                    style={{
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      fontWeight: 600,
                    }}
                  >
                    Sobre o imóvel
                  </div>
                  <p
                    style={{
                      marginTop: 12,
                      color: "var(--color-charcoal-soft)",
                      lineHeight: 1.6,
                    }}
                  >
                    {p.description}
                  </p>
                </div>
              )}
            </div>
          </div>

          {(p.status === "ActiveSale" ||
            p.status === "SoldOut" ||
            p.status === "Tokenized") && (
            <div className="card card-pad-lg">
              <div className="row-between mb-16">
                <div>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>
                    Como o imóvel está dividido
                  </h3>
                  <div className="muted text-sm mt-12">
                    Você mantém o direito de morar e uma parte garantida.
                  </div>
                </div>
              </div>
              <ValueSplit p={p} />
            </div>
          )}

          {propListings.length > 0 && (
            <div className="card card-pad-lg">
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>
                Ofertas publicadas
              </h3>
              <div className="col col-gap mt-24">
                {propListings.map((l) => {
                  const lpct = (l.amount / p.totalValueUnits) * 100;
                  return (
                    <div
                      key={listingIdentity(l)}
                      className="row row-gap"
                      style={{
                        padding: 16,
                        background: "var(--color-surface-soft)",
                        borderRadius: "var(--radius-md)",
                      }}
                    >
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 12,
                          background:
                            l.status === "Active"
                              ? "var(--color-orange)"
                              : "var(--color-charcoal)",
                          color: "#fff",
                          display: "grid",
                          placeItems: "center",
                          flexShrink: 0,
                        }}
                      >
                        {l.status === "Active" ? (
                          <IconEye size={18} />
                        ) : (
                          <IconCheck size={18} />
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="fw-700 text-sm">
                          Oferta de {lpct.toFixed(2)}% ·{" "}
                          {formatUnits(l.amount)} unidades
                        </div>
                        <div className="muted text-xs">
                          Publicada em{" "}
                          {new Date(l.listedAt).toLocaleDateString("pt-BR")}
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-end",
                          gap: 8,
                        }}
                      >
                        <div className="mono fw-800 text-base">
                          {Number(l.priceWei).toFixed(4)} ETH
                        </div>
                        <span
                          className={
                            l.status === "Active"
                              ? "badge badge-orange badge-sm"
                              : l.status === "Cancelled"
                                ? "badge badge-danger badge-sm"
                                : "badge badge-success badge-sm"
                          }
                        >
                          {l.status === "Active"
                            ? "Ativa"
                            : l.status === "Cancelled"
                              ? "Cancelada"
                              : "Concluída"}
                        </span>
                        {isOwner && l.status === "Active" && (
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{
                              color: "var(--color-danger)",
                              padding: "4px 10px",
                            }}
                            onClick={() =>
                              void runChainAction(
                                "Cancelando oferta",
                                (onStep) =>
                                  actions.cancelListing(
                                    p.id,
                                    l.listingId,
                                    onStep,
                                  ),
                              )
                            }
                          >
                            Cancelar oferta
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="card card-pad-lg">
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>
              Documentos
            </h3>
            <div className="muted text-sm mt-12">
              Visíveis apenas para você e nossa equipe de análise.
            </div>
            <div className="col col-gap mt-24">
              {p.documents.map((d, i) => (
                <div
                  key={i}
                  className="row row-gap"
                  style={{
                    padding: 14,
                    background: "var(--color-surface-soft)",
                    borderRadius: "var(--radius-md)",
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: "var(--color-surface)",
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    <IconFile size={16} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="fw-700 text-sm">{d.filename}</div>
                    <div className="muted text-xs">
                      {d.type === "mock_deed"
                        ? "Matrícula"
                        : d.type === "mock_owner_id"
                          ? "Documento do proprietário"
                          : "IPTU"}
                    </div>
                  </div>
                  {(
                    [
                      "MockVerified",
                      "Tokenized",
                      "ActiveSale",
                      "SoldOut",
                    ] as PropertyStatus[]
                  ).includes(p.status) ? (
                    <span className="badge badge-success badge-sm">
                      <IconCheck size={10} /> Verificado
                    </span>
                  ) : (
                    <span className="badge badge-warning badge-sm">
                      <IconClock size={10} /> Em análise
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div
            className="card card-pad-lg"
            style={{ background: "var(--color-surface-soft)" }}
          >
            <button
              className="btn-ghost w-100"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: 0,
                color: "var(--color-charcoal)",
                fontWeight: 700,
              }}
              onClick={() => setShowTech((s) => !s)}
            >
              <span className="row row-gap-sm">
                <IconLayers size={16} /> Detalhes técnicos do registro on-chain
              </span>
              <IconChevronRight
                size={16}
                style={{
                  transform: showTech ? "rotate(90deg)" : "none",
                  transition: "transform 0.2s",
                }}
              />
            </button>
            {showTech && (
              <div className="mt-24 col col-gap">
                <div className="row-between">
                  <span className="muted text-sm">Hash da metadata</span>
                  <HashChip hash={p.metadataHash} />
                </div>
                <div className="row-between">
                  <span className="muted text-sm">Hash dos documentos</span>
                  <HashChip hash={p.documentsHash} />
                </div>
                <div className="row-between">
                  <span className="muted text-sm">Hash da localização</span>
                  <HashChip hash={p.locationHash} />
                </div>
                {p.valueTokenAddress && (
                  <div className="row-between">
                    <span className="muted text-sm">
                      Contrato de participações
                    </span>
                    <HashChip hash={p.valueTokenAddress} />
                  </div>
                )}
                <div
                  className="text-xs muted mt-12"
                  style={{ lineHeight: 1.5 }}
                >
                  Documentos ficam protegidos fora da blockchain. Apenas
                  hashes determinísticos são registrados publicamente.
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="col col-gap-lg">
          <div className="card card-pad-lg">
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>
              Jornada
            </h3>
            <div className="mt-24">
              {journey.map((s, i) => (
                <div
                  key={s.key}
                  className={
                    "timeline-item" +
                    (s.done ? " done" : "") +
                    (s.active ? " active" : "")
                  }
                >
                  <div className="timeline-dot">
                    {s.done ? (
                      <IconCheck size={14} />
                    ) : (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: s.active ? "#fff" : "var(--color-muted)",
                        }}
                      >
                        {i + 1}
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="tl-title">{s.label}</div>
                    <div className="tl-sub">{s.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {p.status === "PendingMockVerification" && (
            <div
              className="card card-pad"
              style={{
                background: "var(--color-orange-soft)",
                borderColor: "var(--color-orange)",
              }}
            >
              <div
                className="row row-gap"
                style={{ color: "var(--color-orange-muted)" }}
              >
                <IconClock size={18} />
                <div className="text-sm fw-700">Em análise</div>
              </div>
              <div
                className="text-sm mt-12"
                style={{
                  color: "var(--color-charcoal-soft)",
                  lineHeight: 1.55,
                }}
              >
                Nossa equipe está validando os documentos. Costuma levar até
                24h. Você será avisado por aqui assim que terminar.
              </div>
            </div>
          )}

          {isOwner && p.status === "MockVerified" && (
            <div
              className="card card-pad"
              style={{
                background: "var(--color-charcoal)",
                color: "#fff",
                borderColor: "var(--color-charcoal)",
              }}
            >
              <div className="text-sm fw-700">Pronto para tokenizar</div>
              <div
                className="text-sm mt-12"
                style={{ opacity: 0.75, lineHeight: 1.55 }}
              >
                Seus documentos foram aprovados. Tokenize para gerar o
                direito de uso e o direito sobre o valor.
              </div>
              <button
                className="btn btn-primary w-100 mt-16"
                onClick={() =>
                  void runChainAction("Tokenizando imóvel", (onStep) =>
                    actions.tokenizeProperty(p.id, p.propertyId, onStep),
                  )
                }
              >
                Tokenizar imóvel <IconArrowRight size={14} />
              </button>
            </div>
          )}

          {isOwner && p.status === "Tokenized" && (
            <div
              className="card card-pad"
              style={{
                background: "var(--color-charcoal)",
                color: "#fff",
                borderColor: "var(--color-charcoal)",
              }}
            >
              <div className="text-sm fw-700">Pronto para captar</div>
              <div
                className="text-sm mt-12"
                style={{ opacity: 0.75, lineHeight: 1.55 }}
              >
                O imóvel já está tokenizado. Em poucos cliques você publica
                uma oferta para investidores.
              </div>
              <button
                className="btn btn-primary w-100 mt-16"
                onClick={() => navigate("property-publish", { id: p.id })}
              >
                Disponibilizar imóvel <IconArrowRight size={14} />
              </button>
            </div>
          )}

          <div
            className="card card-pad"
            style={{
              background: "var(--color-charcoal)",
              color: "#fff",
              borderColor: "var(--color-charcoal)",
            }}
          >
            <div
              className="muted text-xs"
              style={{
                color: "rgba(255,255,255,0.5)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                fontWeight: 600,
              }}
            >
              Localização
            </div>
            <div className="mono text-sm mt-12" style={{ opacity: 0.8 }}>
              {p.lat}, {p.lng}
            </div>
            <div
              className="minimap mt-16"
              style={{ borderColor: "rgba(255,255,255,0.1)" }}
            />
          </div>

          {errorMessage && (
            <div
              className="card card-pad"
              style={{
                background: "var(--color-danger-soft)",
                borderColor: "var(--color-danger)",
                color: "var(--color-danger)",
              }}
            >
              <div className="text-sm fw-700">Operação falhou</div>
              <div className="text-sm mt-12">{errorMessage}</div>
            </div>
          )}
        </div>
      </div>
      <TxModal
        open={tx.open}
        step={tx.step}
        title={tx.title}
        successLabel="Continuar"
        onClose={() => setTx({ open: false, step: "sign", title: "" })}
      />
    </div>
  );
}

function PreviewSplit({
  p,
  newOfferPct,
}: {
  p: Property;
  newOfferPct: number;
}) {
  const linkedPct = (p.linkedValueUnits / p.totalValueUnits) * 100;
  const alreadySoldPct = (p.soldFreeValueUnits / p.totalValueUnits) * 100;
  const ownerKept = 100 - linkedPct - alreadySoldPct - newOfferPct;
  return (
    <div>
      <div className="value-split-bar">
        <div
          className="value-seg"
          style={{
            width: linkedPct + "%",
            background: "var(--color-charcoal)",
            color: "#fff",
          }}
        >
          <span
            style={{
              fontSize: 11,
              opacity: 0.7,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Reservado
          </span>
          <span className="pct">{linkedPct.toFixed(0)}%</span>
        </div>
        {ownerKept > 0 && (
          <div
            className="value-seg"
            style={{
              width: ownerKept + "%",
              background: "var(--color-cream)",
              color: "var(--color-charcoal)",
            }}
          >
            <span
              style={{
                fontSize: 11,
                opacity: 0.7,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Em carteira
            </span>
            <span className="pct">{ownerKept.toFixed(0)}%</span>
          </div>
        )}
        <div
          className="value-seg"
          style={{
            width: newOfferPct + "%",
            background: "var(--color-orange)",
            color: "#fff",
            borderRight: ownerKept > 0 ? "2px dashed #fff" : "none",
          }}
        >
          <span
            style={{
              fontSize: 11,
              opacity: 0.85,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Nova oferta
          </span>
          <span className="pct">{newOfferPct.toFixed(0)}%</span>
        </div>
        {alreadySoldPct > 0 && (
          <div
            className="value-seg"
            style={{
              width: alreadySoldPct + "%",
              background: "var(--color-orange-soft)",
              color: "var(--color-orange-muted)",
            }}
          >
            <span
              style={{
                fontSize: 11,
                opacity: 0.85,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Já captado
            </span>
            <span className="pct">{alreadySoldPct.toFixed(0)}%</span>
          </div>
        )}
      </div>
      <div
        className="row row-gap-lg text-sm muted mt-16"
        style={{ flexWrap: "wrap" }}
      >
        <div className="row row-gap-sm">
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: 3,
              background: "var(--color-charcoal)",
            }}
          />
          <span>
            Reservado pra você (com direito de morar):{" "}
            <strong style={{ color: "var(--color-charcoal)" }}>
              {linkedPct.toFixed(0)}%
            </strong>
          </span>
        </div>
        {ownerKept > 0 && (
          <div className="row row-gap-sm">
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 3,
                background: "var(--color-cream)",
                border: "1px solid var(--color-border)",
              }}
            />
            <span>
              Mantém em carteira:{" "}
              <strong style={{ color: "var(--color-charcoal)" }}>
                {ownerKept.toFixed(0)}%
              </strong>
            </span>
          </div>
        )}
        <div className="row row-gap-sm">
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: 3,
              background: "var(--color-orange)",
            }}
          />
          <span>
            Esta nova oferta:{" "}
            <strong style={{ color: "var(--color-charcoal)" }}>
              {newOfferPct.toFixed(0)}%
            </strong>
          </span>
        </div>
        {alreadySoldPct > 0 && (
          <div className="row row-gap-sm">
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 3,
                background: "var(--color-orange-soft)",
                border: "1px solid var(--color-orange)",
              }}
            />
            <span>
              Já captado:{" "}
              <strong style={{ color: "var(--color-charcoal)" }}>
                {alreadySoldPct.toFixed(0)}%
              </strong>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function PropertyPublishPage({
  property,
  navigate,
  actions,
}: {
  property: Property | undefined;
  navigate: Navigate;
  actions: AppActions;
}) {
  const totalAvailableUnits = property
    ? property.freeValueUnits - property.soldFreeValueUnits
    : 0;
  const maxPctOfProperty = property
    ? (totalAvailableUnits / property.totalValueUnits) * 100
    : 0;

  const [pctOfProperty, setPctOfProperty] = useState(
    Math.round(maxPctOfProperty * 0.5),
  );
  const [duration, setDuration] = useState(30);
  const [tx, setTx] = useState<{ open: boolean; step: TxStep }>({
    open: false,
    step: "sign",
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!property) return null;
  const p = property;

  const units = Math.round(p.totalValueUnits * (pctOfProperty / 100));
  const priceEth =
    Number(p.marketValueEth) * (units / p.totalValueUnits);
  const minTicket = units > 0 ? (priceEth / units) * 1000 : 0;

  const start = async () => {
    setErrorMessage(null);
    setTx({ open: true, step: "sign" });
    try {
      await actions.publishListing(
        p.id,
        p.propertyId,
        units,
        (s) => setTx({ open: true, step: s }),
      );
    } catch (error) {
      setTx({ open: false, step: "sign" });
      setErrorMessage(
        error instanceof Error ? error.message : "Falha ao publicar oferta.",
      );
    }
  };
  const finish = () => {
    setTx({ open: false, step: "sign" });
    navigate("property", { id: p.id });
  };

  return (
    <div className="page">
      <PageHeader
        crumb={
          <>
            <a onClick={() => navigate("property", { id: p.id })}>
              {p.title}
            </a>
            <span>/</span>
            <span>Disponibilizar</span>
          </>
        }
        title="Disponibilizar imóvel para investidores"
        subtitle="Defina quanto do seu imóvel você quer ofertar. O preço é calculado a partir da avaliação."
      />

      <div className="grid-2-1">
        <div className="col col-gap-lg">
          <div className="card card-pad-lg">
            <div
              className="muted text-xs"
              style={{
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                fontWeight: 600,
              }}
            >
              Quanto do imóvel você quer ofertar
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 12,
                marginTop: 12,
              }}
            >
              <div
                className="fw-800"
                style={{ fontSize: 64, lineHeight: 1 }}
              >
                {pctOfProperty}
                <span style={{ fontSize: 32, color: "var(--color-orange)" }}>
                  %
                </span>
              </div>
              <div className="muted text-sm" style={{ paddingBottom: 8 }}>
                do imóvel
              </div>
            </div>
            <input
              type="range"
              className="range-orange mt-24"
              min="5"
              max={Math.floor(maxPctOfProperty)}
              step="1"
              value={pctOfProperty}
              onChange={(e) => setPctOfProperty(Number(e.target.value))}
            />
            <div className="row-between text-xs muted">
              <span>5% (oferta menor)</span>
              <span>{Math.floor(maxPctOfProperty)}% (máximo disponível)</span>
            </div>
          </div>

          <div className="card card-pad-lg">
            <div className="row-between mb-16">
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>
                Como o imóvel ficará dividido
              </h3>
            </div>
            <PreviewSplit p={p} newOfferPct={pctOfProperty} />
          </div>

          <div className="grid-2">
            <div
              className="card card-pad"
              style={{
                background: "var(--color-orange-soft)",
                borderColor: "var(--color-orange)",
              }}
            >
              <div
                className="muted text-xs"
                style={{
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  fontWeight: 600,
                  color: "var(--color-orange-muted)",
                }}
              >
                Você pode receber até
              </div>
              <div
                className="fw-800 text-3xl mono mt-12"
                style={{ color: "var(--color-charcoal)" }}
              >
                {priceEth.toFixed(3)} ETH
              </div>
              <div
                className="text-sm mt-12"
                style={{ color: "var(--color-charcoal-soft)" }}
              >
                ≈ {formatUsd(priceEth)} · {formatBrl(priceEth)}
              </div>
              <div
                className="text-xs mt-12"
                style={{ color: "var(--color-orange-muted)" }}
              >
                se a oferta for 100% captada
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
                Investimento mínimo por pessoa
              </div>
              <div className="fw-800 text-2xl mono mt-12">
                {minTicket.toFixed(4)} ETH
              </div>
              <div className="muted text-sm">≈ {formatUsd(minTicket)}</div>
              <div className="text-xs mt-12 muted">
                Cada investidor compra a partir desse valor
              </div>
            </div>
          </div>

          <div className="card card-pad-lg">
            <div
              className="muted text-xs"
              style={{
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                fontWeight: 600,
              }}
            >
              Por quanto tempo a oferta fica no ar?
            </div>
            <div className="row row-gap mt-16" style={{ flexWrap: "wrap" }}>
              {([
                { days: 30, label: "1 mês" },
                { days: 120, label: "4 meses" },
                { days: 365, label: "1 ano" },
                { days: 730, label: "2 anos" },
              ] as { days: number; label: string }[]).map(({ days, label }) => (
                <button
                  key={days}
                  className={"btn " + (duration === days ? "btn-primary" : "btn-neutral")}
                  onClick={() => setDuration(days)}
                >
                  {label}
                </button>
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
            <div className="row row-gap mb-12">
              <IconShield size={18} style={{ color: "var(--color-orange)" }} />
              <div className="fw-700">Você não perde sua casa</div>
            </div>
            <ul
              className="text-sm"
              style={{ opacity: 0.8, paddingLeft: 16, margin: 0, lineHeight: 1.7 }}
            >
              <li>O direito de morar continua sendo seu</li>
              <li>Os investidores não podem entrar nem usar o imóvel</li>
              <li>Você pode pausar a oferta a qualquer momento</li>
              <li>Operações registradas e auditáveis</li>
            </ul>
          </div>

          {errorMessage && (
            <div
              className="card card-pad"
              style={{
                background: "var(--color-danger-soft)",
                borderColor: "var(--color-danger)",
                color: "var(--color-danger)",
              }}
            >
              <div className="text-sm fw-700">Falha ao publicar oferta</div>
              <div className="text-sm mt-12">{errorMessage}</div>
            </div>
          )}

          <div
            className="row-between"
            style={{
              borderTop: "1px solid var(--color-border)",
              paddingTop: 24,
            }}
          >
            <button
              className="btn btn-ghost"
              onClick={() => navigate("property", { id: p.id })}
            >
              Cancelar
            </button>
            <button
              className="btn btn-primary btn-lg"
              onClick={() => {
                void start();
              }}
            >
              <IconSparkles size={16} /> Publicar oferta
            </button>
          </div>
        </div>

        <div
          className="col col-gap"
          style={{ position: "sticky", top: 24, alignSelf: "start" }}
        >
          <div className="card" style={{ overflow: "hidden" }}>
            <div className="prop-thumb" style={{ height: 160 }}>
              <PropThumbArt variant={p.thumbVariant} />
              <div className="prop-thumb-overlay">
                <div className="prop-thumb-tags">
                  <span
                    className="badge"
                    style={{
                      background: "rgba(255,255,255,0.92)",
                      color: "var(--color-charcoal)",
                    }}
                  >
                    Pré-visualização
                  </span>
                </div>
                <div className="prop-thumb-bottom">
                  <span className="badge badge-orange">
                    <strong>{pctOfProperty.toFixed(0)}%</strong> do imóvel
                  </span>
                </div>
              </div>
            </div>
            <div className="card-pad">
              <div
                className="muted text-xs"
                style={{
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  fontWeight: 600,
                }}
              >
                Como investidores verão
              </div>
              <div className="fw-800 text-lg mt-12">{p.title}</div>
              <div
                className="muted text-sm row row-gap-sm"
                style={{ marginTop: 4 }}
              >
                <IconMapPin size={13} />
                {p.city}, {p.state}
              </div>
              <div className="divider-dashed" />
              <div className="row-between">
                <span className="muted text-sm">Investimento mínimo</span>
                <strong className="mono">{minTicket.toFixed(4)} ETH</strong>
              </div>
              <div className="row-between mt-12">
                <span className="muted text-sm">Oferta total</span>
                <strong className="mono">{priceEth.toFixed(3)} ETH</strong>
              </div>
              <div className="row-between mt-12">
                <span className="muted text-sm">Duração</span>
                <strong>
                  {duration === 30 ? "1 mês" : duration === 120 ? "4 meses" : duration === 365 ? "1 ano" : "2 anos"}
                </strong>
              </div>
            </div>
          </div>
        </div>
      </div>
      <TxModal
        open={tx.open}
        step={tx.step}
        title="Publicando oferta"
        successLabel="Ver imóvel"
        onClose={
          tx.step === "done"
            ? finish
            : () => setTx({ open: false, step: "sign" })
        }
      />
    </div>
  );
}
