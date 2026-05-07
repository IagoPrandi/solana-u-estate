import os from "node:os";
import path from "node:path";
import { mkdir, rm } from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetDbForTests } from "@/offchain/db";
import { readFiatRatesCache } from "@/offchain/repository";
import { getFiatRates } from "@/server/fiat-rates";

const originalEnv = { ...process.env };

describe("getFiatRates", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = path.join(
      os.tmpdir(),
      `hacknation-u-estate-${crypto.randomUUID()}`,
    );

    await mkdir(tempDir, { recursive: true });

    process.env.LOCAL_DB_PATH = path.join(tempDir, "db.json");
    process.env.OKX_API_BASE_URL = "https://www.okx.com";
    process.env.OKX_ETH_USDC_INST_ID = "ETH-USDC";
    process.env.OKX_ETH_USDC_INST_TYPE = "SPOT";
    process.env.OKX_USDC_BRL_INST_ID = "USDC-BRL";
    process.env.OKX_USDC_BRL_INST_TYPE = "SPOT";
    process.env.OKX_USDC_EUR_INST_ID = "";
    process.env.OKX_USDC_EUR_INST_TYPE = "SPOT";
    process.env.OKX_USDC_JPY_INST_ID = "";
    process.env.OKX_USDC_JPY_INST_TYPE = "SPOT";
    process.env.FIAT_REQUEST_TIMEOUT_MS = "3000";
    process.env.FIAT_CACHE_TTL_SECONDS = "60";
    process.env.FIAT_MAX_STALENESS_SECONDS = "3600";

    resetDbForTests();
  });

  afterEach(async () => {
    resetDbForTests();

    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) {
        delete process.env[key];
      }
    }

    Object.assign(process.env, originalEnv);
    await rm(tempDir, { recursive: true, force: true });
  });

  it("returns live USD and BRL rates and persists the cache", async () => {
    const fetchImpl = vi.fn(async (input: string | URL | Request) => {
      const url = input.toString();

      if (url.includes("ETH-USDC")) {
        return jsonResponse({
          code: "0",
          data: [{ last: "2250.10" }],
        });
      }

      if (url.includes("USDC-BRL")) {
        return jsonResponse({
          code: "0",
          data: [{ last: "5.10" }],
        });
      }

      throw new Error(`Unexpected URL: ${url}`);
    });

    const result = await getFiatRates({
      fetchImpl,
      now: new Date("2026-04-29T12:00:00.000Z"),
    });

    expect(result.status).toBe(200);
    expect(result.body.ok).toBe(true);

    if (!result.body.ok) {
      return;
    }

    expect(result.body.cached).toBe(false);
    expect(result.body.rates.usd).toBe("2250.1");
    expect(result.body.rates.brl).toBe("11475.51");
    expect(result.body.routes.brl).toBe("ETH-USDC * USDC-BRL");

    const cache = await readFiatRatesCache();
    expect(cache.rates.usd).toBe("2250.1");
    expect(cache.rates.brl).toBe("11475.51");
    expect(cache.updatedAt).toBe("2026-04-29T12:00:00.000Z");
  });

  it("uses OKX mark price for non-SPOT instruments and ticker for SPOT instruments", async () => {
    process.env.OKX_ETH_USDC_INST_ID = "ETH-USDT-SWAP";
    process.env.OKX_ETH_USDC_INST_TYPE = "SWAP";

    const fetchImpl = vi.fn(async (input: string | URL | Request) => {
      const url = input.toString();

      if (url.includes("/api/v5/public/mark-price")) {
        expect(url).toContain("instType=SWAP");
        expect(url).toContain("instId=ETH-USDT-SWAP");

        return jsonResponse({
          code: "0",
          data: [{ markPx: "2000.00" }],
        });
      }

      if (url.includes("/api/v5/market/ticker") && url.includes("USDC-BRL")) {
        return jsonResponse({
          code: "0",
          data: [{ last: "5.10" }],
        });
      }

      throw new Error(`Unexpected URL: ${url}`);
    });

    const result = await getFiatRates({
      fetchImpl,
      now: new Date("2026-04-29T12:00:00.000Z"),
    });

    expect(result.status).toBe(200);
    expect(result.body.ok).toBe(true);

    if (!result.body.ok) {
      return;
    }

    expect(result.body.cached).toBe(false);
    expect(result.body.rates.usd).toBe("2000");
    expect(result.body.rates.brl).toBe("10200");
    expect(result.body.routes.usd).toBe("SWAP:ETH-USDT-SWAP");
    expect(result.body.routes.brl).toBe("SWAP:ETH-USDT-SWAP * USDC-BRL");
  });

  it("uses the cached snapshot within TTL without calling OKX again", async () => {
    await getFiatRates({
      fetchImpl: okxFetchMock(),
      now: new Date("2026-04-29T12:00:00.000Z"),
    });

    const fetchImpl = vi.fn(async () => {
      throw new Error("Live fetch should not run inside TTL.");
    });

    const result = await getFiatRates({
      fetchImpl,
      now: new Date("2026-04-29T12:00:30.000Z"),
    });

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(result.body.ok).toBe(true);

    if (!result.body.ok) {
      return;
    }

    expect(result.body.cached).toBe(true);
    expect(result.body.warning).toBeUndefined();
    expect(result.body.rates.usd).toBe("2250.1");
  });

  it("falls back to the last known cache when OKX fails after TTL", async () => {
    await getFiatRates({
      fetchImpl: okxFetchMock(),
      now: new Date("2026-04-29T12:00:00.000Z"),
    });

    const result = await getFiatRates({
      fetchImpl: vi.fn(async () => {
        throw new Error("OKX outage");
      }),
      now: new Date("2026-04-29T12:02:00.000Z"),
    });

    expect(result.status).toBe(200);
    expect(result.body.ok).toBe(true);

    if (!result.body.ok) {
      return;
    }

    expect(result.body.cached).toBe(true);
    expect(result.body.warning).toBe("USING_LAST_KNOWN_RATES");
    expect(result.body.rates.usd).toBe("2250.1");
  });

  it("returns the standardized error when there is no valid cache fallback", async () => {
    const result = await getFiatRates({
      fetchImpl: vi.fn(async () => {
        throw new Error("OKX outage");
      }),
      now: new Date("2026-04-29T12:00:00.000Z"),
    });

    expect(result.status).toBe(503);
    expect(result.body).toEqual({
      ok: false,
      code: "FIAT_RATES_UNAVAILABLE",
      message:
        "Could not fetch ETH fiat rates from OKX and no cached rates are available within max staleness.",
      provider: "okx",
    });
  });

  it("keeps USD available when the BRL route is unavailable", async () => {
    const fetchImpl = vi.fn(async (input: string | URL | Request) => {
      const url = input.toString();

      if (url.includes("ETH-USDC")) {
        return jsonResponse({
          code: "0",
          data: [{ last: "2250.10" }],
        });
      }

      if (url.includes("USDC-BRL")) {
        return new Response("bad gateway", { status: 502 });
      }

      throw new Error(`Unexpected URL: ${url}`);
    });

    const result = await getFiatRates({
      fetchImpl,
      now: new Date("2026-04-29T12:00:00.000Z"),
    });

    expect(result.status).toBe(200);
    expect(result.body.ok).toBe(true);

    if (!result.body.ok) {
      return;
    }

    expect(result.body.cached).toBe(false);
    expect(result.body.warning).toBe("BRL_ROUTE_UNAVAILABLE");
    expect(result.body.rates.usd).toBe("2250.1");
    expect(result.body.rates.brl).toBeUndefined();
    expect(result.body.unavailable).toContain("brl");
  });
});

function okxFetchMock() {
  return vi.fn(async (input: string | URL | Request) => {
    const url = input.toString();

    if (url.includes("ETH-USDC")) {
      return jsonResponse({
        code: "0",
        data: [{ last: "2250.10" }],
      });
    }

    if (url.includes("USDC-BRL")) {
      return jsonResponse({
        code: "0",
        data: [{ last: "5.10" }],
      });
    }

    throw new Error(`Unexpected URL: ${url}`);
  });
}

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
}
