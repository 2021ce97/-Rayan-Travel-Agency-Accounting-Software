import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as core from "./schema-core";
import * as accounting from "./schema-accounting";
import * as travel from "./schema-travel";

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || "postgresql://postgres:postgres@127.0.0.1:5432/postgres";
const usesSsl = connectionString.includes("supabase.co") || connectionString.includes("pooler.supabase.com");
const usesPooler = connectionString.includes("pooler.supabase.com");

if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
  console.warn("DATABASE_URL not set; falling back to localhost PostgreSQL at 127.0.0.1:5432.");
}

// One shared connection pool per server instance.
const client = postgres(connectionString, { max: 10, ssl: usesSsl ? "require" : false, prepare: !usesPooler });

export const db = drizzle(client, {
  schema: { ...core, ...accounting, ...travel },
});

export * from "./schema-core";
export * from "./schema-accounting";
export * from "./schema-travel";
