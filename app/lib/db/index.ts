import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as core from "./schema-core";
import * as accounting from "./schema-accounting";
import * as travel from "./schema-travel";

declare global {
  // Keep a single Postgres client alive across hot reloads in dev.
  var __postgresClient: ReturnType<typeof postgres> | undefined;
}

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!connectionString) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL or POSTGRES_URL environment variable is required in production.");
  }
  console.warn("DATABASE_URL not set; falling back to localhost PostgreSQL at 127.0.0.1:5432.");
}

const resolvedConnectionString = connectionString || "postgresql://postgres:postgres@127.0.0.1:5432/postgres";
const usesSsl = resolvedConnectionString.includes("supabase.co") || resolvedConnectionString.includes("pooler.supabase.com");
const usesPooler = resolvedConnectionString.includes("pooler.supabase.com");

// One shared connection pool per server instance.
const client = globalThis.__postgresClient ?? postgres(resolvedConnectionString, {
  max: 10,
  ssl: usesSsl ? "require" : false,
  prepare: !usesPooler,
});

if (!globalThis.__postgresClient) {
  globalThis.__postgresClient = client;
}

export const db = drizzle(client, {
  schema: { ...core, ...accounting, ...travel },
});

export * from "./schema-core";
export * from "./schema-accounting";
export * from "./schema-travel";
