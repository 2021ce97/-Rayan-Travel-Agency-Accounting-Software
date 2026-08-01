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

// Supabase Transaction Pooler (port 6543) handles many serverless connections efficiently.
// Session Pooler (port 5432) has a hard cap of 15 concurrent sessions — avoid it in production.
const usesTransactionPooler = resolvedConnectionString.includes(":6543");
const usesSessionPooler = resolvedConnectionString.includes("pooler.supabase.com") && !usesTransactionPooler;

// In serverless (Vercel), each function is a new process — the global singleton helps in
// local dev hot-reloads only. Keep pool size small to avoid exhausting Supabase limits.
const client = globalThis.__postgresClient ?? postgres(resolvedConnectionString, {
  // Transaction pooler: 1 connection per invocation is ideal for serverless.
  // Session pooler / direct: cap at 3 to stay well below the 15-session limit.
  max: usesTransactionPooler ? 1 : 3,
  ssl: usesSsl ? "require" : false,
  // Prepared statements are NOT supported in pooler mode (both session and transaction).
  prepare: !usesSessionPooler && !usesTransactionPooler,
  // Terminate idle connections quickly so they don't pile up.
  idle_timeout: 20,
  max_lifetime: 60 * 10, // 10 minutes
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
