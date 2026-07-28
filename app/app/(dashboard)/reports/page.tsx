import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth/get-session";
import { sql } from "drizzle-orm";
import { BarChart3, TrendingUp } from "lucide-react";
import { BranchFilter } from "./branch-filter";

interface PLRow {
  [key: string]: unknown;
  account_type: string;
  account_name: string;
  net_amount: string;
}
interface AirlineRow {
  [key: string]: unknown;
  airline_name: string;
  ticket_count: number;
  total_sales: string;
  total_cost: string;
  total_profit: string;
}
interface AgingRow {
  [key: string]: unknown;
  aging_bucket: string;
  customer_name: string;
  voucher_no: string;
  total_amount: string;
  days_outstanding: number;
}

export default async function ReportsPage(props: { searchParams: Promise<{ branchId?: string }> }) {
  const searchParams = await props.searchParams;
  const session = await requireSession();
  const selectedBranchId = searchParams.branchId ? parseInt(searchParams.branchId, 10) : undefined;

  const [branches, plResult, airlineResult, agingResult] = await Promise.all([
    db.select({ id: sql`id`, name: sql`name` }).from(sql`branches`).where(sql`agency_id = ${session.agencyId}`),
    db.execute<PLRow>(
      selectedBranchId
        ? sql`SELECT account_type, account_name, net_amount FROM profit_loss_view WHERE agency_id = ${session.agencyId} AND branch_id = ${selectedBranchId} ORDER BY account_type, account_name`
        : sql`SELECT account_type, account_name, sum(net_amount) as net_amount FROM profit_loss_view WHERE agency_id = ${session.agencyId} GROUP BY account_type, account_name ORDER BY account_type, account_name`
    ),
    db.execute<AirlineRow>(
      selectedBranchId
        ? sql`SELECT airline_name, sum(ticket_count) as ticket_count, sum(total_sales) as total_sales, sum(total_cost) as total_cost, sum(total_profit) as total_profit FROM airline_wise_sales_view WHERE agency_id = ${session.agencyId} AND branch_id = ${selectedBranchId} GROUP BY airline_name ORDER BY total_sales DESC`
        : sql`SELECT airline_name, sum(ticket_count) as ticket_count, sum(total_sales) as total_sales, sum(total_cost) as total_cost, sum(total_profit) as total_profit FROM airline_wise_sales_view WHERE agency_id = ${session.agencyId} GROUP BY airline_name ORDER BY total_sales DESC`
    ),
    db.execute<AgingRow>(
      selectedBranchId
        ? sql`SELECT aging_bucket, customer_name, voucher_no, total_amount, days_outstanding FROM aging_report_view WHERE agency_id = ${session.agencyId} AND branch_id = ${selectedBranchId} ORDER BY days_outstanding DESC LIMIT 50`
        : sql`SELECT aging_bucket, customer_name, voucher_no, total_amount, days_outstanding FROM aging_report_view WHERE agency_id = ${session.agencyId} ORDER BY days_outstanding DESC LIMIT 50`
    ),
  ]);

  const plRows = plResult;
  const airlineRows = airlineResult;
  const agingRows = agingResult;

  const income = plRows.filter((r) => r.account_type === "income");
  const expense = plRows.filter((r) => r.account_type === "expense");
  const totalIncome = income.reduce((s, r) => s + Number(r.net_amount), 0);
  const totalExpense = expense.reduce((s, r) => s - Number(r.net_amount), 0);
  const netProfit = totalIncome - totalExpense;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <section className="rounded-[24px] border border-slate-200/70 bg-gradient-to-br from-slate-950 via-slate-900 to-sky-900 p-6 text-white shadow-[0_22px_70px_-30px_rgba(15,23,42,0.6)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-sm font-medium text-slate-200 backdrop-blur">
              <BarChart3 className="size-4" /> Executive reporting
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight">Reports</h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-300">
              Review profit and loss, airline performance, and receivables aging from one consolidated view.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <BranchFilter branches={branches as any} />

            <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-slate-200 backdrop-blur">
              <div className="font-semibold text-white">Net profit</div>
              <div className={`mt-1 text-xl font-bold ${netProfit >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{netProfit.toFixed(2)}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[24px] border border-slate-200/70 bg-white/70 p-2 shadow-sm backdrop-blur">
        <div className="mb-4 flex items-center gap-2 px-4 pt-4">
          <div className="h-6 w-2 rounded-full bg-blue-500" />
          <h2 className="text-base font-bold text-slate-800">Profit & Loss</h2>
        </div>
        <div className="overflow-hidden rounded-[20px] border border-slate-200/70">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-100/70 bg-white/70">
              <tr className="bg-slate-50/70">
                <td className="px-6 py-3 text-[11px] font-bold uppercase tracking-[0.25em] text-slate-500" colSpan={2}>Income</td>
              </tr>
              {income.length === 0 && (
                <tr><td className="px-6 py-6 text-center font-medium text-slate-500" colSpan={2}>No income posted yet.</td></tr>
              )}
              {income.map((r) => (
                <tr key={r.account_name} className="hover:bg-slate-50/70">
                  <td className="px-6 py-3 pl-10 font-medium text-slate-700">{r.account_name}</td>
                  <td className="px-6 py-3 text-right font-semibold text-slate-900">{Number(r.net_amount).toFixed(2)}</td>
                </tr>
              ))}
              <tr className="bg-slate-50/70">
                <td className="px-6 py-3 text-[11px] font-bold uppercase tracking-[0.25em] text-slate-500" colSpan={2}>Expenses</td>
              </tr>
              {expense.length === 0 && (
                <tr><td className="px-6 py-6 text-center font-medium text-slate-500" colSpan={2}>No expenses posted yet.</td></tr>
              )}
              {expense.map((r) => (
                <tr key={r.account_name} className="hover:bg-slate-50/70">
                  <td className="px-6 py-3 pl-10 font-medium text-slate-700">{r.account_name}</td>
                  <td className="px-6 py-3 text-right font-semibold text-slate-900">{(-Number(r.net_amount)).toFixed(2)}</td>
                </tr>
              ))}
              <tr className="border-t border-slate-200/70 bg-white/70">
                <td className="px-6 py-5 text-base font-bold text-slate-800">Net Profit</td>
                <td className={`px-6 py-5 text-right text-lg font-bold ${netProfit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  {netProfit >= 0 ? "+" : ""}{netProfit.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-[24px] border border-slate-200/70 bg-white/70 p-2 shadow-sm backdrop-blur">
        <div className="mb-4 flex items-center gap-2 px-4 pt-4">
          <div className="h-6 w-2 rounded-full bg-violet-500" />
          <h2 className="text-base font-bold text-slate-800">Airline-wise Sales</h2>
        </div>
        <div className="overflow-hidden rounded-[20px] border border-slate-200/70">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-left text-[11px] font-bold uppercase tracking-[0.25em] text-slate-500">
                <th className="px-6 py-4">Airline</th>
                <th className="px-6 py-4 text-right">Tickets</th>
                <th className="px-6 py-4 text-right">Sales</th>
                <th className="px-6 py-4 text-right">Cost</th>
                <th className="px-6 py-4 text-right">Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/70 bg-white/70">
              {airlineRows.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-12 text-center font-medium text-slate-500">No ticket sales yet.</td></tr>
              )}
              {airlineRows.map((r) => (
                <tr key={r.airline_name} className="hover:bg-slate-50/70">
                  <td className="px-6 py-4 font-semibold text-slate-800">{r.airline_name}</td>
                  <td className="px-6 py-4 text-right font-medium text-slate-600">{r.ticket_count}</td>
                  <td className="px-6 py-4 text-right font-semibold text-slate-900">{Number(r.total_sales).toFixed(2)}</td>
                  <td className="px-6 py-4 text-right font-medium text-slate-600">{Number(r.total_cost).toFixed(2)}</td>
                  <td className={`px-6 py-4 text-right font-bold ${Number(r.total_profit) >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {Number(r.total_profit).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-[24px] border border-slate-200/70 bg-white/70 p-2 shadow-sm backdrop-blur">
        <div className="mb-4 flex items-center gap-2 px-4 pt-4">
          <div className="h-6 w-2 rounded-full bg-rose-500" />
          <h2 className="text-base font-bold text-slate-800">Receivables Aging (Top 50)</h2>
        </div>
        <div className="overflow-hidden rounded-[20px] border border-slate-200/70">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-left text-[11px] font-bold uppercase tracking-[0.25em] text-slate-500">
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Voucher</th>
                <th className="px-6 py-4 text-right">Amount</th>
                <th className="px-6 py-4 text-right">Days</th>
                <th className="px-6 py-4 text-center">Bucket</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/70 bg-white/70">
              {agingRows.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-12 text-center font-medium text-slate-500">No outstanding receivables.</td></tr>
              )}
              {agingRows.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50/70">
                  <td className="px-6 py-4 font-semibold text-slate-800">{r.customer_name}</td>
                  <td className="px-6 py-4 font-medium text-slate-600">{r.voucher_no}</td>
                  <td className="px-6 py-4 text-right font-semibold text-slate-900">{Number(r.total_amount).toFixed(2)}</td>
                  <td className="px-6 py-4 text-right font-medium text-slate-600">{r.days_outstanding}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold tracking-wide ${r.aging_bucket === "90+" ? "border-rose-100 bg-rose-50 text-rose-700" : r.aging_bucket === "61-90" ? "border-amber-100 bg-amber-50 text-amber-700" : "border-slate-200 bg-slate-100 text-slate-600"}`}>
                      {r.aging_bucket} days
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
