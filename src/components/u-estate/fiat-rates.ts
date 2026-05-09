"use client";

import type { FiatRatesResponse } from "@/offchain/schemas";
import { formatBrl, formatUsd } from "./data";

type FiatRatesState = {
  loading: boolean;
  error: string | null;
  usdRate: number | null;
  brlRate: number | null;
  cached: boolean;
  updatedAt: string | null;
};

const initialState: FiatRatesState = {
  loading: true,
  error: null,
  usdRate: null,
  brlRate: null,
  cached: false,
  updatedAt: null,
};

let cachedState: FiatRatesState | null = null;
let pendingRequest: Promise<FiatRatesState> | null = null;

function parseRate(raw: string | undefined) {
  const rate = Number(raw);
  return Number.isFinite(rate) && rate > 0 ? rate : null;
}

async function fetchFiatRates() {
  const response = await fetch("/api/fiat-rates", { cache: "no-store" });
  const body = (await response.json()) as FiatRatesResponse;

  if (!response.ok || !body.ok) {
    throw new Error(body.ok ? "OKX fiat rates unavailable." : body.message);
  }

  const usdRate = parseRate(body.rates.usd);
  if (!usdRate) {
    throw new Error("OKX SOL-USDC rate is missing or invalid.");
  }

  return {
    loading: false,
    error: null,
    usdRate,
    brlRate: parseRate(body.rates.brl),
    cached: body.cached,
    updatedAt: body.updatedAt,
  } satisfies FiatRatesState;
}

export function loadFiatRatesSnapshot() {
  if (cachedState) return Promise.resolve(cachedState);
  pendingRequest ??= fetchFiatRates()
    .then((state) => {
      cachedState = state;
      return state;
    })
    .catch((error) => {
      const state: FiatRatesState = {
        ...initialState,
        loading: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not load OKX fiat rates.",
      };
      cachedState = state;
      return state;
    })
    .finally(() => {
      pendingRequest = null;
    });

  return pendingRequest;
}

export function formatUsdFromFiatRates(
  sol: string | number,
  rates: Pick<FiatRatesState, "loading" | "error" | "usdRate">,
) {
  if (rates.loading) return "loading OKX rate";
  if (rates.error || !rates.usdRate) return "OKX rate unavailable";
  return formatUsd(sol, rates.usdRate);
}

export function formatBrlFromFiatRates(
  sol: string | number,
  rates: Pick<FiatRatesState, "loading" | "error" | "brlRate">,
) {
  if (rates.loading) return "loading OKX rate";
  if (rates.error || !rates.brlRate) return "OKX rate unavailable";
  return formatBrl(sol, rates.brlRate);
}

export function formatFiatPairFromRates(
  sol: string | number,
  rates: Pick<FiatRatesState, "loading" | "error" | "usdRate" | "brlRate">,
) {
  return `${formatUsdFromFiatRates(sol, rates)} · ${formatBrlFromFiatRates(sol, rates)}`;
}

export type { FiatRatesState };
export { initialState as initialFiatRatesState };
