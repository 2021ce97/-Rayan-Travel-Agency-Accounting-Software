"use server";

import { db, agencyExchangeRates } from "@/lib/db";
import { requireSession } from "@/lib/auth/get-session";
import { revalidatePath } from "next/cache";

export async function addExchangeRate(prevState: any, formData: FormData) {
  const session = await requireSession();

  const currencyId = parseInt(formData.get("currencyId") as string, 10);
  const rateToBase = parseFloat(formData.get("rateToBase") as string);
  const effectiveDate = formData.get("effectiveDate") as string;

  if (isNaN(currencyId) || isNaN(rateToBase) || !effectiveDate) {
    return { status: "error", message: "Invalid input values." };
  }

  try {
    await db.insert(agencyExchangeRates).values({
      agencyId: session.agencyId,
      currencyId,
      rateToBase: rateToBase.toString(),
      effectiveDate,
    });

    revalidatePath("/settings");

    return { status: "success", message: "Exchange rate added successfully." };
  } catch (error: any) {
    // Unique constraint error check
    if (error.code === '23505' || error.message.includes('unique constraint')) {
      return { status: "error", message: "An exchange rate already exists for this currency on this date." };
    }
    return { status: "error", message: "Failed to add exchange rate." };
  }
}
