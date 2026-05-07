import { describe, expect, it } from "vitest";
import { listingIdentity, matchesListingIdentity } from "./listing-identity";
import type { Listing } from "./types";

const baseListing: Listing = {
  listingId: "3",
  localPropertyId: "local-a",
  propertyId: "1",
  amount: 1000,
  priceWei: "0.001",
  seller: "11111111111111111111111111111113",
  status: "Active",
  listedAt: "2026-05-05T00:00:00.000Z",
  txHash:
    "1111111111111111111111111111111111111111111111111111111111111111",
};

describe("listing identity", () => {
  it("keeps repeated on-chain listing ids distinct in UI lists", () => {
    const sameOnchainId: Listing = {
      ...baseListing,
      localPropertyId: "local-b",
      txHash:
        "2222222222222222222222222222222222222222222222222222222222222222",
    };

    expect(baseListing.listingId).toBe(sameOnchainId.listingId);
    expect(listingIdentity(baseListing)).not.toBe(
      listingIdentity(sameOnchainId),
    );
  });

  it("matches the composed identity and keeps legacy listing-id links working", () => {
    expect(matchesListingIdentity(baseListing, listingIdentity(baseListing))).toBe(
      true,
    );
    expect(matchesListingIdentity(baseListing, "3")).toBe(true);
    expect(matchesListingIdentity(baseListing, "4")).toBe(false);
  });
});

