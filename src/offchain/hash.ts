import { keccak_256 } from "@noble/hashes/sha3";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils";
import { stableStringify } from "@/offchain/stableStringify";

export function hashStableJson(value: Parameters<typeof stableStringify>[0]) {
  const stableJson = stableStringify(value);

  return `0x${bytesToHex(keccak_256(utf8ToBytes(stableJson)))}`;
}
