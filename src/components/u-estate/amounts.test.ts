import { describe, expect, it } from "vitest";
import {
  storedSolAmountToDecimal,
  storedSolAmountToNumber,
} from "./amounts";

describe("stored SOL amount conversion", () => {
  it("reads Solana lamports stored with 9 decimals", () => {
    expect(storedSolAmountToDecimal("66000000000")).toBe("66");
    expect(storedSolAmountToNumber("426000")).toBe(0.000426);
  });

  it("reads legacy wei-style records stored with 18 decimals", () => {
    expect(storedSolAmountToDecimal("66000000000000000000")).toBe("66");
    expect(storedSolAmountToDecimal("60000000000000000")).toBe("0.06");
  });
});
