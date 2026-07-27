"use client";

import { useActionState, useMemo, useState } from "react";
import { submitJournalVoucher, type JournalVoucherFormState } from "@/app/actions/journal-voucher";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/vouchers/field";
import { AccountPickerInline } from "@/components/vouchers/account-picker-inline";
import { Plus, Trash2 } from "lucide-react";

const initialState: JournalVoucherFormState = { status: "idle" };

interface Line {
  account: { id: number; label: string } | null;
  description: string;
  debitAmount: string;
  creditAmount: string;
}

const emptyLine = (): Line => ({ account: null, description: "", debitAmount: "", creditAmount: "" });

const voucherTypeOptions = [
  { value: "journal", label: "Journal" },
  { value: "cash", label: "Cash" },
  { value: "bank", label: "Bank" },
  { value: "expense", label: "Expense" },
];

export function JournalVoucherForm() {
  const [state, formAction, isPending] = useActionState(submitJournalVoucher, initialState);
  const [lines, setLines] = useState<Line[]>([emptyLine(), emptyLine()]);

  const totalDebit = useMemo(() => lines.reduce((s, l) => s + (Number(l.debitAmount) || 0), 0), [lines]);
  const totalCredit = useMemo(() => lines.reduce((s, l) => s + (Number(l.creditAmount) || 0), 0), [lines]);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  const linesJson = JSON.stringify(
    lines
      .filter((l) => l.account)
      .map((l) => ({
        accountId: l.account!.id,
        description: l.description || undefined,
        debitAmount: Number(l.debitAmount) || 0,
        creditAmount: Number(l.creditAmount) || 0,
      }))
  );

  function updateLine(index: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function addLine() {
    setLines((prev) => [...prev, emptyLine()]);
  }

  function removeLine(index: number) {
    setLines((prev) => (prev.length > 2 ? prev.filter((_, i) => i !== index) : prev));
  }

  return (
    <form action={formAction} className="space-y-6">
      {state.status === "success" && (
        <div className="rounded-md bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-800">
          {state.message}
        </div>
      )}
      {state.status === "error" && state.message && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-800">
          {state.message}
        </div>
      )}

      <input type="hidden" name="linesJson" value={linesJson} />

      <section className="bg-white border border-slate-200 rounded-lg p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">Voucher details</h2>
        <div className="grid grid-cols-4 gap-4">
          <Field label="Voucher No" name="voucherNo" required error={state.fieldErrors?.voucherNo} />
          <Field label="Voucher Date" name="voucherDate" type="date" required error={state.fieldErrors?.voucherDate} />
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-600">
              Type <span className="text-red-500">*</span>
            </span>
            <select
              name="voucherType"
              required
              defaultValue="journal"
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
            >
              {voucherTypeOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <Field label="Currency ID" name="currencyId" type="number" defaultValue={1} />
        </div>
        <div className="mt-4">
          <Field label="Notes" name="notes" placeholder="What this voucher is for" />
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-900">Lines</h2>
          <button
            type="button"
            onClick={addLine}
            className="flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900"
          >
            <Plus className="size-3.5" /> Add line
          </button>
        </div>

        <div className="space-y-2">
          <div className="grid grid-cols-12 gap-2 text-xs font-medium text-slate-500 px-1">
            <div className="col-span-4">Account</div>
            <div className="col-span-3">Description</div>
            <div className="col-span-2">Debit</div>
            <div className="col-span-2">Credit</div>
            <div className="col-span-1" />
          </div>
          {lines.map((line, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-4">
                <AccountPickerInline value={line.account} onChange={(account) => updateLine(i, { account })} />
              </div>
              <input
                value={line.description}
                onChange={(e) => updateLine(i, { description: e.target.value })}
                placeholder="Optional"
                className="col-span-3 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
              />
              <input
                type="number"
                step="0.01"
                value={line.debitAmount}
                onChange={(e) => updateLine(i, { debitAmount: e.target.value, creditAmount: "" })}
                placeholder="0.00"
                className="col-span-2 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
              />
              <input
                type="number"
                step="0.01"
                value={line.creditAmount}
                onChange={(e) => updateLine(i, { creditAmount: e.target.value, debitAmount: "" })}
                placeholder="0.00"
                className="col-span-2 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
              />
              <button
                type="button"
                onClick={() => removeLine(i)}
                disabled={lines.length <= 2}
                className="col-span-1 flex justify-center text-slate-400 hover:text-red-600 disabled:opacity-30 disabled:hover:text-slate-400"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-sm">
          <div className="flex gap-6">
            <div>
              <span className="text-xs text-slate-400">Total Debit </span>
              <span className="font-semibold text-slate-900">{totalDebit.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-xs text-slate-400">Total Credit </span>
              <span className="font-semibold text-slate-900">{totalCredit.toFixed(2)}</span>
            </div>
          </div>
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${
              isBalanced
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-amber-50 text-amber-700 border-amber-200"
            }`}
          >
            {isBalanced ? "Balanced" : "Not balanced"}
          </span>
        </div>
      </section>

      <div className="flex justify-end gap-3">
        <Button type="submit" disabled={isPending || !isBalanced}>
          {isPending ? "Posting…" : "Post Voucher"}
        </Button>
      </div>
    </form>
  );
}
