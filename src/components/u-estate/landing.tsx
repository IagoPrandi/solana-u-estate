"use client";

import Image from "next/image";
import {
  IconArrowRight,
  IconBuilding,
  IconCheck,
  IconCoins,
  IconKey,
  IconLayers,
  IconShield,
  IconUsers,
  IconZap,
} from "./icons";
import { LanguageToggle, useLanguage } from "./i18n";
import type { Navigate, Role } from "./types";

const heroCopy = {
  en: {
    tag: "Proptech · Real estate tokenization",
    titleLead: "Invest in",
    titleAccent: "real estate value",
    titleTail: "without buying the whole property.",
    subtitleLead: "u-estate separates",
    subtitleUseRight: "the right to use the property",
    subtitleAnd: "and",
    subtitleValueRight: "the right to the property's value",
    subtitleTail:
      "two independent positions that open a new way to participate economically in real estate.",
  },
  pt: {
    tag: "Proptech · Tokenização imobiliária",
    titleLead: "Invista em",
    titleAccent: "valor imobiliário",
    titleTail: "sem comprar o imóvel inteiro.",
    subtitleLead: "A u-estate separa",
    subtitleUseRight: "o direito de usufruir do imóvel",
    subtitleAnd: "e",
    subtitleValueRight: "o direito sobre o valor do imóvel",
    subtitleTail:
      "duas posições independentes que abrem uma forma totalmente nova de participação econômica em imóveis.",
  },
} as const;

export function LandingPage({
  navigate,
  setRole,
}: {
  navigate: Navigate;
  setRole: (r: Role) => void;
}) {
  const { locale } = useLanguage();
  const copy = heroCopy[locale];
  const enterAsOwner = () => {
    setRole("owner");
    navigate("dashboard");
  };
  const enterAsBuyer = () => {
    setRole("buyer");
    navigate("marketplace");
  };
  return (
    <div className="landing">
      <div className="landing-nav">
        <div
          className="row row-gap"
          style={{ cursor: "pointer" }}
          onClick={() => navigate("landing")}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 1,
              display: "grid",
              placeItems: "center",
              overflow: "hidden",
            }}
          >
            <Image
              src="/u-estate-logo-s-nome-s-fundo.png"
              alt=""
              width={44}
              height={44}
              style={{ objectFit: "contain" }}
            />
          </div>
          <div className="fw-800 text-xl">u-estate</div>
        </div>
        <div className="landing-nav-links">
          <a onClick={(e) => { e.preventDefault(); document.getElementById("publico")?.scrollIntoView({ behavior: "smooth" }); }}>Para quem</a>
          <a onClick={(e) => { e.preventDefault(); document.getElementById("como")?.scrollIntoView({ behavior: "smooth" }); }}>Como funciona</a>
          <a onClick={(e) => { e.preventDefault(); document.getElementById("direitos")?.scrollIntoView({ behavior: "smooth" }); }}>Os dois direitos</a>
          <a onClick={(e) => { e.preventDefault(); document.getElementById("beneficios")?.scrollIntoView({ behavior: "smooth" }); }}>Benefícios</a>
        </div>
        <div className="row row-gap">
          <LanguageToggle compact />
          <a
            href="/validator"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost btn-sm"
            style={{ textDecoration: "none" }}
          >
            <IconShield size={14} /> Validadores
          </a>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => navigate("learn")}
          >
            Saiba mais
          </button>
          <button className="btn btn-primary btn-sm" onClick={enterAsBuyer}>
            Entrar no app <IconArrowRight size={14} />
          </button>
        </div>
      </div>

      <section className="hero">
        <div>
          <span className="hero-tag" data-i18n-skip="true">
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "var(--color-orange)",
              }}
            />{" "}
            {copy.tag}
          </span>
          <h1 data-i18n-skip="true">
            {copy.titleLead} <span className="accent">{copy.titleAccent}</span>{" "}
            {copy.titleTail}
          </h1>
          <p data-i18n-skip="true">
            {copy.subtitleLead} <strong>{copy.subtitleUseRight}</strong>{" "}
            {copy.subtitleAnd} <strong>{copy.subtitleValueRight}</strong> —{" "}
            {copy.subtitleTail}
          </p>
          <div className="hero-cta">
            <button className="btn btn-primary btn-lg" onClick={enterAsBuyer}>
              Quero investir <IconArrowRight size={16} />
            </button>
            <button className="btn btn-neutral btn-lg" onClick={enterAsOwner}>
              Tenho um imóvel
            </button>
          </div>
          <div className="hero-stats">
            <div>
              <div className="hero-stat-num">2</div>
              <div className="hero-stat-lbl">direitos por imóvel</div>
            </div>
            <div>
              <div className="hero-stat-num">0,001 ETH</div>
              <div className="hero-stat-lbl">menor fração</div>
            </div>
            <div>
              <div className="hero-stat-num">100%</div>
              <div className="hero-stat-lbl">on-chain auditável</div>
            </div>
          </div>
        </div>

        <div className="hero-visual">
          <div className="hero-blob-1" />
          <div className="hero-blob-2" />
          <div className="hero-blob-3" />
          <div className="hero-card hero-card-1">
            <div
              className="muted text-xs"
              style={{
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                fontWeight: 600,
              }}
            >
              Casa Vila Madalena
            </div>
            <div className="fw-800 text-lg mt-12">0,85 ETH</div>
            <div className="muted text-sm">≈ US$ 1.998</div>
            <div
              className="value-split-bar mt-16"
              style={{ height: 32 }}
            >
              <div
                className="value-seg"
                style={{
                  width: "30%",
                  background: "var(--color-charcoal)",
                  color: "#fff",
                  padding: "0 8px",
                }}
              >
                <span className="pct" style={{ fontSize: 11 }}>
                  Usufruto
                </span>
              </div>
              <div
                className="value-seg"
                style={{
                  width: "45%",
                  background: "var(--color-orange)",
                  color: "#fff",
                  padding: "0 8px",
                }}
              >
                <span className="pct" style={{ fontSize: 11 }}>
                  Valor disponível
                </span>
              </div>
              <div
                className="value-seg"
                style={{
                  width: "25%",
                  background: "var(--color-orange-soft)",
                  color: "var(--color-orange-muted)",
                  padding: "0 8px",
                }}
              >
                <span className="pct" style={{ fontSize: 11 }}>
                  Captado
                </span>
              </div>
            </div>
            <div className="muted text-xs mt-12">
              Direito de uso · Direito sobre o valor
            </div>
          </div>
          <div className="hero-card hero-card-2">
            <div className="row row-gap">
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: "var(--color-success-soft)",
                  color: "var(--color-success)",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <IconCheck size={18} />
              </div>
              <div>
                <div className="fw-700 text-sm">Compra confirmada</div>
                <div className="muted text-xs">
                  + 80.000 unidades · 0.068 ETH
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="publico" className="section">
        <div className="section-eyebrow">Para quem</div>
        <h2 className="section-title">Dois lados, um mesmo protocolo.</h2>
        <p className="section-sub">
          A u-estate conecta quem quer captar liquidez sem vender a casa com
          quem quer investir em valor imobiliário a partir de pequenas
          frações.
        </p>
        <div className="audience-grid">
          <div className="audience-card audience-buyer">
            <div className="audience-eyebrow">
              <IconCoins size={16} />
              <span>Para quem investe</span>
            </div>
            <h3>Compre frações de imóveis reais.</h3>
            <p>
              Acesso a participação econômica em imóveis a partir de 0,001
              ETH. Sem cartório, sem contrato em papel, sem precisar comprar o
              imóvel inteiro.
            </p>
            <ul className="audience-list">
              <li>
                <IconCheck size={16} />
                <span>Investimento mínimo a partir de R$ 50</span>
              </li>
              <li>
                <IconCheck size={16} />
                <span>Histórico e documentos auditáveis on-chain</span>
              </li>
              <li>
                <IconCheck size={16} />
                <span>Diversifique entre vários imóveis</span>
              </li>
            </ul>
            <button className="btn btn-primary w-100" onClick={enterAsBuyer}>
              Explorar imóveis <IconArrowRight size={16} />
            </button>
          </div>
          <div className="audience-card audience-owner">
            <div className="audience-eyebrow">
              <IconBuilding size={16} />
              <span>Para quem tem imóvel</span>
            </div>
            <h3>Capte liquidez sem vender a casa.</h3>
            <p>
              Você continua morando e mantém o controle do uso. Apenas a
              fração econômica que você quiser fica disponível para
              investidores.
            </p>
            <ul className="audience-list">
              <li>
                <IconCheck size={16} />
                <span>O usufruto continua com você</span>
              </li>
              <li>
                <IconCheck size={16} />
                <span>Você decide quanto disponibilizar</span>
              </li>
              <li>
                <IconCheck size={16} />
                <span>Receba ETH direto na sua carteira</span>
              </li>
            </ul>
            <button className="btn btn-neutral w-100" onClick={enterAsOwner}>
              Cadastrar imóvel <IconArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      <section id="como" className="section">
        <div className="section-eyebrow">Como funciona</div>
        <h2 className="section-title">
          Do imóvel à participação econômica em quatro passos.
        </h2>
        <p className="section-sub">
          A u-estate destaca, de um mesmo imóvel, dois direitos que podem
          circular separadamente — mantendo a proprietária no controle do
          uso, enquanto a participação no valor pode ser ofertada a
          investidores.
        </p>
        <div className="how-grid">
          {[
            {
              n: "01",
              t: "Cadastro",
              d: "A proprietária registra o imóvel, envia documentos e gera hashes determinísticos on-chain.",
            },
            {
              n: "02",
              t: "Verificação",
              d: "Documentos são auditados pelo verificador autorizado da rede.",
            },
            {
              n: "03",
              t: "Tokenização",
              d: "O imóvel é representado por dois direitos: o direito de uso e o direito sobre o valor.",
            },
            {
              n: "04",
              t: "Marketplace",
              d: "A proprietária pode listar parte do direito sobre o valor para captar liquidez.",
            },
          ].map((s) => (
            <div key={s.n} className="how-card">
              <div className="how-card-num">{s.n}</div>
              <h3>{s.t}</h3>
              <p>{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="direitos" className="section">
        <div className="section-eyebrow">Os dois direitos</div>
        <h2 className="section-title">
          Um imóvel. Dois direitos. Liquidez sem perder a casa.
        </h2>
        <p className="section-sub">
          O direito de usar o imóvel e o direito sobre o valor do imóvel
          passam a ser duas posições independentes. Quem usa não precisa ser
          quem detém todo o valor — e vice-versa.
        </p>
        <div className="rights-grid">
          <div className="rights-card charcoal">
            <span className="pill-mono">Direito de uso</span>
            <div style={{ flex: 1 }}>
              <h3>Direito de Usufruto</h3>
              <p style={{ marginTop: 12 }}>
                O direito de morar e usar o imóvel. Permanece com a
                proprietária e não circula no marketplace — quem investe não
                ganha acesso à casa.
              </p>
            </div>
            <div
              className="row row-gap-sm"
              style={{
                borderTop: "1px solid rgba(255,255,255,0.15)",
                paddingTop: 12,
              }}
            >
              <IconKey size={14} />
              <span className="text-sm">
                Token único, intransferível por venda direta
              </span>
            </div>
          </div>
          <div className="rights-card orange">
            <span className="pill-mono">Direito sobre o valor</span>
            <div style={{ flex: 1 }}>
              <h3>Direito sobre o Valor</h3>
              <p style={{ marginTop: 12, opacity: 0.95 }}>
                A participação econômica do imóvel: a parcela do valor que a
                proprietária pode ofertar a investidores em frações pequenas
                e negociáveis.
              </p>
            </div>
            <div
              className="row row-gap-sm"
              style={{
                borderTop: "1px solid rgba(255,255,255,0.2)",
                paddingTop: 12,
              }}
            >
              <IconCoins size={14} />
              <span className="text-sm">
                Compre frações a partir de 0,001 ETH
              </span>
            </div>
          </div>
        </div>
      </section>

      <section id="beneficios" className="section">
        <div className="section-eyebrow">Benefícios</div>
        <h2 className="section-title">
          Pensado para quem mora, para quem investe e para quem regula.
        </h2>
        <div className="benefits-grid">
          {[
            {
              i: <IconShield size={26} />,
              t: "A casa continua sua",
              d: "A proprietária mantém o direito de morar mesmo após captar liquidez vendendo frações do valor.",
            },
            {
              i: <IconCoins size={26} />,
              t: "Liquidez sob medida",
              d: "Venda apenas a fração de valor que você quer. O contrato calcula o preço automaticamente.",
            },
            {
              i: <IconZap size={26} />,
              t: "Sem intermediários",
              d: "A transação é direta entre vendedora e compradora; o contrato registra tudo.",
            },
            {
              i: <IconLayers size={26} />,
              t: "Compliance por design",
              d: "Tokens não saem da plataforma. Apenas operações autorizadas pelos contratos.",
            },
            {
              i: <IconUsers size={26} />,
              t: "Acessível desde 0,001 ETH",
              d: "Você não precisa comprar o imóvel inteiro para começar a investir em valor imobiliário.",
            },
            {
              i: <IconBuilding size={26} />,
              t: "Auditável on-chain",
              d: "Cada hash, cada verificação, cada compra: tudo registrado em rede pública.",
            },
          ].map((b, i) => (
            <div key={i} className="benefit-item">
              <div className="benefit-icon">{b.i}</div>
              <h4>{b.t}</h4>
              <p>{b.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="cta-section">
        <div
          style={{
            position: "absolute",
            right: -100,
            top: -100,
            width: 400,
            height: 400,
            background: "var(--color-orange)",
            borderRadius: "50%",
            filter: "blur(80px)",
            opacity: 0.4,
          }}
        />
        <div style={{ position: "relative" }}>
          <h2>Pronto para tokenizar valor imobiliário?</h2>
          <p>
            Conecte sua carteira, cadastre seu imóvel e comece a operar. Toda
            a infraestrutura on-chain já está pronta para você.
          </p>
          <div className="row row-gap" style={{ justifyContent: "center" }}>
            <button className="btn btn-primary btn-lg" onClick={enterAsBuyer}>
              Explorar marketplace <IconArrowRight size={16} />
            </button>
            <button className="btn btn-neutral btn-lg" onClick={enterAsOwner}>
              Cadastrar meu imóvel
            </button>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div>© 2026 u-estate · Hackathon prototype</div>
        <div className="row row-gap-lg">
          <a>Termos</a>
          <a>Privacidade</a>
          <a>GitHub</a>
        </div>
      </footer>
    </div>
  );
}
