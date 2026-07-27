"use server";

import { z } from "zod";
import { db, tickets, bspSales } from "@/lib/db";
import { requireSession } from "@/lib/auth/get-session";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

/**
 * BSP (IATA Billing & Settlement Plan) groups ticket sales into
 * fortnightly/monthly periods that get remitted to IATA, net of the
 * agency's commission. This flags an already-posted ticket as part of
 * a BSP period and records what's owed.
 *
 * Net remittance = what the agency owes IATA = gross fare - agency's
 * commission on that fare. This does NOT touch voucher_lines — BSP
 * is a settlement/reconciliation layer on top of tickets that are
 * already fully posted through postTicketVoucher. Marking the actual
 * bank transfer to IATA as paid is a separate step (a journal
 * voucher crediting Bank and debiting BSP Payable, 2100).
 */

const markBspSchema = z.object({
  ticketId: z.coerce.number().int().positive(),
  bspPeriod: z.string().min(1, "BSP period is required, e.g. 2026-08-1"),
});

export type BspFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function markTicketAsBsp(
  _prevState: BspFormState,
  formData: FormData
): Promise<BspFormState> {
  const parsed = markBspSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!parsed.success) {
    return { status: "error", message: "Please fix the errors below.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const session = await requireSession();

  const [ticket] = await db
    .select()
    .from(tickets)
    .where(and(eq(tickets.id, parsed.data.ticketId), eq(tickets.agencyId, session.agencyId)));

  if (!ticket) {
    return { status: "error", message: "Ticket not found for this agency." };
  }

  const grossAmount = Number(ticket.baseFare) + Number(ticket.taxAmount);
  const commissionAmount = Number(ticket.commissionAmount);
  const netRemittance = grossAmount - commissionAmount;

  try {
    await db.transaction(async (tx) => {
      await tx.insert(bspSales).values({
        agencyId: session.agencyId,
        ticketId: ticket.id,
        bspPeriod: parsed.data.bspPeriod,
        airlineId: ticket.airlineId,
        grossAmount: String(grossAmount),
        commissionAmount: String(commissionAmount),
        netRemittance: String(netRemittance),
        settlementStatus: "pending",
      });

      await tx.update(tickets).set({ isBsp: true }).where(eq(tickets.id, ticket.id));
    });

    revalidatePath("/vouchers/bsp");
    return { status: "success", message: `Ticket ${ticket.ticketNo ?? ticket.pnr} added to BSP period ${parsed.data.bspPeriod}.` };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : "Failed to mark ticket as BSP." };
  }
}

const updateStatusSchema = z.object({
  bspSaleId: z.coerce.number().int().positive(),
  settlementStatus: z.enum(["pending", "submitted", "settled"]),
});

export async function updateBspStatus(formData: FormData): Promise<void> {
  const parsed = updateStatusSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return;

  const session = await requireSession();

  await db
    .update(bspSales)
    .set({ settlementStatus: parsed.data.settlementStatus })
    .where(and(eq(bspSales.id, parsed.data.bspSaleId), eq(bspSales.agencyId, session.agencyId)));

  revalidatePath("/vouchers/bsp");
}
