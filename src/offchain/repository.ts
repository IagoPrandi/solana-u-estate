import "server-only";

import { getDb } from "@/offchain/db";
import { buildSavedPropertyRecord } from "@/offchain/property-draft";
import { isSolanaPublicKey } from "@/lib/solana/config";
import type {
  FiatRatesSnapshot,
  LocalSolanaTransaction,
  PropertyDraftInput,
  PropertyPrimarySaleCancellationInput,
  PropertyPrimarySaleListingInput,
  PropertyPrimarySalePurchaseInput,
  PropertyMockVerificationInput,
  PropertyOnchainRegistrationInput,
  PropertyTokenizationInput,
  SavedPropertyRecord,
} from "@/offchain/schemas";

const SECTION_32_DEMO_LOCAL_PROPERTY_ID = "32000000-0000-4000-8000-000000000032";
const SECTION_32_DEMO_PROPERTY_ID = "32";
const SECTION_32_DEMO_LISTING_ID = "32";
const SECTION_32_DEMO_VALUE_TOKEN_ADDRESS =
  "11111111111111111111111111111112";
const DEFAULT_DEMO_SELLER_ADDRESS =
  "11111111111111111111111111111113";
const DEFAULT_DEMO_BUYER_ADDRESS =
  "11111111111111111111111111111114";
const DEMO_SIGNATURE_1 =
  "1111111111111111111111111111111111111111111111111111111111111111";
const DEMO_SIGNATURE_2 =
  "2222222222222222222222222222222222222222222222222222222222222222";
const DEMO_SIGNATURE_3 =
  "3333333333333333333333333333333333333333333333333333333333333333";
const DEMO_SIGNATURE_4 =
  "4444444444444444444444444444444444444444444444444444444444444444";
const DEMO_SIGNATURE_5 =
  "5555555555555555555555555555555555555555555555555555555555555555";

function solanaTransaction(input: Omit<LocalSolanaTransaction, "createdAt" | "syncStatus">) {
  return {
    ...input,
    syncStatus: "confirmed" as const,
    createdAt: new Date().toISOString(),
  };
}

export async function listPropertyDrafts() {
  const db = await getDb();

  return [...db.data.properties].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt),
  );
}

export async function readFiatRatesCache() {
  const db = await getDb();

  return db.data.fiatRatesCache;
}

export async function writeFiatRatesCache(snapshot: FiatRatesSnapshot) {
  const db = await getDb();

  db.data.fiatRatesCache = snapshot;
  await db.write();

  return snapshot;
}

export async function createPropertyDraft(
  input: PropertyDraftInput,
): Promise<SavedPropertyRecord> {
  const db = await getDb();
  const record = buildSavedPropertyRecord(input);

  db.data.properties.unshift(record);
  await db.write();

  return record;
}

export async function seedSection32DemoScenario() {
  const db = await getDb();
  const sellerWallet = resolveDemoWalletAddress(
    process.env.DEMO_SELLER_ADDRESS,
    DEFAULT_DEMO_SELLER_ADDRESS,
  );
  const buyerWalletCandidate = resolveDemoWalletAddress(
    process.env.DEMO_BUYER_ADDRESS,
    DEFAULT_DEMO_BUYER_ADDRESS,
  );
  const buyerWallet =
    buyerWalletCandidate.toLowerCase() === sellerWallet.toLowerCase()
      ? DEFAULT_DEMO_BUYER_ADDRESS
      : buyerWalletCandidate;

  db.data.properties = db.data.properties.filter(
    (record) => record.localPropertyId !== SECTION_32_DEMO_LOCAL_PROPERTY_ID,
  );
  await db.write();

  await createPropertyDraft({
    localPropertyId: SECTION_32_DEMO_LOCAL_PROPERTY_ID,
    ownerWallet: sellerWallet,
    marketValueEth: "0.2",
    linkedValueBps: 2000,
    description:
      "Section 32 guided demo simulation. Person A keeps usufruct and linked value while Person B buys only free economic value.",
    street: "Rua Haddock Lobo",
    number: "595",
    city: "Sao Paulo",
    state: "SP",
    country: "Brazil",
    postalCode: "01414-001",
    lat: "-23.561414",
    lng: "-46.656632",
    documents: [
      {
        type: "mock_deed",
        filename: "mock_matricula.pdf",
      },
      {
        type: "mock_owner_id",
        filename: "mock_owner_id.pdf",
      },
    ],
  });

  await saveOnchainPropertyRegistration({
    kind: "registration",
    localPropertyId: SECTION_32_DEMO_LOCAL_PROPERTY_ID,
    propertyId: SECTION_32_DEMO_PROPERTY_ID,
    txHash: DEMO_SIGNATURE_1,
  });

  await savePropertyMockVerification({
    kind: "mockVerification",
    localPropertyId: SECTION_32_DEMO_LOCAL_PROPERTY_ID,
    propertyId: SECTION_32_DEMO_PROPERTY_ID,
    txHash: DEMO_SIGNATURE_2,
  });

  await savePropertyTokenization({
    kind: "tokenization",
    localPropertyId: SECTION_32_DEMO_LOCAL_PROPERTY_ID,
    propertyId: SECTION_32_DEMO_PROPERTY_ID,
    txHash: DEMO_SIGNATURE_3,
    valueTokenAddress: SECTION_32_DEMO_VALUE_TOKEN_ADDRESS,
    usufructTokenId: SECTION_32_DEMO_PROPERTY_ID,
    linkedValueUnits: "200000",
    freeValueUnits: "800000",
  });

  await savePropertyPrimarySaleListing({
    kind: "primarySaleListing",
    localPropertyId: SECTION_32_DEMO_LOCAL_PROPERTY_ID,
    propertyId: SECTION_32_DEMO_PROPERTY_ID,
    listingId: SECTION_32_DEMO_LISTING_ID,
    txHash: DEMO_SIGNATURE_4,
    amount: "300000",
    priceWei: "60000000",
  });

  return savePropertyPrimarySalePurchase({
    kind: "primarySalePurchase",
    localPropertyId: SECTION_32_DEMO_LOCAL_PROPERTY_ID,
    propertyId: SECTION_32_DEMO_PROPERTY_ID,
    listingId: SECTION_32_DEMO_LISTING_ID,
    txHash: DEMO_SIGNATURE_5,
    buyerWallet,
    amount: "300000",
    priceWei: "60000000",
  });
}

export async function saveOnchainPropertyRegistration(
  input: PropertyOnchainRegistrationInput,
) {
  const db = await getDb();
  const property = db.data.properties.find(
    (record) => record.localPropertyId === input.localPropertyId,
  );

  if (!property) {
    throw new Error("Property draft not found.");
  }

  if (property.onchainRegistration) {
    throw new Error("Property draft already linked to an on-chain property.");
  }

  property.onchainRegistration = {
    propertyId: input.propertyId,
    txHash: input.txHash,
    status: "PendingMockVerification",
    registeredAt: new Date().toISOString(),
  };
  db.data.solanaTransactions.unshift(
    solanaTransaction({
      signature: input.txHash,
      kind: "registration",
      localPropertyId: input.localPropertyId,
      propertyId: input.propertyId,
    }),
  );

  await db.write();

  return property;
}

export async function savePropertyMockVerification(
  input: PropertyMockVerificationInput,
) {
  const db = await getDb();
  const property = db.data.properties.find(
    (record) => record.localPropertyId === input.localPropertyId,
  );

  if (!property) {
    throw new Error("Property draft not found.");
  }

  if (!property.onchainRegistration) {
    throw new Error("Property draft is not registered on-chain.");
  }

  if (property.onchainRegistration.propertyId !== input.propertyId) {
    throw new Error("On-chain property id does not match the saved draft.");
  }

  if (property.onchainRegistration.status === "MockVerified") {
    throw new Error("Property draft is already mock-verified.");
  }

  property.onchainRegistration.status = "MockVerified";
  property.onchainRegistration.verificationTxHash = input.txHash;
  property.onchainRegistration.verifiedAt = new Date().toISOString();
  db.data.solanaTransactions.unshift(
    solanaTransaction({
      signature: input.txHash,
      kind: "mockVerification",
      localPropertyId: input.localPropertyId,
      propertyId: input.propertyId,
    }),
  );

  await db.write();

  return property;
}

export async function savePropertyTokenization(
  input: PropertyTokenizationInput,
) {
  const db = await getDb();
  const property = db.data.properties.find(
    (record) => record.localPropertyId === input.localPropertyId,
  );

  if (!property) {
    throw new Error("Property draft not found.");
  }

  if (!property.onchainRegistration) {
    throw new Error("Property draft is not registered on-chain.");
  }

  if (property.onchainRegistration.propertyId !== input.propertyId) {
    throw new Error("On-chain property id does not match the saved draft.");
  }

  if (property.onchainRegistration.status === "Tokenized") {
    throw new Error("Property draft is already tokenized.");
  }

  property.onchainRegistration.status = "Tokenized";
  property.onchainRegistration.tokenizationTxHash = input.txHash;
  property.onchainRegistration.tokenizedAt = new Date().toISOString();
  property.onchainRegistration.valueTokenAddress = input.valueTokenAddress;
  property.onchainRegistration.usufructTokenId = input.usufructTokenId;
  property.onchainRegistration.linkedValueUnits = input.linkedValueUnits;
  property.onchainRegistration.freeValueUnits = input.freeValueUnits;
  db.data.solanaTransactions.unshift(
    solanaTransaction({
      signature: input.txHash,
      kind: "tokenization",
      localPropertyId: input.localPropertyId,
      propertyId: input.propertyId,
    }),
  );

  await db.write();

  return property;
}

export async function savePropertyPrimarySaleListing(
  input: PropertyPrimarySaleListingInput,
) {
  const db = await getDb();
  const property = db.data.properties.find(
    (record) => record.localPropertyId === input.localPropertyId,
  );

  if (!property) {
    throw new Error("Property draft not found.");
  }

  if (!property.onchainRegistration) {
    throw new Error("Property draft is not registered on-chain.");
  }

  if (property.onchainRegistration.propertyId !== input.propertyId) {
    throw new Error("On-chain property id does not match the saved draft.");
  }

  if (
    property.onchainRegistration.status !== "Tokenized" &&
    property.onchainRegistration.status !== "ActiveSale"
  ) {
    throw new Error("Property draft must be tokenized before primary sale.");
  }

  const existingListings = property.onchainRegistration.primarySaleListings ?? [];
  if (
    existingListings.some((listing) => listing.listingId === input.listingId)
  ) {
    throw new Error("Primary sale listing already saved locally.");
  }

  const activeEscrowedAmount =
    BigInt(property.onchainRegistration.activeEscrowedAmount ?? "0") +
    BigInt(input.amount);
  const activeListingsCount =
    BigInt(property.onchainRegistration.activeListingsCount ?? "0") + BigInt(1);

  property.onchainRegistration.status = "ActiveSale";
  property.onchainRegistration.activeEscrowedAmount =
    activeEscrowedAmount.toString();
  property.onchainRegistration.activeListingsCount =
    activeListingsCount.toString();
  property.onchainRegistration.totalFreeValueSold ??= "0";
  property.onchainRegistration.primarySaleListings = [
    {
      listingId: input.listingId,
      amount: input.amount,
      priceWei: input.priceWei,
      priceLamports: input.priceWei,
      txHash: input.txHash,
      createdSignature: input.txHash,
      syncStatus: "confirmed",
      status: "Active",
      listedAt: new Date().toISOString(),
    },
    ...existingListings,
  ];
  db.data.solanaTransactions.unshift(
    solanaTransaction({
      signature: input.txHash,
      kind: "primarySaleListing",
      localPropertyId: input.localPropertyId,
      propertyId: input.propertyId,
      listingId: input.listingId,
    }),
  );

  await db.write();

  return property;
}

export async function savePropertyPrimarySalePurchase(
  input: PropertyPrimarySalePurchaseInput,
) {
  const db = await getDb();
  const property = db.data.properties.find(
    (record) => record.localPropertyId === input.localPropertyId,
  );

  if (!property) {
    throw new Error("Property draft not found.");
  }

  if (!property.onchainRegistration) {
    throw new Error("Property draft is not registered on-chain.");
  }

  if (property.onchainRegistration.propertyId !== input.propertyId) {
    throw new Error("On-chain property id does not match the saved draft.");
  }

  const listings = property.onchainRegistration.primarySaleListings;
  if (!listings?.length) {
    throw new Error("Primary sale listing is not saved locally.");
  }

  const listingIndex = listings.findIndex(
    (listing) => listing.listingId === input.listingId,
  );
  if (listingIndex === -1) {
    throw new Error("Primary sale listing is not saved locally.");
  }

  const existingListing = listings[listingIndex];
  if (existingListing.status !== "Active") {
    throw new Error("Primary sale listing is not active locally.");
  }
  const remainingAmount = BigInt(existingListing.amount);
  const remainingPriceWei = BigInt(existingListing.priceWei);
  const purchaseAmount = BigInt(input.amount);
  const purchasePriceWei = BigInt(input.priceWei);
  if (purchaseAmount > remainingAmount) {
    throw new Error(
      "Primary sale purchase amount exceeds the saved listing amount.",
    );
  }
  if (purchasePriceWei > remainingPriceWei) {
    throw new Error(
      "Primary sale purchase price exceeds the saved listing price.",
    );
  }

  const nextListingAmount = remainingAmount - purchaseAmount;
  const nextListingPriceWei = remainingPriceWei - purchasePriceWei;
  const listingFilled = nextListingAmount === 0n;

  const updatedListings = [...listings];
  updatedListings[listingIndex] = {
    ...existingListing,
    amount: nextListingAmount.toString(),
    priceWei: nextListingPriceWei.toString(),
    status: listingFilled ? "Filled" : "Active",
    buyerWallet: input.buyerWallet,
    purchaseTxHash: input.txHash,
    purchasedAt: new Date().toISOString(),
  };

  const activeEscrowedAmount = (
    BigInt(property.onchainRegistration.activeEscrowedAmount ?? "0") -
    purchaseAmount
  ).toString();
  const activeListingsCount = listingFilled
    ? (
        BigInt(property.onchainRegistration.activeListingsCount ?? "0") -
        BigInt(1)
      ).toString()
    : (property.onchainRegistration.activeListingsCount ?? "0");
  const totalFreeValueSold = (
    BigInt(property.onchainRegistration.totalFreeValueSold ?? "0") +
    BigInt(input.amount)
  ).toString();
  const freeValueUnits = BigInt(property.onchainRegistration.freeValueUnits ?? "0");
  const nextStatus =
    totalFreeValueSold === freeValueUnits.toString()
      ? "SoldOut"
      : activeListingsCount !== "0"
        ? "ActiveSale"
        : "Tokenized";

  const existingBuyerBalances = property.onchainRegistration.buyerBalances ?? [];
  const buyerBalanceIndex = existingBuyerBalances.findIndex(
    (entry) => entry.buyerWallet.toLowerCase() === input.buyerWallet.toLowerCase(),
  );
  const nextBuyerBalance = {
    buyerWallet: input.buyerWallet,
    freeValueUnits: input.amount,
    totalPaidWei: input.priceWei,
    lastPurchaseTxHash: input.txHash,
    acquiredAt: new Date().toISOString(),
  };
  const buyerBalances =
    buyerBalanceIndex === -1
      ? [nextBuyerBalance, ...existingBuyerBalances]
      : existingBuyerBalances.map((entry, index) =>
          index === buyerBalanceIndex
            ? {
                ...entry,
                freeValueUnits: (
                  BigInt(entry.freeValueUnits) + BigInt(input.amount)
                ).toString(),
                totalPaidWei: (
                  BigInt(entry.totalPaidWei) + BigInt(input.priceWei)
                ).toString(),
                lastPurchaseTxHash: input.txHash,
                acquiredAt: new Date().toISOString(),
              }
            : entry,
        );

  property.onchainRegistration.status = nextStatus;
  property.onchainRegistration.activeEscrowedAmount = activeEscrowedAmount;
  property.onchainRegistration.activeListingsCount = activeListingsCount;
  property.onchainRegistration.totalFreeValueSold = totalFreeValueSold;
  property.onchainRegistration.sellerReceivedWei = (
    BigInt(property.onchainRegistration.sellerReceivedWei ?? "0") +
    BigInt(input.priceWei)
  ).toString();
  property.onchainRegistration.buyerBalances = buyerBalances;
  property.onchainRegistration.primarySaleListings = updatedListings;
  db.data.solanaTransactions.unshift(
    solanaTransaction({
      signature: input.txHash,
      kind: "primarySalePurchase",
      localPropertyId: input.localPropertyId,
      propertyId: input.propertyId,
      listingId: input.listingId,
    }),
  );

  await db.write();

  return property;
}

export async function savePropertyPrimarySaleCancellation(
  input: PropertyPrimarySaleCancellationInput,
) {
  const db = await getDb();
  const property = db.data.properties.find(
    (record) => record.localPropertyId === input.localPropertyId,
  );

  if (!property) {
    throw new Error("Property draft not found.");
  }

  if (!property.onchainRegistration) {
    throw new Error("Property draft is not registered on-chain.");
  }

  if (property.onchainRegistration.propertyId !== input.propertyId) {
    throw new Error("On-chain property id does not match the saved draft.");
  }

  const listings = property.onchainRegistration.primarySaleListings;
  if (!listings?.length) {
    throw new Error("Primary sale listing is not saved locally.");
  }

  const listingIndex = listings.findIndex(
    (listing) => listing.listingId === input.listingId,
  );
  if (listingIndex === -1) {
    throw new Error("Primary sale listing is not saved locally.");
  }

  const existingListing = listings[listingIndex];
  if (existingListing.status !== "Active") {
    throw new Error("Primary sale listing is not active locally.");
  }
  if (existingListing.amount !== input.amount) {
    throw new Error("Primary sale cancellation does not match the saved listing.");
  }

  const updatedListings = [...listings];
  updatedListings[listingIndex] = {
    ...existingListing,
    status: "Cancelled",
  };

  const activeEscrowedAmount = (
    BigInt(property.onchainRegistration.activeEscrowedAmount ?? "0") -
    BigInt(input.amount)
  ).toString();
  const activeListingsCount = (
    BigInt(property.onchainRegistration.activeListingsCount ?? "0") - BigInt(1)
  ).toString();
  const nextStatus = activeListingsCount !== "0" ? "ActiveSale" : "Tokenized";

  property.onchainRegistration.status = nextStatus;
  property.onchainRegistration.activeEscrowedAmount = activeEscrowedAmount;
  property.onchainRegistration.activeListingsCount = activeListingsCount;
  property.onchainRegistration.totalFreeValueSold ??= "0";
  property.onchainRegistration.primarySaleListings = updatedListings;
  db.data.solanaTransactions.unshift(
    solanaTransaction({
      signature: input.txHash,
      kind: "primarySaleCancellation",
      localPropertyId: input.localPropertyId,
      propertyId: input.propertyId,
      listingId: input.listingId,
    }),
  );

  await db.write();

  return property;
}

export async function saveValidatorApproval(
  localPropertyId: string,
  propertyId: string,
  txHash: string,
): Promise<SavedPropertyRecord> {
  const db = await getDb();
  const property = db.data.properties.find(
    (record) => record.localPropertyId === localPropertyId,
  );
  if (!property) throw new Error("Property draft not found.");

  const now = new Date().toISOString();

  if (property.onchainRegistration) {
    if (property.onchainRegistration.propertyId !== propertyId) {
      throw new Error("On-chain property id does not match the saved draft.");
    }
    if (property.onchainRegistration.status !== "PendingMockVerification") {
      throw new Error("Property is not pending verification.");
    }
    property.onchainRegistration.status = "MockVerified";
    property.onchainRegistration.verificationTxHash = txHash;
    property.onchainRegistration.verifiedAt = now;
    delete property.onchainRegistration.rejection;
  } else {
    throw new Error("Property draft is not registered on-chain.");
  }

  db.data.solanaTransactions.unshift(
    solanaTransaction({
      signature: txHash,
      kind: "mockVerification",
      localPropertyId,
      propertyId,
    }),
  );

  await db.write();
  return property;
}

export async function saveValidatorRejection(
  localPropertyId: string,
  reason: string,
): Promise<SavedPropertyRecord> {
  const trimmedReason = reason.trim();
  if (!trimmedReason) {
    throw new Error("Rejection reason is required.");
  }
  const db = await getDb();
  const property = db.data.properties.find(
    (record) => record.localPropertyId === localPropertyId,
  );
  if (!property) throw new Error("Property draft not found.");

  const dummyHash = DEMO_SIGNATURE_2;
  const now = new Date().toISOString();
  const rejection = { reason: trimmedReason, rejectedAt: now };

  if (property.onchainRegistration) {
    if (property.onchainRegistration.status !== "PendingMockVerification") {
      throw new Error("Property is not pending verification.");
    }
    property.onchainRegistration.status = "Rejected";
    property.onchainRegistration.verificationTxHash = dummyHash;
    property.onchainRegistration.verifiedAt = now;
    property.onchainRegistration.rejection = rejection;
  } else {
    const seed = localPropertyId.replace(/-/g, "");
    const mockPropertyId = String(
      (parseInt(seed.slice(0, 8), 16) % 9000) + 1000,
    );
    property.onchainRegistration = {
      propertyId: mockPropertyId,
      txHash: dummyHash,
      status: "Rejected",
      registeredAt: now,
      verifiedAt: now,
      verificationTxHash: dummyHash,
      rejection,
    };
  }

  await db.write();
  return property;
}

function resolveDemoWalletAddress(
  value: string | undefined,
  fallback: string,
): string {
  if (!value) {
    return fallback;
  }

  return isSolanaPublicKey(value) ? value : fallback;
}
