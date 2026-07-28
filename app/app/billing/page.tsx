import { getSession } from "@/lib/auth/get-session";
import { db, agencies } from "@/lib/db";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { AlertCircle, CreditCard, LogOut } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Subscription Expired | Rayan Solutions",
};

export default async function BillingPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const [agency] = await db
    .select()
    .from(agencies)
    .where(eq(agencies.id, session.agencyId))
    .limit(1);

  if (!agency) {
    redirect("/login");
  }

  const isExpired = agency.planStatus === "suspended" || (agency.trialEndsAt && new Date() > agency.trialEndsAt);

  if (!isExpired) {
    // If they aren't expired, they don't need to be here right now
    // (A real app might show billing history here, but we are using this for enforcement)
    redirect("/");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4 sm:p-8">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-rose-200 bg-white shadow-xl shadow-rose-200/50">
        <div className="bg-rose-50/50 p-8 text-center border-b border-rose-100">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 text-rose-600 mb-6">
            <AlertCircle className="size-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Subscription Inactive
          </h1>
          <p className="mt-3 text-sm text-slate-600">
            Your agency's trial period has ended, or the subscription has been suspended. 
            Access to the accounting system is temporarily restricted.
          </p>
        </div>

        <div className="p-8 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="font-semibold text-slate-800">Need to restore access?</h3>
            <p className="mt-2 text-sm text-slate-600">
              Please enter your payment details to upgrade to an active subscription and regain full access to all travel agency management features.
            </p>
            <button className="mt-4 w-full bg-slate-900 text-white hover:bg-slate-800 rounded-xl h-10 px-4 py-2 inline-flex items-center justify-center text-sm font-medium disabled:opacity-50" disabled>
              <CreditCard className="size-4 mr-2" /> Upgrade Subscription (Coming Soon)
            </button>
          </div>

          <form action="/api/auth/logout" method="POST">
            <button type="submit" className="w-full rounded-xl border border-slate-200 bg-white hover:bg-slate-100 h-10 px-4 py-2 inline-flex items-center justify-center text-sm font-medium">
              <LogOut className="size-4 mr-2" /> Sign Out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
