import Link from "next/link";
import { ArrowRight, Sparkles, Ticket, Wallet2 } from "lucide-react";
import { SignupForm } from "./signup-form";

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(125,211,252,0.18),_transparent_32%),linear-gradient(135deg,_#f9fcff_0%,_#f2f6ff_55%,_#fcfdff_100%)] px-4 py-10 text-slate-900">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 lg:flex-row lg:items-center">
        <div className="max-w-xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-sky-200/70 bg-white/70 px-3 py-1.5 text-sm font-medium text-sky-700 shadow-sm backdrop-blur">
            <Sparkles className="size-4" /> Launch your agency workspace in minutes
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
            Build a modern travel agency operations hub from day one.
          </h1>
          <p className="mt-4 text-lg leading-8 text-slate-600">
            Create a professional workspace for vouchers, customer accounts, supplier payouts, and financial reporting.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/70 bg-white/70 p-4 shadow-sm backdrop-blur">
              <div className="mb-2 flex items-center gap-2 text-sky-700">
                <Ticket className="size-4" /> Voucher workflow
              </div>
              <p className="text-sm text-slate-600">Issue ticket, hotel, visa, refund, and journal vouchers with a guided flow.</p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/70 p-4 shadow-sm backdrop-blur">
              <div className="mb-2 flex items-center gap-2 text-violet-700">
                <Wallet2 className="size-4" /> Accounting clarity
              </div>
              <p className="text-sm text-slate-600">Track every debit and credit through ledger, trial balance, and reporting views.</p>
            </div>
          </div>
        </div>

        <div className="w-full max-w-lg">
          <div className="rounded-[28px] border border-white/70 bg-white/80 p-6 shadow-[0_30px_90px_-30px_rgba(15,23,42,0.35)] backdrop-blur-xl sm:p-8">
            <div className="mb-6 flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-900 to-sky-600 text-sm font-bold text-white">
                R
              </div>
              <div>
                <div className="text-lg font-semibold text-slate-900">Create your agency account</div>
                <div className="text-sm text-slate-500">Start your 14-day trial</div>
              </div>
            </div>

            <SignupForm />

            <p className="mt-6 text-center text-sm text-slate-500">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-slate-900 transition hover:text-sky-600">
                Sign in <ArrowRight className="ml-1 inline size-4" />
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
