"use client";

import { useActionState } from "react";
import { addExchangeRate } from "@/app/actions/exchange-rates";

const initialState = { status: "idle", message: "" };

export function ExchangeRatesForm({ currencies }: { currencies: Array<{ id: number; code: string; name: string }> }) {
  const [state, formAction, isPending] = useActionState(addExchangeRate as any, initialState);

  return (
    <form action={formAction} className="bg-slate-50/50 p-6 space-y-4 rounded-xl border border-slate-100">
      <div className="grid gap-4 md:grid-cols-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-600">Currency</span>
          <select name="currencyId" required className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-900/10">
            <option value="">Select currency</option>
            {currencies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} - {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-600">Rate to Base Currency</span>
          <input type="number" step="0.000001" name="rateToBase" required placeholder="e.g. 278.50" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-900/10" />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-600">Effective Date</span>
          <input type="date" name="effectiveDate" required defaultValue={new Date().toISOString().split("T")[0]} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-900/10" />
        </label>
      </div>

      {state.message ? (
        <div className={`rounded-lg px-3 py-2 text-sm ${state.status === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
          {state.message}
        </div>
      ) : null}

      <div className="flex justify-end mt-2">
        <button type="submit" disabled={isPending} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
          {isPending ? "Adding..." : "Add Rate"}
        </button>
      </div>
    </form>
  );
}
