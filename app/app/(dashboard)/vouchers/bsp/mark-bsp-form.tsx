"use client";

import { useActionState } from "react";
import { markTicketAsBsp, type BspFormState } from "@/app/actions/bsp";
import { Button } from "@/components/ui/button";
import { PartyPicker } from "@/components/vouchers/party-picker";
import { Field } from "@/components/vouchers/field";

const initialState: BspFormState = { status: "idle" };

export function MarkBspForm() {
  const [state, formAction, isPending] = useActionState(markTicketAsBsp, initialState);

  return (
    <form action={formAction} className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
      <h2 className="text-sm font-semibold text-slate-900">Add a ticket to a BSP period</h2>

      {state.status === "success" && (
        <div className="rounded-md bg-emerald-50 border border-emerald-200 px-4 py-2 text-sm text-emerald-800">
          {state.message}
        </div>
      )}
      {state.status === "error" && state.message && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-800">
          {state.message}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <PartyPicker name="ticketId" type="ticket" label="Ticket" required error={state.fieldErrors?.ticketId} />
        <Field
          label="BSP Period"
          name="bspPeriod"
          placeholder="2026-08-1 (first half of Aug)"
          required
          error={state.fieldErrors?.bspPeriod}
        />
      </div>
      <p className="text-xs text-slate-400">
        Only shows tickets not already added to a BSP period.
      </p>

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Adding…" : "Add to BSP"}
        </Button>
      </div>
    </form>
  );
}
