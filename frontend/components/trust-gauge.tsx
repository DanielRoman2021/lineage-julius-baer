"use client";
import type { TrustScore } from "@/lib/types";

function band(score: number): { label: string; tone: string } {
  if (score >= 75) return { label: "STRONG", tone: "#5E806B" };
  if (score >= 50) return { label: "STEADY", tone: "#C9A86A" };
  return { label: "EARLY", tone: "#C8895E" };
}

/** Arc trust gauge (matches the design system's renderGauge). */
export function TrustGauge({ score, width = 280 }: { score: number; width?: number }) {
  const h = width * 0.671;
  const cx = width / 2;
  const cy = h * 0.713;
  const r = width * 0.336;
  const start = -128;
  const end = 128;
  const vAng = start + (end - start) * (score / 100);
  const { label, tone } = band(score);

  const arc = (a0: number, a1: number) => {
    const p = (deg: number) => {
      const a = ((deg - 90) * Math.PI) / 180;
      return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const;
    };
    const [x0, y0] = p(a0);
    const [x1, y1] = p(a1);
    const large = a1 - a0 <= 180 ? 0 : 1;
    return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`;
  };

  return (
    <svg viewBox={`0 0 ${width} ${h}`} className="mx-auto block w-full" style={{ maxWidth: width }}>
      <path d={arc(start, end)} fill="none" stroke="#E9E3D6" strokeWidth={13} strokeLinecap="round" />
      <path d={arc(start, vAng)} fill="none" stroke={tone} strokeWidth={13} strokeLinecap="round" style={{ transition: "all .8s ease" }} />
      <text x={cx} y={cy - 4} fill="#141E3C" fontSize={width * 0.171} fontFamily="Spectral" textAnchor="middle">{score}</text>
      <text x={cx} y={cy + 22} fill="#707A8A" fontSize={width * 0.039} fontFamily="Archivo" fontWeight={600} letterSpacing="0.16em" textAnchor="middle">{label}</text>
    </svg>
  );
}

/** Compact ring for list rows. */
export function TrustRing({ score, size = 76 }: { score: number; size?: number }) {
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const { tone } = band(score);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E9E3D6" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={tone} strokeWidth={stroke}
        strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: "stroke-dashoffset .8s ease" }}
      />
      <text x="50%" y="52%" textAnchor="middle" dominantBaseline="middle" fontFamily="Spectral" fontSize={size * 0.3} fill="#141E3C">{score}</text>
    </svg>
  );
}

const COMPONENT_LABELS: Record<string, string> = {
  kyc_completeness: "KYC completeness",
  data_freshness: "Data freshness",
  engagement: "Client engagement",
  risk_cleared: "Risk cleared",
};

export function TrustBreakdown({ trust }: { trust: TrustScore }) {
  return (
    <div className="space-y-2.5">
      {Object.entries(trust.components).map(([k, v]) => (
        <div key={k}>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-slate-ink">{COMPONENT_LABELS[k] ?? k}</span>
            <span className="font-medium text-slate-muted">{v}/25</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-ivory-200">
            <div className="h-full rounded-full bg-navy" style={{ width: `${(v / 25) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
