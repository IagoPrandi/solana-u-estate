import { keccak256, toBytes } from "viem";
import { stableStringify } from "@/offchain/stableStringify";

export function hashStableJson(value: Parameters<typeof stableStringify>[0]) {
  const stableJson = stableStringify(value);

  return keccak256(toBytes(stableJson));
}
