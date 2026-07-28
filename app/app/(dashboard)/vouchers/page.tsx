import Link from "next/link";
import { db, vouchers, customers, suppliers } from "@/lib/db";
import { requireSession } from "@/lib/auth/get-session";
import { eq, and, desc, isNull } from "drizzle-orm";

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    posted: "bg-emerald-50 text-emerald-700 border-emerald-200",
    draft: "bg-amber-50 text-amber-700 border-amber-200",
    cancelled: "bg-red-50 text-red-700 border-red-200",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${styles[status] ?? "bg-slate-50 text-slate-600 border-slate-200"}`}>
      {status}
    </span>
  );
}

const typeLabels: Record<string, string> = {
  ticket: "Ticket",
  visa: "Visa",
  hotel: "Hotel",
  refund: "Refund",
  package: "Package",
  journal: "Journal",
  cash: "Cash",
  bank: "Bank",
  expense: "Expense",
};

export default async function VouchersPage() {
  const session = await requireSession();

  const rows = await db
    .select({
      id: vouchers.id,
      voucherNo: vouchers.voucherNo,
      voucherType: vouchers.voucherType,
      voucherDate: vouchers.voucherDate,
      totalAmount: vouchers.totalAmount,
      totalProfit: vouchers.totalProfit,
      status: vouchers.status,
      customerName: customers.name,
      supplierName: suppliers.name,
    })
    .from(vouchers)
    .leftJoin(customers, eq(customers.id, vouchers.customerId))
    .leftJoin(suppliers, eq(suppliers.id, vouchers.supplierId))
    .where(and(eq(vouchers.agencyId, session.agencyId), isNull(vouchers.deletedAt)))
    .orderBy(desc(vouchers.createdAt))
    .limit(100);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">All Vouchers</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Most recent 100 vouchers across every type.</p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <Link href="/vouchers/ticket" className="text-sm font-medium rounded-lg border border-slate-200/60 bg-white/60 backdrop-blur-sm px-4 py-2 hover:bg-white/90 hover:shadow-sm transition-all text-slate-700">
            + Ticket
          </Link>
          <Link href="/vouchers/visa" className="text-sm font-medium rounded-lg border border-slate-200/60 bg-white/60 backdrop-blur-sm px-4 py-2 hover:bg-white/90 hover:shadow-sm transition-all text-slate-700">
            + Visa
          </Link>
          <Link href="/vouchers/hotel" className="text-sm font-medium rounded-lg border border-slate-200/60 bg-white/60 backdrop-blur-sm px-4 py-2 hover:bg-white/90 hover:shadow-sm transition-all text-slate-700">
            + Hotel
          </Link>
          <Link href="/vouchers/package" className="text-sm font-medium rounded-lg border border-slate-200/60 bg-white/60 backdrop-blur-sm px-4 py-2 hover:bg-white/90 hover:shadow-sm transition-all text-slate-700">
            + Package
          </Link>
          <Link href="/vouchers/refund" className="text-sm font-medium rounded-lg border border-slate-200/60 bg-white/60 backdrop-blur-sm px-4 py-2 hover:bg-white/90 hover:shadow-sm transition-all text-slate-700">
            + Refund
          </Link>
          <Link href="/vouchers/journal" className="text-sm font-medium rounded-lg border border-slate-200/60 bg-white/60 backdrop-blur-sm px-4 py-2 hover:bg-white/90 hover:shadow-sm transition-all text-slate-700">
            + Journal
          </Link>
        </div>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200/50 bg-white/40 text-left text-[11px] font-bold uppercase tracking-widest text-slate-500">
              <th className="px-5 py-4">Voucher No</th>
              <th className="px-5 py-4">Type</th>
              <th className="px-5 py-4">Date</th>
              <th className="px-5 py-4">Party</th>
              <th className="px-5 py-4 text-right">Amount</th>
              <th className="px-5 py-4 text-right">Profit</th>
              <th className="px-5 py-4 text-center">Status</th>
              <th className="px-5 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/60 bg-white/20">
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-12 text-center text-slate-500 font-medium bg-white/40">
                  No vouchers posted yet.
                </td>
              </tr>
            )}
            {rows.map((v) => (
              <tr key={v.id} className="hover:bg-white/60 transition-colors">
                <td className="px-5 py-3.5 font-semibold text-slate-800">{v.voucherNo}</td>
                <td className="px-5 py-3.5 text-slate-600 font-medium">{typeLabels[v.voucherType] ?? v.voucherType}</td>
                <td className="px-5 py-3.5 text-slate-500">{v.voucherDate}</td>
                <td className="px-5 py-3.5 text-slate-700">{v.customerName ?? v.supplierName ?? "—"}</td>
                <td className="px-5 py-3.5 text-right font-medium text-slate-900">{Number(v.totalAmount).toFixed(2)}</td>
                <td className={`px-5 py-3.5 text-right font-medium ${Number(v.totalProfit) >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  {Number(v.totalProfit).toFixed(2)}
                </td>
                <td className="px-5 py-3.5 text-center">
                  <StatusBadge status={v.status} />
                </td>
                <td className="px-5 py-3.5 text-right">
                  <div className="flex items-center justify-end gap-3">
                    {v.status === "posted" && (
                      <>
                        <form action={async () => {
                          "use server";
                          const { voidVoucher } = await import("@/app/actions/void-voucher");
                          await voidVoucher(v.id);
                        }}>
                          <button type="submit" className="text-xs font-semibold text-rose-500 hover:text-rose-700 transition-colors">
                            Void
                          </button>
                        </form>
                        <a
                          href={`/api/vouchers/${v.id}/pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          PDF
                        </a>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
