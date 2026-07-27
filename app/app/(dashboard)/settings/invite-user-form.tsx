"use client";

import { useActionState } from "react";
import { createAgencyUser, type CreateUserState } from "@/app/actions/users";

const initialState: CreateUserState = { status: "idle" };

export function InviteUserForm({ roles }: { roles: Array<{ id: number; name: string }> }) {
  const [state, formAction, isPending] = useActionState(createAgencyUser, initialState);

  return (
    <form action={formAction} className="space-y-4 rounded-[24px] border border-slate-200/70 bg-white/80 p-6 shadow-sm backdrop-blur">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-800">Create a new workspace user</h3>
          <p className="mt-1 text-sm text-slate-500">Assign a role such as owner, admin, accountant, consultant, or viewer.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-600">Full name</span>
          <input name="name" required className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-900/10" />
          {state.fieldErrors?.name?.[0] ? <span className="text-xs text-red-500">{state.fieldErrors.name[0]}</span> : null}
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-600">Email address</span>
          <input type="email" name="email" required className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-900/10" />
          {state.fieldErrors?.email?.[0] ? <span className="text-xs text-red-500">{state.fieldErrors.email[0]}</span> : null}
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-600">Temporary password</span>
          <input type="password" name="password" required className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-900/10" />
          {state.fieldErrors?.password?.[0] ? <span className="text-xs text-red-500">{state.fieldErrors.password[0]}</span> : null}
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-600">Role</span>
          <select name="roleId" required className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-900/10">
            <option value="">Select a role</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
          {state.fieldErrors?.roleId?.[0] ? <span className="text-xs text-red-500">{state.fieldErrors.roleId[0]}</span> : null}
        </label>
      </div>

      {state.message ? (
        <div className={`rounded-lg px-3 py-2 text-sm ${state.status === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
          {state.message}
        </div>
      ) : null}

      <button type="submit" disabled={isPending} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
        {isPending ? "Creating user..." : "Create user"}
      </button>
    </form>
  );
}
