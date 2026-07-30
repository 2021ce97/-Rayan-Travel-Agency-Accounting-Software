"use server";

import { z } from "zod";
import { postHotelVoucher } from "@/lib/accounting/post-hotel-voucher";
import { requireSession } from "@/lib/auth/get-session";
import { getCurrentConsultantId } from "@/lib/auth/current-consultant";
import { ensureVoucherNumberIsAvailable } from "@/lib/accounting/voucher-number";
import { revalidatePath } from "next/cache";

const optionalPositiveInteger = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? undefined : value),
  z.coerce.number().int().positive().optional()
);
const optionalNonNegativeInteger = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? undefined : value),
  z.coerce.number().int().min(0).optional()
);

const hotelVoucherSchema = z.object({
  voucherNo: z.string().min(1, "Voucher number is required"),
  voucherDate: z.string().min(1),
  customerId: z.coerce.number().int().positive("Select a customer"),
  supplierId: z.coerce.number().int().positive("Select a supplier"),
  currencyId: z.coerce.number().int().positive(),
  exchangeRate: z.coerce.number().positive().default(1),

  hotelName: z.string().optional(),
  countryId: optionalPositiveInteger,
  cityId: optionalPositiveInteger,
  checkInDate: z.string().optional(),
  checkOutDate: z.string().optional(),
  nights: optionalNonNegativeInteger,
  rooms: optionalNonNegativeInteger,
  adults: optionalNonNegativeInteger,
  children: optionalNonNegativeInteger,
  roomType: z.string().optional(),

  sellingAmount: z.coerce.number().min(0),
  purchaseAmount: z.coerce.number().min(0),
});

export type HotelVoucherFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[]>;
  voucherId?: number;
};

export async function submitHotelVoucher(
  _prevState: HotelVoucherFormState,
  formData: FormData
): Promise<HotelVoucherFormState> {
  const parsed = hotelVoucherSchema.safeParse(Object.fromEntries(formData.entries()));

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
    const voucherNo = await ensureVoucherNumberIsAvailable(session.agencyId, parsed.data.voucherNo);
    const voucher = await postHotelVoucher({
      ...parsed.data,
      voucherNo,
      agencyId: session.agencyId,
      branchId: session.branchId ?? undefined,
      createdBy: session.userId,
      consultantId,
    });

    revalidatePath("/vouchers");
    return { status: "success", message: `Hotel voucher ${voucher.voucherNo} posted.`, voucherId: voucher.id };
  } catch (err) {
    return {
      status: "error",
      message: err instanceof Error ? err.message : "Failed to post voucher.",
    };
  }
}
