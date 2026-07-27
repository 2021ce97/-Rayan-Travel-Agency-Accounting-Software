"use server";

import { z } from "zod";
import { db, suppliers, chartOfAccounts, accountGroups } from "@/lib/db";
import { requireSession } from "@/lib/auth/get-session";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

const supplierSchema = z.object({
  name: z.string().min(1, "Name is required"),
  supplierCode: z.string().optional(),
  type: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  openingBalance: z.coerce.number().default(0),
});

export type SupplierFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function createSupplier(
  _prevState: SupplierFormState,
  formData: FormData
): Promise<SupplierFormState> {
  const parsed = supplierSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!parsed.success) {
    return { status: "error", message: "Please fix the errors below.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const session = await requireSession();
  const data = parsed.data;

  try {
    await db.transaction(async (tx) => {
      let [liabilityGroup] = await tx
        .select({ id: accountGroups.id })
        .from(accountGroups)
        .where(and(eq(accountGroups.agencyId, session.agencyId), eq(accountGroups.groupType, "liability")));

      if (!liabilityGroup) {
        [liabilityGroup] = await tx
          .insert(accountGroups)
          .values({ agencyId: session.agencyId, name: "Current Liabilities", groupType: "liability" })
          .returning({ id: accountGroups.id });
      }

      const existingCodes = await tx
        .select({ code: chartOfAccounts.accountCode })
        .from(chartOfAccounts)
        .where(and(eq(chartOfAccounts.agencyId, session.agencyId), eq(chartOfAccounts.accountType, "liability")));
      const nextSeq = existingCodes.length + 1;
      const accountCode = `21${String(nextSeq).padStart(2, "0")}`;

      const [account] = await tx
        .insert(chartOfAccounts)
        .values({
          agencyId: session.agencyId,
          accountCode,
          accountName: `${data.name} (Payable)`,
          groupId: liabilityGroup.id,
          accountType: "liability",
          balanceType: "credit",
          openingBalance: String(data.openingBalance),
          isSystem: true,
        })
        .returning({ id: chartOfAccounts.id });

      await tx.insert(suppliers).values({
        agencyId: session.agencyId,
        name: data.name,
        supplierCode: data.supplierCode || null,
        type: data.type || null,
        phone: data.phone || null,
        email: data.email || null,
        accountId: account.id,
        openingBalance: String(data.openingBalance),
      });
    });

    revalidatePath("/suppliers");
    return { status: "success", message: `Supplier "${data.name}" created.` };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : "Failed to create supplier." };
  }
}
