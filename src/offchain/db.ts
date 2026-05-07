import "server-only";

import { mkdir } from "node:fs/promises";
import path from "node:path";
import { JSONFilePreset } from "lowdb/node";
import type { OffchainDatabase } from "@/offchain/schemas";

let dbPromise: ReturnType<typeof createDatabase> | undefined;

const defaultDatabase: OffchainDatabase = {
  properties: [],
  fiatRatesCache: {
    provider: "okx",
    base: "ETH",
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

  db.data.properties ??= [];
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
