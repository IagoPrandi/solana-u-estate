import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/fiat-rates/route";
import { getFiatRates } from "@/server/fiat-rates";

vi.mock("@/server/fiat-rates", () => ({
  getFiatRates: vi.fn(),
}));

describe("GET /api/fiat-rates", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns the successful fiat payload with the upstream status", async () => {
    vi.mocked(getFiatRates).mockResolvedValue({
      status: 200,
      body: {
        ok: true,
        cached: false,
        provider: "okx",
        base: "ETH",
        routes: {
          usd: "ETH-USDC",
          brl: "ETH-USDC * USDC-BRL",
        },
        rates: {
          usd: "2250.1",
          brl: "11475.51",
        },
        unavailable: [],
        optionalRates: {
          eur: null,
          jpy: null,
        },
        updatedAt: "2026-04-30T12:00:00.000Z",
      },
    });

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      cached: false,
      provider: "okx",
      base: "ETH",
      routes: {
        usd: "ETH-USDC",
        brl: "ETH-USDC * USDC-BRL",
      },
      rates: {
        usd: "2250.1",
        brl: "11475.51",
      },
      unavailable: [],
      optionalRates: {
        eur: null,
        jpy: null,
      },
      updatedAt: "2026-04-30T12:00:00.000Z",
    });
  });

  it("returns the standardized error payload with the upstream status", async () => {
    vi.mocked(getFiatRates).mockResolvedValue({
      status: 503,
      body: {
        ok: false,
        code: "FIAT_RATES_UNAVAILABLE",
        message:
          "Could not fetch ETH fiat rates from OKX and no cached rates are available within max staleness.",
        provider: "okx",
      },
    });

    const response = await GET();

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      code: "FIAT_RATES_UNAVAILABLE",
      message:
        "Could not fetch ETH fiat rates from OKX and no cached rates are available within max staleness.",
      provider: "okx",
    });
  });
});
