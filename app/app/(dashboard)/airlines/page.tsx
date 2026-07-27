import { db, airlines } from "@/lib/db";
import { requireSession } from "@/lib/auth/get-session";
import { eq, desc } from "drizzle-orm";
import { AirlineForm } from "./airline-form";

export default async function AirlinesPage() {
  const session = await requireSession();

  const rows = await db
    .select()
    .from(airlines)
    .where(eq(airlines.agencyId, session.agencyId))
    .orderBy(desc(airlines.createdAt))
    .limit(100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Airlines</h1>
        <p className="text-sm text-slate-500 mt-0.5">Used on ticket vouchers and airline-wise sales reports.</p>
      </div>

      <AirlineForm />

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium text-slate-500">
              <th className="px-4 py-2.5">Code</th>
              <th className="px-4 py-2.5">Name</th>
              <th className="px-4 py-2.5">IATA</th>
              <th className="px-4 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-slate-400">
                  No airlines yet.
                </td>
              </tr>
            )}
            {rows.map((a) => (
              <tr key={a.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-2.5 text-slate-500">{a.airlineCode ?? `#${a.id}`}</td>
                <td className="px-4 py-2.5 font-medium text-slate-900">{a.name}</td>
                <td className="px-4 py-2.5 text-slate-600">{a.iataCode ?? "—"}</td>
                <td className="px-4 py-2.5 text-slate-600 capitalize">{a.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
