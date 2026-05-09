import { PublicKey } from "@solana/web3.js";
import { describe, expect, it } from "vitest";
import type {
  DecodedListingAccount,
  DecodedPropertyAccount,
} from "@/lib/solana/accounts";
import {
  assertFreshPrimarySalePurchase,
  assertNoPendingTransaction,
  isTxPending,
} from "./transaction-guards";

type FreshPurchaseInput = Parameters<typeof assertFreshPrimarySalePurchase>[0];

const seller = new PublicKey("11111111111111111111111111111113");
const buyer = new PublicKey("11111111111111111111111111111114");
const mint = new PublicKey("11111111111111111111111111111115");
const otherMint = new PublicKey("11111111111111111111111111111116");

function property(overrides: Partial<DecodedPropertyAccount> = {}) {
  return {
    address: new PublicKey("11111111111111111111111111111117"),
    propertyId: 1n,
    owner: seller,
    marketValueLamports: 200_000_000n,
    totalValueUnits: 1_000_000n,
    linkedValueUnits: 200_000n,
    freeValueUnits: 800_000n,
    linkedValueBps: 2000,
    valueMint: mint,
    usufructPosition: new PublicKey("11111111111111111111111111111118"),
    activeListingsCount: 1n,
    totalFreeValueSold: 0n,
    activeEscrowedAmount: 300_000n,
    status: "ActiveSale",
    bump: 255,
    ...overrides,
  } satisfies DecodedPropertyAccount;
}

function listing(overrides: Partial<DecodedListingAccount> = {}) {
  return {
    address: new PublicKey("11111111111111111111111111111119"),
    listingId: 1n,
    property: property().address,
    propertyId: 1n,
    seller,
    valueMint: mint,
    sellerTokenAccount: new PublicKey("1111111111111111111111111111111A"),
    escrowTokenAccount: new PublicKey("1111111111111111111111111111111B"),
    escrowAuthority: new PublicKey("1111111111111111111111111111111C"),
    amount: 300_000n,
    priceLamports: 60_000_000n,
    status: "Active",
    bump: 254,
    ...overrides,
  } satisfies DecodedListingAccount;
}

function baseInput(): FreshPurchaseInput {
  return {
    localListing: {
      amount: "300000",
      priceWei: "60000000",
      syncStatus: "confirmed",
      status: "Active",
    },
    chainListing: listing(),
    chainProperty: property(),
    requestedAmount: 300_000n,
    requestedPriceLamports: 60_000_000n,
    buyerWallet: buyer,
    sellerWallet: seller,
    expectedValueMint: mint,
  };
}

function assertValid(overrides: Partial<FreshPurchaseInput> = {}) {
  return assertFreshPrimarySalePurchase({
    ...baseInput(),
    ...overrides,
  });
}

describe("transaction guards", () => {
  it("detects pending transactions for double-submit protection", () => {
    expect(isTxPending(true, "sign")).toBe(true);
    expect(isTxPending(true, "done")).toBe(false);
    expect(() => assertNoPendingTransaction(true, "confirming")).toThrow(
      "Transaction already in progress.",
    );
  });

  it("accepts fresh listing purchase snapshots", () => {
    expect(() => assertValid()).not.toThrow();
  });

  it("accepts fresh partial listing purchase snapshots", () => {
    expect(() =>
      assertValid({
        requestedAmount: 75_000n,
        requestedPriceLamports: 15_000_000n,
      }),
    ).not.toThrow();
  });

  it("rejects stale local listings", () => {
    expect(() =>
      assertValid({
        localListing: {
          amount: "300000",
          priceWei: "60000000",
          syncStatus: "stale",
          status: "Active",
        },
      }),
    ).toThrow("Listing is stale");
  });

  it("rejects stale price snapshots", () => {
    expect(() => assertValid({ requestedPriceLamports: 59_999_999n })).toThrow(
      "Stale listing price",
    );
  });

  it("rejects purchase amounts above the listing balance", () => {
    expect(() => assertValid({ requestedAmount: 300_001n })).toThrow(
      "Purchase amount exceeds",
    );
  });

  it("rejects buyer and seller wallet reuse", () => {
    expect(() => assertValid({ buyerWallet: seller })).toThrow(
      "Buyer wallet must differ",
    );
  });

  it("rejects divergent mint state", () => {
    expect(() =>
      assertValid({
        chainListing: listing({ valueMint: otherMint }),
      }),
    ).toThrow("Listing mint diverges");
    expect(() =>
      assertValid({
        chainProperty: property({ valueMint: otherMint }),
      }),
    ).toThrow("Property mint diverges");
  });
});
