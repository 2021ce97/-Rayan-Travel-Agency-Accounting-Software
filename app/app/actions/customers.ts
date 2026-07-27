"use server";

import { z } from "zod";
import { db, customers, chartOfAccounts, accountGroups } from "@/lib/db";
import { requireSession } from "@/lib/auth/get-session";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

const customerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  customerCode: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  passportNo: z.string().optional(),
  openingBalance: z.coerce.number().default(0),
});

export type CustomerFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

/**
 * Every customer needs a receivable account in the chart of accounts
 * before vouchers can post against them. We auto-create one here
 * rather than making the user do it manually — same pattern for
 * suppliers (payable account) and airlines.
 */
export async function createCustomer(
  _prevState: CustomerFormState,
  formData: FormData
): Promise<CustomerFormState> {
  const parsed = customerSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!parsed.success) {
    return { status: "error", message: "Please fix the errors below.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const session = await requireSession();
  const data = parsed.data;

  try {
    await db.transaction(async (tx) => {
      // Find (or lazily create) this agency's "Current Assets" group so the
      // new receivable account has somewhere to live.
      let [assetGroup] = await tx
        .select({ id: accountGroups.id })
        .from(accountGroups)
        .where(and(eq(accountGroups.agencyId, session.agencyId), eq(accountGroups.groupType, "asset")));

      if (!assetGroup) {
        [assetGroup] = await tx
          .insert(accountGroups)
          .values({ agencyId: session.agencyId, name: "Current Assets", groupType: "asset" })
          .returning({ id: accountGroups.id });
      }

      // Generate a unique account code in the 11xx (receivables) range.
      const existingCodes = await tx
        .select({ code: chartOfAccounts.accountCode })
        .from(chartOfAccounts)
        .where(and(eq(chartOfAccounts.agencyId, session.agencyId), eq(chartOfAccounts.accountType, "asset")));
      const nextSeq = existingCodes.length + 1;
      const accountCode = `11${String(nextSeq).padStart(2, "0")}`;

      const [account] = await tx
        .insert(chartOfAccounts)
        .values({
          agencyId: session.agencyId,
          accountCode,
          accountName: `${data.name} (Receivable)`,
          groupId: assetGroup.id,
          accountType: "asset",
          balanceType: "debit",
          openingBalance: String(data.openingBalance),
          isSystem: true,
        })
        .returning({ id: chartOfAccounts.id });

      await tx.insert(customers).values({
        agencyId: session.agencyId,
        name: data.name,
        customerCode: data.customerCode || null,
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
        passportNo: data.passportNo || null,
        accountId: account.id,
        openingBalance: String(data.openingBalance),
      });
    });

    revalidatePath("/customers");
    return { status: "success", message: `Customer "${data.name}" created.` };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : "Failed to create customer." };
  }
}
