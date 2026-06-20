"use client";
import { AlertTriangle, FileText, Lock } from "lucide-react";
import { useState } from "react";
import { roleLabel } from "@/lib/format";
import type { ApprovalItem } from "@/lib/types";
import { Badge, ConfidenceMeter } from "./ui";

export function ApprovalCard({
  item,
  onDecide,
  busy,
}: {
  item: ApprovalItem;
  onDecide: (decision: string, rationale: string) => void;
  busy?: boolean;
}) {
  const [reason, setReason] = useState("Verified date of birth — different individual; immaterial.");
  const isFlag = item.kind === "flag";

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Badge tone={isFlag ? "ruby" : "gold"}>{isFlag ? "Risk flag" : "Action point"}</Badge>
            <Badge tone={item.severity}>{item.severity}</Badge>
            <span className="text-xs text-slate-muted">· {item.client_name}</span>
          </div>
          <h3 className="display text-lg font-medium text-navy">{item.title}</h3>
        </div>
        <div className="text-right">
          <p className="label">Owner</p>
          <p className="text-sm font-medium text-navy">{roleLabel(item.owner_role)}</p>
        </div>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-slate-ink">{item.detail}</p>

      <div className="mt-4 grid grid-cols-2 gap-4 rounded-xl bg-ivory-100 p-3">
        <div>
          <p className="label mb-1.5">AI confidence</p>
          <ConfidenceMeter value={item.confidence} />
          {item.confidence < 0.7 && (
            <p className="mt-1 text-[11px] text-amber">Below 0.70 → auto-escalated to a human.</p>
          )}
        </div>
        <div>
          <p className="label mb-1.5">Source</p>
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-ink">
            <FileText size={13} className="text-gold-600" />
            {item.source ?? "Identity screening"}
          </span>
        </div>
      </div>

      <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber/30 bg-amber-soft/60 px-3 py-2 text-[11.5px] text-amber">
        <Lock size={13} className="mt-0.5 shrink-0" />
        <span>{item.guardrail}</span>
      </div>

      <div className="mt-4">
        <p className="label mb-1.5">Decision rationale (logged to audit trail)</p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          className="w-full resize-none rounded-xl border border-ivory-300 bg-white px-3 py-2 text-sm text-slate-ink focus:border-gold focus:outline-none"
        />
      </div>

      {/* Equal-effort decision buttons */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <button className="btn-primary" disabled={busy} onClick={() => onDecide("approve", reason)}>
          {isFlag ? "Clear (approve)" : "Approve"}
        </button>
        {isFlag ? (
          <button
            className="btn border border-ruby/40 bg-white text-ruby hover:bg-ruby-soft"
            disabled={busy}
            onClick={() => onDecide("override", reason)}
          >
            <AlertTriangle size={15} /> Override
          </button>
        ) : (
          <button className="btn-ghost" disabled={busy} onClick={() => onDecide("reroute", reason)}>
            Re-route
          </button>
        )}
        {isFlag && (
          <button className="btn-ghost" disabled={busy} onClick={() => onDecide("reroute", reason)}>
            Re-route
          </button>
        )}
      </div>
      <p className="mt-2 text-center text-[11px] text-slate-muted">
        Approve and Override take equal effort — the human owns the decision.
      </p>
    </div>
  );
}
