"use client";

import { useEffect, useMemo, useState } from "react";

type Locale = "en" | "pt";

type LocalizedCopy = {
  badge: string;
  heading: string;
  subtitle: string;
  sections: {
    ownerTitle: string;
    ownerBody: string;
    investorTitle: string;
    investorBody: string;
    demoTitle: string;
    demoBody: string;
  };
  ctaPrimary: string;
  ctaSecondary: string;
  toggleAriaLabel: string;
  toggleCurrent: string;
};

const copyByLocale: Record<Locale, LocalizedCopy> = {
  en: {
    badge: "Language mode",
    heading: "A bilingual demo-ready interface",
    subtitle:
      "This app is now fully prepared to switch between English and Portuguese with one slider, so your team can present the product in either language instantly.",
    sections: {
      ownerTitle: "For property owners",
      ownerBody:
        "Tokenize properties with a clear flow and present legal-economic rights with consistent terminology.",
      investorTitle: "For investors",
      investorBody:
        "Review available value-right opportunities in a cleaner interface with focused calls to action.",
      demoTitle: "For hackathon demos",
      demoBody:
        "Use the language toggle during presentations to adapt your story to local and international judges.",
    },
    ctaPrimary: "Start tokenization",
    ctaSecondary: "Explore marketplace",
    toggleAriaLabel: "Switch language between Portuguese and English",
    toggleCurrent: "Current language: English",
  },
  pt: {
    badge: "Modo de idioma",
    heading: "Uma interface bilíngue pronta para demo",
    subtitle:
      "Este app agora está totalmente preparado para alternar entre português e inglês com um único botão deslizante, para que sua equipe apresente o produto em qualquer idioma na hora.",
    sections: {
      ownerTitle: "Para proprietários",
      ownerBody:
        "Tokenize imóveis com um fluxo claro e apresente direitos jurídico-econômicos com terminologia consistente.",
      investorTitle: "Para investidores",
      investorBody:
        "Avalie oportunidades de direito de valor em uma interface mais limpa e com chamadas de ação objetivas.",
      demoTitle: "Para demos de hackathon",
      demoBody:
        "Use o seletor de idioma durante apresentações para adaptar sua narrativa para jurados locais e internacionais.",
    },
    ctaPrimary: "Iniciar tokenização",
    ctaSecondary: "Explorar marketplace",
    toggleAriaLabel: "Alternar idioma entre português e inglês",
    toggleCurrent: "Idioma atual: Português",
  },
};

export default function Home() {
  const [locale, setLocale] = useState<Locale>("en");

  const isEnglish = locale === "en";
  const content = useMemo(() => copyByLocale[locale], [locale]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-100 px-6 py-16">
      <main className="w-full max-w-5xl rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <span className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
            {content.badge}
          </span>

          <button
            type="button"
            onClick={() => setLocale(isEnglish ? "pt" : "en")}
            className="inline-flex items-center gap-3 rounded-full border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
            aria-label={content.toggleAriaLabel}
          >
            <span className="text-zinc-500">PT</span>
            <span
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                isEnglish ? "bg-zinc-900" : "bg-zinc-400"
              }`}
              aria-hidden="true"
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                  isEnglish ? "translate-x-5" : "translate-x-1"
                }`}
              />
            </span>
            <span className="text-zinc-500">EN</span>
          </button>
        </div>

        <section className="space-y-5">
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-900">
            {content.heading}
          </h1>
          <p className="max-w-4xl text-lg leading-relaxed text-zinc-600">
            {content.subtitle}
          </p>
        </section>

        <section className="mt-10 grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
            <h2 className="text-base font-semibold text-zinc-900">
              {content.sections.ownerTitle}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">
              {content.sections.ownerBody}
            </p>
          </article>

          <article className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
            <h2 className="text-base font-semibold text-zinc-900">
              {content.sections.investorTitle}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">
              {content.sections.investorBody}
            </p>
          </article>

          <article className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
            <h2 className="text-base font-semibold text-zinc-900">
              {content.sections.demoTitle}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">
              {content.sections.demoBody}
            </p>
          </article>
        </section>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <button className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-zinc-700">
            {content.ctaPrimary}
          </button>
          <button className="rounded-full border border-zinc-300 px-6 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50">
            {content.ctaSecondary}
          </button>
        </div>

        <p className="mt-6 text-xs uppercase tracking-wide text-zinc-400">
          {content.toggleCurrent}
        </p>
      </main>
    </div>
  );
}
