import { db, vouchers, voucherLines, visas, chartOfAccounts, customers, suppliers } from "@/lib/db";
import { eq, and } from "drizzle-orm";

/**
 * Posting a visa voucher. Follows the same shape as postTicketVoucher —
 * see that file for the full explanation of the pattern.
 *
 *   Dr  Accounts Receivable (customer)  = selling_amount
 *   Cr  Visa Service Income             = selling_amount
 *   Dr  Visa Purchase Cost              = purchase_amount
 *   Cr  Accounts Payable (supplier)     = purchase_amount
 *
 * Visas don't carry a separate commission line in the source spec, so
 * income is booked at the full selling amount (unlike tickets, which
 * split out commission income). Add a commission split here later if
 * an agency's visa suppliers pay commission too.
 */

export interface VisaVoucherInput {
  agencyId: number;
  branchId?: number;
  voucherNo: string;
  voucherDate: string;
  customerId: number;
  supplierId: number;
  consultantId?: number;
  currencyId: number;
  exchangeRate: number;
  createdBy: number;

  visaType?: string;
  visaNo?: string;
  passportNo?: string;
  countryId?: number;
  issueDate?: string;

  sellingAmount: number;
  purchaseAmount: number;
}

export async function postVisaVoucher(input: VisaVoucherInput) {
  const profitAmount = input.sellingAmount - input.purchaseAmount;

  const [customer] = await db
    .select({ accountId: customers.accountId })
    .from(customers)
    .where(and(eq(customers.id, input.customerId), eq(customers.agencyId, input.agencyId)));

  const [supplier] = await db
    .select({ accountId: suppliers.accountId })
    .from(suppliers)
    .where(and(eq(suppliers.id, input.supplierId), eq(suppliers.agencyId, input.agencyId)));

  if (!customer?.accountId) {
    throw new Error("Customer has no linked receivable account. Set customers.account_id first.");
  }
  if (!supplier?.accountId) {
    throw new Error("Supplier has no linked payable account. Set suppliers.account_id first.");
  }

  const [visaIncomeAccount] = await db
    .select({ id: chartOfAccounts.id })
    .from(chartOfAccounts)
    .where(and(eq(chartOfAccounts.agencyId, input.agencyId), eq(chartOfAccounts.accountCode, "4010")));

  const [visaCostAccount] = await db
    .select({ id: chartOfAccounts.id })
    .from(chartOfAccounts)
    .where(and(eq(chartOfAccounts.agencyId, input.agencyId), eq(chartOfAccounts.accountCode, "5010")));

  if (!visaIncomeAccount || !visaCostAccount) {
    throw new Error(
      "Standard chart of accounts is missing (4010, 5010). Run the onboard_new_agency seed first."
    );
  }

  return await db.transaction(async (tx) => {
    const [voucher] = await tx
      .insert(vouchers)
      .values({
        agencyId: input.agencyId,
        branchId: input.branchId,
        voucherNo: input.voucherNo,
        voucherType: "visa",
        voucherDate: input.voucherDate,
        customerId: input.customerId,
        supplierId: input.supplierId,
        consultantId: input.consultantId,
        currencyId: input.currencyId,
        exchangeRate: String(input.exchangeRate),
        totalAmount: String(input.sellingAmount),
        totalCost: String(input.purchaseAmount),
        totalProfit: String(profitAmount),
        status: "draft",
        createdBy: input.createdBy,
      })
      .returning();

    await tx.insert(visas).values({
      agencyId: input.agencyId,
      voucherId: voucher.id,
      customerId: input.customerId,
      supplierId: input.supplierId,
      consultantId: input.consultantId,
      visaType: input.visaType,
      visaNo: input.visaNo,
      passportNo: input.passportNo,
      countryId: input.countryId,
      issueDate: input.issueDate,
      sellingAmount: String(input.sellingAmount),
      purchaseAmount: String(input.purchaseAmount),
      exchangeRate: String(input.exchangeRate),
      profitAmount: String(profitAmount),
      status: "active",
    });

    const lines = [
      {
        accountId: customer.accountId!,
        lineType: "receivable",
        description: `Visa sale - ${input.visaNo ?? ""}`,
        debitAmount: input.sellingAmount,
        creditAmount: 0,
      },
      {
        accountId: visaIncomeAccount.id,
        lineType: "income",
        description: "Visa service income",
        debitAmount: 0,
        creditAmount: input.sellingAmount,
      },
      {
        accountId: visaCostAccount.id,
        lineType: "cost",
        description: "Visa purchase cost",
        debitAmount: input.purchaseAmount,
        creditAmount: 0,
      },
      {
        accountId: supplier.accountId!,
        lineType: "payable",
        description: `Payable to supplier - ${input.visaNo ?? ""}`,
        debitAmount: 0,
        creditAmount: input.purchaseAmount,
      },
    ];

    const totalDebit = lines.reduce((sum, l) => sum + l.debitAmount, 0);
    const totalCredit = lines.reduce((sum, l) => sum + l.creditAmount, 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error(
        `Voucher does not balance: debit ${totalDebit} != credit ${totalCredit}. Posting aborted.`
      );
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
