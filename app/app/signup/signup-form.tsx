"use client";

import { useActionState } from "react";
import { signup, type SignupFormState } from "@/app/actions/signup";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/vouchers/field";

const initialState: SignupFormState = { status: "idle" };

const currencyOptions = ["PKR", "USD", "AFN", "SAR", "AED", "GBP", "EUR"];

export function SignupForm() {
  const [state, formAction, isPending] = useActionState(signup, initialState);

  return (
    <form action={formAction} className="space-y-5">
      {state.status === "error" && state.message && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800">
          {state.message}
        </div>
      )}

      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Your agency</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2">
            <Field label="Agency Name" name="agencyName" required error={state.fieldErrors?.agencyName} />
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Base Currency</span>
            <select
              name="baseCurrency"
              defaultValue="PKR"
              className="rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none transition focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-500/10"
            >
              {currencyOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Your account</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Your Name" name="ownerName" required error={state.fieldErrors?.ownerName} />
          <Field label="Email" name="email" type="email" required error={state.fieldErrors?.email} />
          <Field
            label="Password"
            name="password"
            type="password"
            required
            error={state.fieldErrors?.password}
            autoComplete="new-password"
          />
          <Field
            label="Confirm Password"
            name="confirmPassword"
            type="password"
            required
            error={state.fieldErrors?.confirmPassword}
            autoComplete="new-password"
          />
        </div>
      </div>

      <p className="text-xs leading-5 text-slate-400">
        You will be set up as the account owner with full access, on a 14-day trial. We will create your default chart of accounts and roles automatically.
      </p>

      <Button type="submit" className="w-full rounded-2xl bg-slate-900 text-white shadow-lg shadow-slate-900/10 hover:bg-slate-800" disabled={isPending}>
        {isPending ? "Creating your workspace…" : "Create Agency Account"}
      </Button>
    </form>
  );
}
