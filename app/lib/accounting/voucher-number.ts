import { and, eq } from "drizzle-orm";
import { db, vouchers } from "@/lib/db";

/** Ensures voucher numbers remain unique within an agency before posting. */
export async function ensureVoucherNumberIsAvailable(agencyId: number, voucherNo: string) {
  const normalizedVoucherNo = voucherNo.trim();
  const [existingVoucher] = await db
    .select({ id: vouchers.id })
    .from(vouchers)
    .where(and(eq(vouchers.agencyId, agencyId), eq(vouchers.voucherNo, normalizedVoucherNo)))
    .limit(1);

  if (existingVoucher) {
    throw new Error(`Voucher number “${normalizedVoucherNo}” already exists. Please use a different voucher number.`);
  }

  return normalizedVoucherNo;
}
