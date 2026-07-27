"use client";

import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";

interface AccountResult {
  id: number;
  label: string;
  sublabel: string | null;
}

export function AccountPickerInline({
  value,
  onChange,
}: {
  value: { id: number; label: string } | null;
  onChange: (account: { id: number; label: string } | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AccountResult[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handle = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?type=account&q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data.results ?? []);
      } catch {
        setResults([]);
      }
    }, 200);
    return () => clearTimeout(handle);
  }, [query, open]);

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
        <input
          type="text"
          value={value ? value.label : query}
          onFocus={() => {
            setOpen(true);
            if (value) onChange(null);
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          placeholder="Search account…"
          className="w-full rounded-md border border-slate-300 bg-white pl-8 pr-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
        />
      </div>
      {open && (
        <div className="absolute z-20 mt-1 w-full max-h-52 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
          {results.length === 0 && (
            <div className="px-3 py-2 text-sm text-slate-400">No matches.</div>
          )}
          {results.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => {
                onChange({ id: r.id, label: r.label });
                setQuery("");
                setOpen(false);
              }}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50"
            >
              <span className="text-slate-900">{r.label}</span>
              {r.sublabel && <span className="text-slate-400 text-xs font-mono">{r.sublabel}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
