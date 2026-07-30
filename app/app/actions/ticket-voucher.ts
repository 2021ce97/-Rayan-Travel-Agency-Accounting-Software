"use server";

import { z } from "zod";
import { postTicketVoucher } from "@/lib/accounting/post-ticket-voucher";
import { requireSession } from "@/lib/auth/get-session";
import { getCurrentConsultantId } from "@/lib/auth/current-consultant";
import { revalidatePath } from "next/cache";

const ticketVoucherSchema = z.object({
  voucherNo: z.string().min(1, "Voucher number is required"),
  voucherDate: z.string().min(1),
  customerId: z.coerce.number().int().positive("Select a customer"),
  supplierId: z.coerce.number().int().positive("Select a supplier"),
  airlineId: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.coerce.number().int().positive().optional()
  ),
  currencyId: z.coerce.number().int().positive(),
  exchangeRate: z.coerce.number().positive().default(1),

  pnr: z.string().optional(),
  ticketNo: z.string().optional(),
  passengerName: z.string().optional(),
  sectorFrom: z.string().optional(),
  sectorTo: z.string().optional(),
  issueDate: z.string().optional(),
  travelDate: z.string().optional(),

  baseFare: z.coerce.number().min(0),
  taxAmount: z.coerce.number().min(0).default(0),
  serviceCharge: z.coerce.number().min(0).default(0),
  commissionAmount: z.coerce.number().min(0).default(0),
  purchaseAmount: z.coerce.number().min(0),
});

export type TicketVoucherFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[]>;
  voucherId?: number;
};

export async function submitTicketVoucher(
  _prevState: TicketVoucherFormState,
  formData: FormData
): Promise<TicketVoucherFormState> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = ticketVoucherSchema.safeParse(raw);

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
    const voucher = await postTicketVoucher({
      ...parsed.data,
      agencyId: session.agencyId,
      branchId: session.branchId ?? undefined,
      createdBy: session.userId,
      consultantId,
    });

    revalidatePath("/vouchers");
    return { status: "success", message: `Ticket voucher ${voucher.voucherNo} posted.`, voucherId: voucher.id };
  } catch (err) {
    return {
      status: "error",
      message: err instanceof Error ? err.message : "Failed to post voucher.",
    };
  }
}
