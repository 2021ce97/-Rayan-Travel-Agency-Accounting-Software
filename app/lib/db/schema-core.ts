import {
  pgTable,
  bigserial,
  bigint,
  varchar,
  text,
  boolean,
  timestamp,
  numeric,
  jsonb,
  date,
  unique,
} from "drizzle-orm/pg-core";

export const agencies = pgTable("agencies", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  email: varchar("email", { length: 200 }),
  phone: varchar("phone", { length: 50 }),
  address: text("address"),
  country: varchar("country", { length: 100 }),
  baseCurrency: varchar("base_currency", { length: 10 }).notNull().default("PKR"),
  logoUrl: text("logo_url"),
  plan: varchar("plan", { length: 30 }).notNull().default("trial"),
  planStatus: varchar("plan_status", { length: 20 }).notNull().default("active"),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const roles = pgTable("roles", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  agencyId: bigint("agency_id", { mode: "number" }).references(() => agencies.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 50 }).notNull(),
  description: text("description"),
  permissions: jsonb("permissions").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  agencyNameUnique: unique().on(t.agencyId, t.name),
}));

export const branches = pgTable("branches", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  agencyId: bigint("agency_id", { mode: "number" }).notNull().references(() => agencies.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 150 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  address: text("address"),
  isHeadOffice: boolean("is_head_office").notNull().default(false),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable("users", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  agencyId: bigint("agency_id", { mode: "number" }).notNull().references(() => agencies.id, { onDelete: "cascade" }),
  branchId: bigint("branch_id", { mode: "number" }).references(() => branches.id),
  roleId: bigint("role_id", { mode: "number" }).notNull().references(() => roles.id),
  name: varchar("name", { length: 150 }).notNull(),
  email: varchar("email", { length: 200 }).notNull(),
  passwordHash: text("password_hash").notNull(),
  phone: varchar("phone", { length: 50 }),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  agencyEmailUnique: unique().on(t.agencyId, t.email),
}));

export const countries = pgTable("countries", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  isoCode: varchar("iso_code", { length: 3 }).notNull().unique(),
});

export const cities = pgTable("cities", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  countryId: bigint("country_id", { mode: "number" }).notNull().references(() => countries.id),
  name: varchar("name", { length: 150 }).notNull(),
});

export const currencies = pgTable("currencies", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  code: varchar("code", { length: 10 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  symbol: varchar("symbol", { length: 10 }),
});

export const customers = pgTable("customers", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  agencyId: bigint("agency_id", { mode: "number" }).notNull().references(() => agencies.id, { onDelete: "cascade" }),
  customerCode: varchar("customer_code", { length: 30 }),
  name: varchar("name", { length: 200 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 200 }),
  address: text("address"),
  passportNo: varchar("passport_no", { length: 50 }),
  countryId: bigint("country_id", { mode: "number" }).references(() => countries.id),
  accountId: bigint("account_id", { mode: "number" }),
  openingBalance: numeric("opening_balance", { precision: 18, scale: 2 }).notNull().default("0"),
  balanceType: varchar("balance_type", { length: 10 }).notNull().default("debit"),
  notes: text("notes"),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const suppliers = pgTable("suppliers", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  agencyId: bigint("agency_id", { mode: "number" }).notNull().references(() => agencies.id, { onDelete: "cascade" }),
  supplierCode: varchar("supplier_code", { length: 30 }),
  name: varchar("name", { length: 200 }).notNull(),
  type: varchar("type", { length: 50 }),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 200 }),
  accountId: bigint("account_id", { mode: "number" }),
  openingBalance: numeric("opening_balance", { precision: 18, scale: 2 }).notNull().default("0"),
  balanceType: varchar("balance_type", { length: 10 }).notNull().default("credit"),
  notes: text("notes"),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const airlines = pgTable("airlines", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  agencyId: bigint("agency_id", { mode: "number" }).notNull().references(() => agencies.id, { onDelete: "cascade" }),
  airlineCode: varchar("airline_code", { length: 30 }),
  name: varchar("name", { length: 150 }).notNull(),
  iataCode: varchar("iata_code", { length: 10 }),
  accountId: bigint("account_id", { mode: "number" }),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const consultants = pgTable("consultants", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  agencyId: bigint("agency_id", { mode: "number" }).notNull().references(() => agencies.id, { onDelete: "cascade" }),
  consultantCode: varchar("consultant_code", { length: 30 }),
  name: varchar("name", { length: 150 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 200 }),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const agencyExchangeRates = pgTable("agency_exchange_rates", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  agencyId: bigint("agency_id", { mode: "number" }).notNull().references(() => agencies.id, { onDelete: "cascade" }),
  currencyId: bigint("currency_id", { mode: "number" }).notNull().references(() => currencies.id),
  rateToBase: numeric("rate_to_base", { precision: 18, scale: 6 }).notNull(),
  effectiveDate: date("effective_date").notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  agencyCurrencyDateUnique: unique().on(t.agencyId, t.currencyId, t.effectiveDate),
}));
