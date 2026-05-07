"use client";

import { useConnection, useWallet as useSolanaWallet } from "@solana/wallet-adapter-react";
import {
  Keypair,
  PublicKey,
  Transaction,
  type Signer,
  type TransactionInstruction,
} from "@solana/web3.js";
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";
import type { SavedPropertyRecord } from "@/offchain/schemas";
import type { PropertyDocument, TxStep } from "./types";
import type { WalletState } from "./wallet";
import {
  fetchListingAccount,
  fetchPropertyAccount,
  fetchProtocolState,
} from "@/lib/solana/accounts";
import {
  buyPrimarySaleListingIxs,
  cancelPrimarySaleListingIx,
  createPrimarySaleListingIx,
  initializeProtocolIx,
  lamportsToSolDecimal,
  mockVerifyPropertyIx,
  registerPropertyIx,
  solDecimalToLamports,
  tokenizePropertyIx,
} from "@/lib/solana/instructions";
import { patchOnchainSync } from "./onchain";
import { assertFreshPrimarySalePurchase } from "./transaction-guards";

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
  const { connection } = useConnection();
  const solanaWallet = useSolanaWallet();

  const requireWallet = () => {
    if (!solanaWallet.publicKey || !wallet.address) {
      throw new Error("Connect a Solana wallet before sending transactions.");
    }
    if (!wallet.canTransact) {
      throw new Error("Wallet must be connected to Solana Devnet with program id configured.");
    }
    return solanaWallet.publicKey;
  };

  const sendInstructions = async (
    instructions: TransactionInstruction[],
    onStep: StepCb,
    signers: Signer[] = [],
  ) => {
    const publicKey = requireWallet();
    onStep("sign");
    const tx = new Transaction().add(...instructions);
    tx.feePayer = publicKey;
    const signature = await solanaWallet.sendTransaction(tx, connection, {
      signers,
    });
    onStep("sent");
    onStep("confirming");
    await connection.confirmTransaction(signature, "confirmed");
    onStep("done");
    return signature;
  };

  const ensureSolBalance = async (minimumLamports: bigint) => {
    const publicKey = requireWallet();
    const balance = await connection.getBalance(publicKey, "confirmed");
    if (BigInt(balance) < minimumLamports) {
      throw new Error(
        `Insufficient SOL balance. Need at least ${lamportsToSolDecimal(minimumLamports)} SOL.`,
      );
    }
  };

  const createDraft = async (form: NewPropertyForm) => {
    const ownerWallet = requireWallet().toBase58();
    const payload = {
      ownerWallet,
      marketValueEth: form.marketValueEth,
      linkedValueBps: Math.round(form.reservedPct * 100),
      description: form.description,
      street: form.street,
      number: form.number,
      city: form.city,
      state: form.state,
      country: form.country,
      postalCode: form.postalCode,
      lat: form.lat,
      lng: form.lng,
      documents: form.documents,
    };
    const response = await fetch("/api/properties", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = (await response.json()) as
      | { record: SavedPropertyRecord }
      | { error: string };
    if (!response.ok || !("record" in body)) {
      throw new Error("error" in body ? body.error : "Could not save property draft.");
    }
    return body.record;
  };

  const ensureProtocolState = async (publicKey: PublicKey, onStep: StepCb) => {
    const state = await fetchProtocolState(connection);
    if (state) return state;

    await sendInstructions([initializeProtocolIx(publicKey, publicKey)], onStep);
    const initialized = await fetchProtocolState(connection);
    if (!initialized) {
      throw new Error("ProtocolState was not initialized.");
    }
    return initialized;
  };

  const loadLocalRecord = async (localPropertyId: string) => {
    const response = await fetch("/api/properties", { cache: "no-store" });
    if (!response.ok) throw new Error("Could not load local property records.");
    const body = (await response.json()) as { properties: SavedPropertyRecord[] };
    const record = body.properties.find(
      (item) => item.localPropertyId === localPropertyId,
    );
    if (!record) throw new Error("Property draft not found.");
    return record;
  };

  return {
    ready: Boolean(wallet.canTransact),
    primaryValueSaleAddress: undefined,
    registryAddress: process.env.NEXT_PUBLIC_USUFRUCT_PROGRAM_ID || undefined,
    submitProperty: async (form, onStep) => {
      const publicKey = requireWallet();
      await ensureSolBalance(50_000_000n);
      const record = await createDraft(form);
      const state = await ensureProtocolState(publicKey, onStep);
      const marketValueLamports = solDecimalToLamports(form.marketValueEth);
      const { instruction } = registerPropertyIx({
        owner: publicKey,
        propertyId: state.nextPropertyId,
        marketValueLamports,
        linkedValueBps: Math.round(form.reservedPct * 100),
        metadataHash: record.metadataHash,
        documentsHash: record.documentsHash,
        locationHash: record.locationHash,
      });
      const signature = await sendInstructions([instruction], onStep);
      return patchOnchainSync({
        kind: "registration",
        localPropertyId: record.localPropertyId,
        propertyId: state.nextPropertyId.toString(),
        txHash: signature,
      });
    },
    mockVerify: async (localPropertyId, onchainPropertyId, onStep) => {
      const publicKey = requireWallet();
      const propertyId = BigInt(onchainPropertyId);
      const signature = await sendInstructions(
        [mockVerifyPropertyIx({ propertyId, verifier: publicKey })],
        onStep,
      );
      return patchOnchainSync({
        kind: "mockVerification",
        localPropertyId,
        propertyId: onchainPropertyId,
        txHash: signature,
      });
    },
    tokenize: async (localPropertyId, onchainPropertyId, onStep) => {
      const publicKey = requireWallet();
      const propertyId = BigInt(onchainPropertyId);
      const valueMint = Keypair.generate();
      const { instruction } = tokenizePropertyIx({
        propertyId,
        owner: publicKey,
        valueMint: valueMint.publicKey,
      });
      const signature = await sendInstructions([instruction], onStep, [valueMint]);
      const property = await fetchPropertyAccount(connection, propertyId);
      if (!property) throw new Error("Property account not found after tokenization.");
      return patchOnchainSync({
        kind: "tokenization",
        localPropertyId,
        propertyId: onchainPropertyId,
        txHash: signature,
        valueTokenAddress: property.valueMint.toBase58(),
        usufructTokenId: property.propertyId.toString(),
        linkedValueUnits: property.linkedValueUnits.toString(),
        freeValueUnits: property.freeValueUnits.toString(),
      });
    },
    publishListing: async (localPropertyId, onchainPropertyId, units, onStep) => {
      const publicKey = requireWallet();
      const record = await loadLocalRecord(localPropertyId);
      const state = await fetchProtocolState(connection);
      if (!state) throw new Error("ProtocolState not found.");
      const valueMint = record.onchainRegistration?.valueTokenAddress;
      if (!valueMint) throw new Error("Property must be tokenized before listing.");
      const valueMintKey = new PublicKey(valueMint);
      const ownerTokenAccount = getAssociatedTokenAddressSync(
        valueMintKey,
        publicKey,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID,
      );
      const { instruction, property } = createPrimarySaleListingIx({
        propertyId: BigInt(onchainPropertyId),
        listingId: state.nextListingId,
        owner: publicKey,
        valueMint: valueMintKey,
        ownerTokenAccount,
        amount: BigInt(units),
      });
      const signature = await sendInstructions([instruction], onStep);
      const listingAccount = await fetchListingAccount(
        connection,
        property,
        state.nextListingId,
      );
      if (!listingAccount) {
        throw new Error("Listing account not found after listing creation.");
      }
      return patchOnchainSync({
        kind: "primarySaleListing",
        localPropertyId,
        propertyId: onchainPropertyId,
        listingId: state.nextListingId.toString(),
        txHash: signature,
        amount: listingAccount.amount.toString(),
        priceWei: listingAccount.priceLamports.toString(),
      });
    },
    buyListing: async (localPropertyId, listingId, amount, priceWei, onStep) => {
      const publicKey = requireWallet();
      const record = await loadLocalRecord(localPropertyId);
      const onchain = record.onchainRegistration;
      const listing = onchain?.primarySaleListings?.find(
        (item) => item.listingId === listingId,
      );
      if (!onchain || !listing) throw new Error("Primary sale listing is not saved locally.");
      const valueMint = new PublicKey(onchain.valueTokenAddress ?? "");
      const buyerTokenAccount = getAssociatedTokenAddressSync(
        valueMint,
        publicKey,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID,
      );
      const buyerAtaExists = Boolean(
        await connection.getAccountInfo(buyerTokenAccount, "confirmed"),
      );
      await ensureSolBalance(BigInt(listing.priceWei) + 20_000_000n);
      const propertyId = BigInt(onchain.propertyId);
      const property = await fetchPropertyAccount(connection, propertyId);
      const listingAccount = property
        ? await fetchListingAccount(connection, property.address, BigInt(listingId))
        : null;
      if (!listingAccount) {
        throw new Error("Listing is not active on-chain.");
      }
      assertFreshPrimarySalePurchase({
        localListing: listing,
        chainListing: listingAccount,
        chainProperty: property,
        requestedAmount: BigInt(amount),
        requestedPriceLamports: priceWei,
        buyerWallet: publicKey,
        sellerWallet: record.ownerWallet,
        expectedValueMint: valueMint,
      });
      const { instructions } = buyPrimarySaleListingIxs({
        propertyId,
        listingId: BigInt(listingId),
        buyer: publicKey,
        seller: new PublicKey(record.ownerWallet),
        valueMint,
        escrowTokenAccount: listingAccount.escrowTokenAccount,
        amount: BigInt(listing.amount),
        priceLamports: BigInt(listing.priceWei),
        buyerTokenAccountExists: buyerAtaExists,
      });
      const signature = await sendInstructions(instructions, onStep);
      return patchOnchainSync({
        kind: "primarySalePurchase",
        localPropertyId,
        propertyId: onchain.propertyId,
        listingId,
        txHash: signature,
        buyerWallet: publicKey.toBase58(),
        amount: listing.amount,
        priceWei: listing.priceWei,
      });
    },
    cancelListing: async (localPropertyId, listingId, onStep) => {
      const publicKey = requireWallet();
      const record = await loadLocalRecord(localPropertyId);
      const onchain = record.onchainRegistration;
      const listing = onchain?.primarySaleListings?.find(
        (item) => item.listingId === listingId,
      );
      if (!onchain || !listing) throw new Error("Primary sale listing is not saved locally.");
      if (publicKey.toBase58().toLowerCase() !== record.ownerWallet.toLowerCase()) {
        throw new Error("Only the seller wallet can cancel this listing.");
      }
      const valueMint = new PublicKey(onchain.valueTokenAddress ?? "");
      const sellerTokenAccount = getAssociatedTokenAddressSync(
        valueMint,
        publicKey,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID,
      );
      const propertyId = BigInt(onchain.propertyId);
      const property = await fetchPropertyAccount(connection, propertyId);
      const listingAccount = property
        ? await fetchListingAccount(connection, property.address, BigInt(listingId))
        : null;
      if (!listingAccount || listingAccount.status !== "Active") {
        throw new Error("Listing is not active on-chain.");
      }
      const signature = await sendInstructions(
        [
          cancelPrimarySaleListingIx({
            propertyId,
            listingId: BigInt(listingId),
            seller: publicKey,
            valueMint,
            escrowTokenAccount: listingAccount.escrowTokenAccount,
            sellerTokenAccount,
          }),
        ],
        onStep,
      );
      return patchOnchainSync({
        kind: "primarySaleCancellation",
        localPropertyId,
        propertyId: onchain.propertyId,
        listingId,
        txHash: signature,
        amount: listing.amount,
      });
    },
  };
}

export function ethToWei(sol: string): bigint {
  return solDecimalToLamports(sol);
}
