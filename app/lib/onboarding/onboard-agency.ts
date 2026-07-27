import { db, roles, branches, accountGroups, chartOfAccounts } from "@/lib/db";

/**
 * TypeScript port of db/seeds/onboard_new_agency.sql — kept in sync
 * with that file by hand. Run this immediately after inserting a new
 * `agencies` row (see signup action) so a brand-new agency has
 * default roles, a Head Office branch, and the standard chart of
 * accounts every posting engine (ticket/visa/hotel/package/refund)
 * depends on.
 *
 * If you add a new account code to any posting engine in
 * lib/accounting/, add it here AND in the .sql seed — the two must
 * stay in sync, since the .sql version is what onboards agencies
 * created directly via psql (see SETUP_GUIDE.md).
 */

const DEFAULT_ROLES = [
  { name: "owner", description: "Full access to everything", permissions: { "*": true } },
  {
    name: "admin",
    description: "Manage users, vouchers, reports",
    permissions: { "vouchers.*": true, "reports.*": true, "masters.*": true, "users.manage": true },
  },
  {
    name: "accountant",
    description: "Post vouchers and view reports",
    permissions: { "vouchers.*": true, "reports.view": true, "masters.view": true },
  },
  {
    name: "consultant",
    description: "Create vouchers only, no reports",
    permissions: { "vouchers.create": true, "vouchers.view_own": true },
  },
  { name: "viewer", description: "Read-only access", permissions: { "vouchers.view": true, "reports.view": true } },
] as const;

const ACCOUNT_GROUPS = [
  { name: "Current Assets", groupType: "asset" },
  { name: "Current Liabilities", groupType: "liability" },
  { name: "Equity", groupType: "equity" },
  { name: "Income", groupType: "income" },
  { name: "Direct Expenses", groupType: "expense" },
  { name: "Indirect Expenses", groupType: "expense" },
] as const;

// account_code convention: 1xxx assets, 2xxx liabilities, 3xxx equity, 4xxx income, 5xxx expense
const CHART_OF_ACCOUNTS = [
  { code: "1000", name: "Cash in Hand", type: "asset", bal: "debit", group: "Current Assets" },
  { code: "1010", name: "Bank Account", type: "asset", bal: "debit", group: "Current Assets" },
  { code: "1100", name: "Accounts Receivable", type: "asset", bal: "debit", group: "Current Assets" },
  { code: "2000", name: "Accounts Payable", type: "liability", bal: "credit", group: "Current Liabilities" },
  { code: "2100", name: "BSP Payable (IATA)", type: "liability", bal: "credit", group: "Current Liabilities" },
  { code: "3000", name: "Owner's Equity", type: "equity", bal: "credit", group: "Equity" },
  { code: "4000", name: "Ticket Sales Income", type: "income", bal: "credit", group: "Income" },
  { code: "4010", name: "Visa Service Income", type: "income", bal: "credit", group: "Income" },
  { code: "4020", name: "Hotel Booking Income", type: "income", bal: "credit", group: "Income" },
  { code: "4030", name: "Package Sales Income", type: "income", bal: "credit", group: "Income" },
  { code: "4090", name: "Commission Income", type: "income", bal: "credit", group: "Income" },
  { code: "5000", name: "Ticket Purchase Cost", type: "expense", bal: "debit", group: "Direct Expenses" },
  { code: "5010", name: "Visa Purchase Cost", type: "expense", bal: "debit", group: "Direct Expenses" },
  { code: "5020", name: "Hotel Purchase Cost", type: "expense", bal: "debit", group: "Direct Expenses" },
  { code: "5030", name: "Package Purchase Cost", type: "expense", bal: "debit", group: "Direct Expenses" },
  { code: "5100", name: "Refunds & Cancellations", type: "expense", bal: "debit", group: "Indirect Expenses" },
  { code: "5900", name: "Office & Admin Expenses", type: "expense", bal: "debit", group: "Indirect Expenses" },
] as const;

export async function onboardAgency(agencyId: number, tx: typeof db = db) {
  // 1. Default roles
  const insertedRoles = await tx
    .insert(roles)
    .values(DEFAULT_ROLES.map((r) => ({ agencyId, name: r.name, description: r.description, permissions: r.permissions })))
    .returning({ id: roles.id, name: roles.name });

  const ownerRole = insertedRoles.find((r) => r.name === "owner");
  if (!ownerRole) {
    throw new Error("Failed to create owner role during onboarding.");
  }

  // 2. Head office branch
  await tx.insert(branches).values({ agencyId, name: "Head Office", isHeadOffice: true, status: "active" });

  // 3. Account groups
  const insertedGroups = await tx
    .insert(accountGroups)
    .values(ACCOUNT_GROUPS.map((g) => ({ agencyId, name: g.name, groupType: g.groupType })))
    .returning({ id: accountGroups.id, name: accountGroups.name });

  const groupIdByName = new Map(insertedGroups.map((g) => [g.name, g.id]));

  // 4. Chart of accounts
  await tx.insert(chartOfAccounts).values(
    CHART_OF_ACCOUNTS.map((a) => {
      const groupId = groupIdByName.get(a.group);
      if (!groupId) {
        throw new Error(`Onboarding error: account group "${a.group}" was not created.`);
      }
      return {
        agencyId,
        accountCode: a.code,
        accountName: a.name,
        groupId,
        accountType: a.type,
        balanceType: a.bal,
        isSystem: true,
      };
    })
  );

  return { ownerRoleId: ownerRole.id };
}
