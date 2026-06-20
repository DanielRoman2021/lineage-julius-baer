"use client";
import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { AuditEntry } from "@/lib/types";

export function AuditTrail({ entries }: { entries: AuditEntry[] }) {
  const [open, setOpen] = useState<string | null>(entries.at(-1)?.id ?? null);
  if (!entries.length) return null;
  return (
    <div className="card p-5">
      <p className="label mb-3">Audit trail · interaction-level</p>
      <div className="space-y-1.5">
        {entries.map((e) => {
          const isOpen = open === e.id;
          const human = e.model_version === "human-decision";
          return (
            <div key={e.id} className="rounded-xl border border-ivory-300">
              <button
                className="flex w-full items-center justify-between px-3 py-2 text-left"
                onClick={() => setOpen(isOpen ? null : e.id)}
              >
                <span className="flex items-center gap-2 text-sm">
                  {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <span className={`h-1.5 w-1.5 rounded-full ${human ? "bg-navy" : "bg-gold"}`} />
                  <span className="text-slate-ink">{e.output_summary}</span>
                </span>
                <span className="text-[11px] text-slate-muted">{e.ref_type}</span>
              </button>
              {isOpen && (
                <div className="space-y-1 border-t border-ivory-200 px-3 py-2 text-[11.5px] text-slate-muted">
                  <p><span className="text-slate-ink">Input:</span> {e.input_summary}</p>
                  <p><span className="text-slate-ink">Model / version:</span> {e.model_version}</p>
                  <p><span className="text-slate-ink">Confidence:</span> {Math.round(e.confidence * 100)}%</p>
                  <p><span className="text-slate-ink">Reviewer:</span> {e.reviewer}</p>
                  {e.rationale && <p><span className="text-slate-ink">Rationale:</span> {e.rationale}</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
