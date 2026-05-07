/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const path = require("node:path");
const bs58 = require("bs58");
const { Keypair } = require("@solana/web3.js");

const secret = fs.readFileSync(0, "utf8").trim();
const outPath = process.argv[2];
const decode = bs58.default?.decode ?? bs58.decode;
const raw = Uint8Array.from(decode(secret));

let keypair;
if (raw.length === 64) {
  keypair = Keypair.fromSecretKey(raw);
} else if (raw.length === 32) {
  keypair = Keypair.fromSeed(raw);
} else {
  throw new Error(`Expected 32-byte seed or 64-byte secret key, got ${raw.length} bytes.`);
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(Array.from(keypair.secretKey)), { mode: 0o600 });
console.log(`Imported deployer public key: ${keypair.publicKey.toBase58()}`);
