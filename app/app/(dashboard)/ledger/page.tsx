import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth/get-session";
import { sql } from "drizzle-orm";
import { BookOpen, FileText } from "lucide-react";
import { BranchFilter } from "../reports/branch-filter";

interface LedgerRow {
  [key: string]: unknown;
  account_id: number;
  account_name: string;
  voucher_id: number;
  voucher_no: string;
  voucher_type: string;
  voucher_date: string;
  description: string | null;
  debit_amount: string;
  credit_amount: string;
  net_amount: string;
}

export default async function LedgerPage(props: { searchParams: Promise<{ branchId?: string }> }) {
  const searchParams = await props.searchParams;
  const session = await requireSession();
  const selectedBranchId = searchParams.branchId ? parseInt(searchParams.branchId, 10) : undefined;

  const [branches, result] = await Promise.all([
    db.select({ id: sql`id`, name: sql`name` }).from(sql`branches`).where(sql`agency_id = ${session.agencyId}`),
    db.execute<LedgerRow>(
      selectedBranchId
        ? sql`
            SELECT account_id, account_name, voucher_id, voucher_no, voucher_type,
                   voucher_date, description, debit_amount, credit_amount, net_amount
            FROM ledger_view
            WHERE agency_id = ${session.agencyId} AND branch_id = ${selectedBranchId}
            ORDER BY voucher_date DESC, voucher_id DESC
            LIMIT 200
          `
        : sql`
            SELECT account_id, account_name, voucher_id, voucher_no, voucher_type,
                   voucher_date, description, debit_amount, credit_amount, net_amount
            FROM ledger_view
            WHERE agency_id = ${session.agencyId}
            ORDER BY voucher_date DESC, voucher_id DESC
            LIMIT 200
          `
    ),
  ]);

  const rows = result;

  return (
    <div className="space-y-6">
      <section className="rounded-[24px] border border-slate-200/70 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-900 p-6 text-white shadow-[0_22px_70px_-30px_rgba(15,23,42,0.6)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-sm font-medium text-slate-200 backdrop-blur">
              <BookOpen className="size-4" /> Double-entry ledger
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight">Ledger</h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-300">
              Every posted debit and credit line is visible here in chronological order, helping you audit travel vouchers with confidence.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <BranchFilter branches={branches as any} />
            <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-slate-200 backdrop-blur">
              <div className="font-semibold text-white">Latest entries</div>
              <div className="mt-1 text-xl font-bold text-white">{rows.length}</div>
            </div>
          </div>
        </div>
      </section>

      <div className="overflow-hidden rounded-[24px] border border-slate-200/70 bg-white/70 shadow-sm backdrop-blur">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Voucher</th>
              <th className="px-4 py-3">Account</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3 text-right">Debit</th>
              <th className="px-4 py-3 text-right">Credit</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                  No ledger entries yet.
                </td>
              </tr>
            )}
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70">
                <td className="px-4 py-3 text-slate-600">{r.voucher_date}</td>
                <td className="px-4 py-3 font-semibold text-slate-900">{r.voucher_no}</td>
                <td className="px-4 py-3 text-slate-600">{r.account_name}</td>
                <td className="px-4 py-3 text-slate-500">{r.description ?? "—"}</td>
                <td className="px-4 py-3 text-right text-slate-900">
                  {Number(r.debit_amount) > 0 ? Number(r.debit_amount).toFixed(2) : ""}
                </td>
                <td className="px-4 py-3 text-right text-slate-900">
                  {Number(r.credit_amount) > 0 ? Number(r.credit_amount).toFixed(2) : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
