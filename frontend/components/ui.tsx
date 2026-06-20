"use client";
import Link from "next/link";
import { SEVERITY_TONE } from "@/lib/format";

export function BrandMark({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span
        className={`grid h-8 w-8 place-items-center rounded-lg ${
          light ? "bg-ivory text-navy" : "bg-navy text-ivory"
        }`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M12 2v20M12 8l6-3M12 8L6 5M12 14l7 3M12 14l-7 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          <circle cx="12" cy="12" r="2.2" fill="currentColor" />
        </svg>
      </span>
      <span className={`display text-lg font-medium ${light ? "text-ivory" : "text-navy"}`}>Lineage</span>
    </Link>
  );
}

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: string }) {
  const tones: Record<string, string> = {
    neutral: "bg-ivory-200 text-slate-ink",
    gold: "bg-gold/15 text-gold-600",
    navy: "bg-navy text-ivory",
    emerald: "bg-emerald-soft text-emerald",
    amber: "bg-amber-soft text-amber",
    ruby: "bg-ruby-soft text-ruby",
    ...SEVERITY_TONE,
  };
  return <span className={`chip ${tones[tone] ?? tones.neutral}`}>{children}</span>;
}

export function StatusDot({ status }: { status: string }) {
  const map: Record<string, string> = {
    running: "bg-gold animate-pulse",
    done: "bg-emerald",
    approved: "bg-emerald",
    awaiting_approval: "bg-amber animate-pulse",
    blocked: "bg-ruby",
    error: "bg-ruby",
    queued: "bg-ivory-300",
  };
  return <span className={`inline-block h-2 w-2 rounded-full ${map[status] ?? "bg-ivory-300"}`} />;
}

export function ConfidenceMeter({ value }: { value: number }) {
  const tone = value < 0.7 ? "bg-amber" : value < 0.85 ? "bg-gold" : "bg-emerald";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-ivory-200">
        <div className={`h-full ${tone}`} style={{ width: `${Math.round(value * 100)}%` }} />
      </div>
      <span className="text-xs font-medium text-slate-muted">{Math.round(value * 100)}%</span>
    </div>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="label mb-2">{children}</p>;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-ivory-300 p-8 text-center text-sm text-slate-muted">
      {children}
    </div>
  );
}
