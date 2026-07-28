"use client";

import { useActionState, useState } from "react";
import { requestPasswordReset } from "@/app/actions/reset-password";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const initialState = { status: "idle", message: "", resetLink: "" };

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(requestPasswordReset as any, initialState);

  return (
    <div className="space-y-6">
      {state.status === "success" && state.resetLink ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-4 text-sm text-green-800">
            <p className="font-medium mb-2">Reset link generated successfully!</p>
            <p>Because we do not have an email service configured, here is your reset link directly:</p>
            <div className="mt-3 bg-white border border-green-200 rounded-xl p-3 break-all font-mono text-xs text-slate-800">
              <a href={state.resetLink} className="hover:underline">{window.location.origin}{state.resetLink}</a>
            </div>
          </div>
          <Link href="/login" className="block w-full">
            <Button variant="outline" className="w-full rounded-2xl">
              Back to Login
            </Button>
          </Link>
        </div>
      ) : (
        <form action={formAction} className="space-y-4">
          {state.status === "error" && state.message && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800">
              {state.message}
            </div>
          )}

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Email Address</span>
            <input
              name="email"
              type="email"
              required
              className="rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              placeholder="name@agency.com"
            />
          </label>

          <Button type="submit" className="w-full rounded-2xl bg-slate-900 text-white shadow-lg shadow-slate-900/10 hover:bg-slate-800" disabled={isPending}>
            {isPending ? "Sending..." : "Send Reset Link"}
          </Button>

          <div className="mt-4 text-center">
            <Link href="/login" className="text-sm font-medium text-blue-600 hover:text-blue-500">
              Back to Sign in
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
