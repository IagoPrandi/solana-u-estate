import { describe, expect, it } from "vitest";
import { computeListingInvestmentQuote } from "./marketplace";

describe("computeListingInvestmentQuote", () => {
  it("derives selected units, percentages, and price from the active listing", () => {
    const quote = computeListingInvestmentQuote({
      listingAmount: 240_000,
      listingPriceSOL: 0.204,
      propertyTotalValueUnits: 1_000_000,
      requestedUnits: 60_000,
    });

    expect(quote.minimumUnits).toBe(1000);
    expect(quote.selectedUnits).toBe(60_000);
    expect(quote.pctOfOffer).toBe(25);
    expect(quote.pctOfProperty).toBe(6);
    expect(quote.pricePerUnitSOL).toBeCloseTo(0.00000085);
    expect(quote.totalPriceSOL).toBeCloseTo(0.051);
    expect(quote.isFullListingSelected).toBe(false);
  });

  it("clamps to the real listing amount and marks full-listing selection", () => {
    const quote = computeListingInvestmentQuote({
      listingAmount: 240_000,
      listingPriceSOL: 0.204,
      propertyTotalValueUnits: 1_000_000,
      requestedUnits: 999_999,
    });

    expect(quote.selectedUnits).toBe(240_000);
    expect(quote.pctOfOffer).toBe(100);
    expect(quote.totalPriceSOL).toBeCloseTo(0.204);
    expect(quote.isFullListingSelected).toBe(true);
  });
});
