"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function BranchFilter({ branches }: { branches: Array<{ id: number; name: string }> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentBranchId = searchParams.get("branchId") || "";

  return (
    <select
      value={currentBranchId}
      onChange={(e) => {
        const url = new URL(window.location.href);
        if (e.target.value) {
          url.searchParams.set("branchId", e.target.value);
        } else {
          url.searchParams.delete("branchId");
        }
        router.push(url.pathname + url.search);
      }}
      className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white outline-none focus:border-white/40 focus:ring-2 focus:ring-white/20 [&>option]:text-slate-900"
    >
      <option value="">All Branches</option>
      {branches.map((b) => (
        <option key={b.id} value={b.id}>
          {b.name}
        </option>
      ))}
    </select>
  );
}
