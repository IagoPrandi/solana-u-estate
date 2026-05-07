"use client";

import { http } from "viem";
import { createConfig } from "wagmi";
import { sepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";

const chainId = process.env.NEXT_PUBLIC_CHAIN_ID;
const sepoliaRpcUrl = process.env.NEXT_PUBLIC_RPC_URL;

if (!chainId) {
  throw new Error("NEXT_PUBLIC_CHAIN_ID is required to start frontend runtime.");
}

if (Number(chainId) !== sepolia.id) {
  throw new Error(`NEXT_PUBLIC_CHAIN_ID must be ${sepolia.id} for Milestone 0.1.`);
}

if (!sepoliaRpcUrl) {
  throw new Error(
    "NEXT_PUBLIC_RPC_URL is required to start frontend runtime.",
  );
}

export const wagmiConfig = createConfig({
  chains: [sepolia],
  connectors: [injected()],
  transports: {
    [sepolia.id]: http(sepoliaRpcUrl),
  },
});
