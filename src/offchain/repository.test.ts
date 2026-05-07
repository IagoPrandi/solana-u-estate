import os from "node:os";
import path from "node:path";
import { mkdir, rm } from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildPropertyDraftPreview } from "@/offchain/property-draft";
import { resetDbForTests } from "@/offchain/db";
import {
  createPropertyDraft,
  listPropertyDrafts,
  seedSection32DemoScenario,
  savePropertyMockVerification,
  saveOnchainPropertyRegistration,
  savePropertyPrimarySaleCancellation,
  savePropertyPrimarySaleListing,
  savePropertyPrimarySalePurchase,
  savePropertyTokenization,
} from "@/offchain/repository";
import { hashStableJson } from "@/offchain/hash";
import type { PropertyDraftInput } from "@/offchain/schemas";

const originalEnv = { ...process.env };

describe("property drafts", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = path.join(
      os.tmpdir(),
      `hacknation-u-estate-drafts-${crypto.randomUUID()}`,
    );

    await mkdir(tempDir, { recursive: true });
    process.env.LOCAL_DB_PATH = path.join(tempDir, "db.json");
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

  it("builds deterministic preview hashes from the PRD hash payloads", () => {
    const input = createInput();

    const preview = buildPropertyDraftPreview(input, {
      localPropertyId: "4bbf258c-d4d7-40dd-a16d-ee5320cd3f95",
    });

    expect(preview.location).toEqual({
      lat: "-23.550500",
      lng: "-46.633300",
    });
    expect(preview.metadataForHash.address.city).toBe("Sao Paulo");
    expect(preview.documentsForHash.documents).toEqual([
      {
        type: "mock_deed",
        filename: "mock_matricula.pdf",
        mock: true,
      },
      {
        type: "mock_owner_id",
        filename: "mock_owner_id.pdf",
        mock: true,
      },
    ]);
    expect(preview.documentsHash).toBe(hashStableJson(preview.documentsForHash));
    expect(preview.locationHash).toBe(hashStableJson(preview.locationForHash));
    expect(preview.metadataHash).toBe(hashStableJson(preview.metadataForHash));
  });

  it("saves the property draft server-side with uploadedAt outside documentsHash", async () => {
    const input = createInput();

    const record = await createPropertyDraft({
      ...input,
      localPropertyId: "4bbf258c-d4d7-40dd-a16d-ee5320cd3f95",
    });

    expect(record.address.street).toBe("Rua Exemplo");
    expect(record.location.lat).toBe("-23.550500");
    expect(record.documents[0].uploadedAt).toBe(record.createdAt);
    expect(record.documentsHash).toBe(
      hashStableJson({
        version: "1.0",
        propertyLocalId: record.localPropertyId,
        documents: record.documents.map(({ filename, mock, type }) => ({
          type,
          filename,
          mock,
        })),
      }),
    );

    const drafts = await listPropertyDrafts();
    expect(drafts).toHaveLength(1);
    expect(drafts[0].localPropertyId).toBe(record.localPropertyId);
  });

  it("persists the on-chain property id after registration confirmation", async () => {
    const record = await createPropertyDraft(createInput());

    const updatedRecord = await saveOnchainPropertyRegistration({
      kind: "registration",
      localPropertyId: record.localPropertyId,
      propertyId: "1",
      txHash:
        "1111111111111111111111111111111111111111111111111111111111111111",
    });

    expect(updatedRecord.onchainRegistration).toMatchObject({
      propertyId: "1",
      txHash:
        "1111111111111111111111111111111111111111111111111111111111111111",
      status: "PendingMockVerification",
    });
    expect(updatedRecord.onchainRegistration?.registeredAt).toBeTruthy();

    const drafts = await listPropertyDrafts();
    expect(drafts[0].onchainRegistration?.propertyId).toBe("1");
  });

  it("persists mock verification after on-chain approval", async () => {
    const record = await createPropertyDraft(createInput());

    await saveOnchainPropertyRegistration({
      kind: "registration",
      localPropertyId: record.localPropertyId,
      propertyId: "1",
      txHash:
        "1111111111111111111111111111111111111111111111111111111111111111",
    });

    const updatedRecord = await savePropertyMockVerification({
      kind: "mockVerification",
      localPropertyId: record.localPropertyId,
      propertyId: "1",
      txHash:
        "2222222222222222222222222222222222222222222222222222222222222222",
    });

    expect(updatedRecord.onchainRegistration).toMatchObject({
      propertyId: "1",
      status: "MockVerified",
      verificationTxHash:
        "2222222222222222222222222222222222222222222222222222222222222222",
    });
    expect(updatedRecord.onchainRegistration?.verifiedAt).toBeTruthy();
  });

  it("persists tokenization after on-chain completion", async () => {
    const record = await createPropertyDraft(createInput());

    await saveOnchainPropertyRegistration({
      kind: "registration",
      localPropertyId: record.localPropertyId,
      propertyId: "1",
      txHash:
        "1111111111111111111111111111111111111111111111111111111111111111",
    });

    await savePropertyMockVerification({
      kind: "mockVerification",
      localPropertyId: record.localPropertyId,
      propertyId: "1",
      txHash:
        "2222222222222222222222222222222222222222222222222222222222222222",
    });

    const updatedRecord = await savePropertyTokenization({
      kind: "tokenization",
      localPropertyId: record.localPropertyId,
      propertyId: "1",
      txHash:
        "3333333333333333333333333333333333333333333333333333333333333333",
      valueTokenAddress: "11111111111111111111111111111112",
      usufructTokenId: "1",
      linkedValueUnits: "200000",
      freeValueUnits: "800000",
    });

    expect(updatedRecord.onchainRegistration).toMatchObject({
      propertyId: "1",
      status: "Tokenized",
      tokenizationTxHash:
        "3333333333333333333333333333333333333333333333333333333333333333",
      valueTokenAddress: "11111111111111111111111111111112",
      usufructTokenId: "1",
      linkedValueUnits: "200000",
      freeValueUnits: "800000",
    });
    expect(updatedRecord.onchainRegistration?.tokenizedAt).toBeTruthy();
  });

  it("persists primary sale listings after on-chain listing creation", async () => {
    const record = await createPropertyDraft(createInput());

    await saveOnchainPropertyRegistration({
      kind: "registration",
      localPropertyId: record.localPropertyId,
      propertyId: "1",
      txHash:
        "1111111111111111111111111111111111111111111111111111111111111111",
    });

    await savePropertyMockVerification({
      kind: "mockVerification",
      localPropertyId: record.localPropertyId,
      propertyId: "1",
      txHash:
        "2222222222222222222222222222222222222222222222222222222222222222",
    });

    await savePropertyTokenization({
      kind: "tokenization",
      localPropertyId: record.localPropertyId,
      propertyId: "1",
      txHash:
        "3333333333333333333333333333333333333333333333333333333333333333",
      valueTokenAddress: "11111111111111111111111111111112",
      usufructTokenId: "1",
      linkedValueUnits: "200000",
      freeValueUnits: "800000",
    });

    const updatedRecord = await savePropertyPrimarySaleListing({
      kind: "primarySaleListing",
      localPropertyId: record.localPropertyId,
      propertyId: "1",
      listingId: "1",
      txHash:
        "4444444444444444444444444444444444444444444444444444444444444444",
      amount: "300000",
      priceWei: "3000000000000000000",
    });

    expect(updatedRecord.onchainRegistration).toMatchObject({
      propertyId: "1",
      status: "ActiveSale",
      activeListingsCount: "1",
      activeEscrowedAmount: "300000",
      totalFreeValueSold: "0",
    });
    expect(updatedRecord.onchainRegistration?.primarySaleListings).toEqual([
      expect.objectContaining({
        listingId: "1",
        amount: "300000",
        priceWei: "3000000000000000000",
        txHash:
          "4444444444444444444444444444444444444444444444444444444444444444",
        status: "Active",
      }),
    ]);
  });

  it("persists primary sale purchases and buyer balances after on-chain completion", async () => {
    const record = await createPropertyDraft(createInput());

    await saveOnchainPropertyRegistration({
      kind: "registration",
      localPropertyId: record.localPropertyId,
      propertyId: "1",
      txHash:
        "1111111111111111111111111111111111111111111111111111111111111111",
    });

    await savePropertyMockVerification({
      kind: "mockVerification",
      localPropertyId: record.localPropertyId,
      propertyId: "1",
      txHash:
        "2222222222222222222222222222222222222222222222222222222222222222",
    });

    await savePropertyTokenization({
      kind: "tokenization",
      localPropertyId: record.localPropertyId,
      propertyId: "1",
      txHash:
        "3333333333333333333333333333333333333333333333333333333333333333",
      valueTokenAddress: "11111111111111111111111111111112",
      usufructTokenId: "1",
      linkedValueUnits: "200000",
      freeValueUnits: "800000",
    });

    await savePropertyPrimarySaleListing({
      kind: "primarySaleListing",
      localPropertyId: record.localPropertyId,
      propertyId: "1",
      listingId: "1",
      txHash:
        "4444444444444444444444444444444444444444444444444444444444444444",
      amount: "300000",
      priceWei: "3000000000000000000",
    });

    const updatedRecord = await savePropertyPrimarySalePurchase({
      kind: "primarySalePurchase",
      localPropertyId: record.localPropertyId,
      propertyId: "1",
      listingId: "1",
      txHash:
        "5555555555555555555555555555555555555555555555555555555555555555",
      buyerWallet: "11111111111111111111111111111114",
      amount: "300000",
      priceWei: "3000000000000000000",
    });

    expect(updatedRecord.onchainRegistration).toMatchObject({
      propertyId: "1",
      status: "Tokenized",
      activeListingsCount: "0",
      activeEscrowedAmount: "0",
      totalFreeValueSold: "300000",
      sellerReceivedWei: "3000000000000000000",
    });
    expect(updatedRecord.onchainRegistration?.buyerBalances).toEqual([
      expect.objectContaining({
        buyerWallet: "11111111111111111111111111111114",
        freeValueUnits: "300000",
        totalPaidWei: "3000000000000000000",
        lastPurchaseTxHash:
          "5555555555555555555555555555555555555555555555555555555555555555",
      }),
    ]);
    expect(updatedRecord.onchainRegistration?.primarySaleListings).toEqual([
      expect.objectContaining({
        listingId: "1",
        status: "Filled",
        buyerWallet: "11111111111111111111111111111114",
        purchaseTxHash:
          "5555555555555555555555555555555555555555555555555555555555555555",
      }),
    ]);
  });

  it("persists primary sale cancellations after on-chain completion", async () => {
    const record = await createPropertyDraft(createInput());

    await saveOnchainPropertyRegistration({
      kind: "registration",
      localPropertyId: record.localPropertyId,
      propertyId: "1",
      txHash:
        "1111111111111111111111111111111111111111111111111111111111111111",
    });

    await savePropertyMockVerification({
      kind: "mockVerification",
      localPropertyId: record.localPropertyId,
      propertyId: "1",
      txHash:
        "2222222222222222222222222222222222222222222222222222222222222222",
    });

    await savePropertyTokenization({
      kind: "tokenization",
      localPropertyId: record.localPropertyId,
      propertyId: "1",
      txHash:
        "3333333333333333333333333333333333333333333333333333333333333333",
      valueTokenAddress: "11111111111111111111111111111112",
      usufructTokenId: "1",
      linkedValueUnits: "200000",
      freeValueUnits: "800000",
    });

    await savePropertyPrimarySaleListing({
      kind: "primarySaleListing",
      localPropertyId: record.localPropertyId,
      propertyId: "1",
      listingId: "1",
      txHash:
        "4444444444444444444444444444444444444444444444444444444444444444",
      amount: "300000",
      priceWei: "3000000000000000000",
    });

    const updatedRecord = await savePropertyPrimarySaleCancellation({
      kind: "primarySaleCancellation",
      localPropertyId: record.localPropertyId,
      propertyId: "1",
      listingId: "1",
      txHash:
        "6666666666666666666666666666666666666666666666666666666666666666",
      amount: "300000",
    });

    expect(updatedRecord.onchainRegistration).toMatchObject({
      propertyId: "1",
      status: "Tokenized",
      activeListingsCount: "0",
      activeEscrowedAmount: "0",
      totalFreeValueSold: "0",
    });
    expect(updatedRecord.onchainRegistration?.primarySaleListings).toEqual([
      expect.objectContaining({
        listingId: "1",
        status: "Cancelled",
      }),
    ]);
  });

  it("seeds the section 32 demo simulation with the final 70/30 split", async () => {
    process.env.DEMO_SELLER_ADDRESS = "11111111111111111111111111111114";
    process.env.DEMO_BUYER_ADDRESS = "11111111111111111111111111111113";

    const record = await seedSection32DemoScenario();

    expect(record.localPropertyId).toBe("32000000-0000-4000-8000-000000000032");
    expect(record.ownerWallet).toBe(process.env.DEMO_SELLER_ADDRESS);
    expect(record.marketValueWei).toBe("200000000000000000");
    expect(record.linkedValueBps).toBe(2000);
    expect(record.onchainRegistration).toMatchObject({
      propertyId: "32",
      status: "Tokenized",
      linkedValueUnits: "200000",
      freeValueUnits: "800000",
      activeListingsCount: "0",
      activeEscrowedAmount: "0",
      totalFreeValueSold: "300000",
      sellerReceivedWei: "60000000000000000",
    });
    expect(record.onchainRegistration?.primarySaleListings).toEqual([
      expect.objectContaining({
        listingId: "32",
        amount: "0",
        priceWei: "0",
        status: "Filled",
        buyerWallet: process.env.DEMO_BUYER_ADDRESS,
      }),
    ]);
    expect(record.onchainRegistration?.buyerBalances).toEqual([
      expect.objectContaining({
        buyerWallet: process.env.DEMO_BUYER_ADDRESS,
        freeValueUnits: "300000",
        totalPaidWei: "60000000000000000",
      }),
    ]);

    const drafts = await listPropertyDrafts();
    expect(drafts).toHaveLength(1);
    expect(drafts[0].localPropertyId).toBe(record.localPropertyId);
  });
});

function createInput(): PropertyDraftInput {
  return {
    localPropertyId: "4bbf258c-d4d7-40dd-a16d-ee5320cd3f95",
    ownerWallet: "11111111111111111111111111111113",
    marketValueEth: "10",
    linkedValueBps: 2000,
    description: "Sample property",
    street: "Rua Exemplo",
    number: "123",
    city: "Sao Paulo",
    state: "SP",
    country: "BR",
    postalCode: "00000-000",
    lat: "-23.5505",
    lng: "-46.6333",
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
  };
}

