import Link from "next/link";
import { TrendingUp, Ticket, Users, AlertCircle, ArrowRight, BookOpen, FileText } from "lucide-react";
import { and, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { agencies, customers, db, vouchers } from "@/lib/db";
import { requireSession } from "@/lib/auth/get-session";

const quickActions = [
  { href: "/vouchers/ticket", label: "Create ticket voucher", icon: Ticket },
  { href: "/vouchers/hotel", label: "Post hotel voucher", icon: BookOpen },
  { href: "/reports", label: "Open reports", icon: FileText },
];

function formatAmount(value: string | number | null | undefined, currency: string) {
  return `${currency} ${Number(value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function DashboardPage() {
  const session = await requireSession();
  const postedVoucher = and(
    eq(vouchers.agencyId, session.agencyId),
    eq(vouchers.status, "posted"),
    eq(vouchers.isVoided, false),
    isNull(vouchers.deletedAt),
  );

  const [agencyRows, todaySalesRows, monthTicketRows, activeCustomerRows, overdueReceivableRows] = await Promise.all([
    db.select({ baseCurrency: agencies.baseCurrency }).from(agencies).where(eq(agencies.id, session.agencyId)).limit(1),
    db.select({ total: sql<string>`coalesce(sum(${vouchers.totalAmount}), 0)` }).from(vouchers).where(and(postedVoucher, sql`${vouchers.voucherDate} = CURRENT_DATE`)),
    db.select({ count: sql<number>`count(*)::int` }).from(vouchers).where(and(postedVoucher, eq(vouchers.voucherType, "ticket"), sql`${vouchers.voucherDate} >= date_trunc('month', CURRENT_DATE)::date`)),
    db.select({ count: sql<number>`count(*)::int` }).from(customers).where(and(eq(customers.agencyId, session.agencyId), eq(customers.status, "active"))),
    db.select({ total: sql<string>`coalesce(sum(${vouchers.totalAmount}), 0)`, count: sql<number>`count(*)::int` })
      .from(vouchers)
      .where(and(postedVoucher, isNotNull(vouchers.customerId), sql`${vouchers.voucherDate} < CURRENT_DATE - INTERVAL '90 days'`)),
  ]);

  const currency = agencyRows[0]?.baseCurrency ?? "PKR";
  const todaySales = todaySalesRows[0]?.total ?? "0";
  const ticketsThisMonth = monthTicketRows[0]?.count ?? 0;
  const activeCustomers = activeCustomerRows[0]?.count ?? 0;
  const overdueReceivables = overdueReceivableRows[0]?.total ?? "0";
  const overdueCount = overdueReceivableRows[0]?.count ?? 0;

  const cards = [
    { label: "Today's Sales", value: formatAmount(todaySales, currency), icon: TrendingUp, hint: "Posted vouchers dated today", gradient: "from-blue-500/10 to-indigo-500/10", iconColor: "text-blue-500" },
    { label: "Tickets This Month", value: ticketsThisMonth.toLocaleString(), icon: Ticket, hint: "Posted ticket vouchers", gradient: "from-emerald-500/10 to-teal-500/10", iconColor: "text-emerald-500" },
    { label: "Active Customers", value: activeCustomers.toLocaleString(), icon: Users, hint: "Active customer records", gradient: "from-violet-500/10 to-purple-500/10", iconColor: "text-violet-500" },
    { label: "Overdue Receivables", value: formatAmount(overdueReceivables, currency), icon: AlertCircle, hint: `${overdueCount} voucher${overdueCount === 1 ? "" : "s"} over 90 days`, gradient: "from-rose-500/10 to-red-500/10", iconColor: "text-rose-500" },
  ];

  const hasActivity = Number(todaySales) > 0 || ticketsThisMonth > 0 || activeCustomers > 0;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <section className="rounded-[28px] border border-slate-200/70 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-8 text-white shadow-[0_30px_90px_-35px_rgba(15,23,42,0.55)]">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-sm font-medium text-slate-200 backdrop-blur">
              <TrendingUp className="size-4" /> Travel agency operations hub
            </div>
            <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">
              Your team can manage bookings, accounting, and reporting from a single smart workspace.
            </h1>
            <p className="mt-3 text-sm leading-7 text-slate-300 sm:text-base">
              Start with a voucher, keep customer and supplier records aligned, and follow the impact in the ledger and reports sections.
            </p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 p-4 text-sm text-slate-200 backdrop-blur">
            <div className="font-semibold text-white">Current focus</div>
            <div className="mt-2 text-sm text-slate-300">{hasActivity ? "Your live figures are based on posted vouchers and active customer records." : "Post your first voucher to begin tracking live figures."}</div>
          </div>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {quickActions.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className="rounded-2xl border border-white/15 bg-white/10 p-4 transition hover:bg-white/15">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">{item.label}</span>
                  <ArrowRight className="size-4 text-slate-300" />
                </div>
                <div className="mt-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-slate-200">
                  <Icon className="size-5" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-4 md:grid-cols-2">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className={`glass-panel rounded-2xl bg-gradient-to-br ${c.gradient} p-6 transition-transform duration-300 hover:-translate-y-1`}>
              <div className="mb-4 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">{c.label}</span>
                <div className={`rounded-xl bg-white/70 p-2 shadow-sm ${c.iconColor}`}>
                  <Icon className="size-5" strokeWidth={2.5} />
                </div>
              </div>
              <div className="text-3xl font-black tracking-tight text-slate-800">{c.value}</div>
              <div className="mt-2 text-xs font-semibold text-slate-400">{c.hint}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
