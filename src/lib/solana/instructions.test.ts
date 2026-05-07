import { describe, expect, it } from "vitest";
import { hexHashToBytes32, solDecimalToLamports } from "./instructions";
import { isSolanaPublicKey, isSolanaSignature } from "./config";

describe("Solana conversion helpers", () => {
  it("converts SOL decimal strings to lamports", () => {
    expect(solDecimalToLamports("0.2").toString()).toBe("200000000");
    expect(solDecimalToLamports("1.000000001").toString()).toBe("1000000001");
    expect(() => solDecimalToLamports("1.0000000001")).toThrow(
      "SOL amount has more than 9 decimal places.",
    );
  });

  it("converts 32-byte hex hashes for Anchor instruction args", () => {
    const bytes = hexHashToBytes32(`0x${"ab".repeat(32)}`);
    expect(bytes).toHaveLength(32);
    expect(bytes[0]).toBe(0xab);
    expect(() => hexHashToBytes32("0x1234")).toThrow(
      "Hash must be 32 bytes encoded as hex.",
    );
  });

  it("validates base58 public keys and signatures", () => {
    expect(isSolanaPublicKey("11111111111111111111111111111111")).toBe(true);
    expect(isSolanaSignature("1".repeat(64))).toBe(true);
    expect(isSolanaSignature("0".repeat(64))).toBe(false);
  });
});
