"use client";

import { useMemo } from "react";
import {
  useAccount,
  useBalance,
  useConnect,
  useDisconnect,
  useSwitchChain,
} from "wagmi";
import { sepolia } from "wagmi/chains";
import { formatUnitsSafe } from "@/lib/safe-decimal";
import { propertyRegistryAddress } from "@/lib/contracts/property-registry";
import { truncate } from "./data";
import { IconNetwork } from "./icons";

export type WalletState = ReturnType<typeof useWallet>;

export function useWallet() {
  const { address, chainId, isConnected } = useAccount();
  const { connectors, connectAsync, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain();
  const { data: balance } = useBalance({
    address,
    chainId: sepolia.id,
    query: { enabled: Boolean(address) },
  });

  const injectedConnector = useMemo(
    () => connectors.find((c) => c.type === "injected"),
    [connectors],
  );

  const connect = async () => {
    if (!injectedConnector) return;
    await connectAsync({ connector: injectedConnector });
  };

  const switchToSepolia = async () => {
    await switchChainAsync({ chainId: sepolia.id });
  };

  const onSepolia = chainId === sepolia.id;
  const onchainEnabled = Boolean(propertyRegistryAddress);

  return {
    address,
    chainId,
    isConnected,
    onSepolia,
    onchainEnabled,
    canTransact: Boolean(address && isConnected && onSepolia && onchainEnabled),
    balance: balance
      ? `${formatUnitsSafe(balance.value, 18, 4)} ETH`
      : null,
    connect,
    disconnect,
    switchToSepolia,
    isConnecting,
    isSwitching,
    hasInjected: Boolean(injectedConnector),
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
          ? "Conectando…"
          : wallet.hasInjected
            ? "Conectar carteira"
            : "Sem carteira detectada"}
      </button>
    );
  }

  if (!wallet.onSepolia) {
    return (
      <button
        className="btn btn-neutral btn-sm"
        onClick={() => {
          void wallet.switchToSepolia();
        }}
        disabled={wallet.isSwitching}
        title="A carteira precisa estar na rede Sepolia"
      >
        <IconNetwork size={14} />{" "}
        {wallet.isSwitching ? "Trocando…" : "Trocar para Sepolia"}
      </button>
    );
  }

  return (
    <div className="wallet-chip" onClick={() => wallet.disconnect()} title="Desconectar carteira">
      <div className="wallet-chip-avatar" />
      <div>
        <div style={{ fontSize: 12, lineHeight: 1.1, fontWeight: 700 }}>
          {wallet.balance ?? "Sepolia"}
        </div>
        <div className="wallet-chip-mono">{truncate(wallet.address)}</div>
      </div>
    </div>
  );
}
