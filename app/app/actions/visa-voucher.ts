"use server";

import { z } from "zod";
import { postVisaVoucher } from "@/lib/accounting/post-visa-voucher";
import { requireSession } from "@/lib/auth/get-session";
import { getCurrentConsultantId } from "@/lib/auth/current-consultant";
import { revalidatePath } from "next/cache";

const optionalPositiveInteger = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? undefined : value),
  z.coerce.number().int().positive().optional()
);

const visaVoucherSchema = z.object({
  voucherNo: z.string().min(1, "Voucher number is required"),
  voucherDate: z.string().min(1),
  customerId: z.coerce.number().int().positive("Select a customer"),
  supplierId: z.coerce.number().int().positive("Select a supplier"),
  currencyId: z.coerce.number().int().positive(),
  exchangeRate: z.coerce.number().positive().default(1),

  visaType: z.string().optional(),
  visaNo: z.string().optional(),
  passportNo: z.string().optional(),
  countryId: optionalPositiveInteger,
  issueDate: z.string().optional(),

  sellingAmount: z.coerce.number().min(0),
  purchaseAmount: z.coerce.number().min(0),
});

export type VisaVoucherFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[]>;
  voucherId?: number;
};

export async function submitVisaVoucher(
  _prevState: VisaVoucherFormState,
  formData: FormData
): Promise<VisaVoucherFormState> {
  const parsed = visaVoucherSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const session = await requireSession();
  const consultantId = await getCurrentConsultantId(session);

  try {
    const voucher = await postVisaVoucher({
      ...parsed.data,
      agencyId: session.agencyId,
      branchId: session.branchId ?? undefined,
      createdBy: session.userId,
      consultantId,
    });

    revalidatePath("/vouchers");
    return { status: "success", message: `Visa voucher ${voucher.voucherNo} posted.`, voucherId: voucher.id };
  } catch (err) {
    return {
      status: "error",
      message: err instanceof Error ? err.message : "Failed to post voucher.",
    };
  }
}
