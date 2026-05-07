import { parseDecimalToUnits } from "@/lib/safe-decimal";
import { hashStableJson } from "@/offchain/hash";
import {
  normalizeCoordinate,
  type PropertyDraftInput,
  type PropertyDraftPreview,
  type SavedPropertyRecord,
  type StoredMockDocument,
} from "@/offchain/schemas";

type BuildDraftOptions = {
  createdAt?: string;
  localPropertyId?: string;
};

export function buildPropertyDraftPreview(
  input: PropertyDraftInput,
  options: BuildDraftOptions = {},
): PropertyDraftPreview {
  const localPropertyId =
    input.localPropertyId ?? options.localPropertyId ?? crypto.randomUUID();
  const address = {
    street: input.street.trim(),
    number: input.number.trim(),
    city: input.city.trim(),
    state: input.state.trim(),
    country: input.country.trim(),
    postalCode: input.postalCode.trim(),
  };
  const location = {
    lat: normalizeCoordinate(input.lat),
    lng: normalizeCoordinate(input.lng),
  };
  const documents = input.documents.map((document) => ({
    type: document.type,
    filename: document.filename.trim(),
    mock: true as const,
  }));
  const metadataForHash = {
    version: "1.0" as const,
    propertyLocalId: localPropertyId,
    ownerWallet: input.ownerWallet,
    marketValueWei: parseDecimalToUnits(input.marketValueEth, 18).toString(),
    linkedValueBps: input.linkedValueBps,
    address,
  };
  const locationForHash = {
    version: "1.0" as const,
    propertyLocalId: localPropertyId,
    lat: location.lat,
    lng: location.lng,
  };
  const documentsForHash = {
    version: "1.0" as const,
    propertyLocalId: localPropertyId,
    documents,
  };

  return {
    localPropertyId,
    ownerWallet: input.ownerWallet,
    marketValueWei: metadataForHash.marketValueWei,
    linkedValueBps: input.linkedValueBps,
    description: input.description,
    address,
    location,
    documents,
    metadataForHash,
    locationForHash,
    documentsForHash,
    metadataHash: hashStableJson(metadataForHash),
    locationHash: hashStableJson(locationForHash),
    documentsHash: hashStableJson(documentsForHash),
  };
}

export function buildSavedPropertyRecord(
  input: PropertyDraftInput,
  options: BuildDraftOptions = {},
): SavedPropertyRecord {
  const createdAt = options.createdAt ?? new Date().toISOString();
  const preview = buildPropertyDraftPreview(input, options);
  const storedDocuments: StoredMockDocument[] = preview.documents.map((document) => ({
    ...document,
    uploadedAt: createdAt,
  }));

  return {
    ...preview,
    createdAt,
    documents: storedDocuments,
  };
}
