import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as core from "./schema-core";
import * as accounting from "./schema-accounting";
import * as travel from "./schema-travel";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Add it to your .env.local file.");
}

// One shared connection pool per server instance.
const client = postgres(connectionString, { max: 10 });

export const db = drizzle(client, {
  schema: { ...core, ...accounting, ...travel },
});

export * from "./schema-core";
export * from "./schema-accounting";
export * from "./schema-travel";
