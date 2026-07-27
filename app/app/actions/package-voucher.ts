"use server";

import { z } from "zod";
import { postPackageVoucher } from "@/lib/accounting/post-package-voucher";
import { requireSession } from "@/lib/auth/get-session";
import { revalidatePath } from "next/cache";

const itemSchema = z.object({
  itemType: z.enum(["ticket", "hotel", "visa", "transport", "other"]),
  description: z.string().optional(),
  amount: z.coerce.number().min(0),
});

const packageVoucherSchema = z.object({
  voucherNo: z.string().min(1, "Voucher number is required"),
  voucherDate: z.string().min(1),
  customerId: z.coerce.number().int().positive("Select a customer"),
  currencyId: z.coerce.number().int().positive(),

  packageName: z.string().min(1, "Package name is required"),
  destination: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),

  totalSaleAmount: z.coerce.number().min(0),
  totalPurchaseAmount: z.coerce.number().min(0),
  itemsJson: z.string().default("[]"),
});

export type PackageVoucherFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[]>;
  voucherId?: number;
};

export async function submitPackageVoucher(
  _prevState: PackageVoucherFormState,
  formData: FormData
): Promise<PackageVoucherFormState> {
  const parsed = packageVoucherSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  let items;
  try {
    const rawItems = JSON.parse(parsed.data.itemsJson || "[]");
    items = z.array(itemSchema).parse(rawItems);
  } catch (err) {
    return {
      status: "error",
      message: err instanceof Error ? err.message : "Invalid package items.",
    };
  }

  const session = await requireSession();

  try {
    const voucher = await postPackageVoucher({
      agencyId: session.agencyId,
      branchId: session.branchId ?? undefined,
      voucherNo: parsed.data.voucherNo,
      voucherDate: parsed.data.voucherDate,
      customerId: parsed.data.customerId,
      currencyId: parsed.data.currencyId,
      createdBy: session.userId,
      packageName: parsed.data.packageName,
      destination: parsed.data.destination,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
      totalSaleAmount: parsed.data.totalSaleAmount,
      totalPurchaseAmount: parsed.data.totalPurchaseAmount,
      items,
    });

    revalidatePath("/vouchers");
    return { status: "success", message: `Package voucher ${voucher.voucherNo} posted.`, voucherId: voucher.id };
  } catch (err) {
    return {
      status: "error",
      message: err instanceof Error ? err.message : "Failed to post package voucher.",
    };
  }
}
