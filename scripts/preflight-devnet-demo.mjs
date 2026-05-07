import fs from "node:fs";
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import {
  assertDevnetOnly,
  loadEnvFiles,
  repoRootFromScript,
  resolveProgramIdEnv,
} from "./devnet-demo-utils.mjs";

const rootDir = repoRootFromScript(import.meta.url);
loadEnvFiles(rootDir, [".env.deploy", ".env.app"]);
assertDevnetOnly();

const rpcUrl =
  process.env.ANCHOR_PROVIDER_URL ||
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
  process.env.SOLANA_RPC_URL ||
  "https://api.devnet.solana.com";
const resolvedProgramId = resolveProgramIdEnv();
const minimumLamports = BigInt(process.env.DEVNET_DEMO_MIN_BALANCE_LAMPORTS || "0");

const connection = new Connection(rpcUrl, "confirmed");
const program = new PublicKey(resolvedProgramId);
const programAccount = await connection.getAccountInfo(program, "confirmed");

if (!programAccount?.executable) {
  throw new Error(`Program ${program.toBase58()} is not executable on Devnet.`);
}

console.log(`[OK] RPC: ${rpcUrl}`);
console.log(`[OK] Program executable: ${program.toBase58()}`);

const wallets = [];
addWallet("DEMO_SELLER_ADDRESS", process.env.DEMO_SELLER_ADDRESS);
addWallet("DEMO_BUYER_ADDRESS", process.env.DEMO_BUYER_ADDRESS);
addKeypairWallet("ANCHOR_WALLET", process.env.ANCHOR_WALLET);

for (const wallet of wallets) {
  const lamports = BigInt(await connection.getBalance(wallet.publicKey, "confirmed"));
  const sol = Number(lamports) / LAMPORTS_PER_SOL;
  const ok = lamports >= minimumLamports;
  console.log(
    `${ok ? "[OK]" : "[FAIL]"} ${wallet.label}: ${wallet.publicKey.toBase58()} balance ${sol.toFixed(6)} SOL`,
  );
  if (!ok) {
    throw new Error(`${wallet.label} balance is below DEVNET_DEMO_MIN_BALANCE_LAMPORTS.`);
  }
}

console.log("[OK] Devnet demo preflight passed.");

function addWallet(label, value) {
  if (!value) return;
  wallets.push({ label, publicKey: new PublicKey(value) });
}

function addKeypairWallet(label, value) {
  if (!value || !fs.existsSync(value)) return;
  const secret = JSON.parse(fs.readFileSync(value, "utf8"));
  const keypair = Keypair.fromSecretKey(Uint8Array.from(secret));
  wallets.push({ label, publicKey: keypair.publicKey });
}
