import { afterEach, describe, expect, it } from "vitest";
import { assertDevnetOnly, resolveProgramIdEnv } from "./devnet-demo-utils.mjs";

const originalEnv = { ...process.env };

describe("Devnet demo script guards", () => {
  afterEach(() => {
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) delete process.env[key];
    }
    Object.assign(process.env, originalEnv);
  });

  it("allows Devnet configuration", () => {
    process.env.SOLANA_CLUSTER = "devnet";
    process.env.ANCHOR_PROVIDER_URL = "https://api.devnet.solana.com";

    expect(() => assertDevnetOnly()).not.toThrow();
  });

  it("refuses Mainnet configuration", () => {
    process.env.SOLANA_CLUSTER = "mainnet-beta";
    process.env.ANCHOR_PROVIDER_URL = "https://api.mainnet-beta.solana.com";

    expect(() => assertDevnetOnly()).toThrow("Refusing to run demo tooling");
  });

  it("fails closed when no Devnet signal is configured", () => {
    delete process.env.SOLANA_CLUSTER;
    delete process.env.NEXT_PUBLIC_SOLANA_CLUSTER;
    delete process.env.ANCHOR_PROVIDER_URL;
    delete process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
    delete process.env.SOLANA_RPC_URL;

    expect(() => assertDevnetOnly()).toThrow("requires a Devnet cluster");
  });

  it("requires a program id for Devnet preflight", () => {
    delete process.env.NEXT_PUBLIC_USUFRUCT_PROGRAM_ID;
    delete process.env.USUFRUCT_PROGRAM_ID;

    expect(() => resolveProgramIdEnv()).toThrow(
      "NEXT_PUBLIC_USUFRUCT_PROGRAM_ID is required",
    );
  });
});
