"use client";
import { Check, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "@/lib/api";
import { money } from "@/lib/format";
import type { Feasibility } from "@/lib/types";

function Slider({ label, value, min, max, step, fmt, onChange }: {
  label: string; value: number; min: number; max: number; step: number;
  fmt: (v: number) => string; onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-slate-ink">{label}</span>
        <span className="font-medium text-navy">{fmt(value)}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[#C9A86A]"
      />
    </div>
  );
}

export function FeasibilitySimulator({ clientId, initial }: { clientId: string; initial: Feasibility }) {
  const [feas, setFeas] = useState<Feasibility>(initial);
  const [growth, setGrowth] = useState(initial.assumptions.growth_rate);
  const [spending, setSpending] = useState(initial.assumptions.annual_spending);
  const [retire, setRetire] = useState(initial.assumptions.retirement_age);
  const [busy, setBusy] = useState(false);

  async function recompute(next: { growth_rate?: number; annual_spending?: number; retirement_age?: number }) {
    setBusy(true);
    try {
      const r = await api.simulate(clientId, {
        growth_rate: next.growth_rate ?? growth,
        annual_spending: next.annual_spending ?? spending,
        retirement_age: next.retirement_age ?? retire,
      });
      setFeas(r);
    } finally {
      setBusy(false);
    }
  }

  const data = feas.projection.map((p) => ({ age: p.age, assets: Math.round(p.assets / 1_000_000) }));

  return (
    <div className="space-y-5">
      <div className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="display text-base font-medium text-navy">Life-plan feasibility</h3>
          {busy && <span className="text-xs text-slate-muted">recomputing…</span>}
        </div>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 6, right: 8, left: -12, bottom: 0 }}>
              <defs>
                <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#C9A86A" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#C9A86A" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#EDE8DC" vertical={false} />
              <XAxis dataKey="age" tick={{ fontSize: 11, fill: "#6B7280" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} tickLine={false} axisLine={false} width={42}
                tickFormatter={(v) => `${v}M`} />
              <Tooltip
                formatter={(v: number) => [`CHF ${v}M`, "Net worth"]}
                labelFormatter={(l) => `Age ${l}`}
                contentStyle={{ borderRadius: 12, border: "1px solid #E7E2D6", fontSize: 12 }}
              />
              <Area type="monotone" dataKey="assets" stroke="#B6924E" strokeWidth={2} fill="url(#g)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 rounded-xl bg-ivory-100 px-3 py-2 text-sm text-slate-ink">{feas.verdict}</p>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Slider label="Portfolio growth" value={growth} min={0.01} max={0.08} step={0.005}
            fmt={(v) => `${(v * 100).toFixed(1)}%`} onChange={(v) => { setGrowth(v); recompute({ growth_rate: v }); }} />
          <Slider label="Annual spending" value={spending} min={500_000} max={8_000_000} step={100_000}
            fmt={(v) => money(v)} onChange={(v) => { setSpending(v); recompute({ annual_spending: v }); }} />
          <Slider label="Retire at age" value={retire} min={45} max={75} step={1}
            fmt={(v) => `${v}`} onChange={(v) => { setRetire(v); recompute({ retirement_age: v }); }} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card p-5">
          <p className="label mb-3">Goals</p>
          <div className="space-y-2.5">
            {feas.goal_outcomes.map((o) => (
              <div key={o.goal_id} className="flex items-start gap-2.5">
                {o.feasible ? (
                  <Check size={16} className="mt-0.5 shrink-0 text-emerald" />
                ) : (
                  <TriangleAlert size={16} className="mt-0.5 shrink-0 text-amber" />
                )}
                <div>
                  <p className="text-sm text-slate-ink">{o.goal_title}</p>
                  <p className="text-[11.5px] text-slate-muted">
                    {o.feasible ? "Comfortably funded" : `Gap of ${money(o.gap_amount)} — ${o.suggestion}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="card p-5">
          <p className="label mb-3">Where the real gaps are</p>
          <ul className="space-y-2">
            {feas.life_gaps.map((g, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-ink">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                {g}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
