import { db, vouchers, voucherLines, chartOfAccounts } from "@/lib/db";
import { eq, and, inArray } from "drizzle-orm";

/**
 * Posting a manual journal/cash/bank/expense voucher — the flexible
 * fallback for anything that isn't a ticket/visa/hotel/refund. The
 * user supplies an arbitrary set of debit/credit lines directly
 * (e.g. "Dr Office Rent Expense 50,000 / Cr Bank Account 50,000").
 *
 * Unlike the other posting functions, there's no fixed set of accounts
 * this always touches — the caller provides the full line list, and
 * this function only validates that:
 *   1. every account_id belongs to this agency
 *   2. total debits == total credits
 * before marking it posted.
 */

export interface JournalLineInput {
  accountId: number;
  description?: string;
  debitAmount: number;
  creditAmount: number;
}

export interface JournalVoucherInput {
  agencyId: number;
  branchId?: number;
  voucherNo: string;
  voucherDate: string;
  voucherType: "journal" | "cash" | "bank" | "expense";
  currencyId?: number;
  notes?: string;
  createdBy: number;
  lines: JournalLineInput[];
}

export async function postJournalVoucher(input: JournalVoucherInput) {
  if (input.lines.length < 2) {
    throw new Error("A journal voucher needs at least two lines (one debit, one credit).");
  }

  for (const line of input.lines) {
    if (line.debitAmount > 0 && line.creditAmount > 0) {
      throw new Error("Each line must be either a debit or a credit, not both.");
    }
    if (line.debitAmount === 0 && line.creditAmount === 0) {
      throw new Error("Each line needs a non-zero debit or credit amount.");
    }
  }

  const accountIds = [...new Set(input.lines.map((l) => l.accountId))];
  const accounts = await db
    .select({ id: chartOfAccounts.id })
    .from(chartOfAccounts)
    .where(and(eq(chartOfAccounts.agencyId, input.agencyId), inArray(chartOfAccounts.id, accountIds)));

  if (accounts.length !== accountIds.length) {
    throw new Error("One or more accounts do not belong to this agency. Posting aborted.");
  }

  const totalDebit = input.lines.reduce((s, l) => s + l.debitAmount, 0);
  const totalCredit = input.lines.reduce((s, l) => s + l.creditAmount, 0);

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new Error(`Voucher does not balance: debit ${totalDebit} != credit ${totalCredit}. Posting aborted.`);
  }

  return await db.transaction(async (tx) => {
    const [voucher] = await tx
      .insert(vouchers)
      .values({
        agencyId: input.agencyId,
        branchId: input.branchId,
        voucherNo: input.voucherNo,
        voucherType: input.voucherType,
        voucherDate: input.voucherDate,
        currencyId: input.currencyId,
        totalAmount: String(totalDebit),
        notes: input.notes,
        status: "draft",
        createdBy: input.createdBy,
      })
      .returning();

    await tx.insert(voucherLines).values(
      input.lines.map((l) => ({
        voucherId: voucher.id,
        accountId: l.accountId,
        lineType: input.voucherType,
        description: l.description,
        debitAmount: String(l.debitAmount),
        creditAmount: String(l.creditAmount),
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
