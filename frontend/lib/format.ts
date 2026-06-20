export function money(n: number, ccy = "CHF"): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${ccy} ${(n / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${ccy} ${Math.round(n / 1_000_000)}M`;
  if (abs >= 1_000) return `${ccy} ${Math.round(n / 1_000)}k`;
  return `${ccy} ${Math.round(n)}`;
}

export function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

export function roleLabel(role?: string | null): string {
  switch (role) {
    case "compliance": return "Compliance Officer";
    case "advisor": return "Relationship Manager";
    case "wealth_planner": return "Wealth Planner";
    case "tax": return "Tax Expert";
    default: return role ?? "—";
  }
}

export function titleCase(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const DOC_LABELS: Record<string, string> = {
  passport: "Passport",
  proof_of_address: "Proof of address",
  financials: "Financial statements 2023",
  trust_deed: "Trust deed",
  source_of_wealth: "Source of funds",
  asset_summary: "Asset summary",
  news: "Board and press profile",
};

export function docLabel(filename: string, docType: string): string {
  if (DOC_LABELS[docType]) return DOC_LABELS[docType];
  return filename.replace(/\.pdf$/i, "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export const SEVERITY_TONE: Record<string, string> = {
  low: "bg-emerald-soft text-emerald",
  medium: "bg-amber-soft text-amber",
  high: "bg-ruby-soft text-ruby",
  critical: "bg-ruby-soft text-ruby",
};
