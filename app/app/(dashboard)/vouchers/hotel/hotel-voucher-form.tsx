"use client";

import { useActionState, useMemo, useState } from "react";
import { submitHotelVoucher, type HotelVoucherFormState } from "@/app/actions/hotel-voucher";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/vouchers/field";
import { PartyPicker } from "@/components/vouchers/party-picker";

const initialState: HotelVoucherFormState = { status: "idle" };

export function HotelVoucherForm() {
  const [state, formAction, isPending] = useActionState(submitHotelVoucher, initialState);

  const [sellingAmount, setSellingAmount] = useState(0);
  const [purchaseAmount, setPurchaseAmount] = useState(0);
  const profit = useMemo(() => sellingAmount - purchaseAmount, [sellingAmount, purchaseAmount]);

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
        <div className="grid grid-cols-3 gap-4">
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
          <PartyPicker name="consultantId" type="consultant" label="Consultant" />
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-lg p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">Stay details</h2>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Hotel Name" name="hotelName" />
          <Field label="Country ID" name="countryId" type="number" />
          <Field label="City ID" name="cityId" type="number" />
          <Field label="Check-in Date" name="checkInDate" type="date" />
          <Field label="Check-out Date" name="checkOutDate" type="date" />
          <Field label="Nights" name="nights" type="number" min={0} />
          <Field label="Rooms" name="rooms" type="number" min={0} />
          <Field label="Adults" name="adults" type="number" min={0} />
          <Field label="Children" name="children" type="number" min={0} />
          <Field label="Room Type" name="roomType" placeholder="Double, Twin, Suite…" />
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-lg p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">Pricing</h2>
        <div className="grid grid-cols-3 gap-4">
          <Field
            label="Selling Amount"
            name="sellingAmount"
            type="number"
            step="0.01"
            required
            onChange={(e) => setSellingAmount(Number(e.target.value) || 0)}
          />
          <Field
            label="Purchase Amount (cost)"
            name="purchaseAmount"
            type="number"
            step="0.01"
            required
            onChange={(e) => setPurchaseAmount(Number(e.target.value) || 0)}
          />
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-xs text-slate-400">Selling Amount</div>
            <div className="font-semibold text-slate-900">{sellingAmount.toFixed(2)}</div>
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
