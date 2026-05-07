"use client";

import { useRef, useState } from "react";
import type { AppActions } from "./app";
import { formatBrl, formatUsd } from "./data";
import {
  IconAlert,
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconFile,
  IconMapPin,
  IconPlus,
  IconShield,
  IconUpload,
  IconX,
} from "./icons";
import {
  EmptyState,
  PageHeader,
  PropertyCard,
  PropThumbArt,
  TxModal,
} from "./ui";
import type {
  DocumentType,
  Navigate,
  Property,
  PropertyDocument,
  TxStep,
} from "./types";

type ValueCurrency = "eth" | "usdc" | "usdt";

const ETH_RATE = 2350; // USD per ETH

function toEth(raw: string, currency: ValueCurrency): string {
  const n = Number(raw);
  if (!raw || isNaN(n) || n <= 0) return "";
  if (currency === "eth") return raw;
  return (n / ETH_RATE).toFixed(6);
}

export function PropertiesPage({
  properties,
  navigate,
}: {
  properties: Property[];
  navigate: Navigate;
}) {
  const [filter, setFilter] = useState<
    "all" | "available" | "review" | "ready" | "soldout" | "rejected"
  >("all");
  const filtered = properties.filter((p) => {
    if (filter === "all") return true;
    if (filter === "available") return p.status === "ActiveSale";
    if (filter === "review") return p.status === "PendingMockVerification";
    if (filter === "ready")
      return p.status === "MockVerified" || p.status === "Tokenized";
    if (filter === "rejected") return p.status === "Rejected";
    return p.status === "SoldOut";
  });

  const counts: [typeof filter, string, number][] = [
    ["all", "Todos", properties.length],
    [
      "review",
      "Em análise",
      properties.filter((p) => p.status === "PendingMockVerification").length,
    ],
    [
      "rejected",
      "Reprovados",
      properties.filter((p) => p.status === "Rejected").length,
    ],
    [
      "ready",
      "Prontos para publicar",
      properties.filter(
        (p) => p.status === "MockVerified" || p.status === "Tokenized",
      ).length,
    ],
    [
      "available",
      "Captando",
      properties.filter((p) => p.status === "ActiveSale").length,
    ],
    [
      "soldout",
      "Esgotados",
      properties.filter((p) => p.status === "SoldOut").length,
    ],
  ];

  return (
    <div className="page">
      <PageHeader
        title="Meus imóveis"
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
      <div className="filter-bar mb-24">
        {counts.map(([k, l, n]) => (
          <span
            key={k}
            className={"chip-filter" + (filter === k ? " active" : "")}
            onClick={() => setFilter(k)}
          >
            {l} <span style={{ opacity: 0.6 }}>({n})</span>
          </span>
        ))}
      </div>
      {filtered.length === 0 ? (
        <EmptyState
          title="Nenhum imóvel aqui ainda"
          sub="Cadastre um imóvel para começar a captar liquidez sem abrir mão da sua casa."
          actionLabel="Cadastrar imóvel"
          onAction={() => navigate("property-new")}
        />
      ) : (
        <div className="grid-3">
          {filtered.map((p) => (
            <PropertyCard
              key={p.id}
              p={p}
              onClick={() => navigate("property", { id: p.id })}
            />
          ))}
        </div>
      )}
    </div>
  );
}

type FormState = {
  title: string;
  description: string;
  street: string;
  number: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  lat: string;
  lng: string;
  valueCurrency: ValueCurrency;
  marketValueInput: string;
  reservedPct: number;
  documents: PropertyDocument[];
};

export function PropertyNewPage({
  navigate,
  actions,
}: {
  navigate: Navigate;
  actions: AppActions;
}) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<FormState>({
    title: "",
    description: "",
    street: "",
    number: "",
    city: "",
    state: "",
    country: "Brasil",
    postalCode: "",
    lat: "",
    lng: "",
    valueCurrency: "eth",
    marketValueInput: "",
    reservedPct: 20,
    documents: [],
  });
  const [tx, setTx] = useState<{ open: boolean; step: TxStep }>({
    open: false,
    step: "sign",
  });
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // File input refs per document type
  const deedRef = useRef<HTMLInputElement>(null);
  const ownerIdRef = useRef<HTMLInputElement>(null);
  const taxRef = useRef<HTMLInputElement>(null);

  const refsByType: Record<DocumentType, React.RefObject<HTMLInputElement | null>> = {
    mock_deed: deedRef,
    mock_owner_id: ownerIdRef,
    mock_tax_record: taxRef,
  };

  const handleFileSelect = (type: DocumentType, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setData((d) => ({
      ...d,
      documents: [
        ...d.documents.filter((doc) => doc.type !== type),
        { type, filename: file.name },
      ],
    }));
    e.target.value = "";
  };

  const removeDoc = (i: number) =>
    setData((d) => ({
      ...d,
      documents: d.documents.filter((_, j) => j !== i),
    }));

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setData((d) => ({ ...d, [k]: v }));
  const steps = ["Imóvel", "Endereço", "Documentos", "Revisar"];

  const docTypes: {
    type: DocumentType;
    label: string;
    required: boolean;
    desc: string;
  }[] = [
    {
      type: "mock_deed",
      label: "Matrícula do imóvel",
      required: true,
      desc: "Documento que prova a propriedade.",
    },
    {
      type: "mock_owner_id",
      label: "Documento de identidade",
      required: true,
      desc: "RG ou CNH do proprietário.",
    },
    {
      type: "mock_tax_record",
      label: "Comprovante de IPTU",
      required: false,
      desc: "Opcional — ajuda a verificação.",
    },
  ];

  const marketValueEth = toEth(data.marketValueInput, data.valueCurrency);

  const canNext = () => {
    if (step === 0)
      return Boolean(data.title && marketValueEth && Number(marketValueEth) > 0);
    if (step === 1) return Boolean(data.street && data.city && data.state);
    if (step === 2) return data.documents.length >= 1;
    return true;
  };

  const submit = async () => {
    setErrorMessage(null);
    setTx({ open: true, step: "sign" });
    try {
      const created = await actions.submitProperty(
        {
          marketValueEth,
          reservedPct: data.reservedPct,
          description: data.description,
          street: data.street,
          number: data.number,
          city: data.city,
          state: data.state,
          country: data.country,
          postalCode: data.postalCode,
          lat: data.lat,
          lng: data.lng,
          documents: data.documents,
        },
        (s) => setTx({ open: true, step: s }),
      );
      setSubmittedId(created.id);
    } catch (error) {
      setTx({ open: false, step: "sign" });
      setErrorMessage(
        error instanceof Error ? error.message : "Falha ao enviar.",
      );
    }
  };

  const finish = () => {
    setTx({ open: false, step: "sign" });
    if (submittedId) {
      navigate("property", { id: submittedId });
    } else {
      navigate("properties");
    }
  };

  const currencyLabels: Record<ValueCurrency, string> = {
    eth: "ETH",
    usdc: "USDC",
    usdt: "USDT",
  };

  const currencyHelp = () => {
    const n = Number(data.marketValueInput);
    if (!data.marketValueInput || isNaN(n) || n <= 0) {
      if (data.valueCurrency === "eth")
        return "Valor de mercado estimado em ETH.";
      return `Valor de mercado estimado em ${currencyLabels[data.valueCurrency]} (1:1 com USD).`;
    }
    if (data.valueCurrency === "eth") {
      return `Equivalente: ${formatUsd(data.marketValueInput)} · ${formatBrl(data.marketValueInput)}`;
    }
    const eth = Number(marketValueEth);
    return `≈ ${eth.toFixed(6)} ETH · ${formatBrl(eth)}`;
  };

  return (
    <div className="page" style={{ maxWidth: 1100 }}>
      <PageHeader
        crumb={
          <>
            <a onClick={() => navigate("properties")}>Meus imóveis</a>
            <span>/</span>
            <span>Cadastrar imóvel</span>
          </>
        }
        title="Cadastrar imóvel"
        subtitle="Em poucos minutos seu imóvel estará pronto para captar investimentos."
      />

      <div className="stepper mb-32">
        {steps.map((s, i) => (
          <div
            key={i}
            className={
              "step" +
              (step === i ? " active" : "") +
              (step > i ? " done" : "")
            }
          >
            <div className="step-num">
              {step > i ? <IconCheck size={12} /> : i + 1}
            </div>
            {s}
          </div>
        ))}
      </div>

      <div className="grid-2-1">
        <div className="card card-pad-lg">
          {step === 0 && (
            <div className="col col-gap-lg">
              <div>
                <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>
                  Sobre o imóvel
                </h3>
                <div className="muted text-sm mt-12">
                  Informações básicas e quanto da casa você quer manter
                  reservado para você.
                </div>
              </div>
              <div className="field">
                <label className="field-label">Nome do imóvel</label>
                <input
                  className="input"
                  value={data.title}
                  placeholder="Ex.: Casa Vila Madalena"
                  onChange={(e) => update("title", e.target.value)}
                />
                <span className="field-help">
                  Como você quer chamar este imóvel internamente.
                </span>
              </div>
              <div className="field">
                <label className="field-label">Descrição (opcional)</label>
                <textarea
                  className="textarea"
                  placeholder="Conte um pouco sobre o imóvel — bairro, características, contexto…"
                  value={data.description}
                  onChange={(e) => update("description", e.target.value)}
                />
              </div>
              <div className="field">
                <label className="field-label">Avaliação do imóvel</label>
                <div className="col col-gap-sm">
                  <div className="currency-selector">
                    {(["eth", "usdc", "usdt"] as ValueCurrency[]).map((c) => (
                      <button
                        key={c}
                        className={"currency-btn" + (data.valueCurrency === c ? " active" : "")}
                        onClick={() => update("valueCurrency", c)}
                        type="button"
                      >
                        {currencyLabels[c]}
                      </button>
                    ))}
                  </div>
                  <div className="input-prefix">
                    <input
                      className="input mono"
                      type="number"
                      step={data.valueCurrency === "eth" ? "0.001" : "1000"}
                      placeholder={data.valueCurrency === "eth" ? "0.000" : "200000"}
                      value={data.marketValueInput}
                      onChange={(e) => update("marketValueInput", e.target.value)}
                    />
                    <span className="suffix">{currencyLabels[data.valueCurrency]}</span>
                  </div>
                </div>
                <span className="field-help">{currencyHelp()}</span>
              </div>
              <div className="field">
                <label className="field-label">
                  Quanto você quer manter reservado para você?{" "}
                  <strong style={{ color: "var(--color-charcoal)" }}>
                    {data.reservedPct}%
                  </strong>
                </label>
                <input
                  type="range"
                  className="range-orange"
                  min="5"
                  max="50"
                  step="5"
                  value={data.reservedPct}
                  onChange={(e) =>
                    update("reservedPct", Number(e.target.value))
                  }
                />
                <div className="row-between text-xs muted">
                  <span>5% (máxima captação)</span>
                  <span>50% (cautela)</span>
                </div>
                <span className="field-help">
                  Esta parte fica garantida pra você, junto com o direito de
                  morar. Os outros {100 - data.reservedPct}% poderão ser
                  ofertados a investidores.
                </span>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="col col-gap-lg">
              <div>
                <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>
                  Onde fica
                </h3>
                <div className="muted text-sm mt-12">
                  Endereço completo do imóvel. Estes dados ficam protegidos e
                  não são expostos publicamente.
                </div>
              </div>
              <div className="grid-2">
                <div className="field">
                  <label className="field-label">Rua</label>
                  <input
                    className="input"
                    value={data.street}
                    onChange={(e) => update("street", e.target.value)}
                  />
                </div>
                <div className="field">
                  <label className="field-label">Número</label>
                  <input
                    className="input"
                    value={data.number}
                    onChange={(e) => update("number", e.target.value)}
                  />
                </div>
              </div>
              <div className="grid-2">
                <div className="field">
                  <label className="field-label">Cidade</label>
                  <input
                    className="input"
                    value={data.city}
                    onChange={(e) => update("city", e.target.value)}
                  />
                </div>
                <div className="field">
                  <label className="field-label">Estado</label>
                  <input
                    className="input"
                    value={data.state}
                    onChange={(e) => update("state", e.target.value)}
                    placeholder="SP"
                  />
                </div>
              </div>
              <div className="grid-2">
                <div className="field">
                  <label className="field-label">País</label>
                  <input
                    className="input"
                    value={data.country}
                    onChange={(e) => update("country", e.target.value)}
                  />
                </div>
                <div className="field">
                  <label className="field-label">CEP</label>
                  <input
                    className="input"
                    value={data.postalCode}
                    onChange={(e) => update("postalCode", e.target.value)}
                  />
                </div>
              </div>
              <div
                className="card-pad"
                style={{
                  background: "var(--color-surface-soft)",
                  borderRadius: "var(--radius-md)",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <IconShield
                  size={18}
                  style={{ color: "var(--color-orange-muted)" }}
                />
                <div
                  className="text-sm"
                  style={{ color: "var(--color-charcoal-soft)" }}
                >
                  Seu endereço fica protegido. Investidores só veem cidade e
                  estado.
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="col col-gap-lg">
              <div>
                <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>
                  Documentos
                </h3>
                <div className="muted text-sm mt-12">
                  Anexe os documentos do imóvel. Nossa equipe valida a
                  documentação para você antes da publicação.
                </div>
              </div>
              <div className="col col-gap">
                {docTypes.map((dt) => {
                  const has = data.documents.find((d) => d.type === dt.type);
                  const ref = refsByType[dt.type];
                  return (
                    <div
                      key={dt.type}
                      className="row row-gap"
                      style={{
                        padding: 18,
                        border: "1px dashed var(--color-border)",
                        borderRadius: "var(--radius-md)",
                        background: has
                          ? "var(--color-success-soft)"
                          : "var(--color-surface)",
                      }}
                    >
                      <input
                        type="file"
                        ref={ref}
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        style={{ display: "none" }}
                        onChange={(e) => handleFileSelect(dt.type, e)}
                      />
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 12,
                          background: has
                            ? "var(--color-success)"
                            : "var(--color-surface-soft)",
                          color: has ? "#fff" : "var(--color-muted)",
                          display: "grid",
                          placeItems: "center",
                          flexShrink: 0,
                        }}
                      >
                        {has ? <IconCheck size={18} /> : <IconFile size={18} />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div className="fw-700 text-sm">
                          {dt.label}{" "}
                          {!dt.required && (
                            <span className="muted" style={{ fontWeight: 500 }}>
                              (opcional)
                            </span>
                          )}
                        </div>
                        <div className="muted text-xs mt-12">
                          {has ? has.filename : dt.desc}
                        </div>
                      </div>
                      {has ? (
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() =>
                            removeDoc(data.documents.indexOf(has))
                          }
                        >
                          <IconX size={14} />
                        </button>
                      ) : (
                        <button
                          className="btn btn-neutral btn-sm"
                          onClick={() => ref.current?.click()}
                        >
                          <IconUpload size={14} /> Anexar
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="col col-gap-lg">
              <div>
                <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>
                  Tudo certo?
                </h3>
                <div className="muted text-sm mt-12">
                  Revise as informações. Você pode voltar e ajustar a qualquer
                  momento.
                </div>
              </div>
              <div className="grid-2">
                <div
                  className="card card-pad"
                  style={{ background: "var(--color-surface-soft)" }}
                >
                  <div
                    className="muted text-xs"
                    style={{
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      fontWeight: 600,
                    }}
                  >
                    Imóvel
                  </div>
                  <div className="fw-800 text-lg mt-12">
                    {data.title || "—"}
                  </div>
                  <div className="muted text-sm">
                    {data.street}, {data.number} · {data.city}/{data.state}
                  </div>
                  <div className="divider-dashed" />
                  <div className="muted text-xs">Avaliação</div>
                  <div className="mono fw-700 text-lg">
                    {data.marketValueInput || "0"} {currencyLabels[data.valueCurrency]}
                  </div>
                  {data.valueCurrency !== "eth" && marketValueEth && (
                    <div className="muted text-xs">≈ {marketValueEth} ETH</div>
                  )}
                </div>
                <div
                  className="card card-pad"
                  style={{ background: "var(--color-surface-soft)" }}
                >
                  <div
                    className="muted text-xs"
                    style={{
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      fontWeight: 600,
                    }}
                  >
                    Captação prevista
                  </div>
                  <div className="fw-800 text-lg mt-12">
                    até{" "}
                    {(
                      (Number(marketValueEth || 0) *
                        (100 - data.reservedPct)) /
                      100
                    ).toFixed(3)}{" "}
                    ETH
                  </div>
                  <div className="muted text-sm">
                    se você ofertar 100% da parte disponível
                  </div>
                  <div className="divider-dashed" />
                  <div className="row-between">
                    <span className="text-sm muted">Reservado pra você</span>
                    <strong>{data.reservedPct}%</strong>
                  </div>
                  <div className="row-between mt-12">
                    <span className="text-sm muted">
                      Disponível para investidores
                    </span>
                    <strong>{100 - data.reservedPct}%</strong>
                  </div>
                </div>
              </div>
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
                  <IconAlert size={18} />
                  <div className="text-sm fw-700">O que acontece depois</div>
                </div>
                <div
                  className="text-sm mt-12"
                  style={{
                    color: "var(--color-charcoal-soft)",
                    lineHeight: 1.55,
                  }}
                >
                  Nossa equipe analisa os documentos em até 24h. Quando
                  aprovado, você publica a oferta com um clique.
                </div>
              </div>
            </div>
          )}

          {errorMessage && (
            <div
              className="card card-pad mt-24"
              style={{
                background: "var(--color-danger-soft)",
                borderColor: "var(--color-danger)",
                color: "var(--color-danger)",
              }}
            >
              <div className="text-sm fw-700">Falha ao enviar</div>
              <div className="text-sm mt-12">{errorMessage}</div>
            </div>
          )}
          <div
            className="row-between mt-32"
            style={{
              borderTop: "1px solid var(--color-border)",
              paddingTop: 24,
            }}
          >
            <button
              className="btn btn-ghost"
              onClick={() =>
                step === 0 ? navigate("properties") : setStep((s) => s - 1)
              }
            >
              <IconArrowLeft size={14} /> {step === 0 ? "Cancelar" : "Voltar"}
            </button>
            {step < 3 ? (
              <button
                className="btn btn-primary"
                disabled={!canNext()}
                onClick={() => setStep((s) => s + 1)}
              >
                Continuar <IconArrowRight size={14} />
              </button>
            ) : (
              <button
                className="btn btn-primary"
                onClick={() => {
                  void submit();
                }}
              >
                Enviar para análise <IconArrowRight size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="col col-gap">
          <div className="card" style={{ overflow: "hidden" }}>
            <div className="prop-thumb">
              <PropThumbArt variant="mix" />
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
              </div>
            </div>
            <div className="card-pad">
              <div className="fw-800 text-lg">
                {data.title || "Sem título"}
              </div>
              <div
                className="muted text-sm row row-gap-sm"
                style={{ marginTop: 4 }}
              >
                <IconMapPin size={13} />
                {data.city || "Cidade"}, {data.state || "UF"}
              </div>
              <div className="divider-dashed" />
              <div className="muted text-xs">Avaliação</div>
              <div className="fw-800 text-xl mono">
                {data.marketValueInput || "0.000"} {currencyLabels[data.valueCurrency]}
              </div>
              {data.marketValueInput && data.valueCurrency !== "eth" && (
                <div className="muted text-sm">≈ {marketValueEth} ETH</div>
              )}
              {data.marketValueInput && data.valueCurrency === "eth" && (
                <div className="muted text-sm">
                  ≈ {formatUsd(data.marketValueInput)}
                </div>
              )}
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
            <div className="text-sm fw-700">Você não perde sua casa</div>
            <div
              className="text-sm mt-12"
              style={{ opacity: 0.75, lineHeight: 1.55 }}
            >
              O direito de morar continua sendo seu. Você só está oferecendo
              investidores uma participação no valor econômico do imóvel.
            </div>
          </div>
        </div>
      </div>

      <TxModal
        open={tx.open}
        step={tx.step}
        title="Enviando para análise"
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
