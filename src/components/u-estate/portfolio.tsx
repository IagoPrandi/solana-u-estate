"use client";

import { useState } from "react";
import { formatUsd, truncate } from "./data";
import { getWalletHoldings } from "./holdings";
import {
  IconBell,
  IconCheck,
  IconExternal,
  IconMapPin,
  IconNetwork,
  IconPlus,
  IconUser,
  IconWallet,
} from "./icons";
import {
  EmptyState,
  HashChip,
  PageHeader,
  PropertyCard,
  PropThumbArt,
  TxStatusBadge,
} from "./ui";
import type {
  Listing,
  Navigate,
  Property,
  Role,
  Transaction,
  User,
} from "./types";

export function PortfolioPage({
  properties,
  transactions,
  user,
  navigate,
  role,
}: {
  properties: Property[];
  listings: Listing[];
  transactions: Transaction[];
  user: User;
  navigate: Navigate;
  role: Role;
}) {
  const isBuyer = role === "buyer";
  const [tab, setTab] = useState<"holdings" | "owned" | "history">(
    isBuyer ? "holdings" : "owned",
  );
  const owned = properties;
  const holdings = getWalletHoldings(properties, user.wallet);

  const totalOwnedValueEth = owned.reduce(
    (s, p) =>
      s +
      Number(p.marketValueEth) *
        (p.linkedValueUnits / p.totalValueUnits +
          (p.freeValueUnits - p.soldFreeValueUnits) / p.totalValueUnits),
    0,
  );
  const totalHoldingsValueEth = holdings.reduce(
    (s, h) =>
      s +
      (Number(h.property.marketValueEth) * h.units) /
        h.property.totalValueUnits,
    0,
  );
  const totalInvestedEth = holdings.reduce((s, h) => s + h.costEth, 0);
  const pnl = totalHoldingsValueEth - totalInvestedEth;
  const pnlPct = totalInvestedEth > 0 ? (pnl / totalInvestedEth) * 100 : 0;

  const tabs: [typeof tab, string, number][] = isBuyer
    ? [
        ["holdings", "Minhas participações", holdings.length],
        ["history", "Histórico", transactions.length],
      ]
    : [
        ["owned", "Meus imóveis", owned.length],
        ["holdings", "Minhas participações", holdings.length],
        ["history", "Histórico", transactions.length],
      ];

  return (
    <div className="page">
      <PageHeader
        title={isBuyer ? "Meus investimentos" : "Portfólio"}
        subtitle={
          isBuyer
            ? "Acompanhe suas participações em imóveis e o desempenho de cada uma."
            : "Sua posição completa: imóveis próprios, participações compradas e histórico financeiro."
        }
        actions={
          isBuyer ? (
            <button
              className="btn btn-primary"
              onClick={() => navigate("marketplace")}
            >
              <IconPlus size={14} /> Novo investimento
            </button>
          ) : null
        }
      />

      {isBuyer ? (
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
            <div className="fw-800 text-2xl mt-12 mono">
              {totalInvestedEth.toFixed(3)} ETH
            </div>
            <div className="muted text-sm">
              ≈ {formatUsd(totalInvestedEth)}
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
            <div className="fw-800 text-2xl mt-12 mono">
              {totalHoldingsValueEth.toFixed(3)} ETH
            </div>
            <div className="muted text-sm">
              ≈ {formatUsd(totalHoldingsValueEth)}
            </div>
            <div
              className="text-xs mt-12 fw-700"
              style={{
                color:
                  pnl >= 0 ? "var(--color-success)" : "var(--color-danger)",
              }}
            >
              {pnl >= 0 ? "+" : ""}
              {pnl.toFixed(4)} ETH ({pnlPct >= 0 ? "+" : ""}
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
              Resultado
            </div>
            <div
              className="fw-800 text-2xl mt-12 mono"
              style={{
                color: pnl >= 0 ? "var(--color-orange)" : "#ff8a8a",
              }}
            >
              {pnl >= 0 ? "+" : ""}
              {pnl.toFixed(3)} ETH
            </div>
            <div className="text-sm" style={{ opacity: 0.7 }}>
              ≈ {formatUsd(Math.abs(pnl))}
            </div>
            <div className="text-xs mt-12" style={{ opacity: 0.6 }}>
              desde o primeiro investimento
            </div>
          </div>
        </div>
      ) : (
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
              Patrimônio próprio
            </div>
            <div className="fw-800 text-2xl mt-12 mono">
              {totalOwnedValueEth.toFixed(3)} ETH
            </div>
            <div className="muted text-sm">
              ≈ {formatUsd(totalOwnedValueEth)}
            </div>
            <div
              className="text-xs mt-12"
              style={{ color: "var(--color-success)" }}
            >
              {owned.length} imóveis ·{" "}
              {owned.filter((p) => p.status === "ActiveSale").length} captando
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
              Investimentos
            </div>
            <div className="fw-800 text-2xl mt-12 mono">
              {totalHoldingsValueEth.toFixed(3)} ETH
            </div>
            <div className="muted text-sm">
              ≈ {formatUsd(totalHoldingsValueEth)}
            </div>
            <div
              className="text-xs mt-12"
              style={{ color: "var(--color-orange-muted)" }}
            >
              {holdings.length} participações
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
              Total
            </div>
            <div className="fw-800 text-2xl mt-12 mono">
              {(totalOwnedValueEth + totalHoldingsValueEth).toFixed(3)} ETH
            </div>
            <div className="text-sm" style={{ opacity: 0.7 }}>
              ≈ {formatUsd(totalOwnedValueEth + totalHoldingsValueEth)}
            </div>
          </div>
        </div>
      )}

      <div className="tab-bar">
        {tabs.map(([k, l, n]) => (
          <button
            key={k}
            className={"tab" + (tab === k ? " active" : "")}
            onClick={() => setTab(k)}
          >
            {l} <span className="muted">({n})</span>
          </button>
        ))}
      </div>

      {tab === "owned" && (
        <div className="grid-3 mt-24">
          {owned.map((p) => (
            <PropertyCard
              key={p.id}
              p={p}
              onClick={() => navigate("property", { id: p.id })}
            />
          ))}
        </div>
      )}

      {tab === "holdings" && (
        <div className="col col-gap mt-24">
          {holdings.length === 0 ? (
            <EmptyState
              title="Você ainda não tem participações"
              sub="Explore imóveis disponíveis para fazer seu primeiro investimento."
              actionLabel="Explorar imóveis"
              onAction={() => navigate("marketplace")}
            />
          ) : (
            holdings.map((h, i) => {
              const valueEth =
                (Number(h.property.marketValueEth) * h.units) /
                h.property.totalValueUnits;
              const hpnl = valueEth - h.costEth;
              const hpnlPct = h.costEth > 0 ? (hpnl / h.costEth) * 100 : 0;
              return (
                <div
                  key={`${h.property.id}-${h.buyerWallet}-${i}`}
                  className="card card-pad row row-gap"
                  style={{ cursor: "pointer" }}
                  onClick={() =>
                    navigate("investment", { id: h.property.id })
                  }
                >
                  <div
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: "var(--radius-md)",
                      overflow: "hidden",
                      position: "relative",
                      flexShrink: 0,
                    }}
                  >
                    <PropThumbArt variant={h.property.thumbVariant} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="row row-gap-sm">
                      <strong className="text-base">{h.property.title}</strong>
                    </div>
                    <div
                      className="muted text-sm row row-gap-sm"
                      style={{ marginTop: 2 }}
                    >
                      <IconMapPin size={12} /> {h.property.city},{" "}
                      {h.property.state}
                    </div>
                    <div className="row row-gap text-sm mt-12">
                      <span>
                        <span className="muted">Sua participação</span>{" "}
                        <strong>
                          {(
                            (h.units / h.property.totalValueUnits) *
                            100
                          ).toFixed(2)}
                          %
                        </strong>
                      </span>
                      <span>
                        <span className="muted">Investido</span>{" "}
                        <strong className="mono">
                          {h.costEth.toFixed(4)} ETH
                        </strong>
                      </span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
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
                    <div className="fw-800 text-xl mono">
                      {valueEth.toFixed(4)} ETH
                    </div>
                    <div
                      className="text-sm fw-700"
                      style={{
                        color:
                          hpnl >= 0
                            ? "var(--color-success)"
                            : "var(--color-danger)",
                      }}
                    >
                      {hpnl >= 0 ? "+" : ""}
                      {hpnl.toFixed(4)} ETH ({hpnlPct >= 0 ? "+" : ""}
                      {hpnlPct.toFixed(1)}%)
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {tab === "history" && (
        <div className="card mt-24" style={{ padding: 0, overflow: "hidden" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Imóvel</th>
                <th>Valor</th>
                <th>Status</th>
                <th>Data</th>
                <th>Hash</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id}>
                  <td>
                    <span className="badge">{t.type}</span>
                  </td>
                  <td>{t.propertyTitle}</td>
                  <td className="mono">
                    {t.valueEth ? Number(t.valueEth).toFixed(4) + " ETH" : "—"}
                  </td>
                  <td>
                    <TxStatusBadge status={t.status} />
                  </td>
                  <td className="muted text-sm">
                    {new Date(t.date).toLocaleString("pt-BR")}
                  </td>
                  <td>
                    <HashChip hash={t.txHash} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function TransactionsPage({
  transactions,
}: {
  transactions: Transaction[];
}) {
  const [filter, setFilter] = useState("all");
  const types = ["all", ...Array.from(new Set(transactions.map((t) => t.type)))];
  const filtered = transactions.filter(
    (t) => filter === "all" || t.type === filter,
  );

  return (
    <div className="page">
      <PageHeader
        title="Transações"
        subtitle="Cada operação do seu workspace, com hashes auditáveis."
      />
      <div className="filter-bar mb-24">
        {types.map((t) => (
          <span
            key={t}
            className={"chip-filter" + (filter === t ? " active" : "")}
            onClick={() => setFilter(t)}
          >
            {t === "all" ? "Todas" : t}
          </span>
        ))}
      </div>
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Imóvel</th>
              <th>Valor</th>
              <th>Status</th>
              <th>Data</th>
              <th>Hash</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr key={t.id}>
                <td>
                  <span className="badge">{t.type}</span>
                </td>
                <td>{t.propertyTitle}</td>
                <td className="mono">
                  {t.valueEth ? Number(t.valueEth).toFixed(4) + " ETH" : "—"}
                </td>
                <td>
                  <TxStatusBadge status={t.status} />
                </td>
                <td className="muted text-sm">
                  {new Date(t.date).toLocaleString("pt-BR")}
                </td>
                <td>
                  <HashChip hash={t.txHash} />
                </td>
                <td>
                  <button className="btn btn-ghost btn-sm">
                    <IconExternal size={12} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function LearnPage({ role }: { role: Role; navigate: Navigate }) {
  const isBuyer = role === "buyer";
  return (
    <div className="page" style={{ maxWidth: 1100 }}>
      <PageHeader
        title="Como funciona"
        subtitle={
          isBuyer
            ? "O que você precisa saber antes de investir."
            : "O que você precisa saber para captar com seu imóvel."
        }
      />

      <div
        className="card card-pad-lg"
        style={{
          background: "var(--color-charcoal)",
          color: "#fff",
          borderColor: "var(--color-charcoal)",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div className="learn-hero-deco" />
        <div style={{ position: "relative", maxWidth: 640 }}>
          <div
            className="text-xs"
            style={{
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "var(--color-orange)",
              fontWeight: 700,
            }}
          >
            Em uma frase
          </div>
          <h2
            style={{
              fontSize: 36,
              fontWeight: 800,
              marginTop: 16,
              lineHeight: 1.15,
            }}
          >
            {isBuyer
              ? "Investir em imóveis sem precisar comprar a casa inteira."
              : "Captar liquidez no seu imóvel sem perder o direito de morar nele."}
          </h2>
          <p
            style={{
              marginTop: 16,
              fontSize: 17,
              lineHeight: 1.6,
              opacity: 0.8,
            }}
          >
            {isBuyer
              ? "A u-estate divide imóveis em pequenas participações econômicas. Você compra uma fatia e ganha conforme o imóvel valoriza."
              : "A u-estate separa o direito de morar do direito sobre o valor. Você libera uma parte do valor para investidores e mantém a casa."}
          </p>
        </div>
      </div>

      <div className="card card-pad-lg mt-32">
        <h3 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>
          Em {isBuyer ? "3" : "4"} passos
        </h3>
        <div className="learn-flow mt-32">
          {(isBuyer
            ? [
                {
                  n: 1,
                  t: "Escolha um imóvel",
                  d: "Veja imóveis verificados disponíveis para investimento.",
                },
                {
                  n: 2,
                  t: "Defina seu valor",
                  d: "A partir de poucos centésimos de ETH.",
                },
                {
                  n: 3,
                  t: "Acompanhe",
                  d: "Veja sua participação valorizar junto com o imóvel.",
                },
              ]
            : [
                { n: 1, t: "Cadastre o imóvel", d: "Envie os documentos básicos." },
                { n: 2, t: "Aguarde a análise", d: "Nossa equipe valida em até 24h." },
                {
                  n: 3,
                  t: "Disponibilize",
                  d: "Escolha quanto do imóvel quer ofertar.",
                },
                {
                  n: 4,
                  t: "Receba",
                  d: "Investidores compram e o ETH vai pra sua carteira.",
                },
              ]
          ).map((s) => (
            <div key={s.n} className="learn-flow-item">
              <div className="learn-flow-num">{s.n}</div>
              <div className="fw-800 text-base mt-12">{s.t}</div>
              <div className="muted text-sm mt-12">{s.d}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card card-pad-lg mt-32">
        <h3 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>
          Perguntas frequentes
        </h3>
        <div className="col col-gap mt-24">
          {(isBuyer
            ? [
                [
                  "Eu fico dono de uma parte da casa?",
                  "Você fica com uma participação no direito sobre o valor do imóvel — o direito de morar continua do proprietário.",
                ],
                [
                  "Como ganho dinheiro?",
                  "Sua participação valoriza junto com o imóvel. Você pode revender quando quiser.",
                ],
                [
                  "E se eu quiser sair?",
                  "Você pode revender sua participação no marketplace para outros investidores.",
                ],
                [
                  "É seguro?",
                  "Sim. Cada imóvel passa por verificação de documentos e tudo é registrado de forma auditável.",
                ],
              ]
            : [
                [
                  "Eu perco minha casa?",
                  "Não. Você mantém o direito de morar e uma parte do imóvel reservada pra você.",
                ],
                [
                  "Quanto posso captar?",
                  "Até a parte que você decidir ofertar. Pode começar pequeno e aumentar depois.",
                ],
                [
                  "Posso pausar?",
                  "Sim. Você pode pausar ou cancelar uma oferta a qualquer momento, antes de ela ser totalmente captada.",
                ],
                [
                  "Quem investe pode entrar na minha casa?",
                  "Não. Investidores compram só a parte econômica — não têm direito sobre o uso do imóvel.",
                ],
              ]
          ).map(([q, a], i) => (
            <details key={i} className="faq">
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SettingsPage({
  user,
  setUser,
}: {
  user: User;
  setUser: (u: User) => void;
}) {
  return (
    <div className="page" style={{ maxWidth: 880 }}>
      <PageHeader
        title="Configurações"
        subtitle="Carteira, rede, perfil e preferências."
      />
      <div className="col col-gap-lg">
        <div className="card card-pad-lg">
          <div className="row row-gap mb-24">
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "var(--color-orange-soft)",
                color: "var(--color-orange)",
                display: "grid",
                placeItems: "center",
              }}
            >
              <IconWallet size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>
                Carteira conectada
              </h3>
              <div className="muted text-sm">
                A carteira que assina suas transações.
              </div>
            </div>
          </div>
          <div
            className="row-between"
            style={{
              padding: 16,
              background: "var(--color-surface-soft)",
              borderRadius: "var(--radius-md)",
            }}
          >
            <div>
              <div className="fw-700">{user.ensName}</div>
              <div className="mono text-sm muted">
                {truncate(user.wallet, 8, 6)}
              </div>
            </div>
            <button className="btn btn-neutral btn-sm">Trocar carteira</button>
          </div>
        </div>

        <div className="card card-pad-lg">
          <div className="row row-gap mb-24">
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "var(--color-orange-soft)",
                color: "var(--color-orange)",
                display: "grid",
                placeItems: "center",
              }}
            >
              <IconNetwork size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>
                Rede
              </h3>
              <div className="muted text-sm">
                Onde os contratos da u-estate estão publicados.
              </div>
            </div>
          </div>
          <div className="grid-2">
            {["Sepolia", "Mainnet", "Polygon", "Anvil local"].map((n) => (
              <label
                key={n}
                className={"network-card" + (user.network === n ? " active" : "")}
                onClick={() => setUser({ ...user, network: n })}
              >
                <div className="net-dot" />
                <div>
                  <div className="fw-700 text-sm">{n}</div>
                  <div className="muted text-xs">
                    {n === "Sepolia"
                      ? "Testnet recomendada"
                      : n === "Anvil local"
                        ? "Desenvolvimento local"
                        : "Em breve"}
                  </div>
                </div>
                {user.network === n && (
                  <IconCheck
                    size={14}
                    style={{
                      color: "var(--color-orange)",
                      marginLeft: "auto",
                    }}
                  />
                )}
              </label>
            ))}
          </div>
        </div>

        <div className="card card-pad-lg">
          <div className="row row-gap mb-24">
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "var(--color-orange-soft)",
                color: "var(--color-orange)",
                display: "grid",
                placeItems: "center",
              }}
            >
              <IconUser size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>
                Perfil
              </h3>
              <div className="muted text-sm">
                Apenas para uso na interface.
              </div>
            </div>
          </div>
          <div className="field">
            <label className="field-label">Nome amigável</label>
            <input className="input" defaultValue="Pessoa A" />
          </div>
          <div className="field mt-24">
            <label className="field-label">
              Email para notificações (opcional)
            </label>
            <input className="input" placeholder="voce@exemplo.com" />
          </div>
        </div>

        <div className="card card-pad-lg">
          <div className="row row-gap mb-24">
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "var(--color-orange-soft)",
                color: "var(--color-orange)",
                display: "grid",
                placeItems: "center",
              }}
            >
              <IconBell size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>
                Notificações
              </h3>
              <div className="muted text-sm">Quando avisar você.</div>
            </div>
          </div>
          <div className="col col-gap">
            {(
              [
                ["Análise concluída", true],
                ["Nova compra na minha oferta", true],
                ["Novos imóveis para investir", false],
                ["Resumo semanal", true],
              ] as const
            ).map(([l, on]) => (
              <label
                key={l}
                className="row-between"
                style={{ padding: "12px 0" }}
              >
                <span className="text-sm">{l}</span>
                <span className={"toggle" + (on ? " on" : "")}>
                  <span className="toggle-dot" />
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
