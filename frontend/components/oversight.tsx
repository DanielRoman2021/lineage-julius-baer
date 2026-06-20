"use client";
import { Activity, Clock, Scale } from "lucide-react";
import type { Oversight } from "@/lib/types";

export function OversightPanel({ oversight }: { oversight: Oversight }) {
  const metrics = [
    { icon: Scale, label: "Override rate", value: `${Math.round(oversight.override_rate * 100)}%`, hint: "humans disagreeing with the AI" },
    { icon: Activity, label: "Reviewer agreement", value: `${Math.round(oversight.agreement_rate * 100)}%`, hint: "not ~100% — gates aren't a rubber stamp" },
    { icon: Clock, label: "Median review", value: `${oversight.median_review_seconds}s`, hint: "real consideration, not seconds-per-decision" },
  ];
  return (
    <div className="card p-5">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="display text-base font-medium text-navy">Oversight integrity</h3>
        <span className="text-xs text-slate-muted">{oversight.total_decisions} decisions</span>
      </div>
      <p className="mb-4 text-xs text-slate-muted">{oversight.note}</p>
      <div className="grid grid-cols-3 gap-3">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-xl bg-ivory-100 p-3">
            <m.icon size={15} className="text-gold-600" />
            <p className="display mt-1.5 text-xl font-medium text-navy">{m.value}</p>
            <p className="text-[11px] font-medium text-slate-ink">{m.label}</p>
            <p className="mt-0.5 text-[10.5px] leading-tight text-slate-muted">{m.hint}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
