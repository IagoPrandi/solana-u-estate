import { PublicKey } from "@solana/web3.js";

export const solanaCluster =
  process.env.NEXT_PUBLIC_SOLANA_CLUSTER?.trim() || "devnet";

export const solanaRpcUrl =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL?.trim() ||
  "https://api.devnet.solana.com";

export const usufructProgramId = parseOptionalPublicKey(
  process.env.NEXT_PUBLIC_USUFRUCT_PROGRAM_ID,
);

export function parseOptionalPublicKey(value: string | undefined) {
  if (!value?.trim()) return undefined;

  try {
    return new PublicKey(value.trim());
  } catch {
    throw new Error(
      "NEXT_PUBLIC_USUFRUCT_PROGRAM_ID must be a valid Solana public key.",
    );
  }
}

export function isSolanaPublicKey(value: string) {
  try {
    new PublicKey(value.trim());
    return true;
  } catch {
    return false;
  }
}

export function isSolanaSignature(value: string) {
  return /^[1-9A-HJ-NP-Za-km-z]{64,88}$/.test(value.trim());
}
