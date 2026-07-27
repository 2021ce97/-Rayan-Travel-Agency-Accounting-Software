"use client";

import { useActionState, useMemo, useState } from "react";
import { submitPackageVoucher, type PackageVoucherFormState } from "@/app/actions/package-voucher";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/vouchers/field";
import { PartyPicker } from "@/components/vouchers/party-picker";
import { Plus, Trash2 } from "lucide-react";

const initialState: PackageVoucherFormState = { status: "idle" };

interface Item {
  itemType: "ticket" | "hotel" | "visa" | "transport" | "other";
  description: string;
  amount: string;
}

const emptyItem = (): Item => ({ itemType: "other", description: "", amount: "" });

const itemTypeOptions: Item["itemType"][] = ["ticket", "hotel", "visa", "transport", "other"];

export function PackageVoucherForm() {
  const [state, formAction, isPending] = useActionState(submitPackageVoucher, initialState);

  const [totalSaleAmount, setTotalSaleAmount] = useState(0);
  const [totalPurchaseAmount, setTotalPurchaseAmount] = useState(0);
  const [items, setItems] = useState<Item[]>([emptyItem()]);

  const profit = useMemo(
    () => totalSaleAmount - totalPurchaseAmount,
    [totalSaleAmount, totalPurchaseAmount]
  );

  const itemsSubtotal = useMemo(
    () => items.reduce((s, i) => s + (Number(i.amount) || 0), 0),
    [items]
  );

  const itemsJson = JSON.stringify(
    items
      .filter((i) => i.description || Number(i.amount) > 0)
      .map((i) => ({
        itemType: i.itemType,
        description: i.description || undefined,
        amount: Number(i.amount) || 0,
      }))
  );

  function updateItem(index: number, patch: Partial<Item>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }
  function addItem() {
    setItems((prev) => [...prev, emptyItem()]);
  }
  function removeItem(index: number) {
    setItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
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

      <input type="hidden" name="itemsJson" value={itemsJson} />

      <section className="bg-white border border-slate-200 rounded-lg p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">Voucher details</h2>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Voucher No" name="voucherNo" required error={state.fieldErrors?.voucherNo} />
          <Field label="Voucher Date" name="voucherDate" type="date" required error={state.fieldErrors?.voucherDate} />
          <Field label="Currency ID" name="currencyId" type="number" defaultValue={1} required />
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-lg p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">Customer &amp; package</h2>
        <div className="grid grid-cols-3 gap-4">
          <PartyPicker name="customerId" type="customer" label="Customer" required error={state.fieldErrors?.customerId} />
          <Field label="Package Name" name="packageName" required error={state.fieldErrors?.packageName} />
          <Field label="Destination" name="destination" />
          <Field label="Start Date" name="startDate" type="date" />
          <Field label="End Date" name="endDate" type="date" />
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Package items</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Itemized breakdown shown on the customer invoice — doesn't post its own accounting entries.
            </p>
          </div>
          <button
            type="button"
            onClick={addItem}
            className="flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900"
          >
            <Plus className="size-3.5" /> Add item
          </button>
        </div>

        <div className="space-y-2">
          <div className="grid grid-cols-12 gap-2 text-xs font-medium text-slate-500 px-1">
            <div className="col-span-2">Type</div>
            <div className="col-span-6">Description</div>
            <div className="col-span-3">Amount</div>
            <div className="col-span-1" />
          </div>
          {items.map((item, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <select
                value={item.itemType}
                onChange={(e) => updateItem(i, { itemType: e.target.value as Item["itemType"] })}
                className="col-span-2 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
              >
                {itemTypeOptions.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <input
                value={item.description}
                onChange={(e) => updateItem(i, { description: e.target.value })}
                placeholder="e.g. Return flight LHE–JED"
                className="col-span-6 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
              />
              <input
                type="number"
                step="0.01"
                value={item.amount}
                onChange={(e) => updateItem(i, { amount: e.target.value })}
                placeholder="0.00"
                className="col-span-3 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
              />
              <button
                type="button"
                onClick={() => removeItem(i)}
                disabled={items.length <= 1}
                className="col-span-1 flex justify-center text-slate-400 hover:text-red-600 disabled:opacity-30 disabled:hover:text-slate-400"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100 text-sm text-right">
          <span className="text-xs text-slate-400 mr-2">Items subtotal (reference only)</span>
          <span className="font-medium text-slate-700">{itemsSubtotal.toFixed(2)}</span>
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-lg p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">Pricing</h2>
        <div className="grid grid-cols-3 gap-4">
          <Field
            label="Total Sale Amount"
            name="totalSaleAmount"
            type="number"
            step="0.01"
            required
            onChange={(e) => setTotalSaleAmount(Number(e.target.value) || 0)}
          />
          <Field
            label="Total Purchase Amount (cost)"
            name="totalPurchaseAmount"
            type="number"
            step="0.01"
            required
            onChange={(e) => setTotalPurchaseAmount(Number(e.target.value) || 0)}
          />
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-xs text-slate-400">Sale Amount</div>
            <div className="font-semibold text-slate-900">{totalSaleAmount.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Purchase Amount</div>
            <div className="font-semibold text-slate-900">{totalPurchaseAmount.toFixed(2)}</div>
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
