"use client";

import { useEffect, useRef, useState } from "react";
import { Search, ChevronDown, X } from "lucide-react";

interface PartyResult {
  id: number;
  label: string;
  sublabel: string | null;
}

export function PartyPicker({
  name,
  type,
  label,
  required,
  error,
  defaultValue,
  defaultLabel,
}: {
  name: string;
  type: "customer" | "supplier" | "airline" | "consultant" | "voucher" | "account" | "ticket";
  label: string;
  required?: boolean;
  error?: string[];
  defaultValue?: number;
  defaultLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PartyResult[]>([]);
  const [selected, setSelected] = useState<PartyResult | null>(
    defaultValue && defaultLabel ? { id: defaultValue, label: defaultLabel, sublabel: null } : null
  );
  const [loading, setLoading] = useState(false);
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
    setLoading(true);
    const handle = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?type=${type}&q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data.results ?? []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(handle);
  }, [query, open, type]);

  return (
    <div className="flex flex-col gap-1" ref={containerRef}>
      <span className="text-xs font-medium text-slate-600">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      <input type="hidden" name={name} value={selected?.id ?? ""} required={required} />
      <div className="relative">
        {selected ? (
          <div className="flex items-center justify-between rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm">
            <div>
              <span className="text-slate-900">{selected.label}</span>
              {selected.sublabel && <span className="text-slate-400 ml-1.5">· {selected.sublabel}</span>}
            </div>
            <button
              type="button"
              onClick={() => {
                setSelected(null);
                setQuery("");
              }}
              className="text-slate-400 hover:text-slate-700"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ) : (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
            <input
              type="text"
              value={query}
              onFocus={() => setOpen(true)}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              placeholder={`Search ${label.toLowerCase()}…`}
              className="w-full rounded-md border border-slate-300 bg-white pl-8 pr-8 py-1.5 text-sm outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
            />
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
          </div>
        )}

        {open && !selected && (
          <div className="absolute z-20 mt-1 w-full max-h-60 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
            {loading && <div className="px-3 py-2 text-sm text-slate-400">Searching…</div>}
            {!loading && results.length === 0 && (
              <div className="px-3 py-2 text-sm text-slate-400">
                No matches. {query ? "Try a different search." : "Start typing to search."}
              </div>
            )}
            {!loading &&
              results.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    setSelected(r);
                    setOpen(false);
                  }}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50"
                >
                  <span className="text-slate-900">{r.label}</span>
                  {r.sublabel && <span className="text-slate-400 text-xs">{r.sublabel}</span>}
                </button>
              ))}
          </div>
        )}
      </div>
      {error?.[0] && <span className="text-xs text-red-500">{error[0]}</span>}
    </div>
  );
}
