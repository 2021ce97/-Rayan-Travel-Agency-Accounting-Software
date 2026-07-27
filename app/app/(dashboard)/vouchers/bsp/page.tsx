import { db, bspSales, tickets, airlines } from "@/lib/db";
import { requireSession } from "@/lib/auth/get-session";
import { eq, desc } from "drizzle-orm";
import { MarkBspForm } from "./mark-bsp-form";
import { updateBspStatus } from "@/app/actions/bsp";

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    settled: "bg-emerald-50 text-emerald-700 border-emerald-200",
    submitted: "bg-amber-50 text-amber-700 border-amber-200",
    pending: "bg-slate-100 text-slate-600 border-slate-200",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${styles[status] ?? styles.pending}`}>
      {status}
    </span>
  );
}

export default async function BspPage() {
  const session = await requireSession();

  const rows = await db
    .select({
      id: bspSales.id,
      bspPeriod: bspSales.bspPeriod,
      grossAmount: bspSales.grossAmount,
      commissionAmount: bspSales.commissionAmount,
      netRemittance: bspSales.netRemittance,
      settlementStatus: bspSales.settlementStatus,
      ticketNo: tickets.ticketNo,
      pnr: tickets.pnr,
      airlineName: airlines.name,
    })
    .from(bspSales)
    .leftJoin(tickets, eq(tickets.id, bspSales.ticketId))
    .leftJoin(airlines, eq(airlines.id, bspSales.airlineId))
    .where(eq(bspSales.agencyId, session.agencyId))
    .orderBy(desc(bspSales.bspPeriod));

  const byPeriod = rows.reduce<Record<string, typeof rows>>((acc, r) => {
    (acc[r.bspPeriod] ??= []).push(r);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">BSP Settlement</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          IATA Billing &amp; Settlement Plan batches — track what's owed to IATA per period, net of commission.
        </p>
      </div>

      <MarkBspForm />

      {Object.keys(byPeriod).length === 0 && (
        <div className="bg-white border border-slate-200 rounded-lg px-4 py-10 text-center text-slate-400 text-sm">
          No tickets added to a BSP period yet.
        </div>
      )}

      {Object.entries(byPeriod).map(([period, items]) => {
        const totalGross = items.reduce((s, i) => s + Number(i.grossAmount), 0);
        const totalCommission = items.reduce((s, i) => s + Number(i.commissionAmount), 0);
        const totalNet = items.reduce((s, i) => s + Number(i.netRemittance), 0);

        return (
          <div key={period} className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Period {period}</h3>
              <span className="text-xs text-slate-500">
                Net remittance: <span className="font-semibold text-slate-900">{totalNet.toFixed(2)}</span>
              </span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-medium text-slate-500">
                  <th className="px-4 py-2">Ticket</th>
                  <th className="px-4 py-2">Airline</th>
                  <th className="px-4 py-2 text-right">Gross</th>
                  <th className="px-4 py-2 text-right">Commission</th>
                  <th className="px-4 py-2 text-right">Net</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Update</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-4 py-2 font-medium text-slate-900">{r.ticketNo ?? r.pnr ?? "—"}</td>
                    <td className="px-4 py-2 text-slate-600">{r.airlineName ?? "—"}</td>
                    <td className="px-4 py-2 text-right text-slate-900">{Number(r.grossAmount).toFixed(2)}</td>
                    <td className="px-4 py-2 text-right text-slate-600">{Number(r.commissionAmount).toFixed(2)}</td>
                    <td className="px-4 py-2 text-right font-medium text-slate-900">{Number(r.netRemittance).toFixed(2)}</td>
                    <td className="px-4 py-2">
                      <StatusBadge status={r.settlementStatus} />
                    </td>
                    <td className="px-4 py-2">
                      <form action={updateBspStatus} className="flex gap-1">
                        <input type="hidden" name="bspSaleId" value={r.id} />
                        <select
                          name="settlementStatus"
                          defaultValue={r.settlementStatus}
                          className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-xs outline-none"
                        >
                          <option value="pending">pending</option>
                          <option value="submitted">submitted</option>
                          <option value="settled">settled</option>
                        </select>
                        <button type="submit" className="text-xs text-slate-500 hover:text-slate-900 underline">
                          Save
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold">
                  <td className="px-4 py-2" colSpan={2}>
                    Total
                  </td>
                  <td className="px-4 py-2 text-right">{totalGross.toFixed(2)}</td>
                  <td className="px-4 py-2 text-right">{totalCommission.toFixed(2)}</td>
                  <td className="px-4 py-2 text-right">{totalNet.toFixed(2)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        );
      })}
    </div>
  );
}
