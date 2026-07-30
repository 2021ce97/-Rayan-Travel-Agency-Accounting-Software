import { db, vouchers, voucherLines, hotels, chartOfAccounts, customers, suppliers, countries, cities } from "@/lib/db";
import { eq, and } from "drizzle-orm";

/**
 * Posting a hotel voucher. Same shape as ticket/visa vouchers:
 *
 *   Dr  Accounts Receivable (customer)   = selling_amount
 *   Cr  Hotel Booking Income             = selling_amount
 *   Dr  Hotel Purchase Cost              = purchase_amount
 *   Cr  Accounts Payable (supplier)      = purchase_amount
 */

export interface HotelVoucherInput {
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

  hotelName?: string;
  countryId?: number;
  cityId?: number;
  checkInDate?: string;
  checkOutDate?: string;
  nights?: number;
  rooms?: number;
  adults?: number;
  children?: number;
  roomType?: string;

  sellingAmount: number;
  purchaseAmount: number;
}

export async function postHotelVoucher(input: HotelVoucherInput) {
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

  if (input.countryId) {
    const [country] = await db.select({ id: countries.id }).from(countries).where(eq(countries.id, input.countryId));
    if (!country) throw new Error("The selected country no longer exists. Please select a valid country.");
  }

  if (input.cityId) {
    const [city] = await db.select({ countryId: cities.countryId }).from(cities).where(eq(cities.id, input.cityId));
    if (!city || (input.countryId && city.countryId !== input.countryId)) {
      throw new Error("The selected city is invalid for the selected country. Please choose a city from the list.");
    }
  }

  const [hotelIncomeAccount] = await db
    .select({ id: chartOfAccounts.id })
    .from(chartOfAccounts)
    .where(and(eq(chartOfAccounts.agencyId, input.agencyId), eq(chartOfAccounts.accountCode, "4020")));

  const [hotelCostAccount] = await db
    .select({ id: chartOfAccounts.id })
    .from(chartOfAccounts)
    .where(and(eq(chartOfAccounts.agencyId, input.agencyId), eq(chartOfAccounts.accountCode, "5020")));

  if (!hotelIncomeAccount || !hotelCostAccount) {
    throw new Error(
      "Standard chart of accounts is missing (4020, 5020). Run the onboard_new_agency seed first."
    );
  }

  return await db.transaction(async (tx) => {
    const [voucher] = await tx
      .insert(vouchers)
      .values({
        agencyId: input.agencyId,
        branchId: input.branchId,
        voucherNo: input.voucherNo,
        voucherType: "hotel",
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

    await tx.insert(hotels).values({
      agencyId: input.agencyId,
      voucherId: voucher.id,
      customerId: input.customerId,
      supplierId: input.supplierId,
      consultantId: input.consultantId,
      hotelName: input.hotelName,
      countryId: input.countryId,
      cityId: input.cityId,
      checkInDate: input.checkInDate,
      checkOutDate: input.checkOutDate,
      nights: input.nights,
      rooms: input.rooms,
      adults: input.adults,
      children: input.children,
      roomType: input.roomType,
      sellingAmount: String(input.sellingAmount),
      purchaseAmount: String(input.purchaseAmount),
      profitAmount: String(profitAmount),
      status: "active",
    });

    const lines = [
      {
        accountId: customer.accountId!,
        lineType: "receivable",
        description: `Hotel booking - ${input.hotelName ?? ""}`,
        debitAmount: input.sellingAmount,
        creditAmount: 0,
      },
      {
        accountId: hotelIncomeAccount.id,
        lineType: "income",
        description: "Hotel booking income",
        debitAmount: 0,
        creditAmount: input.sellingAmount,
      },
      {
        accountId: hotelCostAccount.id,
        lineType: "cost",
        description: "Hotel purchase cost",
        debitAmount: input.purchaseAmount,
        creditAmount: 0,
      },
      {
        accountId: supplier.accountId!,
        lineType: "payable",
        description: `Payable to supplier - ${input.hotelName ?? ""}`,
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
