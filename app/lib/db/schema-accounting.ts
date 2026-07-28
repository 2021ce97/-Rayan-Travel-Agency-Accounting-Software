import {
  pgTable,
  bigserial,
  bigint,
  varchar,
  text,
  boolean,
  timestamp,
  numeric,
  date,
  unique,
} from "drizzle-orm/pg-core";
import { agencies, branches, users, customers, suppliers, airlines, consultants, currencies } from "./schema-core";

export const accountGroups = pgTable("account_groups", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  agencyId: bigint("agency_id", { mode: "number" }).notNull().references(() => agencies.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 150 }).notNull(),
  parentId: bigint("parent_id", { mode: "number" }),
  groupType: varchar("group_type", { length: 30 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const chartOfAccounts = pgTable("chart_of_accounts", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  agencyId: bigint("agency_id", { mode: "number" }).notNull().references(() => agencies.id, { onDelete: "cascade" }),
  accountCode: varchar("account_code", { length: 30 }).notNull(),
  accountName: varchar("account_name", { length: 200 }).notNull(),
  groupId: bigint("group_id", { mode: "number" }).notNull().references(() => accountGroups.id),
  parentAccountId: bigint("parent_account_id", { mode: "number" }),
  accountType: varchar("account_type", { length: 30 }).notNull(),
  openingBalance: numeric("opening_balance", { precision: 18, scale: 2 }).notNull().default("0"),
  balanceType: varchar("balance_type", { length: 10 }).notNull().default("debit"),
  isSystem: boolean("is_system").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  agencyCodeUnique: unique().on(t.agencyId, t.accountCode),
}));

export const vouchers = pgTable("vouchers", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  agencyId: bigint("agency_id", { mode: "number" }).notNull().references(() => agencies.id, { onDelete: "cascade" }),
  branchId: bigint("branch_id", { mode: "number" }).references(() => branches.id),
  voucherNo: varchar("voucher_no", { length: 50 }).notNull(),
  voucherType: varchar("voucher_type", { length: 30 }).notNull(),
  voucherDate: date("voucher_date").notNull(),
  referenceNo: varchar("reference_no", { length: 100 }),
  customerId: bigint("customer_id", { mode: "number" }).references(() => customers.id),
  supplierId: bigint("supplier_id", { mode: "number" }).references(() => suppliers.id),
  airlineId: bigint("airline_id", { mode: "number" }).references(() => airlines.id),
  consultantId: bigint("consultant_id", { mode: "number" }).references(() => consultants.id),
  currencyId: bigint("currency_id", { mode: "number" }).references(() => currencies.id),
  exchangeRate: numeric("exchange_rate", { precision: 18, scale: 6 }).notNull().default("1"),
  totalAmount: numeric("total_amount", { precision: 18, scale: 2 }).notNull().default("0"),
  totalCost: numeric("total_cost", { precision: 18, scale: 2 }).notNull().default("0"),
  totalProfit: numeric("total_profit", { precision: 18, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  status: varchar("status", { length: 20 }).notNull().default("draft"),
  isVoided: boolean("is_voided").notNull().default(false),
  createdBy: bigint("created_by", { mode: "number" }).references(() => users.id),
  approvedBy: bigint("approved_by", { mode: "number" }).references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (t) => ({
  agencyVoucherNoUnique: unique().on(t.agencyId, t.voucherNo),
}));

export const voucherLines = pgTable("voucher_lines", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  voucherId: bigint("voucher_id", { mode: "number" }).notNull().references(() => vouchers.id, { onDelete: "cascade" }),
  accountId: bigint("account_id", { mode: "number" }).notNull().references(() => chartOfAccounts.id),
  lineType: varchar("line_type", { length: 30 }).notNull(),
  description: text("description"),
  debitAmount: numeric("debit_amount", { precision: 18, scale: 2 }).notNull().default("0"),
  creditAmount: numeric("credit_amount", { precision: 18, scale: 2 }).notNull().default("0"),
  taxAmount: numeric("tax_amount", { precision: 18, scale: 2 }).notNull().default("0"),
  commissionAmount: numeric("commission_amount", { precision: 18, scale: 2 }).notNull().default("0"),
  costAmount: numeric("cost_amount", { precision: 18, scale: 2 }).notNull().default("0"),
  profitAmount: numeric("profit_amount", { precision: 18, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
