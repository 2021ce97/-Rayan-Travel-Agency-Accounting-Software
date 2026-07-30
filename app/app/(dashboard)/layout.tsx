import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  Building2,
  Plane,
  FileText,
  BookOpen,
  Scale,
  TrendingUp,
  Settings,
  Ticket,
  Stamp,
  Hotel,
  LogOut,
  Undo2,
  BookText,
  Package,
  Receipt,
  AlertTriangle,
} from "lucide-react";
import { requireSession } from "@/lib/auth/get-session";
import { logout } from "@/app/actions/auth";
import { db, agencies } from "@/lib/db";
import { eq } from "drizzle-orm";

// This layout depends on the request session and the agency's current plan.
// It must always be resolved at request time instead of using a cached route.
export const dynamic = "force-dynamic";

const nav = [
  { section: "Overview", items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }] },
  {
    section: "Vouchers",
    items: [
      { href: "/vouchers/ticket", label: "Ticket Voucher", icon: Ticket },
      { href: "/vouchers/visa", label: "Visa Voucher", icon: Stamp },
      { href: "/vouchers/hotel", label: "Hotel Voucher", icon: Hotel },
      { href: "/vouchers/package", label: "Package Voucher", icon: Package },
      { href: "/vouchers/refund", label: "Refund Voucher", icon: Undo2 },
      { href: "/vouchers/journal", label: "Journal / Cash / Bank", icon: BookText },
      { href: "/vouchers/bsp", label: "BSP Settlement", icon: Receipt },
      { href: "/vouchers", label: "All Vouchers", icon: FileText },
    ],
  },
  {
    section: "Master Data",
    items: [
      { href: "/customers", label: "Customers", icon: Users },
      { href: "/suppliers", label: "Suppliers", icon: Building2 },
      { href: "/airlines", label: "Airlines", icon: Plane },
    ],
  },
  {
    section: "Accounts",
    items: [
      { href: "/ledger", label: "Ledger", icon: BookOpen },
      { href: "/trial-balance", label: "Trial Balance", icon: Scale },
      { href: "/reports", label: "Reports", icon: TrendingUp },
    ],
  },
  { section: "System", items: [{ href: "/settings", label: "Settings", icon: Settings }] },
];

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();

  const [agency] = await db
    .select({ name: agencies.name, plan: agencies.plan, planStatus: agencies.planStatus, trialEndsAt: agencies.trialEndsAt })
    .from(agencies)
    .where(eq(agencies.id, session.agencyId));

  const trialDaysLeft = agency?.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(agency.trialEndsAt).getTime() - Date.now()) / 86_400_000))
    : null;

  const isBillingSuspended = agency?.planStatus === "suspended" || (agency?.plan === "trial" && trialDaysLeft !== null && trialDaysLeft <= 0);

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 shrink-0 glass-panel flex flex-col z-10 my-4 ml-4 rounded-2xl overflow-hidden shadow-sm">
        <div className="h-16 flex items-center gap-3 px-5 border-b border-slate-200/50 bg-white/40">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 shadow-md shadow-blue-500/20 flex items-center justify-center text-white font-bold text-sm">
            R
          </div>
          <span className="font-bold text-slate-800 tracking-tight">Rayan Solutions</span>
        </div>
        <nav className="flex-1 overflow-y-auto py-5 px-3 space-y-6 bg-white/20">
          {nav.map((group) => (
            <div key={group.section}>
              <div className="px-3 mb-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                {group.section}
              </div>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="nav-link flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:text-blue-600"
                    >
                      <Icon className="size-[18px] opacity-70" strokeWidth={2.5} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-200/50 bg-white/40 text-xs font-medium text-slate-500">
          {agency?.plan === "trial" && trialDaysLeft !== null
            ? `Trial plan · ${trialDaysLeft} days left`
            : `${agency?.plan ?? "trial"} plan`}
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0 p-4 pl-8">
        {isBillingSuspended && (
          <div className="mb-4 glass-panel bg-rose-50/80 border-rose-200 shadow-sm rounded-2xl p-4 flex items-center gap-3">
            <AlertTriangle className="size-5 text-rose-500 shrink-0" />
            <div className="text-sm font-medium text-rose-800">
              Your subscription is past due or your trial has expired. The system is in <span className="font-bold">Read-Only</span> mode. Please update your billing information in Settings to create new vouchers.
            </div>
          </div>
        )}
        <header className="h-16 glass-panel rounded-2xl flex items-center justify-between px-6 mb-6">
          <div className="text-sm font-medium text-slate-600">{agency?.name ?? ""}</div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold text-slate-700">{session.name}</span>
            <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-slate-200 to-slate-100 border border-slate-200 shadow-sm flex items-center justify-center text-xs font-bold text-slate-600">
              {initials(session.name)}
            </div>
            <form action={logout}>
              <button
                type="submit"
                className="text-slate-400 hover:text-red-500 transition-colors p-1.5 rounded-full hover:bg-red-50"
                title="Sign out"
              >
                <LogOut className="size-5" />
              </button>
            </form>
          </div>
        </header>
        <main className={`flex-1 overflow-y-auto glass-panel rounded-2xl p-6 bg-white/40 shadow-sm relative ${isBillingSuspended ? 'opacity-80 pointer-events-none' : ''}`}>
          {isBillingSuspended && (
            <div className="absolute inset-0 z-50 bg-white/50 backdrop-blur-[1px] rounded-2xl flex items-center justify-center pointer-events-none">
              <div className="bg-white/90 px-6 py-3 rounded-full shadow-lg border border-slate-200 text-slate-800 font-bold flex items-center gap-2">
                <AlertTriangle className="size-5 text-rose-500" /> Read-Only Mode
              </div>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
