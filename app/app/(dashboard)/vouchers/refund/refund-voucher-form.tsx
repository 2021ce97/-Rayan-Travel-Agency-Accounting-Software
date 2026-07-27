"use client";

import { useActionState } from "react";
import { submitRefundVoucher, type RefundVoucherFormState } from "@/app/actions/refund-voucher";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/vouchers/field";
import { PartyPicker } from "@/components/vouchers/party-picker";

const initialState: RefundVoucherFormState = { status: "idle" };

export function RefundVoucherForm() {
  const [state, formAction, isPending] = useActionState(submitRefundVoucher, initialState);

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

      <section className="bg-white border border-slate-200 rounded-lg p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">Refund details</h2>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Voucher No" name="voucherNo" required error={state.fieldErrors?.voucherNo} />
          <Field label="Voucher Date" name="voucherDate" type="date" required error={state.fieldErrors?.voucherDate} />
          <PartyPicker
            name="relatedVoucherId"
            type="voucher"
            label="Original Voucher"
            required
            error={state.fieldErrors?.relatedVoucherId}
          />
          <Field label="Currency ID" name="currencyId" type="number" defaultValue={1} required />
          <Field
            label="Refund Amount"
            name="amount"
            type="number"
            step="0.01"
            required
            error={state.fieldErrors?.amount}
          />
        </div>
        <div className="mt-4">
          <Field label="Reason" name="reason" placeholder="Customer cancelled trip, schedule change, etc." />
        </div>
        <p className="text-xs text-slate-400 mt-3">
          This posts a credit back to the customer's receivable balance and an entry against
          Refunds &amp; Cancellations. The original voucher stays unchanged as a historical record.
        </p>
      </section>

      <div className="flex justify-end gap-3">
        <Button type="reset" variant="outline">
          Clear
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Posting…" : "Post Refund"}
        </Button>
      </div>
    </form>
  );
}
