import { db, vouchers, voucherLines, refunds, chartOfAccounts, customers, suppliers } from "@/lib/db";
import { eq, and } from "drizzle-orm";

/**
 * Posting a refund voucher against an existing ticket/visa/hotel voucher.
 *
 * A refund reverses part or all of the original sale: money goes back
 * to the customer, so we credit their receivable (reducing what they
 * owe, or creating a payable to them if they'd already paid) and debit
 * a refund/contra-income account. This is deliberately kept separate
 * from directly editing the original voucher — the original stays as
 * a historical record, and the refund is its own auditable entry.
 *
 *   Dr  Refund Expense (or contra-income)  = refund_amount
 *   Cr  Accounts Receivable (customer)     = refund_amount
 *
 * If the original voucher was against a supplier who also needs to
 * refund the agency (e.g. airline refunds the ticket cost back), that
 * is a separate flow — record it as a receipt against the supplier's
 * payable account once the money actually arrives, rather than
 * assuming it happens automatically here.
 */

export interface RefundVoucherInput {
  agencyId: number;
  branchId?: number;
  voucherNo: string;
  voucherDate: string;
  relatedVoucherId: number;
  reason?: string;
  amount: number;
  currencyId: number;
  createdBy: number;
}

export async function postRefundVoucher(input: RefundVoucherInput) {
  const [relatedVoucher] = await db
    .select()
    .from(vouchers)
    .where(and(eq(vouchers.id, input.relatedVoucherId), eq(vouchers.agencyId, input.agencyId)));

  if (!relatedVoucher) {
    throw new Error("Related voucher not found for this agency.");
  }
  if (!relatedVoucher.customerId) {
    throw new Error("Related voucher has no customer to refund against.");
  }
  if (input.amount > Number(relatedVoucher.totalAmount)) {
    throw new Error(
      `Refund amount (${input.amount}) exceeds the original voucher total (${relatedVoucher.totalAmount}).`
    );
  }

  const [customer] = await db
    .select({ accountId: customers.accountId })
    .from(customers)
    .where(and(eq(customers.id, relatedVoucher.customerId), eq(customers.agencyId, input.agencyId)));

  if (!customer?.accountId) {
    throw new Error("Customer has no linked receivable account.");
  }

  // Refunds hit a dedicated expense-side account so they show up
  // separately from normal ticket/visa/hotel cost in the P&L, rather
  // than being netted invisibly into the original income line.
  const [refundAccount] = await db
    .select({ id: chartOfAccounts.id })
    .from(chartOfAccounts)
    .where(and(eq(chartOfAccounts.agencyId, input.agencyId), eq(chartOfAccounts.accountCode, "5100")));

  if (!refundAccount) {
    throw new Error(
      "No 'Refunds & Cancellations' account (5100) found. Add it to the chart of accounts before posting refunds."
    );
  }

  return await db.transaction(async (tx) => {
    const [voucher] = await tx
      .insert(vouchers)
      .values({
        agencyId: input.agencyId,
        branchId: input.branchId,
        voucherNo: input.voucherNo,
        voucherType: "refund",
        voucherDate: input.voucherDate,
        customerId: relatedVoucher.customerId,
        currencyId: input.currencyId,
        totalAmount: String(input.amount),
        notes: input.reason,
        status: "draft",
        createdBy: input.createdBy,
      })
      .returning();

    await tx.insert(refunds).values({
      agencyId: input.agencyId,
      voucherId: voucher.id,
      relatedVoucherId: input.relatedVoucherId,
      refundDate: input.voucherDate,
      reason: input.reason,
      amount: String(input.amount),
      currencyId: input.currencyId,
      status: "active",
    });

    const lines = [
      {
        accountId: refundAccount.id,
        lineType: "refund",
        description: `Refund against ${relatedVoucher.voucherNo}`,
        debitAmount: input.amount,
        creditAmount: 0,
      },
      {
        accountId: customer.accountId!,
        lineType: "receivable",
        description: `Refund credited - ${relatedVoucher.voucherNo}`,
        debitAmount: 0,
        creditAmount: input.amount,
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
