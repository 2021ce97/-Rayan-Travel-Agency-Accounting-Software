import { db, vouchers, voucherLines, tickets, chartOfAccounts, customers, suppliers } from "@/lib/db";
import { eq, and } from "drizzle-orm";


/**
 * Posting a ticket voucher — the reference implementation for the whole
 * accounting engine. Every other voucher type (visa, hotel, package)
 * follows the same shape:
 *
 *   1. Insert the voucher header (status: 'draft')
 *   2. Insert the type-specific detail row (tickets/visas/hotels/...)
 *   3. Compute the double-entry lines and insert into voucher_lines
 *   4. Flip the voucher to 'posted' only if debits === credits
 *
 * Standard entries for a ticket sale:
 *   Dr  Accounts Receivable (customer)      = sale_amount
 *   Cr  Ticket Sales Income                 = sale_amount - commission
 *   Cr  Commission Income                   = commission_amount
 *   Dr  Ticket Purchase Cost                = purchase_amount
 *   Cr  Accounts Payable (supplier/airline) = purchase_amount
 *
 * This nets out to total_profit = sale_amount - purchase_amount, which
 * matches tickets.profit_amount and flows straight into profit_loss_view.
 */

export interface TicketVoucherInput {
  agencyId: number;
  branchId?: number;
  voucherNo: string;
  voucherDate: string; // ISO date
  customerId: number;
  supplierId: number;
  airlineId?: number;
  consultantId?: number;
  currencyId: number;
  exchangeRate: number;
  createdBy: number;

  pnr?: string;
  ticketNo?: string;
  passengerName?: string;
  sectorFrom?: string;
  sectorTo?: string;
  issueDate?: string;
  travelDate?: string;
  baseFare: number;
  taxAmount: number;
  serviceCharge: number;
  commissionAmount: number;
  purchaseAmount: number;
}

export async function postTicketVoucher(input: TicketVoucherInput) {
  const saleAmount = input.baseFare + input.taxAmount + input.serviceCharge;
  const profitAmount = saleAmount - input.purchaseAmount;

  // Resolve the control accounts this posting needs.
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

  const [salesIncomeAccount] = await db
    .select({ id: chartOfAccounts.id })
    .from(chartOfAccounts)
    .where(and(eq(chartOfAccounts.agencyId, input.agencyId), eq(chartOfAccounts.accountCode, "4000")));

  const [commissionIncomeAccount] = await db
    .select({ id: chartOfAccounts.id })
    .from(chartOfAccounts)
    .where(and(eq(chartOfAccounts.agencyId, input.agencyId), eq(chartOfAccounts.accountCode, "4090")));

  const [ticketCostAccount] = await db
    .select({ id: chartOfAccounts.id })
    .from(chartOfAccounts)
    .where(and(eq(chartOfAccounts.agencyId, input.agencyId), eq(chartOfAccounts.accountCode, "5000")));

  if (!salesIncomeAccount || !commissionIncomeAccount || !ticketCostAccount) {
    throw new Error(
      "Standard chart of accounts is missing (4000, 4090, 5000). Run the onboard_new_agency seed first."
    );
  }

  return await db.transaction(async (tx) => {
    // 1. Voucher header
    const [voucher] = await tx
      .insert(vouchers)
      .values({
        agencyId: input.agencyId,
        branchId: input.branchId,
        voucherNo: input.voucherNo,
        voucherType: "ticket",
        voucherDate: input.voucherDate,
        customerId: input.customerId,
        supplierId: input.supplierId,
        airlineId: input.airlineId,
        consultantId: input.consultantId,
        currencyId: input.currencyId,
        exchangeRate: String(input.exchangeRate),
        totalAmount: String(saleAmount),
        totalCost: String(input.purchaseAmount),
        totalProfit: String(profitAmount),
        status: "draft",
        createdBy: input.createdBy,
      })
      .returning();

    // 2. Ticket detail row
    await tx.insert(tickets).values({
      agencyId: input.agencyId,
      voucherId: voucher.id,
      customerId: input.customerId,
      supplierId: input.supplierId,
      airlineId: input.airlineId,
      consultantId: input.consultantId,
      pnr: input.pnr,
      ticketNo: input.ticketNo,
      passengerName: input.passengerName,
      sectorFrom: input.sectorFrom,
      sectorTo: input.sectorTo,
      issueDate: input.issueDate,
      travelDate: input.travelDate,
      baseFare: String(input.baseFare),
      taxAmount: String(input.taxAmount),
      serviceCharge: String(input.serviceCharge),
      commissionAmount: String(input.commissionAmount),
      saleAmount: String(saleAmount),
      purchaseAmount: String(input.purchaseAmount),
      profitAmount: String(profitAmount),
      status: "active",
    });

    // 3. Double-entry lines
    const netSalesIncome = saleAmount - input.commissionAmount;

    const lines = [
      // Dr customer receivable for the full sale amount
      {
        accountId: customer.accountId!,
        lineType: "receivable",
        description: `Ticket sale - ${input.ticketNo ?? input.pnr ?? ""}`,
        debitAmount: saleAmount,
        creditAmount: 0,
      },
      // Cr sales income (net of commission)
      {
        accountId: salesIncomeAccount.id,
        lineType: "income",
        description: "Ticket sales income",
        debitAmount: 0,
        creditAmount: netSalesIncome,
      },
      // Cr commission income, if any
      ...(input.commissionAmount > 0
        ? [
            {
              accountId: commissionIncomeAccount.id,
              lineType: "commission",
              description: "Ticket commission income",
              debitAmount: 0,
              creditAmount: input.commissionAmount,
            },
          ]
        : []),
      // Dr ticket cost
      {
        accountId: ticketCostAccount.id,
        lineType: "cost",
        description: "Ticket purchase cost",
        debitAmount: input.purchaseAmount,
        creditAmount: 0,
      },
      // Cr supplier payable
      {
        accountId: supplier.accountId!,
        lineType: "payable",
        description: `Payable to supplier - ${input.ticketNo ?? input.pnr ?? ""}`,
        debitAmount: 0,
        creditAmount: input.purchaseAmount,
      },
    ];

    const totalDebit = lines.reduce((sum, l) => sum + l.debitAmount, 0);
    const totalCredit = lines.reduce((sum, l) => sum + l.creditAmount, 0);

    // Guard: double-entry must balance before we ever mark this posted.
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

    // 4. Flip to posted now that lines balance
    const [posted] = await tx
      .update(vouchers)
      .set({ status: "posted", updatedAt: new Date() })
      .where(eq(vouchers.id, voucher.id))
      .returning();

    return posted;
  });
}
