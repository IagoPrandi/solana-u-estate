import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function loadEnvFiles(rootDir, filenames) {
  for (const filename of filenames) {
    const filePath = path.join(rootDir, filename);
    if (!fs.existsSync(filePath)) continue;

    const content = fs.readFileSync(filePath, "utf8");
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      const value = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = value;
    }
  }
}

export function assertDevnetOnly() {
  const cluster = (
    process.env.SOLANA_CLUSTER ||
    process.env.NEXT_PUBLIC_SOLANA_CLUSTER ||
    ""
  ).toLowerCase();
  const rpc = (
    process.env.ANCHOR_PROVIDER_URL ||
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
    process.env.SOLANA_RPC_URL ||
    ""
  ).toLowerCase();

  if (cluster.includes("mainnet") || rpc.includes("mainnet")) {
    throw new Error("Refusing to run demo tooling against Mainnet.");
  }
  if (!cluster.includes("devnet") && !rpc.includes("devnet")) {
    throw new Error("Devnet demo tooling requires a Devnet cluster or RPC URL.");
  }
}

export function repoRootFromScript(scriptUrl) {
  return path.resolve(path.dirname(fileURLToPath(scriptUrl)), "..");
}

export function resolveDbPath(rootDir) {
  const rawPath = process.env.LOCAL_DB_PATH || path.join("offchain-db", "db.json");
  const normalized = rawPath.replaceAll("\\", "/");

  if (normalized === "/app" || normalized.startsWith("/app/")) {
    return path.resolve(rootDir, normalized.replace(/^\/app\/?/, ""));
  }

  return path.resolve(rootDir, rawPath);
}

export function resolveProgramIdEnv() {
  const programId =
    process.env.NEXT_PUBLIC_USUFRUCT_PROGRAM_ID || process.env.USUFRUCT_PROGRAM_ID;

  if (!programId) {
    throw new Error("NEXT_PUBLIC_USUFRUCT_PROGRAM_ID is required for demo preflight.");
  }

  return programId;
}
