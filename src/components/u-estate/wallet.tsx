"use client";

import {
  useConnection,
  useWallet as useSolanaWallet,
} from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useEffect, useState } from "react";
import { solanaCluster, usufructProgramId } from "@/lib/solana/config";
import { truncate } from "./data";
import { IconNetwork } from "./icons";

export type WalletState = ReturnType<typeof useWallet>;

export function useWallet() {
  const { connection } = useConnection();
  const wallet = useSolanaWallet();
  const [balance, setBalance] = useState<string | null>(null);
  const address = wallet.publicKey?.toBase58();
  const onDevnet = solanaCluster === "devnet";

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
    if (!wallet.wallet) return;
    await wallet.connect();
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
    hasInjected: wallet.wallets.length > 0,
  };
}

export function WalletChip({ wallet }: { wallet: WalletState }) {
  if (!wallet.isConnected || !wallet.address) {
    return (
      <button
        className="btn btn-primary btn-sm"
        onClick={() => {
          void wallet.connect();
        }}
        disabled={!wallet.hasInjected || wallet.isConnecting}
      >
        {wallet.isConnecting
          ? "Connecting..."
          : wallet.hasInjected
            ? "Connect wallet"
            : "No wallet detected"}
      </button>
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
