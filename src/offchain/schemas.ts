import { z } from "zod";
import { parseDecimalToUnits } from "@/lib/safe-decimal";
import { isSolanaPublicKey, isSolanaSignature } from "@/lib/solana/config";

const coordinateSchema = z
  .string()
  .trim()
  .refine((value) => {
    const numericValue = Number(value);
    return Number.isFinite(numericValue);
  }, "Coordinate must be a valid number.");

const marketValueSchema = z
  .string()
  .trim()
  .min(1, "Market value is required.")
  .refine((value) => {
    try {
      parseDecimalToUnits(value, 18);
      return true;
    } catch {
      return false;
    }
  }, "Market value must be a valid SOL amount.");

export const mockDocumentTypeSchema = z.enum([
  "mock_deed",
  "mock_owner_id",
  "mock_tax_record",
]);

export const mockDocumentInputSchema = z.object({
  type: mockDocumentTypeSchema,
  filename: z
    .string()
    .trim()
    .min(1, "Mock document filename is required.")
    .max(120, "Mock document filename must stay under 120 characters."),
});

export const propertyIntakeSchema = z.object({
  localPropertyId: z.uuid().optional(),
  ownerWallet: z
    .string()
    .trim()
    .refine(
      (value) => isSolanaPublicKey(value),
      "Owner wallet must be a valid Solana public key.",
    ),
  marketValueEth: marketValueSchema,
  linkedValueBps: z.coerce
    .number()
    .int()
    .gt(0, "Linked value bps must be greater than zero.")
    .lt(10_000, "Linked value bps must stay below 10,000."),
  description: z
    .string()
    .trim()
    .max(500, "Description must stay under 500 characters.")
    .optional()
    .transform((value) => value || undefined),
  street: z.string().trim().min(1, "Street is required."),
  number: z.string().trim().min(1, "Number is required."),
  city: z.string().trim().min(1, "City is required."),
  state: z.string().trim().min(1, "State is required."),
  country: z.string().trim().min(1, "Country is required."),
  postalCode: z.string().trim().min(1, "Postal code is required."),
  lat: coordinateSchema,
  lng: coordinateSchema,
  documents: z
    .array(mockDocumentInputSchema)
    .min(1, "At least one mock document is required.")
    .max(10, "No more than 10 mock documents are allowed."),
});

export const propertyOnchainRegistrationInputSchema = z.object({
  kind: z.literal("registration"),
  localPropertyId: z.uuid(),
  propertyId: z
    .string()
    .trim()
    .regex(/^[1-9]\d*$/, "Property id must be a positive integer string."),
  txHash: z
    .string()
    .trim()
    .refine(
      (value) => isSolanaSignature(value),
      "Transaction signature must be a valid Solana signature.",
    ),
});

export const propertyMockVerificationInputSchema = z.object({
  kind: z.literal("mockVerification"),
  localPropertyId: z.uuid(),
  propertyId: z
    .string()
    .trim()
    .regex(/^[1-9]\d*$/, "Property id must be a positive integer string."),
  txHash: z
    .string()
    .trim()
    .refine(
      (value) => isSolanaSignature(value),
      "Transaction signature must be a valid Solana signature.",
    ),
});

export const propertyTokenizationInputSchema = z.object({
  kind: z.literal("tokenization"),
  localPropertyId: z.uuid(),
  propertyId: z
    .string()
    .trim()
    .regex(/^[1-9]\d*$/, "Property id must be a positive integer string."),
  txHash: z
    .string()
    .trim()
    .refine(
      (value) => isSolanaSignature(value),
      "Transaction signature must be a valid Solana signature.",
    ),
  valueTokenAddress: z
    .string()
    .trim()
    .refine(
      (value) => isSolanaPublicKey(value),
      "Value token mint must be a valid Solana public key.",
    ),
  usufructTokenId: z
    .string()
    .trim()
    .regex(
      /^[1-9]\d*$/,
      "Usufruct token id must be a positive integer string.",
    ),
  linkedValueUnits: z
    .string()
    .trim()
    .regex(/^\d+$/, "Linked value units must be an integer string."),
  freeValueUnits: z
    .string()
    .trim()
    .regex(/^\d+$/, "Free value units must be an integer string."),
});

export const propertyPrimarySaleListingInputSchema = z.object({
  kind: z.literal("primarySaleListing"),
  localPropertyId: z.uuid(),
  propertyId: z
    .string()
    .trim()
    .regex(/^[1-9]\d*$/, "Property id must be a positive integer string."),
  listingId: z
    .string()
    .trim()
    .regex(/^[1-9]\d*$/, "Listing id must be a positive integer string."),
  txHash: z
    .string()
    .trim()
    .refine(
      (value) => isSolanaSignature(value),
      "Transaction signature must be a valid Solana signature.",
    ),
  amount: z
    .string()
    .trim()
    .regex(/^[1-9]\d*$/, "Listing amount must be a positive integer string."),
  priceWei: z
    .string()
    .trim()
    .regex(/^[1-9]\d*$/, "Listing price must be a positive integer string."),
});

export const propertyPrimarySalePurchaseInputSchema = z.object({
  kind: z.literal("primarySalePurchase"),
  localPropertyId: z.uuid(),
  propertyId: z
    .string()
    .trim()
    .regex(/^[1-9]\d*$/, "Property id must be a positive integer string."),
  listingId: z
    .string()
    .trim()
    .regex(/^[1-9]\d*$/, "Listing id must be a positive integer string."),
  txHash: z
    .string()
    .trim()
    .refine(
      (value) => isSolanaSignature(value),
      "Transaction signature must be a valid Solana signature.",
    ),
  buyerWallet: z
    .string()
    .trim()
    .refine(
      (value) => isSolanaPublicKey(value),
      "Buyer wallet must be a valid Solana public key.",
    ),
  amount: z
    .string()
    .trim()
    .regex(/^[1-9]\d*$/, "Purchase amount must be a positive integer string."),
  priceWei: z
    .string()
    .trim()
    .regex(/^[1-9]\d*$/, "Purchase price must be a positive integer string."),
});

export const propertyPrimarySaleCancellationInputSchema = z.object({
  kind: z.literal("primarySaleCancellation"),
  localPropertyId: z.uuid(),
  propertyId: z
    .string()
    .trim()
    .regex(/^[1-9]\d*$/, "Property id must be a positive integer string."),
  listingId: z
    .string()
    .trim()
    .regex(/^[1-9]\d*$/, "Listing id must be a positive integer string."),
  txHash: z
    .string()
    .trim()
    .refine(
      (value) => isSolanaSignature(value),
      "Transaction signature must be a valid Solana signature.",
    ),
  amount: z
    .string()
    .trim()
    .regex(/^[1-9]\d*$/, "Cancellation amount must be a positive integer string."),
});

export const propertyOnchainSyncSchema = z.discriminatedUnion("kind", [
  propertyOnchainRegistrationInputSchema,
  propertyMockVerificationInputSchema,
  propertyTokenizationInputSchema,
  propertyPrimarySaleListingInputSchema,
  propertyPrimarySalePurchaseInputSchema,
  propertyPrimarySaleCancellationInputSchema,
]);

export type PropertyDraftInput = z.infer<typeof propertyIntakeSchema>;
export type MockDocumentType = z.infer<typeof mockDocumentTypeSchema>;
export type MockDocumentInput = z.infer<typeof mockDocumentInputSchema>;
export type PropertyOnchainRegistrationInput = z.infer<
  typeof propertyOnchainRegistrationInputSchema
>;
export type PropertyMockVerificationInput = z.infer<
  typeof propertyMockVerificationInputSchema
>;
export type PropertyTokenizationInput = z.infer<
  typeof propertyTokenizationInputSchema
>;
export type PropertyPrimarySaleListingInput = z.infer<
  typeof propertyPrimarySaleListingInputSchema
>;
export type PropertyPrimarySalePurchaseInput = z.infer<
  typeof propertyPrimarySalePurchaseInputSchema
>;
export type PropertyPrimarySaleCancellationInput = z.infer<
  typeof propertyPrimarySaleCancellationInputSchema
>;
export type PropertyOnchainSyncInput = z.infer<typeof propertyOnchainSyncSchema>;

export type PropertyAddressV1 = {
  street: string;
  number: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
};

export type PropertyLocationV1 = {
  lat: string;
  lng: string;
};

export type PropertyMetadataHashInputV1 = {
  version: "1.0";
  propertyLocalId: string;
  ownerWallet: string;
  marketValueWei: string;
  linkedValueBps: number;
  address: PropertyAddressV1;
};

export type LocationMetadataHashInputV1 = {
  version: "1.0";
  propertyLocalId: string;
  lat: string;
  lng: string;
};

export type DocumentsHashMetadataV1 = {
  version: "1.0";
  propertyLocalId: string;
  documents: Array<{
    type: MockDocumentType;
    filename: string;
    mock: true;
  }>;
};

export type StoredMockDocument = {
  type: MockDocumentType;
  filename: string;
  mock: true;
  uploadedAt: string;
};

export type PropertyDraftPreview = {
  localPropertyId: string;
  ownerWallet: string;
  marketValueWei: string;
  linkedValueBps: number;
  description?: string;
  address: PropertyAddressV1;
  location: PropertyLocationV1;
  documents: Array<{
    type: MockDocumentType;
    filename: string;
    mock: true;
  }>;
  metadataForHash: PropertyMetadataHashInputV1;
  locationForHash: LocationMetadataHashInputV1;
  documentsForHash: DocumentsHashMetadataV1;
  metadataHash: string;
  locationHash: string;
  documentsHash: string;
};

export type SavedPropertyRecord = PropertyDraftPreview & {
  createdAt: string;
  documents: StoredMockDocument[];
  onchainRegistration?: {
    propertyId: string;
    txHash: string;
    status:
      | "PendingMockVerification"
      | "MockVerified"
      | "Tokenized"
      | "ActiveSale"
      | "SoldOut"
      | "Rejected";
    rejection?: { reason: string; rejectedAt: string };
    registeredAt: string;
    verificationTxHash?: string;
    verifiedAt?: string;
    tokenizationTxHash?: string;
    tokenizedAt?: string;
    valueTokenAddress?: string;
    usufructTokenId?: string;
    linkedValueUnits?: string;
    freeValueUnits?: string;
    activeListingsCount?: string;
    activeEscrowedAmount?: string;
    totalFreeValueSold?: string;
    sellerReceivedWei?: string;
    buyerBalances?: Array<{
      buyerWallet: string;
      freeValueUnits: string;
      totalPaidWei: string;
      lastPurchaseTxHash: string;
      acquiredAt: string;
    }>;
    primarySaleListings?: Array<{
      listingId: string;
      amount: string;
      priceWei: string;
      txHash: string;
      status: "Active" | "Filled" | "Cancelled";
      listedAt: string;
      buyerWallet?: string;
      purchaseTxHash?: string;
      purchasedAt?: string;
    }>;
  };
};

export type FiatCurrency = "usd" | "brl" | "eur" | "jpy";

export type FiatWarningCode =
  | "BRL_ROUTE_UNAVAILABLE"
  | "USING_LAST_KNOWN_RATES";

export type FiatRatesSnapshot = {
  provider: "okx";
  base: "SOL";
  routes: Partial<Record<FiatCurrency, string>>;
  rates: Partial<Record<FiatCurrency, string>>;
  unavailable: FiatCurrency[];
  optionalRates: {
    eur: string | null;
    jpy: string | null;
  };
  updatedAt: string | null;
};

export type FiatRatesSuccessResponse = FiatRatesSnapshot & {
  ok: true;
  cached: boolean;
  warning?: FiatWarningCode;
};

export type FiatRatesErrorResponse = {
  ok: false;
  code: "FIAT_RATES_UNAVAILABLE";
  message: string;
  provider: "okx";
};

export type FiatRatesResponse =
  | FiatRatesSuccessResponse
  | FiatRatesErrorResponse;

export type OffchainDatabase = {
  properties: SavedPropertyRecord[];
  fiatRatesCache: FiatRatesSnapshot;
};

export function normalizeCoordinate(value: string) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    throw new Error("Coordinate could not be normalized.");
  }

  return numericValue.toFixed(6);
}
