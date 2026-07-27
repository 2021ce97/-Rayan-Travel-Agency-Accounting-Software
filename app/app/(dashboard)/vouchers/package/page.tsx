import { PackageVoucherForm } from "./package-voucher-form";

export default function PackageVoucherPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-slate-900">New Package Voucher</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Bundles multiple components (flight, hotel, visa, transport) into one customer sale.
          Posts a single income/cost pair — component vouchers already sold separately shouldn't be re-added here.
        </p>
      </div>
      <PackageVoucherForm />
    </div>
  );
}
