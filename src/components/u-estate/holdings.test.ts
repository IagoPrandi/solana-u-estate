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
  ownerWallet: "0x38492e42908BF4EA35aB2baBd6DD95bbd2D7b907",
  createdAt: "2026-05-05T00:00:00.000Z",
  buyerBalances: [
    {
      buyerWallet: "0x20070C8a9881D8a63CBeF49B2205620c7fe1dD2a",
      freeValueUnits: "5000",
      totalPaidWei: "5000000000000000",
      lastPurchaseTxHash:
        "0x430f39e8e6313f672e4dd7883cb6c5822113a6c383ec0c43528205ab0dc8d835",
      acquiredAt: "2026-05-05T00:16:39.041Z",
    },
  ],
};

describe("wallet holdings", () => {
  it("returns only investments bought by the connected wallet", () => {
    const personAHoldings = getWalletHoldings(
      [baseProperty],
      "0x20070C8a9881D8a63CBeF49B2205620c7fe1dD2a",
    );
    const personBHoldings = getWalletHoldings(
      [baseProperty],
      "0x38492e42908BF4EA35aB2baBd6DD95bbd2D7b907",
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
        "0x20070C8a9881D8a63CBeF49B2205620c7fe1dD2a",
      ),
    ).toBe(true);
    expect(
      hasWalletHolding(
        baseProperty,
        "0x0000000000000000000000000000000000000001",
      ),
    ).toBe(false);
  });

  it("returns a single property-scoped holding for the asset view", () => {
    expect(
      getWalletHoldingForProperty(
        baseProperty,
        "0x20070C8a9881D8a63CBeF49B2205620c7fe1dD2a",
      ),
    ).toMatchObject({
      property: baseProperty,
      units: 5000,
      costEth: 0.005,
    });
    expect(
      getWalletHoldingForProperty(
        baseProperty,
        "0x38492e42908BF4EA35aB2baBd6DD95bbd2D7b907",
      ),
    ).toBeUndefined();
  });
});
