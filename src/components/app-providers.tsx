"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useCallback, useState } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import type { Adapter, WalletError } from "@solana/wallet-adapter-base";
import { clusterApiUrl } from "@solana/web3.js";
import { LanguageProvider } from "@/components/u-estate/i18n";

type AppProvidersProps = {
  children: ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  const [queryClient] = useState(() => new QueryClient());
  const endpoint =
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL?.trim() || clusterApiUrl("devnet");
  const handleWalletError = useCallback(
    (error: WalletError, adapter?: Adapter) => {
      if (error.name === "WalletDisconnectedError") {
        return;
      }

      console.error(error, adapter);
    },
    [],
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={[]} autoConnect onError={handleWalletError}>
        <QueryClientProvider client={queryClient}>
          <LanguageProvider>{children}</LanguageProvider>
        </QueryClientProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
