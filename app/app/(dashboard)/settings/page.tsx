import { db, users, roles } from "@/lib/db";
import { eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth/get-session";
import { createAgencyUser } from "@/app/actions/users";
import { Mail, Shield, UserPlus, Users as UsersIcon, Wallet2 } from "lucide-react";
import { InviteUserForm } from "./invite-user-form";

export default async function SettingsPage() {
  const session = await requireSession();

  const [agencyRoles, agencyUsers] = await Promise.all([
    db.select({ id: roles.id, name: roles.name }).from(roles).where(eq(roles.agencyId, session.agencyId)),
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: roles.name,
      })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .where(eq(users.agencyId, session.agencyId)),
  ]);

  const isPrivileged = ["owner", "admin"].includes(
    agencyRoles.find((role) => role.id === session.roleId)?.name ?? ""
  );

  return (
    <div className="mx-auto max-w-5xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <section className="rounded-[24px] border border-slate-200/70 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-900 p-6 text-white shadow-[0_22px_70px_-30px_rgba(15,23,42,0.6)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-sm font-medium text-slate-200 backdrop-blur">
              <Shield className="size-4" /> Team and configuration
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight">System Settings</h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-300">
              Manage access, permissions, and exchange-rate preferences for your agency workspace.
            </p>
          </div>
          <button className="flex items-center gap-2 rounded-2xl bg-white/15 px-4 py-2 font-semibold text-white transition hover:bg-white/20">
            <UserPlus className="size-4" /> Invite User
          </button>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-[24px] border border-slate-200/70 bg-white/70 p-5 shadow-sm backdrop-blur">
          <div className="flex items-center gap-2 text-slate-800">
            <UsersIcon className="size-5 text-blue-500" />
            <h2 className="text-base font-semibold">Team members</h2>
          </div>
          <div className="mt-3 text-sm text-slate-500">{agencyUsers.length} active users currently on this agency workspace.</div>
        </div>
        <div className="rounded-[24px] border border-slate-200/70 bg-white/70 p-5 shadow-sm backdrop-blur">
          <div className="flex items-center gap-2 text-slate-800">
            <Wallet2 className="size-5 text-emerald-500" />
            <h2 className="text-base font-semibold">Currency setup</h2>
          </div>
          <div className="mt-3 text-sm text-slate-500">Exchange rates can be updated here whenever your agency needs multi-currency reporting.</div>
        </div>
      </div>

      {isPrivileged ? <InviteUserForm roles={agencyRoles} /> : null}

      <div className="overflow-hidden rounded-[24px] border border-slate-200/70 bg-white/70 shadow-sm backdrop-blur">
        <div className="flex items-center justify-between border-b border-slate-200/70 bg-slate-50/70 px-6 py-5">
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-800">
            <UsersIcon className="size-5 text-blue-500" /> Team Members
          </h2>
        </div>
        <div className="divide-y divide-slate-100 bg-white/50">
          {agencyUsers.map((user) => (
            <div key={user.id} className="flex items-center justify-between px-6 py-4 transition hover:bg-white/70">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-gradient-to-br from-slate-200 to-slate-100 font-bold text-slate-600">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold text-slate-800">{user.name}</div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-500">
                    <Mail className="size-3.5" />
                    {user.email}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                  <Shield className="size-3" />
                  {user.role}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-[24px] border border-slate-200/70 bg-white/70 shadow-sm backdrop-blur">
        <div className="flex items-center justify-between border-b border-slate-200/70 bg-slate-50/70 px-6 py-5">
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-800">
            <Wallet2 className="size-5 text-emerald-500" /> Exchange Rates
          </h2>
          <button className="text-sm font-medium text-blue-600 hover:text-blue-700">Update Rates</button>
        </div>
        <div className="bg-white/50 p-6 text-center">
          <p className="text-sm text-slate-500">No custom exchange rates configured for this agency yet.</p>
          <button className="mt-4 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">Add Currency Rate</button>
        </div>
      </div>
    </div>
  );
}
