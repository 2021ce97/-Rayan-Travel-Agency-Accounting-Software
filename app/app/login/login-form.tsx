"use client";

import { useActionState } from "react";
import { login, type LoginFormState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const initialState: LoginFormState = { status: "idle" };

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(login, initialState);

  return (
    <form action={formAction} className="space-y-4">
      {state.status === "error" && state.message && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800">
          {state.message}
        </div>
      )}

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Email</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
        />
        {state.fieldErrors?.email?.[0] && (
          <span className="text-xs text-red-500">{state.fieldErrors.email[0]}</span>
        )}
      </label>

      <label className="flex flex-col gap-1.5">
        <div className="flex justify-between items-center">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Password</span>
          <Link href="/forgot-password" className="text-xs font-medium text-blue-600 hover:text-blue-500" tabIndex={-1}>
            Forgot password?
          </Link>
        </div>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
        />
        {state.fieldErrors?.password?.[0] && (
          <span className="text-xs text-red-500">{state.fieldErrors.password[0]}</span>
        )}
      </label>

      <Button type="submit" className="w-full rounded-2xl bg-slate-900 text-white shadow-lg shadow-slate-900/10 hover:bg-slate-800" disabled={isPending}>
        {isPending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
