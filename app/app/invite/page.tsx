import { AcceptInviteForm } from "./accept-invite-form";
import { Suspense } from "react";

export const metadata = {
  title: "Accept Invite | Rayan Solutions",
};

export default function AcceptInvitePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 sm:p-8">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/20">
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Accept Invitation
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Please set a password to activate your account.
          </p>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50">
          <div className="p-6 sm:p-8">
            <Suspense fallback={<div className="text-center text-sm text-slate-500">Loading...</div>}>
              <AcceptInviteForm />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
