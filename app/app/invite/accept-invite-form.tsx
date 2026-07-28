"use client";

import { useActionState } from "react";
import { acceptInvite } from "@/app/actions/accept-invite";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

const initialState = { status: "idle", message: "" };

export function AcceptInviteForm() {
  const [state, formAction, isPending] = useActionState(acceptInvite as any, initialState);
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  if (!token) {
    return (
      <div className="text-center space-y-4">
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800">
          Invalid or missing invite token.
        </div>
      </div>
    );
  }

  if (state.status === "success") {
    return (
      <div className="text-center space-y-4">
        <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-4 text-sm text-green-800">
          {state.message}
        </div>
        <Link href="/login" className="block w-full">
          <Button variant="outline" className="w-full rounded-2xl bg-white shadow-sm border-slate-200 text-slate-700 hover:bg-slate-50">
            Sign In
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {state.status === "error" && state.message && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800">
          {state.message}
        </div>
      )}

      <input type="hidden" name="token" value={token} />

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Set Password</span>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          className="rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Confirm Password</span>
        <input
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          className="rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
        />
      </label>

      <Button type="submit" className="w-full rounded-2xl bg-slate-900 text-white shadow-lg shadow-slate-900/10 hover:bg-slate-800" disabled={isPending}>
        {isPending ? "Setting up..." : "Complete Setup"}
      </Button>
    </form>
  );
}
