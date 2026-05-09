"use client";

import { useEffect, useState } from "react";
import {
  initialFiatRatesState,
  type FiatRatesState,
} from "./fiat-rates";
import type { FiatRatesResponse } from "@/offchain/schemas";

function parseRate(raw: string | undefined) {
  const rate = Number(raw);
  return Number.isFinite(rate) && rate > 0 ? rate : null;
}

export function useFiatRates() {
  const [rates, setRates] = useState<FiatRatesState>(initialFiatRatesState);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    void fetch("/api/fiat-rates", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const body = (await response.json()) as FiatRatesResponse;
        if (!response.ok || !body.ok) {
          throw new Error(body.ok ? "OKX fiat rates unavailable." : body.message);
        }
        const usdRate = parseRate(body.rates.usd);
        if (!usdRate) throw new Error("OKX SOL-USDC rate is missing or invalid.");
        return {
          loading: false,
          error: null,
          usdRate,
          brlRate: parseRate(body.rates.brl),
          cached: body.cached,
          updatedAt: body.updatedAt,
        } satisfies FiatRatesState;
      })
      .then((snapshot) => {
        if (!cancelled) setRates(snapshot);
      })
      .catch((error) => {
        if (cancelled || error instanceof DOMException) return;
        setRates({
          ...initialFiatRatesState,
          loading: false,
          error:
            error instanceof Error
              ? error.message
              : "Could not load OKX fiat rates.",
        });
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  return rates;
}
