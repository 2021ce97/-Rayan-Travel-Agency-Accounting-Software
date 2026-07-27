import { RefundVoucherForm } from "./refund-voucher-form";

export default function RefundVoucherPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-slate-900">New Refund Voucher</h1>
        <p className="text-sm text-slate-500 mt-0.5">Issue a refund against an existing posted voucher.</p>
      </div>
      <RefundVoucherForm />
    </div>
  );
}
