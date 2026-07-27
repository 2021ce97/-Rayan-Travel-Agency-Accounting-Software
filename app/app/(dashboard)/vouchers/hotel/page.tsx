import { HotelVoucherForm } from "./hotel-voucher-form";

export default function HotelVoucherPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-slate-900">New Hotel Voucher</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Posting this voucher automatically creates the matching double-entry accounting lines.
        </p>
      </div>
      <HotelVoucherForm />
    </div>
  );
}
