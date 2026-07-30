import { config } from "dotenv";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const appDir = join(rootDir, "app");

for (const envFile of [join(appDir, ".env.local"), join(appDir, ".env")]) {
  if (existsSync(envFile)) {
    config({ path: envFile, override: false, quiet: true });
  }
}

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Add it to app/.env.local first.");
}

const sql = postgres(connectionString, {
  max: 1,
  ssl: connectionString.includes("supabase.co") || connectionString.includes("pooler.supabase.com") ? "require" : false,
  prepare: !connectionString.includes("pooler.supabase.com"),
});

try {
  const [{ exists }] = await sql`
    select to_regclass('public.agencies') is not null as exists
  `;

  if (exists) {
    // Older installations may have been created before later application
    // columns were introduced. Migration 006 is idempotent and keeps those
    // databases compatible without replaying the original CREATE TABLE files.
    const upgradePath = join(rootDir, "db", "migrations", "006_upgrade_existing_databases.sql");
    if (existsSync(upgradePath)) {
      console.log("Applying compatibility upgrade...");
      await sql.unsafe(readFileSync(upgradePath, "utf8"));
      console.log("Compatibility upgrade applied successfully.");
    } else {
      console.log("Database schema already exists; no compatibility upgrade found.");
    }
  } else {
    const migrationsDir = join(rootDir, "db", "migrations");
    const migrationFiles = readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".sql"))
      .sort();

    for (const file of migrationFiles) {
      const filePath = join(migrationsDir, file);
      console.log(`Applying ${file}...`);
      await sql.unsafe(readFileSync(filePath, "utf8"));
    }

    console.log("Migrations applied successfully.");
  }
} finally {
  await sql.end();
}
