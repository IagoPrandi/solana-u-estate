"use client";

import Image from "next/image";
import { type ReactNode, useState } from "react";
import { formatEth, formatUnits, truncate } from "./data";
import { formatUsdFromFiatRates } from "./fiat-rates";
import {
  IconArrowRight,
  IconBell,
  IconBook,
  IconBuilding,
  IconCheck,
  IconChevronRight,
  IconCopy,
  IconHome,
  IconMapPin,
  IconMenu,
  IconPlus,
  IconReceipt,
  IconSearch,
  IconSettings,
  IconShield,
  IconStore,
  IconWallet,
  IconX,
} from "./icons";
import type {
  Listing,
  Navigate,
  Property,
  PropertyStatus,
  Role,
  Route,
  ThumbVariant,
  TxStep,
  User,
} from "./types";
import { LanguageToggle } from "./i18n";
import { useFiatRates } from "./use-fiat-rates";
import { WalletChip, type WalletState } from "./wallet";

const STATUS_MAP: Record<
  PropertyStatus,
  { label: string; cls: string }
> = {
  Draft: { label: "Rascunho", cls: "badge" },
  PendingMockVerification: { label: "Registrado", cls: "badge badge-warning" },
  MockVerified: { label: "Pronto para publicar", cls: "badge badge-success" },
  Tokenized: { label: "Pronto para publicar", cls: "badge badge-success" },
  ActiveSale: {
    label: "Disponível para investimento",
    cls: "badge badge-orange",
  },
  SoldOut: { label: "Esgotado", cls: "badge badge-charcoal" },
  Rejected: { label: "Reprovado", cls: "badge badge-danger" },
};

export function StatusPill({
  status,
  small,
}: {
  status: PropertyStatus;
  small?: boolean;
}) {
  const s = STATUS_MAP[status] ?? STATUS_MAP.Draft;
  return (
    <span className={s.cls + (small ? " badge-sm" : "")}>
      <span className="dot-sm" />
      {s.label}
    </span>
  );
}

export function Sidebar({
  route,
  navigate,
  role,
}: {
  route: Route;
  navigate: Navigate;
  role: Role;
}) {
  const ownerItems = [
    { key: "dashboard" as const, label: "Início", icon: IconHome },
    { key: "properties" as const, label: "Meus imóveis", icon: IconBuilding },
    { key: "portfolio" as const, label: "Portfólio", icon: IconWallet },
    { key: "transactions" as const, label: "Transações", icon: IconReceipt },
  ];
  const buyerItems = [
    { key: "dashboard" as const, label: "Início", icon: IconHome },
    { key: "marketplace" as const, label: "Investir", icon: IconStore },
    {
      key: "portfolio" as const,
      label: "Meus investimentos",
      icon: IconWallet,
    },
    { key: "transactions" as const, label: "Transações", icon: IconReceipt },
  ];
  const items = role === "buyer" ? buyerItems : ownerItems;
  const learn = [
    { key: "learn" as const, label: "Como funciona", icon: IconBook },
    { key: "settings" as const, label: "Configurações", icon: IconSettings },
  ];
  return (
    <aside className="sidebar">
      <div
        className="sidebar-brand"
        onClick={() => navigate("landing")}
        style={{ cursor: "pointer" }}
      >
        <div className="sidebar-brand-mark">
          <Image
            src="/u-estate-logo-s-nome-ng.png"
            alt="u-estate"
            width={36}
            height={36}
          />
        </div>
        <div className="sidebar-brand-name">u-estate</div>
      </div>
      <div className="sidebar-section-label">
        {role === "buyer" ? "Investidor" : "Proprietário"}
      </div>
      {items.map((it) => {
        const Ico = it.icon;
        const active =
          route.name === it.key ||
          (it.key === "properties" && route.name.startsWith("property")) ||
          (it.key === "marketplace" && route.name === "listing");
        return (
          <div
            key={it.key}
            className={"sidebar-link" + (active ? " active" : "")}
            onClick={() => navigate(it.key)}
          >
            <Ico className="ico" /> {it.label}
          </div>
        );
      })}

      {role === "owner" && (
        <button
          className="sidebar-cta"
          onClick={() => navigate("property-new")}
        >
          <IconPlus size={14} /> Cadastrar imóvel
        </button>
      )}

      <div className="sidebar-section-label">Mais</div>
      <a
        href="/validator"
        target="_blank"
        rel="noopener noreferrer"
        className="sidebar-link"
        style={{ textDecoration: "none" }}
      >
        <IconShield className="ico" /> Área de validadores
      </a>
      {learn.map((it) => {
        const Ico = it.icon;
        return (
          <div
            key={it.key}
            className={
              "sidebar-link" + (route.name === it.key ? " active" : "")
            }
            onClick={() => navigate(it.key)}
          >
            <Ico className="ico" /> {it.label}
          </div>
        );
      })}
      <div className="sidebar-foot">
        <div className="label">Rede</div>
        <div className="net">
          <span className="dot" />
          Solana Devnet · SOL
        </div>
      </div>
    </aside>
  );
}

export function Topbar({
  role,
  setRole,
  navigate,
  wallet,
  onToggleSidebar,
}: {
  user: User;
  role: Role;
  setRole: (r: Role) => void;
  navigate: Navigate;
  route: Route;
  wallet: WalletState;
  onToggleSidebar: () => void;
}) {
  return (
    <div className="topbar">
      <div className="row row-gap">
        <button
          className="sidebar-toggle-btn"
          onClick={onToggleSidebar}
          title="Mostrar/ocultar menu"
        >
          <IconMenu size={16} />
        </button>
        <div className="topbar-search">
          <IconSearch size={16} />
          <span>
            {role === "buyer"
              ? "Buscar imóvel disponível…"
              : "Buscar nos seus imóveis…"}
          </span>
        </div>
      </div>
      <div className="topbar-right">
        <LanguageToggle compact />
        <div
          className="role-switch"
          title="Alterne entre as duas experiências"
        >
          <button
            className={role === "owner" ? "active" : ""}
            onClick={() => {
              setRole("owner");
              navigate("dashboard");
            }}
          >
            Sou proprietário
          </button>
          <button
            className={role === "buyer" ? "active" : ""}
            onClick={() => {
              setRole("buyer");
              navigate("dashboard");
            }}
          >
            Quero investir
          </button>
        </div>
        <a
          href="/validator"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-neutral btn-sm"
          style={{ textDecoration: "none", gap: 6 }}
          title="Acessar painel de validadores (área operacional)"
        >
          <IconShield size={14} /> Validadores
        </a>
        <button className="btn btn-neutral btn-sm" style={{ padding: "8px" }}>
          <IconBell size={16} />
        </button>
        <WalletChip wallet={wallet} />
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  crumb,
  actions,
}: {
  title: string;
  subtitle?: string;
  crumb?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="page-header">
      {crumb && <div className="crumb">{crumb}</div>}
      <div
        className="row-between"
        style={{ alignItems: "flex-start", gap: 24, flexWrap: "wrap" }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 className="page-title">{title}</h1>
          {subtitle && <div className="page-subtitle">{subtitle}</div>}
        </div>
        {actions && (
          <div className="row row-gap" style={{ flexWrap: "wrap" }}>
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

export function HashChip({ hash, label }: { hash: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const onCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(hash).catch(() => {});
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };
  return (
    <span className="hash-chip" onClick={onCopy} title={hash}>
      {label && <span style={{ color: "var(--color-muted)" }}>{label}</span>}
      <span>{truncate(hash, 6, 4)}</span>
      {copied ? <IconCheck size={12} /> : <IconCopy size={12} />}
    </span>
  );
}

export function PropThumbArt({ variant }: { variant: ThumbVariant }) {
  const palettes: Record<ThumbVariant, [string, string, string]> = {
    mix: ["#2f3130", "#ff6a00", "#ffb27a"],
    orange: ["#ffb27a", "#ff6a00", "#fff0e5"],
    charcoal: ["#5a5e5c", "#2f3130", "#ff6a00"],
    cream: ["#e7e3dc", "#f3eee8", "#ffb27a"],
    soft: ["#fff0e5", "#f3eee8", "#ffb27a"],
    deep: ["#2f3130", "#ff6a00", "#fff0e5"],
  };
  const c = palettes[variant] ?? palettes.mix;
  return (
    <svg
      className="thumb-art"
      viewBox="0 0 400 200"
      preserveAspectRatio="none"
    >
      <rect width="400" height="200" fill={c[0]} />
      <ellipse cx="100" cy="160" rx="180" ry="80" fill={c[1]} opacity="0.92" />
      <ellipse cx="320" cy="60" rx="70" ry="55" fill={c[2]} opacity="0.95" />
      <ellipse cx="370" cy="120" rx="40" ry="32" fill={c[2]} opacity="0.85" />
    </svg>
  );
}

export function PropertyCard({
  p,
  onClick,
}: {
  p: Property;
  onClick: () => void;
}) {
  const fiatRates = useFiatRates();
  const soldPct =
    Math.round((p.soldFreeValueUnits / p.freeValueUnits) * 100) || 0;
  const availUnits = p.freeValueUnits - p.soldFreeValueUnits;
  return (
    <div className="prop-card" onClick={onClick}>
      <div className="prop-thumb">
        <PropThumbArt variant={p.thumbVariant} />
        <div className="prop-thumb-overlay">
          <div className="prop-thumb-tags">
            <StatusPill status={p.status} />
          </div>
        </div>
      </div>
      <div className="prop-card-body">
        <div className="prop-card-title">{p.title}</div>
        <div className="prop-card-loc">
          <IconMapPin size={13} />
          {p.city}, {p.state}
        </div>
        {p.status === "ActiveSale" && (
          <div className="col col-gap-sm" style={{ marginTop: 6 }}>
            <div className="row-between text-xs muted">
              <span>{soldPct}% captado</span>
              <span>{formatUnits(availUnits)} unidades restantes</span>
            </div>
            <div className="progress">
              <div
                className="progress-bar"
                style={{ width: soldPct + "%" }}
              />
            </div>
          </div>
        )}
        <div className="prop-card-foot">
          <div>
            <div className="prop-card-price-label">Avaliação</div>
            <div className="prop-card-price">
              {formatEth(p.marketValueEth)}{" "}
              <span className="fiat">
                ≈ {formatUsdFromFiatRates(p.marketValueEth, fiatRates)}
              </span>
            </div>
          </div>
          <IconChevronRight size={18} />
        </div>
      </div>
    </div>
  );
}

export function OfferCard({
  listing,
  property,
  onClick,
}: {
  listing: Listing;
  property: Property;
  onClick: () => void;
}) {
  const fiatRates = useFiatRates();
  const pctOfProp = (listing.amount / property.totalValueUnits) * 100;
  const pricePerUnit = Number(listing.priceWei) / listing.amount;
  const minTicket = pricePerUnit * 1000;
  return (
    <div className="offer-card" onClick={onClick}>
      <div className="offer-thumb">
        <PropThumbArt variant={property.thumbVariant} />
        <div className="offer-thumb-overlay">
          <span className="offer-pct">
            <strong>{pctOfProp.toFixed(2)}%</strong> do imóvel
          </span>
        </div>
      </div>
      <div className="offer-body">
        <div>
          <div className="offer-title">{property.title}</div>
          <div className="offer-loc">
            <IconMapPin size={13} />
            {property.city}, {property.state}
          </div>
        </div>
        <div className="offer-stats">
          <div>
            <div className="offer-stat-label">Investimento mínimo</div>
            <div className="offer-stat-value mono">
              {minTicket.toFixed(4)} SOL
            </div>
            <div className="offer-stat-sub">
              ≈ {formatUsdFromFiatRates(minTicket, fiatRates)}
            </div>
          </div>
          <div>
            <div className="offer-stat-label">Oferta total</div>
            <div className="offer-stat-value mono">
              {Number(listing.priceWei).toFixed(3)} SOL
            </div>
            <div className="offer-stat-sub">
              {formatUnits(listing.amount)} unidades
            </div>
          </div>
        </div>
        <button className="btn btn-primary w-100">
          Investir <IconArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}

export function ValueSplit({
  p,
  compact,
}: {
  p: Property;
  compact?: boolean;
}) {
  const linkedPct = (p.linkedValueUnits / p.totalValueUnits) * 100;
  const soldPct = (p.soldFreeValueUnits / p.totalValueUnits) * 100;
  const ownerFreePct =
    ((p.freeValueUnits - p.soldFreeValueUnits) / p.totalValueUnits) * 100;
  return (
    <div className="col col-gap">
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
        <div
          className="value-seg"
          style={{
            width: ownerFreePct + "%",
            background: "var(--color-orange)",
            color: "#fff",
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
            Disponível
          </span>
          <span className="pct">{ownerFreePct.toFixed(0)}%</span>
        </div>
        {soldPct > 0 && (
          <div
            className="value-seg"
            style={{
              width: soldPct + "%",
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
              Captado
            </span>
            <span className="pct">{soldPct.toFixed(0)}%</span>
          </div>
        )}
      </div>
      {!compact && (
        <div
          className="row row-gap-lg text-sm muted"
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
            Reservado ao proprietário:{" "}
            <strong style={{ color: "var(--color-charcoal)" }}>
              {linkedPct.toFixed(0)}%
            </strong>
          </div>
          <div className="row row-gap-sm">
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 3,
                background: "var(--color-orange)",
              }}
            />
            Disponível para investidores:{" "}
            <strong style={{ color: "var(--color-charcoal)" }}>
              {ownerFreePct.toFixed(0)}%
            </strong>
          </div>
          {p.soldFreeValueUnits > 0 && (
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
              Já captado:{" "}
              <strong style={{ color: "var(--color-charcoal)" }}>
                {soldPct.toFixed(0)}%
              </strong>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function TxModal({
  open,
  step,
  onClose,
  title,
  successLabel = "Continuar",
}: {
  open: boolean;
  step: TxStep;
  onClose: () => void;
  title: string;
  successLabel?: string;
}) {
  if (!open) return null;
  const steps: { key: TxStep; label: string; sub: string }[] = [
    {
      key: "sign",
      label: "Aguardando sua confirmação",
      sub: "Confirme a operação na sua carteira para prosseguir.",
    },
    {
      key: "sent",
      label: "Operação enviada",
      sub: "A rede está processando.",
    },
    {
      key: "confirming",
      label: "Confirmando",
      sub: "Costuma levar 12 segundos.",
    },
    {
      key: "done",
      label: "Tudo certo!",
      sub: "Sua operação foi registrada com sucesso.",
    },
  ];
  const idx = steps.findIndex((s) => s.key === step);
  return (
    <div
      className="modal-overlay"
      onClick={step === "done" ? onClose : undefined}
    >
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="row-between mb-24">
          <div className="text-lg fw-800">{title}</div>
          <button
            className="btn btn-ghost"
            onClick={onClose}
            style={{ padding: 4, borderRadius: 8 }}
          >
            <IconX size={18} />
          </button>
        </div>
        <div className="col col-gap">
          {steps.map((s, i) => {
            const done = i < idx;
            const active = i === idx;
            return (
              <div
                key={s.key}
                className={
                  "timeline-item" +
                  (done ? " done" : "") +
                  (active ? " active" : "")
                }
              >
                <div className="timeline-dot">
                  {done ? (
                    <IconCheck size={14} />
                  ) : active && step !== "done" ? (
                    <div
                      className="tx-spinner"
                      style={{ width: 12, height: 12, borderWidth: 2 }}
                    />
                  ) : (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: "var(--color-muted)",
                      }}
                    >
                      {i + 1}
                    </span>
                  )}
                </div>
                <div>
                  <div
                    className="tl-title"
                    style={{
                      color: active
                        ? "var(--color-charcoal)"
                        : done
                          ? "var(--color-success)"
                          : "var(--color-muted)",
                    }}
                  >
                    {s.label}
                  </div>
                  {(active || done) && <div className="tl-sub">{s.sub}</div>}
                </div>
              </div>
            );
          })}
        </div>
        {step === "done" && (
          <button
            className="btn btn-primary"
            style={{ width: "100%", marginTop: 12 }}
            onClick={onClose}
          >
            {successLabel}
          </button>
        )}
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  sub,
  actionLabel,
  onAction,
}: {
  title: string;
  sub?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div
      className="card card-pad-lg"
      style={{ textAlign: "center", padding: "64px 24px" }}
    >
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: 24,
          background: "var(--color-orange-soft)",
          margin: "0 auto 24px",
          display: "grid",
          placeItems: "center",
          color: "var(--color-orange)",
        }}
      >
        <IconStore size={32} />
      </div>
      <div className="fw-800 text-xl">{title}</div>
      {sub && (
        <div
          className="muted text-sm mt-12"
          style={{ maxWidth: 400, margin: "12px auto 0" }}
        >
          {sub}
        </div>
      )}
      {actionLabel && onAction && (
        <button className="btn btn-primary mt-24" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function TxStatusBadge({
  status,
}: {
  status: "Confirmado" | "Pendente" | "Falhou";
}) {
  const map = {
    Confirmado: { cls: "badge badge-success", label: "Confirmado" },
    Pendente: { cls: "badge badge-warning", label: "Pendente" },
    Falhou: { cls: "badge badge-danger", label: "Falhou" },
  };
  const s = map[status] ?? map.Confirmado;
  return <span className={s.cls}>{s.label}</span>;
}
