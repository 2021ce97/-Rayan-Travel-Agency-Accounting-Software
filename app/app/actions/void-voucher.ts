"use server";

import { db, vouchers } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { requireSession } from "@/lib/auth/get-session";
import { revalidatePath } from "next/cache";

export async function voidVoucher(voucherId: number) {
  const session = await requireSession();

  // Ensure the voucher belongs to this agency
  const [voucher] = await db
    .select({ id: vouchers.id, status: vouchers.status, isVoided: vouchers.isVoided })
    .from(vouchers)
    .where(and(eq(vouchers.id, voucherId), eq(vouchers.agencyId, session.agencyId)))
    .limit(1);

  if (!voucher) {
    return { status: "error", message: "Voucher not found." };
  }

  if (voucher.isVoided) {
    return { status: "error", message: "Voucher is already voided." };
  }

  // Mark as voided
  await db.update(vouchers)
    .set({
      isVoided: true,
      updatedAt: new Date(),
    })
    .where(eq(vouchers.id, voucherId));

  revalidatePath("/vouchers");
  revalidatePath("/reports");
  revalidatePath("/trial-balance");
  revalidatePath("/ledger");

  return { status: "success", message: "Voucher voided successfully." };
}
