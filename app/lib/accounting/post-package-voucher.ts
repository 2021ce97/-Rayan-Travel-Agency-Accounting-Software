import { db, vouchers, voucherLines, packages, packageItems, chartOfAccounts, customers } from "@/lib/db";
import { eq, and } from "drizzle-orm";

/**
 * Posting a package voucher. A package bundles several components
 * (flight + hotel + visa, etc.) into one customer-facing sale.
 *
 * Deliberately posts at the package level only — one income line, one
 * cost line — rather than posting each component again. If a
 * component was already sold as its own ticket/hotel/visa voucher,
 * posting it again here would double it in the ledger. The
 * `package_items` rows are for the itemized breakdown shown on the
 * customer invoice and package reports; they don't generate their
 * own accounting entries.
 *
 *   Dr  Accounts Receivable (customer)  = total_sale_amount
 *   Cr  Package Sales Income            = total_sale_amount
 *   Dr  Package Purchase Cost           = total_purchase_amount
 *   Cr  Accounts Payable — a package can span several suppliers, so
 *       this posts to a general "Package Suppliers Payable" bucket
 *       rather than one specific supplier. Settle individual supplier
 *       payments via journal vouchers as they're paid.
 */

export interface PackageItemInput {
  itemType: "ticket" | "hotel" | "visa" | "transport" | "other";
  referenceId?: number;
  description?: string;
  amount: number;
}

export interface PackageVoucherInput {
  agencyId: number;
  branchId?: number;
  voucherNo: string;
  voucherDate: string;
  customerId: number;
  currencyId: number;
  createdBy: number;

  packageName: string;
  destination?: string;
  startDate?: string;
  endDate?: string;

  totalSaleAmount: number;
  totalPurchaseAmount: number;
  items: PackageItemInput[];
}

export async function postPackageVoucher(input: PackageVoucherInput) {
  const profitAmount = input.totalSaleAmount - input.totalPurchaseAmount;

  const [customer] = await db
    .select({ accountId: customers.accountId })
    .from(customers)
    .where(and(eq(customers.id, input.customerId), eq(customers.agencyId, input.agencyId)));

  if (!customer?.accountId) {
    throw new Error("Customer has no linked receivable account. Set customers.account_id first.");
  }

  const [packageIncomeAccount] = await db
    .select({ id: chartOfAccounts.id })
    .from(chartOfAccounts)
    .where(and(eq(chartOfAccounts.agencyId, input.agencyId), eq(chartOfAccounts.accountCode, "4030")));

  const [packageCostAccount] = await db
    .select({ id: chartOfAccounts.id })
    .from(chartOfAccounts)
    .where(and(eq(chartOfAccounts.agencyId, input.agencyId), eq(chartOfAccounts.accountCode, "5030")));

  const [packagePayableAccount] = await db
    .select({ id: chartOfAccounts.id })
    .from(chartOfAccounts)
    .where(and(eq(chartOfAccounts.agencyId, input.agencyId), eq(chartOfAccounts.accountCode, "2000")));

  if (!packageIncomeAccount || !packageCostAccount || !packagePayableAccount) {
    throw new Error(
      "Standard chart of accounts is missing (4030, 5030, 2000). Run the onboard_new_agency seed first."
    );
  }

  return await db.transaction(async (tx) => {
    const [voucher] = await tx
      .insert(vouchers)
      .values({
        agencyId: input.agencyId,
        branchId: input.branchId,
        voucherNo: input.voucherNo,
        voucherType: "package",
        voucherDate: input.voucherDate,
        customerId: input.customerId,
        currencyId: input.currencyId,
        totalAmount: String(input.totalSaleAmount),
        totalCost: String(input.totalPurchaseAmount),
        totalProfit: String(profitAmount),
        status: "draft",
        createdBy: input.createdBy,
      })
      .returning();

    const [pkg] = await tx
      .insert(packages)
      .values({
        agencyId: input.agencyId,
        voucherId: voucher.id,
        customerId: input.customerId,
        packageName: input.packageName,
        destination: input.destination,
        startDate: input.startDate,
        endDate: input.endDate,
        totalSaleAmount: String(input.totalSaleAmount),
        totalPurchaseAmount: String(input.totalPurchaseAmount),
        totalProfit: String(profitAmount),
        status: "active",
      })
      .returning();

    if (input.items.length > 0) {
      await tx.insert(packageItems).values(
        input.items.map((item) => ({
          packageId: pkg.id,
          itemType: item.itemType,
          referenceId: item.referenceId,
          description: item.description,
          amount: String(item.amount),
        }))
      );
    }

    const lines = [
      {
        accountId: customer.accountId!,
        lineType: "receivable",
        description: `Package sale - ${input.packageName}`,
        debitAmount: input.totalSaleAmount,
        creditAmount: 0,
      },
      {
        accountId: packageIncomeAccount.id,
        lineType: "income",
        description: "Package sales income",
        debitAmount: 0,
        creditAmount: input.totalSaleAmount,
      },
      {
        accountId: packageCostAccount.id,
        lineType: "cost",
        description: "Package purchase cost",
        debitAmount: input.totalPurchaseAmount,
        creditAmount: 0,
      },
      {
        accountId: packagePayableAccount.id,
        lineType: "payable",
        description: `Package suppliers payable - ${input.packageName}`,
        debitAmount: 0,
        creditAmount: input.totalPurchaseAmount,
      },
    ];

    const totalDebit = lines.reduce((sum, l) => sum + l.debitAmount, 0);
    const totalCredit = lines.reduce((sum, l) => sum + l.creditAmount, 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error(`Voucher does not balance: debit ${totalDebit} != credit ${totalCredit}. Posting aborted.`);
    }

    await tx.insert(voucherLines).values(
      lines.map((l) => ({
        voucherId: voucher.id,
        accountId: l.accountId,
        lineType: l.lineType,
        description: l.description,
        debitAmount: String(l.debitAmount),
        creditAmount: String(l.creditAmount),
        profitAmount: l.lineType === "income" ? String(profitAmount) : "0",
      }))
    );

    const [posted] = await tx
      .update(vouchers)
      .set({ status: "posted", updatedAt: new Date() })
      .where(eq(vouchers.id, voucher.id))
      .returning();

    return posted;
  });
}
