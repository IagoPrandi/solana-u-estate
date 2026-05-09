import type { PublicKey } from "@solana/web3.js";
import type {
  DecodedListingAccount,
  DecodedPropertyAccount,
} from "@/lib/solana/accounts";
import type { TxStep } from "./types";

type LocalListingSnapshot = {
  amount: string | number;
  priceWei: string;
  syncStatus?: "confirmed" | "finalized" | "stale";
  status?: "Active" | "Filled" | "Cancelled";
};

export function isTxPending(open: boolean, step: TxStep) {
  return open && step !== "done";
}

export function assertNoPendingTransaction(open: boolean, step: TxStep) {
  if (isTxPending(open, step)) {
    throw new Error("Transaction already in progress.");
  }
}

function samePubkey(a: PublicKey | string, b: PublicKey | string) {
  const left = typeof a === "string" ? a : a.toBase58();
  const right = typeof b === "string" ? b : b.toBase58();
  return left.toLowerCase() === right.toLowerCase();
}

export function assertFreshPrimarySalePurchase(input: {
  localListing: LocalListingSnapshot;
  chainListing: DecodedListingAccount | null;
  chainProperty: DecodedPropertyAccount | null;
  requestedAmount: bigint;
  requestedPriceLamports: bigint;
  buyerWallet: PublicKey | string;
  sellerWallet: PublicKey | string;
  expectedValueMint: PublicKey | string;
}) {
  const localAmount = BigInt(input.localListing.amount);
  const localPriceLamports = BigInt(input.localListing.priceWei);

  if (input.localListing.syncStatus === "stale") {
    throw new Error("Listing is stale. Refresh before buying.");
  }
  if (input.localListing.status && input.localListing.status !== "Active") {
    throw new Error("Listing is not active locally.");
  }
  if (input.requestedAmount <= 0n) {
    throw new Error("Purchase amount must be greater than zero.");
  }
  if (input.requestedAmount > localAmount) {
    throw new Error("Purchase amount exceeds the available listing amount.");
  }
  const localExpectedPrice =
    localAmount > 0n ? (localPriceLamports * input.requestedAmount) / localAmount : 0n;
  if (localExpectedPrice <= 0n) {
    throw new Error("Purchase price is too small for on-chain settlement.");
  }
  if (input.requestedPriceLamports !== localExpectedPrice) {
    throw new Error("Stale listing price. Refresh before buying.");
  }
  if (samePubkey(input.buyerWallet, input.sellerWallet)) {
    throw new Error("Buyer wallet must differ from seller wallet.");
  }
  if (!input.chainProperty) {
    throw new Error("Property account not found on-chain.");
  }
  if (!input.chainListing || input.chainListing.status !== "Active") {
    throw new Error("Listing is not active on-chain.");
  }
  if (input.chainListing.amount !== localAmount) {
    throw new Error("Listing amount changed on-chain. Refresh before buying.");
  }
  if (input.chainListing.priceLamports !== localPriceLamports) {
    throw new Error("Listing price changed on-chain. Refresh before buying.");
  }
  if (!samePubkey(input.chainListing.seller, input.sellerWallet)) {
    throw new Error("Listing seller diverges from local cache.");
  }
  if (!samePubkey(input.chainListing.valueMint, input.expectedValueMint)) {
    throw new Error("Listing mint diverges from local cache.");
  }
  if (!samePubkey(input.chainProperty.valueMint, input.expectedValueMint)) {
    throw new Error("Property mint diverges from local cache.");
  }
}
