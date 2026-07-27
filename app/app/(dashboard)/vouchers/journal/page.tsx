import { JournalVoucherForm } from "./journal-voucher-form";

export default function JournalVoucherPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-slate-900">New Journal / Cash / Bank / Expense Voucher</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          For entries that aren't tied to a ticket, visa, or hotel booking — office rent, bank
          transfers, cash deposits, and similar.
        </p>
      </div>
      <JournalVoucherForm />
    </div>
  );
}
