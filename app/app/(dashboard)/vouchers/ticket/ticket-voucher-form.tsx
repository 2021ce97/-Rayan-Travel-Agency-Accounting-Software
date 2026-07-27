"use client";

import { useActionState, useMemo, useState } from "react";
import { submitTicketVoucher, type TicketVoucherFormState } from "@/app/actions/ticket-voucher";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/vouchers/field";
import { PartyPicker } from "@/components/vouchers/party-picker";

const initialState: TicketVoucherFormState = { status: "idle" };

export function TicketVoucherForm() {
  const [state, formAction, isPending] = useActionState(submitTicketVoucher, initialState);

  const [baseFare, setBaseFare] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [serviceCharge, setServiceCharge] = useState(0);
  const [purchaseAmount, setPurchaseAmount] = useState(0);
  const [commissionAmount, setCommissionAmount] = useState(0);

  const saleAmount = useMemo(
    () => baseFare + taxAmount + serviceCharge,
    [baseFare, taxAmount, serviceCharge]
  );
  const profit = useMemo(() => saleAmount - purchaseAmount, [saleAmount, purchaseAmount]);

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
        <h2 className="text-sm font-semibold text-slate-900 mb-4">Voucher details</h2>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Voucher No" name="voucherNo" required error={state.fieldErrors?.voucherNo} />
          <Field label="Voucher Date" name="voucherDate" type="date" required error={state.fieldErrors?.voucherDate} />
          <Field label="Currency ID" name="currencyId" type="number" defaultValue={1} required />
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-lg p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">Parties</h2>
        <div className="grid grid-cols-2 gap-4">
          <PartyPicker
            name="customerId"
            type="customer"
            label="Customer"
            required
            error={state.fieldErrors?.customerId}
          />
          <PartyPicker
            name="supplierId"
            type="supplier"
            label="Supplier"
            required
            error={state.fieldErrors?.supplierId}
          />
          <PartyPicker name="airlineId" type="airline" label="Airline" />
          <PartyPicker name="consultantId" type="consultant" label="Consultant" />
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-lg p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">Ticket details</h2>
        <div className="grid grid-cols-3 gap-4">
          <Field label="PNR" name="pnr" />
          <Field label="Ticket No" name="ticketNo" />
          <Field label="Passenger Name" name="passengerName" />
          <Field label="Sector From" name="sectorFrom" placeholder="LHE" />
          <Field label="Sector To" name="sectorTo" placeholder="JED" />
          <Field label="Issue Date" name="issueDate" type="date" />
          <Field label="Travel Date" name="travelDate" type="date" />
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-lg p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">Pricing</h2>
        <div className="grid grid-cols-3 gap-4">
          <Field
            label="Base Fare"
            name="baseFare"
            type="number"
            step="0.01"
            required
            onChange={(e) => setBaseFare(Number(e.target.value) || 0)}
          />
          <Field
            label="Tax Amount"
            name="taxAmount"
            type="number"
            step="0.01"
            onChange={(e) => setTaxAmount(Number(e.target.value) || 0)}
          />
          <Field
            label="Service Charge"
            name="serviceCharge"
            type="number"
            step="0.01"
            onChange={(e) => setServiceCharge(Number(e.target.value) || 0)}
          />
          <Field
            label="Commission Amount"
            name="commissionAmount"
            type="number"
            step="0.01"
            onChange={(e) => setCommissionAmount(Number(e.target.value) || 0)}
          />
          <Field
            label="Purchase Amount (cost)"
            name="purchaseAmount"
            type="number"
            step="0.01"
            required
            onChange={(e) => setPurchaseAmount(Number(e.target.value) || 0)}
          />
          <Field label="Exchange Rate" name="exchangeRate" type="number" step="0.000001" defaultValue={1} />
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-xs text-slate-400">Sale Amount</div>
            <div className="font-semibold text-slate-900">{saleAmount.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Purchase Amount</div>
            <div className="font-semibold text-slate-900">{purchaseAmount.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Profit</div>
            <div className={`font-semibold ${profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {profit.toFixed(2)}
            </div>
          </div>
        </div>
      </section>

      <div className="flex justify-end gap-3">
        <Button type="reset" variant="outline">
          Clear
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Posting…" : "Post Voucher"}
        </Button>
      </div>
    </form>
  );
}
