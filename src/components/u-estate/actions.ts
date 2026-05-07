"use client";

import type { SavedPropertyRecord } from "@/offchain/schemas";
import type { PropertyDocument, TxStep } from "./types";
import type { WalletState } from "./wallet";

export type NewPropertyForm = {
  marketValueEth: string;
  reservedPct: number;
  description: string;
  street: string;
  number: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  lat: string;
  lng: string;
  documents: PropertyDocument[];
};

export type StepCb = (step: TxStep) => void;

export type UEstateActions = {
  ready: boolean;
  primaryValueSaleAddress: string | undefined;
  registryAddress: string | undefined;
  submitProperty: (
    form: NewPropertyForm,
    onStep: StepCb,
  ) => Promise<SavedPropertyRecord>;
  mockVerify: (
    localPropertyId: string,
    onchainPropertyId: string,
    onStep: StepCb,
  ) => Promise<SavedPropertyRecord>;
  tokenize: (
    localPropertyId: string,
    onchainPropertyId: string,
    onStep: StepCb,
  ) => Promise<SavedPropertyRecord>;
  publishListing: (
    localPropertyId: string,
    onchainPropertyId: string,
    units: number,
    onStep: StepCb,
  ) => Promise<SavedPropertyRecord>;
  buyListing: (
    localPropertyId: string,
    listingId: string,
    amount: number,
    priceWei: bigint,
    onStep: StepCb,
  ) => Promise<SavedPropertyRecord>;
  cancelListing: (
    localPropertyId: string,
    listingId: string,
    onStep: StepCb,
  ) => Promise<SavedPropertyRecord>;
};

export function useUEstateActions(wallet: WalletState): UEstateActions {
  const disabled = async (): Promise<SavedPropertyRecord> => {
    throw new Error(
      "Solana transactions are not wired yet. Milestone S1 only scaffolds Anchor setup; transaction flows start in later milestones.",
    );
  };

  return {
    ready: Boolean(wallet.canTransact),
    primaryValueSaleAddress: undefined,
    registryAddress: process.env.NEXT_PUBLIC_USUFRUCT_PROGRAM_ID || undefined,
    submitProperty: disabled,
    mockVerify: disabled,
    tokenize: disabled,
    publishListing: disabled,
    buyListing: disabled,
    cancelListing: disabled,
  };
}

export function ethToWei(eth: string): bigint {
  const [wholePart, fractionalPart = ""] = eth.trim().split(".");
  const whole = BigInt(wholePart || "0") * 1_000_000_000_000_000_000n;
  const fractional = BigInt((fractionalPart + "0".repeat(18)).slice(0, 18));
  return whole + fractional;
}
