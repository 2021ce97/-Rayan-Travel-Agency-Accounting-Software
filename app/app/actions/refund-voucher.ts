"use server";

import { z } from "zod";
import { postRefundVoucher } from "@/lib/accounting/post-refund-voucher";
import { requireSession } from "@/lib/auth/get-session";
import { revalidatePath } from "next/cache";

const refundVoucherSchema = z.object({
  voucherNo: z.string().min(1, "Voucher number is required"),
  voucherDate: z.string().min(1),
  relatedVoucherId: z.coerce.number().int().positive("Select the voucher being refunded"),
  reason: z.string().optional(),
  amount: z.coerce.number().positive("Refund amount must be greater than zero"),
  currencyId: z.coerce.number().int().positive(),
});

export type RefundVoucherFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[]>;
  voucherId?: number;
};

export async function submitRefundVoucher(
  _prevState: RefundVoucherFormState,
  formData: FormData
): Promise<RefundVoucherFormState> {
  const parsed = refundVoucherSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const session = await requireSession();

  try {
    const voucher = await postRefundVoucher({
      ...parsed.data,
      agencyId: session.agencyId,
      branchId: session.branchId ?? undefined,
      createdBy: session.userId,
    });

    revalidatePath("/vouchers");
    return { status: "success", message: `Refund voucher ${voucher.voucherNo} posted.`, voucherId: voucher.id };
  } catch (err) {
    return {
      status: "error",
      message: err instanceof Error ? err.message : "Failed to post refund.",
    };
  }
}
