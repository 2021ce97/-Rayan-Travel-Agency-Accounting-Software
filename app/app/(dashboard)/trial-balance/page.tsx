import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth/get-session";
import { sql } from "drizzle-orm";
import { Scale } from "lucide-react";
import { BranchFilter } from "../reports/branch-filter";

interface TrialBalanceRow {
  [key: string]: unknown;
  account_code: string;
  account_name: string;
  account_type: string;
  total_debit: string;
  total_credit: string;
  balance: string;
}

export default async function TrialBalancePage(props: { searchParams: Promise<{ branchId?: string }> }) {
  const searchParams = await props.searchParams;
  const session = await requireSession();
  const selectedBranchId = searchParams.branchId ? parseInt(searchParams.branchId, 10) : undefined;

  const [branches, result] = await Promise.all([
    db.select({ id: sql`id`, name: sql`name` }).from(sql`branches`).where(sql`agency_id = ${session.agencyId}`),
    db.execute<TrialBalanceRow>(
      selectedBranchId
        ? sql`
            SELECT account_code, account_name, account_type, SUM(total_debit) as total_debit, SUM(total_credit) as total_credit, SUM(balance) as balance
            FROM trial_balance_view
            WHERE agency_id = ${session.agencyId} AND branch_id = ${selectedBranchId}
            GROUP BY account_code, account_name, account_type
            ORDER BY account_code
          `
        : sql`
            SELECT account_code, account_name, account_type, SUM(total_debit) as total_debit, SUM(total_credit) as total_credit, SUM(balance) as balance
            FROM trial_balance_view
            WHERE agency_id = ${session.agencyId}
            GROUP BY account_code, account_name, account_type
            ORDER BY account_code
          `
    ),
  ]);

  const rows = result;
  const totalDebit = rows.reduce((s, r) => s + Number(r.total_debit), 0);
  const totalCredit = rows.reduce((s, r) => s + Number(r.total_credit), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  return (
    <div className="space-y-6">
      <section className="rounded-[24px] border border-slate-200/70 bg-gradient-to-br from-slate-950 via-slate-900 to-amber-900 p-6 text-white shadow-[0_22px_70px_-30px_rgba(15,23,42,0.6)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-sm font-medium text-slate-200 backdrop-blur">
              <Scale className="size-4" /> Trial balance
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight">Trial Balance</h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-300">
              Review every account’s debit and credit totals to ensure the books remain balanced and audit-ready.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <BranchFilter branches={branches as any} />
            <div className={`rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-slate-200 backdrop-blur ${isBalanced ? "" : "border-rose-300/40"}`}>
              <div className="font-semibold text-white">Book status</div>
              <div className={`mt-1 text-xl font-bold ${isBalanced ? "text-emerald-300" : "text-rose-300"}`}>
                {isBalanced ? "Balanced" : "Needs review"}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="overflow-hidden rounded-[24px] border border-slate-200/70 bg-white/70 shadow-sm backdrop-blur">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Account</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3 text-right">Debit</th>
              <th className="px-4 py-3 text-right">Credit</th>
              <th className="px-4 py-3 text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                  No postings yet.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.account_code} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70">
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{r.account_code}</td>
                <td className="px-4 py-3 font-semibold text-slate-900">{r.account_name}</td>
                <td className="px-4 py-3 capitalize text-slate-500">{r.account_type}</td>
                <td className="px-4 py-3 text-right text-slate-900">{Number(r.total_debit).toFixed(2)}</td>
                <td className="px-4 py-3 text-right text-slate-900">{Number(r.total_credit).toFixed(2)}</td>
                <td className={`px-4 py-3 text-right font-semibold ${Number(r.balance) >= 0 ? "text-slate-900" : "text-red-600"}`}>
                  {Number(r.balance).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-50/70 font-semibold">
                <td className="px-4 py-3" colSpan={3}>Total</td>
                <td className="px-4 py-3 text-right">{totalDebit.toFixed(2)}</td>
                <td className="px-4 py-3 text-right">{totalCredit.toFixed(2)}</td>
                <td className="px-4 py-3 text-right">{(totalDebit - totalCredit).toFixed(2)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
