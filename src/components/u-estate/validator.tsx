"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { SavedPropertyRecord } from "@/offchain/schemas";
import { storedSolAmountToNumber } from "./amounts";
import {
  formatUsdFromFiatRates,
  type FiatRatesState,
} from "./fiat-rates";
import {
  IconAlert,
  IconArrowRight,
  IconCheck,
  IconClock,
  IconFile,
  IconShield,
  IconUser,
  IconX,
} from "./icons";
import { LanguageToggle } from "./i18n";
import { useFiatRates } from "./use-fiat-rates";

const ACCESS_CODE = "u-estate-ops";
const STORAGE_KEY = "validator_session";

type Session = { email: string; name: string; loggedInAt: string };

function titleFromRecord(r: SavedPropertyRecord) {
  const s = r.address.street.trim();
  const n = r.address.number.trim();
  if (s && n) return `${s}, ${n}`;
  return s || `Imóvel ${r.localPropertyId.slice(0, 6)}`;
}

function weiToSOLApprox(wei: string) {
  const n = storedSolAmountToNumber(wei);
  return n < 1 ? n.toFixed(4) : n.toFixed(2);
}

function usdApprox(wei: string, fiatRates: FiatRatesState) {
  const SOL = storedSolAmountToNumber(wei);
  return formatUsdFromFiatRates(SOL, fiatRates);
}

function docLabel(type: string) {
  if (type === "mock_deed") return "Matrícula";
  if (type === "mock_owner_id") return "Identidade do proprietário";
  if (type === "mock_tax_record") return "IPTU";
  return type;
}

// ===== AUTH FORMS =====

function LoginForm({
  onLogin,
}: {
  onLogin: (session: Session) => void;
}) {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim()) { setError("Informe o e-mail."); return; }
    const session: Session = { email: email.trim(), name: email.split("@")[0], loggedInAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    onLogin(session);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim()) { setError("Informe o e-mail."); return; }
    if (!name.trim()) { setError("Informe o nome."); return; }
    if (code.trim() !== ACCESS_CODE) { setError("Código de acesso inválido."); return; }
    const session: Session = { email: email.trim(), name: name.trim(), loggedInAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    onLogin(session);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--color-charcoal)",
        padding: 24,
      }}
    >
      <div style={{ position: "fixed", right: 24, top: 24, zIndex: 2 }}>
        <LanguageToggle />
      </div>
      <div
        style={{
          background: "var(--color-surface)",
          borderRadius: "var(--radius-2xl)",
          padding: 48,
          width: "100%",
          maxWidth: 440,
          boxShadow: "var(--shadow-pop)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 32,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              display: "grid",
              placeItems: "center",
            }}
          >
            <Image src="/u-estate-logo-s-nome-s-fundo-ng.png" alt="u-estate" width={35} height={35} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16 }}>u-estate</div>
            <div style={{ fontSize: 12, color: "var(--color-muted)" }}>Painel de Validadores</div>
          </div>
        </div>

        <div className="tab-bar" style={{ marginBottom: 28 }}>
          <button
            className={"tab" + (tab === "login" ? " active" : "")}
            onClick={() => { setTab("login"); setError(""); }}
          >
            Entrar
          </button>
          <button
            className={"tab" + (tab === "register" ? " active" : "")}
            onClick={() => { setTab("register"); setError(""); }}
          >
            Cadastrar
          </button>
        </div>

        {tab === "login" ? (
          <form onSubmit={handleLogin} className="col col-gap">
            <div className="field">
              <label className="field-label">E-mail</label>
              <input
                className="input"
                type="email"
                placeholder="validador@u-estate.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {error && (
              <div
                className="text-sm"
                style={{
                  color: "var(--color-danger)",
                  background: "var(--color-danger-soft)",
                  padding: "10px 14px",
                  borderRadius: "var(--radius-md)",
                }}
              >
                {error}
              </div>
            )}
            <button className="btn btn-primary w-100" type="submit">
              Entrar <IconArrowRight size={14} />
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="col col-gap">
            <div className="field">
              <label className="field-label">Nome</label>
              <input
                className="input"
                type="text"
                placeholder="Seu nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="field">
              <label className="field-label">E-mail</label>
              <input
                className="input"
                type="email"
                placeholder="validador@u-estate.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="field">
              <label className="field-label">Código de acesso</label>
              <input
                className="input"
                type="password"
                placeholder="••••••••"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              <span className="field-help">
                Solicite o código ao administrador do sistema.
              </span>
            </div>
            {error && (
              <div
                className="text-sm"
                style={{
                  color: "var(--color-danger)",
                  background: "var(--color-danger-soft)",
                  padding: "10px 14px",
                  borderRadius: "var(--radius-md)",
                }}
              >
                {error}
              </div>
            )}
            <button className="btn btn-primary w-100" type="submit">
              Cadastrar e entrar <IconArrowRight size={14} />
            </button>
          </form>
        )}

        <div
          className="text-xs muted"
          style={{ marginTop: 24, textAlign: "center", lineHeight: 1.5 }}
        >
          Acesso restrito à equipe de operações u-estate.
          <br />
          Não é uma página para clientes.
        </div>
      </div>
    </div>
  );
}

// ===== PROPERTY DETAIL PANEL =====

function PropertyPanel({
  record,
  onApprove,
  onReject,
  onClose,
}: {
  record: SavedPropertyRecord;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string, reason: string) => Promise<void>;
  onClose: () => void;
}) {
  const fiatRates = useFiatRates();
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [done, setDone] = useState<"approved" | "rejected" | null>(null);
  const [error, setError] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [reason, setReason] = useState("");

  const isPending =
    !record.onchainRegistration ||
    record.onchainRegistration.status === "PendingMockVerification";
  const existingRejection = record.onchainRegistration?.rejection;

  const handleApprove = async () => {
    setError("");
    setBusy("approve");
    try {
      await onApprove(record.localPropertyId);
      setDone("approved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao aprovar.");
    } finally {
      setBusy(null);
    }
  };

  const handleReject = async () => {
    setError("");
    if (!reason.trim()) {
      setError("Justificativa é obrigatória para reprovar.");
      return;
    }
    setBusy("reject");
    try {
      await onReject(record.localPropertyId, reason.trim());
      setDone("rejected");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao reprovar.");
    } finally {
      setBusy(null);
    }
  };

  const title = titleFromRecord(record);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        style={{ maxWidth: 600 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="row-between mb-24">
          <div>
            <div className="fw-800 text-lg">{title}</div>
            <div className="muted text-sm">
              {record.address.city}, {record.address.state}
            </div>
          </div>
          <button
            className="btn btn-ghost"
            onClick={onClose}
            style={{ padding: 4, borderRadius: 8 }}
          >
            <IconX size={18} />
          </button>
        </div>

        <div className="col col-gap">
          {/* Value */}
          <div
            className="row row-gap"
            style={{
              padding: 16,
              background: "var(--color-surface-soft)",
              borderRadius: "var(--radius-md)",
            }}
          >
            <div style={{ flex: 1 }}>
              <div className="muted text-xs" style={{ textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
                Avaliação
              </div>
              <div className="fw-800 text-xl mono mt-12">
                {weiToSOLApprox(record.marketValueWei)} SOL
              </div>
              <div className="muted text-sm">
                {usdApprox(record.marketValueWei, fiatRates)}
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div className="muted text-xs" style={{ textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
                Proprietário
              </div>
              <div
                className="mono text-xs mt-12"
                style={{ wordBreak: "break-all", color: "var(--color-charcoal-soft)" }}
              >
                {record.ownerWallet.slice(0, 10)}…{record.ownerWallet.slice(-6)}
              </div>
            </div>
          </div>

          {/* Documents */}
          <div>
            <div className="fw-700 text-sm mb-12">
              Documentos ({record.documents.length})
            </div>
            <div className="col col-gap-sm">
              {record.documents.map((d, i) => (
                <div
                  key={i}
                  className="row row-gap"
                  style={{
                    padding: 12,
                    background: "var(--color-surface-soft)",
                    borderRadius: "var(--radius-md)",
                  }}
                >
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      background: "var(--color-surface)",
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    <IconFile size={15} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="fw-600 text-sm">{d.filename}</div>
                    <div className="muted text-xs">{docLabel(d.type)}</div>
                  </div>
                  <span className="badge badge-sm"
                    style={{ background: "var(--color-surface)", color: "var(--color-muted)" }}
                  >
                    Recebido
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Hashes */}
          <div
            className="text-xs muted"
            style={{
              padding: 12,
              background: "var(--color-surface-soft)",
              borderRadius: "var(--radius-md)",
              lineHeight: 1.6,
            }}
          >
            <div><strong>Hash documentos:</strong> {record.documentsHash.slice(0, 20)}…</div>
            <div><strong>Hash metadata:</strong> {record.metadataHash.slice(0, 20)}…</div>
            <div><strong>ID local:</strong> {record.localPropertyId}</div>
            <div><strong>Enviado em:</strong> {new Date(record.createdAt).toLocaleString("pt-BR")}</div>
          </div>

          {error && (
            <div
              className="text-sm"
              style={{
                color: "var(--color-danger)",
                background: "var(--color-danger-soft)",
                padding: "10px 14px",
                borderRadius: "var(--radius-md)",
              }}
            >
              {error}
            </div>
          )}

          {existingRejection && !done && (
            <div
              className="text-sm"
              style={{
                color: "var(--color-danger)",
                background: "var(--color-danger-soft)",
                padding: "12px 16px",
                borderRadius: "var(--radius-md)",
                lineHeight: 1.5,
              }}
            >
              <div className="fw-700 row row-gap-sm" style={{ marginBottom: 6 }}>
                <IconAlert size={14} /> Reprovado anteriormente
              </div>
              <div>{existingRejection.reason}</div>
              <div className="muted text-xs" style={{ marginTop: 6 }}>
                {new Date(existingRejection.rejectedAt).toLocaleString("pt-BR")}
              </div>
            </div>
          )}

          {done === "approved" ? (
            <div
              className="text-sm fw-700"
              style={{
                color: "var(--color-success)",
                background: "var(--color-success-soft)",
                padding: "14px 18px",
                borderRadius: "var(--radius-md)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <IconCheck size={16} /> Análise aprovada com sucesso.
            </div>
          ) : done === "rejected" ? (
            <div
              className="text-sm fw-700"
              style={{
                color: "var(--color-danger)",
                background: "var(--color-danger-soft)",
                padding: "14px 18px",
                borderRadius: "var(--radius-md)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <IconX size={16} /> Análise reprovada. Proprietário será notificado.
            </div>
          ) : isPending ? (
            showRejectForm ? (
              <div className="col col-gap-sm">
                <div className="field">
                  <label className="field-label">
                    Justificativa da reprovação
                  </label>
                  <textarea
                    className="textarea"
                    placeholder="Descreva o que está incorreto ou faltando — esta mensagem será mostrada ao proprietário."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={4}
                    autoFocus
                  />
                  <span className="field-help">
                    Obrigatória. Seja claro para que o proprietário possa corrigir.
                  </span>
                </div>
                <div className="row row-gap" style={{ justifyContent: "flex-end" }}>
                  <button
                    className="btn btn-ghost"
                    onClick={() => {
                      setShowRejectForm(false);
                      setReason("");
                      setError("");
                    }}
                    disabled={busy === "reject"}
                  >
                    Cancelar
                  </button>
                  <button
                    className="btn btn-primary"
                    style={{
                      background: "var(--color-danger)",
                      borderColor: "var(--color-danger)",
                    }}
                    onClick={() => void handleReject()}
                    disabled={busy === "reject" || !reason.trim()}
                  >
                    {busy === "reject" ? (
                      <span
                        className="tx-spinner"
                        style={{ width: 14, height: 14, borderWidth: 2 }}
                      />
                    ) : (
                      <IconX size={14} />
                    )}
                    {busy === "reject" ? "Reprovando…" : "Confirmar reprovação"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="row row-gap">
                <button
                  className="btn btn-ghost"
                  style={{
                    flex: 1,
                    color: "var(--color-danger)",
                    borderColor: "var(--color-danger-soft)",
                    border: "1px solid var(--color-danger-soft)",
                  }}
                  onClick={() => {
                    setShowRejectForm(true);
                    setError("");
                  }}
                  disabled={busy !== null}
                >
                  <IconX size={14} /> Reprovar
                </button>
                <button
                  className="btn btn-primary"
                  style={{ flex: 2 }}
                  onClick={() => void handleApprove()}
                  disabled={busy !== null}
                >
                  {busy === "approve" ? (
                    <span
                      className="tx-spinner"
                      style={{ width: 14, height: 14, borderWidth: 2 }}
                    />
                  ) : (
                    <IconShield size={16} />
                  )}
                  {busy === "approve" ? "Aprovando…" : "Aprovar análise"}
                </button>
              </div>
            )
          ) : (
            <div
              className="text-sm muted"
              style={{ textAlign: "center", padding: 12 }}
            >
              Este imóvel já foi analisado.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ===== MAIN DASHBOARD =====

function ValidatorDashboard({
  session,
  onLogout,
}: {
  session: Session;
  onLogout: () => void;
}) {
  const fiatRates = useFiatRates();
  const [properties, setProperties] = useState<SavedPropertyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SavedPropertyRecord | null>(null);
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/validator", { cache: "no-store" });
      const data = (await res.json()) as { properties: SavedPropertyRecord[] };
      setProperties(data.properties);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const handleApprove = async (localPropertyId: string) => {
    const res = await fetch("/api/validator", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ localPropertyId, action: "approve" }),
    });
    if (!res.ok) {
      const err = (await res.json()) as { error: string };
      throw new Error(err.error ?? "Erro ao aprovar.");
    }
    setReviewedIds((prev) => new Set([...prev, localPropertyId]));
    void load();
  };

  const handleReject = async (localPropertyId: string, reason: string) => {
    const res = await fetch("/api/validator", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ localPropertyId, action: "reject", reason }),
    });
    if (!res.ok) {
      const err = (await res.json()) as { error: string };
      throw new Error(err.error ?? "Erro ao reprovar.");
    }
    setReviewedIds((prev) => new Set([...prev, localPropertyId]));
    void load();
  };

  const isReviewedRecord = (p: SavedPropertyRecord) =>
    reviewedIds.has(p.localPropertyId) ||
    (p.onchainRegistration &&
      p.onchainRegistration.status !== "PendingMockVerification");

  const pending = properties.filter((p) => !isReviewedRecord(p));
  const reviewed = properties.filter((p) => isReviewedRecord(p));

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg)" }}>
      {/* Header */}
      <div
        style={{
          background: "var(--color-charcoal)",
          padding: "0 40px",
          height: 68,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 11,
              background: "var(--color-surface)",
              display: "grid",
              placeItems: "center",
              overflow: "hidden",
            }}
          >
            <Image src="/u-estate-logo-s-nome-ng.png" alt="u-estate" width={30} height={30} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: "#fff" }}>u-estate</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
              Painel de Validadores
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <LanguageToggle compact />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: "rgba(255,255,255,0.8)",
              fontSize: 13,
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: "var(--color-orange)",
                display: "grid",
                placeItems: "center",
              }}
            >
              <IconUser size={14} style={{ color: "#fff" }} />
            </div>
            {session.name}
          </div>
          <button
            className="btn btn-ghost btn-sm"
            style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}
            onClick={onLogout}
          >
            Sair
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "36px 40px 80px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>
            Análise de imóveis
          </h1>
          <div className="muted text-sm" style={{ marginTop: 6 }}>
            Review property documents for operational records. Tokenization does not require third-party approval.
          </div>
        </div>

        {/* Stats row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 16,
            marginBottom: 32,
          }}
        >
          {[
            { label: "Aguardando análise", value: pending.length, color: "var(--color-warning)" },
            { label: "Analisados nesta sessão", value: reviewedIds.size, color: "var(--color-success)" },
            { label: "Total recebidos", value: properties.length, color: "var(--color-charcoal)" },
          ].map((s) => (
            <div key={s.label} className="stat">
              <div className="stat-label">{s.label}</div>
              <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
              <div className="blob" />
            </div>
          ))}
        </div>

        {/* Pending */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div
            style={{
              padding: "20px 28px",
              borderBottom: "1px solid var(--color-border)",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <IconClock size={16} style={{ color: "var(--color-warning)" }} />
            <span className="fw-700">Aguardando análise</span>
            {pending.length > 0 && (
              <span
                className="badge badge-warning badge-sm"
                style={{ marginLeft: 4 }}
              >
                {pending.length}
              </span>
            )}
            <button
              className="btn btn-ghost btn-sm"
              style={{ marginLeft: "auto" }}
              onClick={() => void load()}
            >
              Atualizar
            </button>
          </div>

          {loading ? (
            <div
              style={{ padding: 40, textAlign: "center" }}
              className="muted text-sm"
            >
              <div
                className="tx-spinner"
                style={{
                  width: 24,
                  height: 24,
                  margin: "0 auto 12px",
                  borderWidth: 2.5,
                }}
              />
              Carregando imóveis…
            </div>
          ) : pending.length === 0 ? (
            <div
              style={{ padding: 40, textAlign: "center" }}
              className="muted text-sm"
            >
              <IconCheck
                size={28}
                style={{ color: "var(--color-success)", marginBottom: 10 }}
              />
              <br />
              Nenhum imóvel aguardando análise.
            </div>
          ) : (
            <div>
              {pending.map((p) => (
                <PropertyRow
                  key={p.localPropertyId}
                  record={p}
                  fiatRates={fiatRates}
                  onClick={() => setSelected(p)}
                  reviewed={false}
                />
              ))}
            </div>
          )}
        </div>

        {/* Reviewed */}
        {reviewed.length > 0 && (
          <div className="card">
            <div
              style={{
                padding: "20px 28px",
                borderBottom: "1px solid var(--color-border)",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <IconCheck size={16} style={{ color: "var(--color-success)" }} />
              <span className="fw-700">Já analisados</span>
              <span className="badge badge-success badge-sm" style={{ marginLeft: 4 }}>
                {reviewed.length}
              </span>
            </div>
            {reviewed.map((p) => (
              <PropertyRow
                key={p.localPropertyId}
                record={p}
                fiatRates={fiatRates}
                onClick={() => setSelected(p)}
                reviewed
              />
            ))}
          </div>
        )}
      </div>

      {selected && (
        <PropertyPanel
          record={selected}
          onApprove={handleApprove}
          onReject={handleReject}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function PropertyRow({
  record,
  fiatRates,
  onClick,
  reviewed,
}: {
  record: SavedPropertyRecord;
  fiatRates: FiatRatesState;
  onClick: () => void;
  reviewed: boolean;
}) {
  const title = titleFromRecord(record);
  const status = record.onchainRegistration?.status;
  const isRejected = status === "Rejected";
  let statusLabel: string;
  let statusCls: string;
  if (isRejected) {
    statusLabel = "Reprovado";
    statusCls = "badge-danger";
  } else if (reviewed || (status && status !== "PendingMockVerification")) {
    statusLabel = "Verificado";
    statusCls = "badge-success";
  } else {
    statusLabel = "Em análise";
    statusCls = "badge-warning";
  }

  return (
    <div
      style={{
        padding: "18px 28px",
        borderBottom: "1px solid var(--color-border)",
        display: "flex",
        alignItems: "center",
        gap: 16,
        cursor: "pointer",
        transition: "background 0.15s",
      }}
      onClick={onClick}
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = "var(--color-surface-soft)")
      }
      onMouseLeave={(e) => (e.currentTarget.style.background = "")}
    >
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 12,
          background: "var(--color-surface-soft)",
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
        }}
      >
        <IconFile size={18} style={{ color: "var(--color-muted)" }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="fw-700 text-sm">{title}</div>
        <div className="muted text-xs">
          {record.address.city}, {record.address.state} ·{" "}
          {record.documents.length} documento(s) · Enviado{" "}
          {new Date(record.createdAt).toLocaleDateString("pt-BR")}
        </div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div className="mono fw-700 text-sm">
          {weiToSOLApprox(record.marketValueWei)} SOL
        </div>
        <div className="muted text-xs">
          {usdApprox(record.marketValueWei, fiatRates)}
        </div>
      </div>
      <span className={`badge badge-sm ${statusCls}`}>
        {statusLabel}
      </span>
      <div style={{ color: "var(--color-muted)" }}>›</div>
    </div>
  );
}

// ===== APP ENTRY =====

export function ValidatorApp() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    try {
      setSession(JSON.parse(stored) as Session);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const handleLogout = () => {
    window.localStorage.removeItem(STORAGE_KEY);
    setSession(null);
  };

  if (!session) {
    return <LoginForm onLogin={setSession} />;
  }

  return <ValidatorDashboard session={session} onLogout={handleLogout} />;
}
