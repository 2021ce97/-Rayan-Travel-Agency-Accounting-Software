import { db, customers } from "@/lib/db";
import { requireSession } from "@/lib/auth/get-session";
import { eq, desc } from "drizzle-orm";
import { Users } from "lucide-react";
import { CustomerForm } from "./customer-form";

export default async function CustomersPage() {
  const session = await requireSession();

  const rows = await db
    .select()
    .from(customers)
    .where(eq(customers.agencyId, session.agencyId))
    .orderBy(desc(customers.createdAt))
    .limit(100);

  return (
    <div className="space-y-6">
      <section className="rounded-[24px] border border-slate-200/70 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-900 p-6 text-white shadow-[0_22px_70px_-30px_rgba(15,23,42,0.6)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-sm font-medium text-slate-200 backdrop-blur">
              <Users className="size-4" /> Customer relationships
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight">Customers</h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-300">
              Every new customer automatically gets a linked receivable account in the chart of accounts, so booking and finance stay in sync.
            </p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-slate-200 backdrop-blur">
            <div className="font-semibold text-white">Tracked customers</div>
            <div className="mt-1 text-xl font-bold text-white">{rows.length}</div>
          </div>
        </div>
      </section>

      <CustomerForm />

      <div className="overflow-hidden rounded-[24px] border border-slate-200/70 bg-white/70 shadow-sm backdrop-blur">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3 text-right">Opening Balance</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                  No customers yet.
                </td>
              </tr>
            )}
            {rows.map((c) => (
              <tr key={c.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70">
                <td className="px-4 py-3 text-slate-500">{c.customerCode ?? `#${c.id}`}</td>
                <td className="px-4 py-3 font-semibold text-slate-900">{c.name}</td>
                <td className="px-4 py-3 text-slate-600">{c.phone ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">{c.email ?? "—"}</td>
                <td className="px-4 py-3 text-right text-slate-900">{Number(c.openingBalance).toFixed(2)}</td>
                <td className="px-4 py-3 capitalize text-slate-600">{c.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
