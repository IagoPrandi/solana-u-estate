import { storedSolAmountToNumber } from "./amounts";
import type { Property } from "./types";

export type WalletHolding = {
  property: Property;
  buyerWallet: string;
  units: number;
  costEth: number;
  acquiredAt: string;
  lastPurchaseTxHash: string;
};

export function hasWalletHolding(
  property: Property,
  walletAddress: string | undefined,
) {
  const wallet = walletAddress?.toLowerCase();
  if (!wallet) return false;
  return Boolean(
    property.buyerBalances?.some(
      (balance) => balance.buyerWallet.toLowerCase() === wallet,
    ),
  );
}

export function getWalletHoldings(
  properties: Property[],
  walletAddress: string | undefined,
): WalletHolding[] {
  const wallet = walletAddress?.toLowerCase();
  if (!wallet) return [];

  return properties.flatMap((property) =>
    (property.buyerBalances ?? [])
      .filter((balance) => balance.buyerWallet.toLowerCase() === wallet)
      .map((balance) => ({
        property,
        buyerWallet: balance.buyerWallet,
        units: Number(balance.freeValueUnits),
        costEth: storedSolAmountToNumber(balance.totalPaidWei),
        acquiredAt: balance.acquiredAt,
        lastPurchaseTxHash: balance.lastPurchaseTxHash,
      })),
  );
}

export function getWalletHoldingForProperty(
  property: Property | undefined,
  walletAddress: string | undefined,
) {
  if (!property) return undefined;
  const wallet = walletAddress?.toLowerCase();
  if (!wallet) return undefined;
  const balance = property.buyerBalances?.find(
    (entry) => entry.buyerWallet.toLowerCase() === wallet,
  );
  if (!balance) return undefined;
  return {
    property,
    buyerWallet: balance.buyerWallet,
    units: Number(balance.freeValueUnits),
    costEth: storedSolAmountToNumber(balance.totalPaidWei),
    acquiredAt: balance.acquiredAt,
    lastPurchaseTxHash: balance.lastPurchaseTxHash,
  };
}
