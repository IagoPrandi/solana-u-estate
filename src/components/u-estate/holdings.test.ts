import { describe, expect, it } from "vitest";
import {
  getWalletHoldingForProperty,
  getWalletHoldings,
  hasWalletHolding,
} from "./holdings";
import type { Property } from "./types";

const baseProperty: Property = {
  id: "local-1",
  propertyId: "1",
  title: "Test property",
  street: "Rua Teste",
  number: "1",
  city: "Sao Paulo",
  state: "SP",
  country: "Brasil",
  postalCode: "00000-000",
  lat: "0",
  lng: "0",
  description: "",
  marketValueEth: "1",
  linkedValueBps: 2000,
  totalValueUnits: 1_000_000,
  linkedValueUnits: 200_000,
  freeValueUnits: 800_000,
  soldFreeValueUnits: 5_000,
  activeListings: 0,
  status: "Tokenized",
  thumbVariant: "mix",
  documents: [],
  metadataHash: "0xmetadata",
  documentsHash: "0xdocuments",
  locationHash: "0xlocation",
  ownerWallet: "11111111111111111111111111111113",
  createdAt: "2026-05-05T00:00:00.000Z",
  buyerBalances: [
    {
      buyerWallet: "11111111111111111111111111111114",
      freeValueUnits: "5000",
      totalPaidWei: "5000000000000000",
      lastPurchaseTxHash:
        "7777777777777777777777777777777777777777777777777777777777777777",
      acquiredAt: "2026-05-05T00:16:39.041Z",
    },
  ],
};

describe("wallet holdings", () => {
  it("returns only investments bought by the connected wallet", () => {
    const personAHoldings = getWalletHoldings(
      [baseProperty],
      "11111111111111111111111111111114",
    );
    const personBHoldings = getWalletHoldings(
      [baseProperty],
      "11111111111111111111111111111113",
    );

    expect(personAHoldings).toHaveLength(1);
    expect(personAHoldings[0]).toMatchObject({
      property: baseProperty,
      units: 5000,
      costEth: 0.005,
    });
    expect(personBHoldings).toHaveLength(0);
  });

  it("recognizes detail access for holders but not unrelated wallets", () => {
    expect(
      hasWalletHolding(
        baseProperty,
        "11111111111111111111111111111114",
      ),
    ).toBe(true);
    expect(
      hasWalletHolding(
        baseProperty,
        "11111111111111111111111111111115",
      ),
    ).toBe(false);
  });

  it("returns a single property-scoped holding for the asset view", () => {
    expect(
      getWalletHoldingForProperty(
        baseProperty,
        "11111111111111111111111111111114",
      ),
    ).toMatchObject({
      property: baseProperty,
      units: 5000,
      costEth: 0.005,
    });
    expect(
      getWalletHoldingForProperty(
        baseProperty,
        "11111111111111111111111111111113",
      ),
    ).toBeUndefined();
  });
});

