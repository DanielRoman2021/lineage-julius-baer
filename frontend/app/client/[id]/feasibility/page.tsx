"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import {
  AreaChart, Area, XAxis, YAxis, ReferenceLine, ResponsiveContainer,
} from "recharts";
import { api } from "@/lib/api";
import type { Feasibility } from "@/lib/types";
import { MobileFrame } from "@/components/mobile-frame";
import { LoadingState, ErrorState } from "@/components/states";

const LABEL = "11px";

// Verdict styling, keyed off the projected end-of-plan wealth (in CHF millions).
function verdictStyle(endM: number) {
  if (endM >= 60)
    return {
      verdict: "Comfortably feasible",
      color: "#5E806B",
      bg: "#EEF3EE",
      border: "#CFE0D2",
      note: "Every goal is funded with a generous legacy left for the next generation.",
    };
  if (endM >= 12)
    return {
      verdict: "Feasible",
      color: "#5E806B",
      bg: "#EEF3EE",
      border: "#CFE0D2",
      note: "Your plans hold together, with a healthy margin of safety.",
    };
  if (endM >= 0)
    return {
      verdict: "Tight — at risk",
      color: "#C8895E",
      bg: "#FBF1E9",
      border: "#EBD9C9",
      note: "Achievable, but with little room to spare. Worth easing one lever.",
    };
  return {
    verdict: "Not feasible yet",
    color: "#9F5E3A",
    bg: "#FBF1E9",
    border: "#EBD9C9",
    note: "These choices outrun your wealth over time. Try retiring a little later or trimming spend.",
  };
}

export default function ClientFeasibilityPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id || "sarah_keller";

  const [feas, setFeas] = useState<Feasibility | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Lever state (CHF millions / age), seeded from the design defaults then
  // reconciled with the live assumptions once they arrive.
  const [retire, setRetire] = useState(55);
  const [lifestyle, setLifestyle] = useState(2.5);
  const [growth, setGrowth] = useState(2.8);

  const seeded = useRef(false);
  const aliveRef = useRef(true);

  const reload = useCallback(() => {
    aliveRef.current = true;
    setLoading(true);
    setError(false);
    (async () => {
      try {
        const f = await api.getFeasibility(id);
        if (!aliveRef.current) return;
        if (!seeded.current) {
          seeded.current = true;
          setRetire(f.assumptions.retirement_age ?? 55);
          setLifestyle(
            Math.round((f.assumptions.annual_spending / 1_000_000) * 2) / 2 || 2.5,
          );
          setGrowth(Math.round(f.assumptions.growth_rate * 1000) / 10 || 2.8);
        }
        setFeas(f);
      } catch {
        if (aliveRef.current) setError(true);
      } finally {
        if (aliveRef.current) setLoading(false);
      }
    })();
  }, [id]);

  useEffect(() => {
    reload();
    return () => {
      aliveRef.current = false;
    };
  }, [reload]);

  const resimulate = useCallback(
    async (next: { retire?: number; lifestyle?: number; growth?: number }) => {
      const r = next.retire ?? retire;
      const l = next.lifestyle ?? lifestyle;
      const g = next.growth ?? growth;
      try {
        const f = await api.simulate(id, {
          retirement_age: r,
          annual_spending: l * 1_000_000,
          growth_rate: g / 100,
        });
        setFeas(f);
      } catch {
        /* keep last good projection */
      }
    },
    [id, retire, lifestyle, growth],
  );

  if (loading) {
    return (
      <MobileFrame title="Life plan">
        <div style={{ background: "#F7F5F0" }}>
          <LoadingState label="Loading your life plan" minHeight={620} />
        </div>
      </MobileFrame>
    );
  }

  // A failed load leaves us with no projection. Show the error rather than a
  // misleading "Not feasible yet" verdict over an empty chart.
  if (error && !feas) {
    return (
      <MobileFrame title="Life plan">
        <div style={{ background: "#F7F5F0" }}>
          <ErrorState onRetry={reload} minHeight={620} />
        </div>
      </MobileFrame>
    );
  }

  const projection = feas?.projection ?? [];
  const data = projection.map((p) => ({ age: p.age, assetsM: p.assets / 1_000_000 }));
  const endM = data.length ? data[data.length - 1].assetsM : 0;
  const startM = data.length ? data[0].assetsM : 180;
  const vs = verdictStyle(endM);
  const stroke = endM < 10 ? "#C8895E" : "#A8854A";
  const hasNeg = data.some((d) => d.assetsM < 0);

  return (
    <MobileFrame title="Life plan">
      <div
        className="scroll"
        style={{ padding: "6px 22px 30px", fontFamily: "Archivo, sans-serif", background: "#F7F5F0" }}
      >
        {/* header */}
        <div style={{ padding: "4px 2px 12px" }}>
          <div
            style={{
              fontSize: "12px",
              color: "#A8854A",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              fontWeight: 700,
            }}
          >
            Life plan
          </div>
          <div style={{ fontFamily: "Spectral, serif", fontSize: "25px", color: "#141E3C", marginTop: "3px" }}>
            Can your plans work?
          </div>
          <div style={{ fontSize: "13.5px", color: "#6B7488", lineHeight: 1.6, marginTop: "6px" }}>
            Move the levers below to see how your choices play out across your lifetime.
          </div>
        </div>

        {/* verdict + chart */}
        <div style={{ background: vs.bg, border: `1px solid ${vs.border}`, borderRadius: "18px", padding: "18px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ width: "12px", height: "12px", borderRadius: "50%", background: vs.color }} />
            <span style={{ fontFamily: "Spectral, serif", fontSize: "21px", color: "#141E3C" }}>{vs.verdict}</span>
          </div>
          <div style={{ fontSize: "13px", color: "#5C6576", lineHeight: 1.6, marginTop: "8px" }}>{vs.note}</div>

          {/* chart */}
          <div style={{ marginTop: "14px", height: "116px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                <defs>
                  <linearGradient id="feasFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={stroke} stopOpacity={0.22} />
                    <stop offset="100%" stopColor={stroke} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="age" hide />
                <YAxis hide domain={["dataMin", "dataMax"]} />
                {hasNeg && (
                  <ReferenceLine y={0} stroke="#C8895E" strokeWidth={1} strokeDasharray="3 3" opacity={0.6} />
                )}
                <Area
                  type="monotone"
                  dataKey="assetsM"
                  stroke={stroke}
                  strokeWidth={2.2}
                  fill="url(#feasFill)"
                  dot={false}
                  activeDot={{ r: 4, fill: stroke, strokeWidth: 0 }}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: "6px" }}>
            <div>
              <div style={{ fontSize: "10.5px", letterSpacing: "0.1em", textTransform: "uppercase", color: "#8A93A3", fontWeight: 600 }}>
                Estimated legacy at 90
              </div>
              <div style={{ fontFamily: "Spectral, serif", fontSize: "26px", color: "#141E3C" }}>
                CHF {Math.round(endM)}M
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "10.5px", letterSpacing: "0.1em", textTransform: "uppercase", color: "#8A93A3", fontWeight: 600 }}>
                Today
              </div>
              <div style={{ fontFamily: "Spectral, serif", fontSize: "18px", color: "#6B7488" }}>
                CHF {Math.round(startM)}M
              </div>
            </div>
          </div>
        </div>

        {/* levers */}
        <div style={{ marginTop: "20px", display: "flex", flexDirection: "column", gap: "18px" }}>
          <Lever
            label="Retire at age"
            value={String(retire)}
            min={50}
            max={65}
            step={1}
            raw={retire}
            left="50 · sooner"
            right="65 · later"
            onChange={(v) => {
              setRetire(v);
              resimulate({ retire: v });
            }}
          />

          <Lever
            label="Yearly lifestyle"
            value={`CHF ${lifestyle}M`}
            min={1}
            max={6}
            step={0.5}
            raw={lifestyle}
            left="Modest"
            right="Expansive"
            onChange={(v) => {
              setLifestyle(v);
              resimulate({ lifestyle: v });
            }}
          />

          <Lever
            label="Annual growth"
            value={`${growth}%`}
            min={1}
            max={6}
            step={0.1}
            raw={growth}
            left="Cautious"
            right="Ambitious"
            onChange={(v) => {
              setGrowth(v);
              resimulate({ growth: v });
            }}
          />

          {/* goal outcomes */}
          {(feas?.goal_outcomes ?? []).map((g) => (
            <div
              key={g.goal_id}
              style={{
                background: g.feasible ? "#FBFAF6" : "#FBF1E9",
                border: g.feasible ? "1px dashed #D8CFBC" : "1px dashed #EBD9C9",
                borderRadius: "16px",
                padding: "14px 18px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke={g.feasible ? "#5E806B" : "#9F5E3A"}
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 10L12 5 2 10l10 5 10-5z" />
                <path d="M6 12v5c0 1 2.7 3 6 3s6-2 6-3v-5" />
              </svg>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "13.5px", color: "#141E3C", fontWeight: 600 }}>{g.goal_title}</div>
                <div style={{ fontSize: "12px", color: "#707A8A" }}>
                  {g.feasible ? "Fully funded" : g.suggestion}
                </div>
              </div>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: g.feasible ? "#436B52" : "#9F5E3A",
                  background: g.feasible ? "#E7EFE8" : "#F5E3D5",
                  padding: "3px 9px",
                  borderRadius: "999px",
                  whiteSpace: "nowrap",
                }}
              >
                {g.feasible ? "Secured" : "At risk"}
              </span>
            </div>
          ))}

          {/* life gaps */}
          {(feas?.life_gaps ?? []).length > 0 && (
            <div
              style={{
                background: "#fff",
                border: "1px solid #E8E1D3",
                borderRadius: "16px",
                padding: "16px 18px",
              }}
            >
              <div
                style={{
                  fontSize: LABEL,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "#A8854A",
                  fontWeight: 600,
                  marginBottom: "10px",
                }}
              >
                Worth a conversation
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {(feas?.life_gaps ?? []).map((gap, i) => (
                  <div key={i} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                    <span
                      style={{
                        marginTop: "6px",
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        background: "#C9A86A",
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ fontSize: "13px", color: "#3C4456", lineHeight: 1.55 }}>{gap}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </MobileFrame>
  );
}

function Lever({
  label,
  value,
  min,
  max,
  step,
  raw,
  left,
  right,
  onChange,
}: {
  label: string;
  value: string;
  min: number;
  max: number;
  step: number;
  raw: number;
  left: string;
  right: string;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{ background: "#fff", border: "1px solid #E8E1D3", borderRadius: "16px", padding: "16px 18px" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <span style={{ fontSize: "14px", color: "#141E3C", fontWeight: 600 }}>{label}</span>
        <span style={{ fontFamily: "Spectral, serif", fontSize: "22px", color: "#141E3C" }}>{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={raw}
        onChange={(e) => onChange(+e.target.value)}
        style={{
          WebkitAppearance: "none",
          appearance: "none",
          width: "100%",
          height: "4px",
          borderRadius: "999px",
          background: "#E4DFD3",
          outline: "none",
          margin: "14px 0 0",
        }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#A6ADBB", marginTop: "6px" }}>
        <span>{left}</span>
        <span>{right}</span>
      </div>
      <style jsx>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #141e3c;
          border: 4px solid #c9a86a;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(20, 30, 60, 0.3);
        }
        input[type="range"]::-moz-range-thumb {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #141e3c;
          border: 4px solid #c9a86a;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
