"use client";

import { useMemo } from "react";
import type { Address } from "viem";
import {
  useAccount,
  useBalance,
  useBlockNumber,
  useConnect,
  useDisconnect,
  useReadContract,
  useSwitchChain,
} from "wagmi";
import { sepolia } from "wagmi/chains";
import { formatUnitsSafe } from "@/lib/safe-decimal";

const contractReadSmokeTestAddress =
  process.env.NEXT_PUBLIC_CONTRACT_READ_SMOKE_TEST_ADDRESS as Address | undefined;

const chainlinkFeedAbi = [
  {
    type: "function",
    stateMutability: "view",
    name: "decimals",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "latestRoundData",
    inputs: [],
    outputs: [
      { name: "roundId", type: "uint80" },
      { name: "answer", type: "int256" },
      { name: "startedAt", type: "uint256" },
      { name: "updatedAt", type: "uint256" },
      { name: "answeredInRound", type: "uint80" },
    ],
  },
] as const;

export function WalletPanel() {
  const { address, chainId, isConnected } = useAccount();
  const { connectors, connectAsync, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChainAsync, isPending: isSwitchingChain } = useSwitchChain();
  const { data: balance } = useBalance({
    address,
    chainId: sepolia.id,
    query: {
      enabled: Boolean(address),
    },
  });
  const { data: blockNumber } = useBlockNumber({
    chainId: sepolia.id,
    watch: true,
  });
  const { data: smokeFeedDecimals } = useReadContract({
    address: contractReadSmokeTestAddress,
    abi: chainlinkFeedAbi,
    functionName: "decimals",
    chainId: sepolia.id,
    query: {
      enabled: Boolean(contractReadSmokeTestAddress),
    },
  });
  const { data: smokeFeedRound } = useReadContract({
    address: contractReadSmokeTestAddress,
    abi: chainlinkFeedAbi,
    functionName: "latestRoundData",
    chainId: sepolia.id,
    query: {
      enabled: Boolean(contractReadSmokeTestAddress),
      refetchInterval: 60_000,
    },
  });

  const injectedConnector = useMemo(
    () => connectors.find((connector) => connector.type === "injected"),
    [connectors],
  );

  const isOnSepolia = chainId === sepolia.id;
  const balanceLabel = balance
    ? `${formatUnitsSafe(balance.value, 18, 4)} ETH`
    : "Connect wallet";
  const smokeTestLabel =
    smokeFeedRound && smokeFeedDecimals !== undefined
      ? `${formatUnitsSafe(smokeFeedRound[1], smokeFeedDecimals, 2)} USD`
      : contractReadSmokeTestAddress
        ? "Reading contract"
        : "Smoke test address missing";

  return (
    <aside className="rounded-[1.75rem] border border-line bg-white/76 p-6 shadow-[0_18px_50px_rgba(28,34,33,0.08)]">
      <p className="soft-label">Wallet and chain</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-[-0.02em]">
        Frontend Web3 baseline
      </h2>

      <div className="mt-6 space-y-4">
        <Metric
          label="Sepolia RPC status"
          value={blockNumber ? `Live at block ${blockNumber}` : "Connecting"}
        />
        <Metric
          label="Wallet connection"
          value={isConnected && address ? shorten(address) : "Disconnected"}
        />
        <Metric
          label="Sepolia balance"
          value={balanceLabel}
        />
        <Metric
          label="Detected chain"
          value={chainId ? `${chainId}` : "No wallet chain yet"}
        />
        <Metric
          label="Contract read smoke test"
          value={smokeTestLabel}
        />
      </div>

      <div className="mt-6 flex flex-col gap-3">
        {isConnected ? (
          <>
            {!isOnSepolia ? (
              <button
                type="button"
                onClick={() => {
                  void switchChainAsync({ chainId: sepolia.id });
                }}
                disabled={isSwitchingChain}
                className="inline-flex items-center justify-center rounded-full border border-accent/20 bg-accent/10 px-4 py-3 text-sm font-semibold text-accent transition hover:bg-accent/15 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSwitchingChain ? "Switching..." : "Switch to Sepolia"}
              </button>
            ) : (
              <div className="rounded-2xl border border-accent/20 bg-accent/10 px-4 py-3 text-sm text-accent">
                The connected wallet is already on Sepolia.
              </div>
            )}

            <button
              type="button"
              onClick={() => disconnect()}
              className="inline-flex items-center justify-center rounded-full border border-line bg-white px-4 py-3 text-sm font-semibold text-foreground transition hover:border-foreground/30"
            >
              Disconnect wallet
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => {
              if (injectedConnector) {
                void connectAsync({ connector: injectedConnector });
              }
            }}
            disabled={!injectedConnector || isPending}
            className="inline-flex items-center justify-center rounded-full bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Connecting..." : "Connect browser wallet"}
          </button>
        )}
      </div>

      <div className="mt-6 rounded-3xl border border-dashed border-line bg-white/60 p-4 text-sm leading-7 text-muted">
        On-chain reads active through wagmi + viem. Panel watches latest
        Sepolia block, wallet balance, contract read against Chainlink
        ETH/USD feed on Sepolia.
      </div>
    </aside>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-line bg-white/80 p-4">
      <p className="soft-label">{label}</p>
      <p className="mt-2 text-base font-semibold text-foreground">{value}</p>
    </div>
  );
}

function shorten(value: string) {
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}
