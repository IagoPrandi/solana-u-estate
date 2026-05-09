import { storedSolAmountToDecimal } from "./amounts";
import type { SavedPropertyRecord } from "@/offchain/schemas";
import type {
  Listing,
  Property,
  PropertyDocument,
  PropertyStatus,
  ThumbVariant,
  Transaction,
} from "./types";

const VARIANTS: ThumbVariant[] = [
  "mix",
  "orange",
  "charcoal",
  "soft",
  "deep",
  "cream",
];

export function pickThumbVariant(seed: string): ThumbVariant {
  let acc = 0;
  for (let i = 0; i < seed.length; i += 1) {
    acc = (acc + seed.charCodeAt(i)) % 1024;
  }
  return VARIANTS[acc % VARIANTS.length];
}

export function recordToProperty(record: SavedPropertyRecord): Property {
  const onchain = record.onchainRegistration;
  const totalValueUnits = 1_000_000;
  const linkedValueUnits = onchain?.linkedValueUnits
    ? Number(onchain.linkedValueUnits)
    : Math.round((record.linkedValueBps / 10000) * totalValueUnits);
  const freeValueUnits = onchain?.freeValueUnits
    ? Number(onchain.freeValueUnits)
    : totalValueUnits - linkedValueUnits;
  const soldFreeValueUnits = onchain?.totalFreeValueSold
    ? Number(onchain.totalFreeValueSold)
    : 0;
  const activeListings = onchain?.activeListingsCount
    ? Number(onchain.activeListingsCount)
    : 0;

  const status: PropertyStatus = onchain ? onchain.status : "Draft";

  const documents: PropertyDocument[] = record.documents.map((d) => ({
    type: d.type,
    filename: d.filename,
  }));

  return {
    id: record.localPropertyId,
    propertyId: onchain?.propertyId ?? "0",
    title: titleFromAddress(record),
    street: record.address.street,
    number: record.address.number,
    city: record.address.city,
    state: record.address.state,
    country: record.address.country,
    postalCode: record.address.postalCode,
    lat: record.location.lat,
    lng: record.location.lng,
    description: record.description ?? "",
    marketValueEth: storedSolAmountToDecimal(record.marketValueWei, 8),
    linkedValueBps: record.linkedValueBps,
    totalValueUnits,
    linkedValueUnits,
    freeValueUnits,
    soldFreeValueUnits,
    activeListings,
    status,
    thumbVariant: pickThumbVariant(record.localPropertyId),
    documents,
    metadataHash: record.metadataHash,
    documentsHash: record.documentsHash,
    locationHash: record.locationHash,
    valueTokenAddress: onchain?.valueTokenAddress,
    usufructTokenId: onchain?.usufructTokenId,
    buyerBalances: onchain?.buyerBalances,
    ownerWallet: record.ownerWallet,
    createdAt: record.createdAt,
    rejection: onchain?.rejection,
  };
}

function titleFromAddress(record: SavedPropertyRecord) {
  const street = record.address.street.trim();
  const number = record.address.number.trim();
  if (street && number) return `${street}, ${number}`;
  if (street) return street;
  return `Imóvel ${record.localPropertyId.slice(0, 6)}`;
}

export function recordsToListings(records: SavedPropertyRecord[]): Listing[] {
  const listings: Listing[] = [];
  for (const record of records) {
    const onchain = record.onchainRegistration;
    if (!onchain?.primarySaleListings) continue;
    for (const l of onchain.primarySaleListings) {
      listings.push({
        listingId: l.listingId,
        localPropertyId: record.localPropertyId,
        propertyId: onchain.propertyId,
        amount: Number(l.amount),
        priceWei: storedSolAmountToDecimal(l.priceWei, 9),
        seller: record.ownerWallet,
        status: l.status,
        listedAt: l.listedAt,
        txHash: l.txHash,
      });
    }
  }
  return listings.sort(
    (a, b) =>
      new Date(b.listedAt).getTime() - new Date(a.listedAt).getTime(),
  );
}

export function recordsToTransactions(
  records: SavedPropertyRecord[],
): Transaction[] {
  const txs: Transaction[] = [];
  for (const record of records) {
    const onchain = record.onchainRegistration;
    if (!onchain) continue;
    const title = titleFromAddress(record);
    txs.push({
      id: `${record.localPropertyId}-reg`,
      type: "Cadastro",
      localPropertyId: record.localPropertyId,
      propertyId: onchain.propertyId,
      ownerWallet: record.ownerWallet,
      propertyTitle: title,
      valueEth: null,
      status: "Confirmado",
      date: onchain.registeredAt,
      txHash: onchain.txHash,
    });
    if (onchain.verificationTxHash && onchain.verifiedAt) {
      txs.push({
        id: `${record.localPropertyId}-verify`,
        type: "Análise concluída",
        localPropertyId: record.localPropertyId,
        propertyId: onchain.propertyId,
        ownerWallet: record.ownerWallet,
        propertyTitle: title,
        valueEth: null,
        status: "Confirmado",
        date: onchain.verifiedAt,
        txHash: onchain.verificationTxHash,
      });
    }
    if (onchain.tokenizationTxHash && onchain.tokenizedAt) {
      txs.push({
        id: `${record.localPropertyId}-tok`,
        type: "Pronto pra publicar",
        localPropertyId: record.localPropertyId,
        propertyId: onchain.propertyId,
        ownerWallet: record.ownerWallet,
        propertyTitle: title,
        valueEth: null,
        status: "Confirmado",
        date: onchain.tokenizedAt,
        txHash: onchain.tokenizationTxHash,
      });
    }
    for (const l of onchain.primarySaleListings ?? []) {
      txs.push({
        id: `${record.localPropertyId}-list-${l.listingId}`,
        type: "Oferta publicada",
        localPropertyId: record.localPropertyId,
        propertyId: onchain.propertyId,
        ownerWallet: record.ownerWallet,
        sellerWallet: record.ownerWallet,
        propertyTitle: title,
        valueEth: storedSolAmountToDecimal(l.priceWei, 8),
        status: "Confirmado",
        date: l.listedAt,
        txHash: l.txHash,
      });
      if (l.purchaseTxHash && l.purchasedAt) {
        txs.push({
          id: `${record.localPropertyId}-buy-${l.listingId}`,
          type: "Investimento",
          localPropertyId: record.localPropertyId,
          propertyId: onchain.propertyId,
          ownerWallet: record.ownerWallet,
          sellerWallet: record.ownerWallet,
          buyerWallet: l.buyerWallet,
          propertyTitle: title,
          valueEth: storedSolAmountToDecimal(l.priceWei, 8),
          status: "Confirmado",
          date: l.purchasedAt,
          txHash: l.purchaseTxHash,
        });
      }
    }
  }
  return txs.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

export async function fetchProperties(): Promise<SavedPropertyRecord[]> {
  const response = await fetch("/api/properties", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Could not load properties from the API.");
  }
  const payload = (await response.json()) as {
    properties: SavedPropertyRecord[];
  };
  return payload.properties;
}

export async function patchOnchainSync<T extends { kind: string }>(body: T) {
  const response = await fetch("/api/properties", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as
    | { record: SavedPropertyRecord }
    | { error: string };
  if (!response.ok || !("record" in payload)) {
    throw new Error(
      "error" in payload
        ? payload.error
        : "Could not persist the on-chain event.",
    );
  }
  return payload.record;
}
