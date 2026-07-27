"use server";

import { z } from "zod";
import { postJournalVoucher } from "@/lib/accounting/post-journal-voucher";
import { requireSession } from "@/lib/auth/get-session";
import { revalidatePath } from "next/cache";

const lineSchema = z.object({
  accountId: z.coerce.number().int().positive(),
  description: z.string().optional(),
  debitAmount: z.coerce.number().min(0).default(0),
  creditAmount: z.coerce.number().min(0).default(0),
});

const journalVoucherSchema = z.object({
  voucherNo: z.string().min(1, "Voucher number is required"),
  voucherDate: z.string().min(1),
  voucherType: z.enum(["journal", "cash", "bank", "expense"]),
  notes: z.string().optional(),
  currencyId: z.coerce.number().int().positive().optional(),
  linesJson: z.string().min(1, "At least two lines are required"),
});

export type JournalVoucherFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[]>;
  voucherId?: number;
};

export async function submitJournalVoucher(
  _prevState: JournalVoucherFormState,
  formData: FormData
): Promise<JournalVoucherFormState> {
  const parsed = journalVoucherSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  let lines;
  try {
    const rawLines = JSON.parse(parsed.data.linesJson);
    lines = z.array(lineSchema).min(2, "At least two lines are required").parse(rawLines);
  } catch (err) {
    return {
      status: "error",
      message: err instanceof Error ? err.message : "Invalid journal lines.",
    };
  }

  const session = await requireSession();

  try {
    const voucher = await postJournalVoucher({
      agencyId: session.agencyId,
      branchId: session.branchId ?? undefined,
      voucherNo: parsed.data.voucherNo,
      voucherDate: parsed.data.voucherDate,
      voucherType: parsed.data.voucherType,
      currencyId: parsed.data.currencyId,
      notes: parsed.data.notes,
      createdBy: session.userId,
      lines,
    });

    revalidatePath("/vouchers");
    return { status: "success", message: `${voucher.voucherType} voucher ${voucher.voucherNo} posted.`, voucherId: voucher.id };
  } catch (err) {
    return {
      status: "error",
      message: err instanceof Error ? err.message : "Failed to post voucher.",
    };
  }
}
