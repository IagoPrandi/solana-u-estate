"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { SavedPropertyRecord } from "@/offchain/schemas";
import { lamportsToSolDecimal } from "@/lib/solana/instructions";
import { useUEstateActions, type NewPropertyForm } from "./actions";
import { DashboardPage } from "./dashboard";
import { initialUser } from "./data";
import { LandingPage } from "./landing";
import { getWalletHoldingForProperty } from "./holdings";
import { InvestmentDetailPage } from "./investment-detail";
import { matchesListingIdentity } from "./listing-identity";
import { ListingDetailPage, MarketplacePage } from "./marketplace";
import {
  fetchProperties,
  recordsToListings,
  recordsToTransactions,
  recordToProperty,
} from "./onchain";
import {
  LearnPage,
  PortfolioPage,
  SettingsPage,
  TransactionsPage,
} from "./portfolio";
import { PropertiesPage, PropertyNewPage } from "./properties";
import {
  PropertyDetailPage,
  PropertyPublishPage,
} from "./property-detail";
import { Sidebar, Topbar } from "./ui";
import type {
  Listing,
  Navigate,
  Property,
  Role,
  Route,
  RouteName,
  Transaction,
  TxStep,
  User,
} from "./types";
import { useWallet } from "./wallet";

export type StepCb = (step: TxStep) => void;

export type AppActions = {
  ready: boolean;
  /** Single submit handler. Persists a draft and submits the on-chain registration transaction. */
  submitProperty: (form: NewPropertyForm, onStep: StepCb) => Promise<Property>;
  verifyProperty: (
    localId: string,
    onchainId: string | undefined,
    onStep: StepCb,
  ) => Promise<void>;
  tokenizeProperty: (
    localId: string,
    onchainId: string | undefined,
    onStep: StepCb,
  ) => Promise<void>;
  publishListing: (
    localId: string,
    onchainId: string | undefined,
    units: number,
    onStep: StepCb,
  ) => Promise<Listing>;
  buyListing: (
    localId: string,
    listingId: string,
    units: number,
    priceWei: bigint,
    onStep: StepCb,
  ) => Promise<void>;
  cancelListing: (
    localId: string,
    listingId: string,
    onStep: StepCb,
  ) => Promise<void>;
};

const TOTAL_VALUE_UNITS = 1_000_000;

export function UEstateApp() {
  const wallet = useWallet();
  const actions = useUEstateActions(wallet);

  const [route, setRoute] = useState<Route>({ name: "landing", params: {} });
  const [properties, setProperties] = useState<Property[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [userBase, setUser] = useState<User>(initialUser);
  const [role, setRole] = useState<Role>("owner");
  const user = useMemo<User>(
    () =>
      wallet.address ? { ...userBase, wallet: wallet.address } : userBase,
    [userBase, wallet.address],
  );
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const navigate: Navigate = useCallback((name: RouteName, params = {}) => {
    setRoute({ name, params });
    if (typeof window !== "undefined") window.scrollTo(0, 0);
  }, []);

  const applyRecord = useCallback((record: SavedPropertyRecord) => {
    const p = recordToProperty(record);
    setProperties((prev) => {
      const idx = prev.findIndex((x) => x.id === p.id);
      if (idx === -1) return [p, ...prev];
      const next = [...prev];
      next[idx] = p;
      return next;
    });
  }, []);

  const refreshFromApi = useCallback(async () => {
    try {
      const records = await fetchProperties();
      setProperties(records.map(recordToProperty));
      setListings(recordsToListings(records));
      setTransactions(recordsToTransactions(records));
      return true;
    } catch {
      setProperties([]);
      setListings([]);
      setTransactions([]);
      return false;
    }
  }, []);

  useEffect(() => {
    void refreshFromApi();
    // Whenever the wallet identity changes, drop any in-progress per-property
    // route so the user does not stay on a foreign wallet's detail/publish page.
    setRoute((prev) =>
      prev.name === "property" ||
      prev.name === "property-publish" ||
      prev.name === "investment"
        ? { name: "dashboard", params: {} }
        : prev,
    );
  }, [wallet.address, refreshFromApi]);

  // Poll the off-chain DB while a wallet is connected so that validator
  // decisions (approve/reject) and other out-of-band state changes show up
  // without requiring a manual reload. Pauses when the tab is hidden.
  useEffect(() => {
    if (!wallet.address) return;
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refreshFromApi();
      }
    }, 8000);
    return () => window.clearInterval(interval);
  }, [wallet.address, refreshFromApi]);

  const submitProperty = useCallback<AppActions["submitProperty"]>(
    async (form, onStep) => {
      if (!actions.ready) {
        throw new Error(
          "Connect a Solana Devnet wallet with the configured program before registering a property.",
        );
      }

      const record = await actions.submitProperty(form, onStep);
      applyRecord(record);
      await refreshFromApi();
      return recordToProperty(record);
    },
    [actions, applyRecord, refreshFromApi],
  );

  const verifyProperty = useCallback<AppActions["verifyProperty"]>(
    async (localId, onchainId, onStep) => {
      if (!actions.ready) {
        throw new Error(
          "Connect a Solana Devnet wallet with the configured program before verifying a property.",
        );
      }
      if (!onchainId || onchainId === "0") {
        throw new Error("Property must be registered on-chain before verification.");
      }
      const record = await actions.mockVerify(localId, onchainId, onStep);
      applyRecord(record);
      await refreshFromApi();
    },
    [actions, applyRecord, refreshFromApi],
  );

  const tokenizeProperty = useCallback<AppActions["tokenizeProperty"]>(
    async (localId, onchainId, onStep) => {
      if (!actions.ready) {
        throw new Error(
          "Connect a Solana Devnet wallet with the configured program before tokenizing a property.",
        );
      }
      if (!onchainId || onchainId === "0") {
        throw new Error("Property must be registered on-chain before tokenization.");
      }
      const record = await actions.tokenize(localId, onchainId, onStep);
      applyRecord(record);
      await refreshFromApi();
    },
    [actions, applyRecord, refreshFromApi],
  );

  const publishListing = useCallback<AppActions["publishListing"]>(
    async (localId, onchainId, units, onStep) => {
      if (!actions.ready) {
        throw new Error(
          "Connect a Solana Devnet wallet with the configured program before publishing a listing.",
        );
      }
      if (!onchainId || onchainId === "0") {
        throw new Error("Property must be registered on-chain before listing publication.");
      }
      const record = await actions.publishListing(
        localId,
        onchainId,
        units,
        onStep,
      );
      applyRecord(record);
      await refreshFromApi();
      const created = recordsToListings([record]).find(
        (listing) => Number(listing.amount) === units,
      );
      if (!created) throw new Error("Listing not found after sync.");
      return created;
    },
    [actions, applyRecord, refreshFromApi],
  );

  const buyListing = useCallback<AppActions["buyListing"]>(
    async (localId, listingId, units, priceWei, onStep) => {
      const listing = listings.find((l) => l.listingId === listingId);
      if (!listing) throw new Error("Oferta não encontrada.");

      if (!actions.ready) {
        throw new Error(
          "Connect a Solana Devnet wallet with the configured program before buying a listing.",
        );
      }
      if (!listing.localPropertyId || listing.localPropertyId !== localId) {
        throw new Error(
          "This listing is not linked to the current local on-chain record. Refresh before buying.",
        );
      }
      const record = await actions.buyListing(
        localId,
        listingId,
        units,
        priceWei,
        onStep,
      );
      applyRecord(record);
      await refreshFromApi();
    },
    [actions, applyRecord, listings, refreshFromApi],
  );

  const cancelListing = useCallback<AppActions["cancelListing"]>(
    async (localId, listingId, onStep) => {
      if (!actions.ready) {
        throw new Error(
          "Connect a Solana Devnet wallet with the configured program before cancelling a listing.",
        );
      }
      const record = await actions.cancelListing(
        localId,
        listingId,
        onStep,
      );
      applyRecord(record);
      await refreshFromApi();
    },
    [actions, applyRecord, refreshFromApi],
  );

  const appActions: AppActions = useMemo(
    () => ({
      ready: actions.ready,
      submitProperty,
      verifyProperty,
      tokenizeProperty,
      publishListing,
      buyListing,
      cancelListing,
    }),
    [
      actions.ready,
      submitProperty,
      verifyProperty,
      tokenizeProperty,
      publishListing,
      buyListing,
      cancelListing,
    ],
  );

  const walletAddr = wallet.address?.toLowerCase();

  const myProperties = useMemo(() => {
    if (!walletAddr) return properties;
    return properties.filter(
      (p) => p.ownerWallet && p.ownerWallet.toLowerCase() === walletAddr,
    );
  }, [properties, walletAddr]);

  const myListings = useMemo(() => {
    if (!walletAddr) return listings;
    return listings.filter(
      (l) => l.seller && l.seller.toLowerCase() === walletAddr,
    );
  }, [listings, walletAddr]);

  const myTransactions = useMemo(() => {
    if (!walletAddr) return transactions;
    const ownedIds = new Set(myProperties.map((p) => p.id));
    return transactions.filter(
      (t) =>
        t.ownerWallet?.toLowerCase() === walletAddr ||
        t.sellerWallet?.toLowerCase() === walletAddr ||
        (t.localPropertyId ? ownedIds.has(t.localPropertyId) : false),
    );
  }, [transactions, myProperties, walletAddr]);

  const myBuyerTransactions = useMemo(() => {
    if (!walletAddr) return transactions;
    return transactions.filter(
      (t) => t.buyerWallet?.toLowerCase() === walletAddr,
    );
  }, [transactions, walletAddr]);

  const findOwnedProp = () =>
    myProperties.find((p) => p.id === route.params.id);
  const findInvestmentProp = () =>
    properties.find((p) => p.id === route.params.id);
  const findListing = () =>
    listings.find((l) => matchesListingIdentity(l, route.params.id));

  if (route.name === "landing") {
    return <LandingPage navigate={navigate} setRole={setRole} />;
  }

  const renderPage = () => {
    switch (route.name) {
      case "dashboard":
        return (
          <DashboardPage
            properties={role === "buyer" ? properties : myProperties}
            listings={role === "buyer" ? listings : myListings}
            transactions={
              role === "buyer" ? myBuyerTransactions : myTransactions
            }
            navigate={navigate}
            role={role}
            user={user}
          />
        );
      case "properties":
        return (
          <PropertiesPage properties={myProperties} navigate={navigate} />
        );
      case "property-new":
        return (
          <PropertyNewPage navigate={navigate} actions={appActions} />
        );
      case "property":
        return (
          <PropertyDetailPage
            property={findOwnedProp()}
            navigate={navigate}
            listings={listings}
            actions={appActions}
            wallet={wallet}
          />
        );
      case "property-publish":
        return (
          <PropertyPublishPage
            property={findOwnedProp()}
            navigate={navigate}
            actions={appActions}
          />
        );
      case "investment": {
        const p = findInvestmentProp();
        return (
          <InvestmentDetailPage
            property={p}
            holding={getWalletHoldingForProperty(p, wallet.address)}
            listings={listings}
            navigate={navigate}
          />
        );
      }
      case "marketplace":
        return (
          <MarketplacePage
            properties={properties}
            listings={listings}
            navigate={navigate}
          />
        );
      case "listing": {
        const l = findListing();
        const p = l
          ? properties.find((pp) => pp.propertyId === l.propertyId)
          : undefined;
        return (
          <ListingDetailPage
            listing={l}
            property={p}
            navigate={navigate}
            actions={appActions}
            walletAddress={wallet.address}
          />
        );
      }
      case "portfolio":
        return (
          <PortfolioPage
            properties={role === "buyer" ? properties : myProperties}
            listings={role === "buyer" ? listings : myListings}
            transactions={
              role === "buyer" ? myBuyerTransactions : myTransactions
            }
            user={user}
            navigate={navigate}
            role={role}
          />
        );
      case "transactions":
        return (
          <TransactionsPage
            transactions={
              role === "buyer" ? myBuyerTransactions : myTransactions
            }
          />
        );
      case "learn":
        return <LearnPage role={role} navigate={navigate} />;
      case "settings":
        return <SettingsPage user={user} setUser={setUser} />;
      default:
        return (
          <div className="page">
            <h2>Página não encontrada</h2>
          </div>
        );
    }
  };

  return (
    <div className={"app-shell" + (sidebarOpen ? "" : " sidebar-hidden")}>
      <Sidebar route={route} navigate={navigate} role={role} />
      <div className="main">
        <Topbar
          user={user}
          role={role}
          setRole={setRole}
          navigate={navigate}
          route={route}
          wallet={wallet}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
        />
        {renderPage()}
      </div>
    </div>
  );
}
