import Link from "next/link";
import { ArrowRight, BarChart3, Plane, ShieldCheck, Sparkles } from "lucide-react";
import { LoginForm } from "./login-form";

const highlights = [
  { title: "Voucher automation", text: "Issue tickets, hotels, visas, and refunds from one workspace." },
  { title: "Live reporting", text: "Track P&L, trial balance, and receivables without spreadsheets." },
];

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.16),_transparent_30%),linear-gradient(135deg,_#f8fbff_0%,_#eef4ff_45%,_#f8fafc_100%)] px-4 py-10 text-slate-900">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 lg:flex-row lg:items-center">
        <div className="max-w-xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-200/70 bg-white/70 px-3 py-1.5 text-sm font-medium text-blue-700 shadow-sm backdrop-blur">
            <Sparkles className="size-4" /> Modern travel agency finance OS
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
            Run every booking, voucher, and report from one calm control center.
          </h1>
          <p className="mt-4 text-lg leading-8 text-slate-600">
            Rayan Solutions gives your team a polished, secure place to manage travel documents, accounting entries, and real-time performance.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {highlights.map((item) => (
              <div key={item.title} className="rounded-2xl border border-white/70 bg-white/70 p-4 shadow-sm backdrop-blur">
                <div className="mb-2 flex items-center gap-2 text-blue-700">
                  {item.title === "Voucher automation" ? <Plane className="size-4" /> : <BarChart3 className="size-4" />}
                  <span className="text-sm font-semibold">{item.title}</span>
                </div>
                <p className="text-sm text-slate-600">{item.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="w-full max-w-md">
          <div className="rounded-[28px] border border-white/70 bg-white/80 p-6 shadow-[0_30px_90px_-30px_rgba(15,23,42,0.35)] backdrop-blur-xl sm:p-8">
            <div className="mb-6 flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-900 to-blue-600 text-sm font-bold text-white">
                R
              </div>
              <div>
                <div className="text-lg font-semibold text-slate-900">Rayan Solutions</div>
                <div className="text-sm text-slate-500">Welcome back</div>
              </div>
            </div>

            <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3 text-sm text-emerald-700">
              <div className="flex items-center gap-2 font-semibold">
                <ShieldCheck className="size-4" /> Secure sign-in with agency access control
              </div>
            </div>

            <LoginForm />

            <p className="mt-6 text-center text-sm text-slate-500">
              New here?{" "}
              <Link href="/signup" className="font-semibold text-slate-900 transition hover:text-blue-600">
                Create an agency account <ArrowRight className="ml-1 inline size-4" />
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
