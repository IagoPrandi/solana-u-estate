import "server-only";

import { mkdir } from "node:fs/promises";
import path from "node:path";
import { JSONFilePreset } from "lowdb/node";
import type { OffchainDatabase } from "@/offchain/schemas";

let dbPromise: ReturnType<typeof createDatabase> | undefined;

const defaultDatabase: OffchainDatabase = {
  properties: [],
  solanaTransactions: [],
  fiatRatesCache: {
    provider: "okx",
    base: "SOL",
    routes: {},
    rates: {},
    unavailable: [],
    optionalRates: {
      eur: null,
      jpy: null,
    },
    updatedAt: null,
  },
};

async function createDatabase() {
  const databasePath =
    process.env.LOCAL_DB_PATH ??
    path.join(process.cwd(), "offchain-db", "db.json");

  await mkdir(path.dirname(databasePath), { recursive: true });

  const db = await JSONFilePreset<OffchainDatabase>(
    databasePath,
    structuredClone(defaultDatabase),
  );
  const originalWrite = db.write.bind(db);
  let writeChain = Promise.resolve();

  db.write = () => {
    const nextWrite = writeChain.then(() => originalWrite());
    writeChain = nextWrite.catch(() => undefined);
    return nextWrite;
  };

  db.data.properties ??= [];
  db.data.solanaTransactions ??= [];
  db.data.fiatRatesCache ??= structuredClone(defaultDatabase.fiatRatesCache);
  await db.write();

  return db;
}

export function getDb() {
  dbPromise ??= createDatabase();

  return dbPromise;
}

export function resetDbForTests() {
  dbPromise = undefined;
}
