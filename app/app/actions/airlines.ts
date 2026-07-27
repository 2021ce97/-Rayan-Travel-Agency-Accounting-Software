"use server";

import { z } from "zod";
import { db, airlines } from "@/lib/db";
import { requireSession } from "@/lib/auth/get-session";
import { revalidatePath } from "next/cache";

const airlineSchema = z.object({
  name: z.string().min(1, "Name is required"),
  airlineCode: z.string().optional(),
  iataCode: z.string().optional(),
});

export type AirlineFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function createAirline(
  _prevState: AirlineFormState,
  formData: FormData
): Promise<AirlineFormState> {
  const parsed = airlineSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!parsed.success) {
    return { status: "error", message: "Please fix the errors below.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const session = await requireSession();

  try {
    await db.insert(airlines).values({
      agencyId: session.agencyId,
      name: parsed.data.name,
      airlineCode: parsed.data.airlineCode || null,
      iataCode: parsed.data.iataCode || null,
    });

    revalidatePath("/airlines");
    return { status: "success", message: `Airline "${parsed.data.name}" added.` };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : "Failed to add airline." };
  }
}
