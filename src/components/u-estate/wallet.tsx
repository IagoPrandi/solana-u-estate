"use client";

import {
  useConnection,
  useWallet as useSolanaWallet,
} from "@solana/wallet-adapter-react";
import type { WalletName } from "@solana/wallet-adapter-base";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useEffect, useState } from "react";
import { solanaCluster, usufructProgramId } from "@/lib/solana/config";
import { truncate } from "./data";
import { IconNetwork } from "./icons";

export type WalletState = ReturnType<typeof useWallet>;

type AvailableWallet = {
  name: WalletName;
  icon: string;
  readyState: string;
};

export function useWallet() {
  const { connection } = useConnection();
  const wallet = useSolanaWallet();
  const [balance, setBalance] = useState<string | null>(null);
  const address = wallet.publicKey?.toBase58();
  const onDevnet = solanaCluster === "devnet";
  const availableWallets: AvailableWallet[] = wallet.wallets
    .filter((entry) => String(entry.readyState) !== "Unsupported")
    .map((entry) => ({
      name: entry.adapter.name,
      icon: entry.adapter.icon,
      readyState: String(entry.readyState),
    }));
  const selectedWalletName: WalletName | null = wallet.wallet?.adapter.name ?? null;

  useEffect(() => {
    let cancelled = false;

    async function loadBalance() {
      if (!wallet.publicKey) {
        setBalance(null);
        return;
      }

      const lamports = await connection.getBalance(wallet.publicKey, "confirmed");
      if (!cancelled) {
        setBalance(`${(lamports / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
      }
    }

    void loadBalance().catch(() => {
      if (!cancelled) setBalance(null);
    });

    return () => {
      cancelled = true;
    };
  }, [connection, wallet.publicKey]);

  const connect = async () => {
    if (!wallet.wallet) {
      throw new Error("Select a wallet before connecting.");
    }
    await wallet.connect();
  };

  const selectWallet = (walletName: WalletName) => {
    wallet.select(walletName);
  };

  const switchToDevnet = async () => {
    throw new Error("Network switching is handled by the Solana wallet adapter.");
  };

  const onchainEnabled = Boolean(usufructProgramId);

  return {
    address,
    chainId: solanaCluster,
    isConnected: wallet.connected,
    onDevnet,
    onchainEnabled,
    canTransact: Boolean(address && wallet.connected && onDevnet && onchainEnabled),
    balance,
    connect,
    disconnect: wallet.disconnect,
    switchToDevnet,
    isConnecting: wallet.connecting,
    isSwitching: false,
    hasInjected: availableWallets.length > 0,
    availableWallets,
    selectedWalletName,
    selectWallet,
  };
}

export function WalletChip({ wallet }: { wallet: WalletState }) {
  if (!wallet.isConnected || !wallet.address) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {wallet.hasInjected && (
          <label className="sr-only" htmlFor="wallet-selector">
            Wallet selector
          </label>
        )}
        {wallet.hasInjected && (
          <select
            id="wallet-selector"
            className="input"
            value={wallet.selectedWalletName ?? ""}
            onChange={(event) => {
              const selectedWallet = wallet.availableWallets.find(
                (availableWallet) => availableWallet.name === event.target.value,
              );
              if (selectedWallet) {
                wallet.selectWallet(selectedWallet.name);
              }
            }}
            style={{ minWidth: 180, height: 36, padding: "0 12px" }}
          >
            <option value="" disabled>
              Select wallet
            </option>
            {wallet.availableWallets.map((availableWallet) => (
              <option key={availableWallet.name} value={availableWallet.name}>
                {availableWallet.name}
              </option>
            ))}
          </select>
        )}
        <button
          className="btn btn-primary btn-sm"
          onClick={() => {
            void wallet.connect();
          }}
          disabled={
            !wallet.hasInjected || !wallet.selectedWalletName || wallet.isConnecting
          }
          title={wallet.hasInjected ? "Connect selected wallet" : "No Solana wallet detected in this browser"}
        >
          {wallet.isConnecting
            ? "Connecting..."
            : wallet.hasInjected
              ? "Connect wallet"
              : "No wallet detected"}
        </button>
      </div>
    );
  }

  if (!wallet.onDevnet) {
    return (
      <button
        className="btn btn-neutral btn-sm"
        onClick={() => {
          void wallet.switchToDevnet();
        }}
        disabled={wallet.isSwitching}
        title="Wallet must use Solana Devnet"
      >
        <IconNetwork size={14} />{" "}
        {wallet.isSwitching ? "Switching..." : "Use Solana Devnet"}
      </button>
    );
  }

  return (
    <div
      className="wallet-chip"
      onClick={() => wallet.disconnect()}
      title="Disconnect wallet"
    >
      <div className="wallet-chip-avatar" />
      <div>
        <div style={{ fontSize: 12, lineHeight: 1.1, fontWeight: 700 }}>
          {wallet.balance ?? "Solana Devnet"}
        </div>
        <div className="wallet-chip-mono">{truncate(wallet.address)}</div>
      </div>
    </div>
  );
}
