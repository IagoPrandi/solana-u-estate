import fs from "node:fs";
import path from "node:path";
import {
  assertDevnetOnly,
  loadEnvFiles,
  repoRootFromScript,
  resolveDbPath,
} from "./devnet-demo-utils.mjs";

const rootDir = repoRootFromScript(import.meta.url);
loadEnvFiles(rootDir, [".env.deploy", ".env.app"]);
assertDevnetOnly();

const dbPath = resolveDbPath(rootDir);
const appBaseUrl = process.env.DEVNET_DEMO_APP_BASE_URL || "http://127.0.0.1:3002";

if (fs.existsSync(dbPath)) {
  const backupPath = `${dbPath}.${new Date().toISOString().replace(/[:.]/g, "-")}.bak`;
  fs.mkdirSync(path.dirname(backupPath), { recursive: true });
  fs.copyFileSync(dbPath, backupPath);
  console.log(`[OK] Backed up lowdb to ${backupPath}`);
} else {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  console.log("[OK] No lowdb file found; nothing to back up.");
}

const response = await fetch(`${appBaseUrl}/api/properties/demo-simulation`, {
  method: "POST",
  headers: { Accept: "application/json" },
});

const body = await response.json().catch(() => null);
if (!response.ok) {
  throw new Error(
    `Demo reset failed with HTTP ${response.status}: ${JSON.stringify(body)}`,
  );
}

console.log(`[OK] Seeded local guided demo through ${appBaseUrl}`);
console.log("[OK] No keypair or deploy artifact was deleted.");
console.log("[INFO] Local simulation is not on-chain acceptance.");
