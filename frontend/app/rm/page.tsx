"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { money } from "@/lib/format";
import { TrustRing } from "@/components/trust-gauge";
import { LoadingState, ErrorState, EmptyState } from "@/components/states";
import type { ApprovalItem, ClientSummary, Oversight } from "@/lib/types";

const SPECTRAL = { fontFamily: "Spectral" } as const;

function initials(name: string): string {
  const parts = name.replace(/^The\s+/i, "").split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Role badge styling for the action-points feed.
const ROLE_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  compliance: { label: "Compliance", bg: "#F7EAE1", color: "#9F5E3A" },
  advisor: { label: "Advisor", bg: "#F4EFE4", color: "#707A8A" },
  wealth_planner: { label: "Wealth Planner", bg: "#EDEFF3", color: "#1B2A4A" },
  tax: { label: "Tax", bg: "#EDEFF3", color: "#1B2A4A" },
  relationship: { label: "Relationship", bg: "#EDEFF3", color: "#1B2A4A" },
};

function roleBadge(role: string) {
  return ROLE_BADGE[role] ?? { label: role.replace(/_/g, " "), bg: "#F4EFE4", color: "#707A8A" };
}

// Dot colour by severity/kind, matching the design's terracotta / champagne / emerald.
function dotColour(item: ApprovalItem): string {
  if (item.kind === "flag") return "#C8895E";
  if (item.severity === "high" || item.severity === "critical") return "#C8895E";
  if (item.kind === "action") return "#5E806B";
  return "#C9A86A";
}

export default function RmDashboard() {
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [, setOversight] = useState<Oversight | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // New-client inline form (email only, no password).
  const [showForm, setShowForm] = useState(false);
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [email, setEmail] = useState("");
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState(false);
  const [newId, setNewId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [c, a] = await Promise.all([api.listClients(), api.approvals()]);
      setClients(c.clients);
      setItems(a.items);
      setOversight(a.oversight);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const onboardLink = newId ? `${window.location.origin}/onboard/${newId}` : "";

  async function submitNewClient(e: React.FormEvent) {
    e.preventDefault();
    const name = `${first} ${last}`.trim();
    if (!name || !email.trim()) return;
    setCreating(true);
    setFormError(false);
    try {
      const res = await api.createClient({ name, email: email.trim() });
      setNewId(res.client.id);
      setCopied(false);
      await reload();
    } catch {
      setFormError(true);
    } finally {
      setCreating(false);
    }
  }

  async function copyLink() {
    if (!onboardLink) return;
    try {
      await navigator.clipboard.writeText(onboardLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  if (loading) {
    return (
      <div className="px-8 py-7">
        <LoadingState label="Loading your relationships" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-8 py-7">
        <ErrorState onRetry={reload} />
      </div>
    );
  }

  const totalAum = clients.reduce((a, c) => a + c.net_worth, 0);
  const avgTrust = clients.length
    ? Math.round(clients.reduce((a, c) => a + c.trust_score, 0) / clients.length)
    : 0;
  const openActions = items.length;

  return (
    <div style={{ padding: "28px 32px 40px" }}>
      {/* Topbar greeting */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ ...SPECTRAL, fontSize: 18, color: "#141E3C" }}>Good morning, Markus</div>
        <div style={{ fontSize: 12, color: "#707A8A" }}>
          Friday, 20 June 2026 · {clients.length} relationships
        </div>
      </div>

      {/* Metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 18 }}>
        <div style={{ background: "#fff", border: "1px solid #E4DFD3", borderRadius: 10, padding: "18px 20px" }}>
          <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "#707A8A", fontWeight: 600 }}>
            Assets under care
          </div>
          <div style={{ ...SPECTRAL, fontSize: 30, color: "#141E3C", marginTop: 7 }}>{money(totalAum)}</div>
        </div>
        <div style={{ background: "#fff", border: "1px solid #E4DFD3", borderRadius: 10, padding: "18px 20px" }}>
          <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "#707A8A", fontWeight: 600 }}>
            Relationships
          </div>
          <div style={{ ...SPECTRAL, fontSize: 30, color: "#141E3C", marginTop: 7 }}>{clients.length}</div>
        </div>
        <div style={{ background: "#fff", border: "1px solid #E4DFD3", borderRadius: 10, padding: "18px 20px" }}>
          <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "#707A8A", fontWeight: 600 }}>
            Avg. trust score
          </div>
          <div style={{ ...SPECTRAL, fontSize: 30, color: "#A8854A", marginTop: 7 }}>{avgTrust}</div>
        </div>
        <div style={{ background: "#141E3C", borderRadius: 10, padding: "18px 20px" }}>
          <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "#9BA6BC", fontWeight: 600 }}>
            Open action points
          </div>
          <div style={{ ...SPECTRAL, fontSize: 30, color: "#C9A86A", marginTop: 7 }}>{openActions}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 392px", gap: 24, marginTop: 24, alignItems: "start" }}>
        {/* Client list */}
        <div style={{ background: "#fff", border: "1px solid #E4DFD3", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "18px 22px", borderBottom: "1px solid #F1ECE1", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ ...SPECTRAL, fontSize: 18, color: "#141E3C" }}>Your relationships</div>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ fontSize: 12, color: "#707A8A" }}>Sorted by priority</span>
              <button
                onClick={() => {
                  setShowForm((v) => !v);
                  setFormError(false);
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "7px 14px",
                  borderRadius: 8,
                  border: "1px solid #C9A86A",
                  background: showForm ? "#C9A86A" : "#FBF3E2",
                  color: showForm ? "#141E3C" : "#A8854A",
                  fontSize: 12.5,
                  fontWeight: 600,
                  fontFamily: "Archivo, sans-serif",
                  cursor: "pointer",
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                New client
              </button>
            </div>
          </div>

          {showForm && (
            <div style={{ padding: "18px 22px", borderBottom: "1px solid #F1ECE1", background: "#FBFAF6" }}>
              <form onSubmit={submitNewClient} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Field label="First name" value={first} onChange={setFirst} placeholder="Sarah" />
                  <Field label="Last name" value={last} onChange={setLast} placeholder="Keller" />
                </div>
                <Field label="Email" value={email} onChange={setEmail} placeholder="sarah@example.com" type="email" />
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <button
                    type="submit"
                    disabled={creating || !first.trim() || !last.trim() || !email.trim()}
                    style={{
                      padding: "9px 18px",
                      borderRadius: 8,
                      border: "none",
                      background: "#141E3C",
                      color: "#F7F5F0",
                      fontSize: 13,
                      fontWeight: 600,
                      fontFamily: "Archivo, sans-serif",
                      cursor: creating ? "default" : "pointer",
                      opacity: creating || !first.trim() || !last.trim() || !email.trim() ? 0.5 : 1,
                      boxShadow: "inset 0 0 0 1px #C9A86A",
                    }}
                  >
                    {creating ? "Creating…" : "Create client"}
                  </button>
                  {formError && (
                    <span style={{ fontSize: 12, color: "#9F5E3A" }}>Could not create the client. Try again.</span>
                  )}
                </div>
              </form>

              {newId && (
                <div style={{ marginTop: 16, background: "#fff", border: "1px solid #E4DFD3", borderRadius: 10, padding: "14px 16px" }}>
                  <div style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "#A8854A", fontWeight: 700 }}>
                    Onboarding link
                  </div>
                  <div style={{ fontSize: 12.5, color: "#707A8A", marginTop: 4, lineHeight: 1.5 }}>
                    Send this to your new client so they can upload their documents.
                  </div>
                  <div style={{ display: "flex", gap: 10, marginTop: 11 }}>
                    <input
                      readOnly
                      value={onboardLink}
                      onFocus={(e) => e.currentTarget.select()}
                      style={{
                        flex: 1,
                        padding: "9px 12px",
                        borderRadius: 8,
                        border: "1px solid #E4DFD3",
                        background: "#FBFAF6",
                        color: "#141E3C",
                        fontSize: 12.5,
                        fontFamily: "Archivo, sans-serif",
                      }}
                    />
                    <button
                      onClick={copyLink}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "9px 16px",
                        borderRadius: 8,
                        border: "1px solid #C9A86A",
                        background: copied ? "#EAF0EB" : "#FBF3E2",
                        color: copied ? "#436B52" : "#A8854A",
                        fontSize: 12.5,
                        fontWeight: 600,
                        fontFamily: "Archivo, sans-serif",
                        cursor: "pointer",
                        flex: "none",
                      }}
                    >
                      {copied ? "Copied" : "Copy link"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.6fr 1fr 0.9fr 1.2fr",
              gap: 12,
              padding: "11px 22px",
              fontSize: 10.5,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#A6ADBB",
              fontWeight: 600,
              borderBottom: "1px solid #F1ECE1",
            }}
          >
            <span>Client</span>
            <span>Assets</span>
            <span style={{ textAlign: "center" }}>Trust</span>
            <span>Next action</span>
          </div>

          {clients.length === 0 && (
            <EmptyState title="No relationships yet" hint="New clients will show up here once they are onboarded." minHeight={220} />
          )}

          {clients.map((c, i) => {
            const flagged = c.open_flags > 0;
            const nextAction =
              c.open_flags > 0
                ? "Resolve flagged hit"
                : c.pending_actions > 0
                ? "Review proposed actions"
                : "Relationship review";
            return (
              <Link
                key={c.id}
                href={`/rm/clients/${c.id}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.6fr 1fr 0.9fr 1.2fr",
                  gap: 12,
                  padding: "16px 22px",
                  alignItems: "center",
                  borderBottom: i < clients.length - 1 ? "1px solid #F4EFE6" : "none",
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: "50%",
                      background: "#1B2A4A",
                      color: "#F7F5F0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      ...SPECTRAL,
                      fontSize: 15,
                      flex: "none",
                    }}
                  >
                    {initials(c.name)}
                  </span>
                  <div>
                    <div style={{ fontSize: 14, color: "#141E3C", fontWeight: 600 }}>{c.name}</div>
                    <div style={{ fontSize: 11.5, color: "#707A8A" }}>{c.headline}</div>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 14, color: "#141E3C", ...SPECTRAL }}>{money(c.net_worth, c.currency)}</div>
                  <div style={{ fontSize: 11, color: flagged ? "#9F5E3A" : "#707A8A" }}>
                    {c.status}
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <TrustRing score={c.trust_score} size={46} />
                </div>
                <div style={{ fontSize: 12, color: flagged ? "#9F5E3A" : "#3C4456", fontWeight: 600 }}>
                  {nextAction}
                  <div style={{ fontSize: 11, color: "#A6ADBB", fontWeight: 400 }}>
                    {flagged ? "Today" : c.pending_actions > 0 ? "This week" : "—"}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Action points feed */}
        <div style={{ background: "#fff", border: "1px solid #E4DFD3", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "18px 20px", borderBottom: "1px solid #F1ECE1", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ ...SPECTRAL, fontSize: 18, color: "#141E3C" }}>Next action points</div>
            <span style={{ fontSize: 11, background: "#141E3C", color: "#C9A86A", fontWeight: 600, padding: "3px 9px", borderRadius: 999 }}>
              {items.length}
            </span>
          </div>
          <div style={{ padding: "6px 8px" }}>
            {items.length === 0 && (
              <div style={{ padding: "20px 14px", fontSize: 12.5, color: "#707A8A" }}>
                Queue clear. Every flag and action has been actioned.
              </div>
            )}
            {items.map((item, i) => {
              const badge = roleBadge(item.role);
              return (
                <Link
                  key={`${item.kind}-${item.id}`}
                  href="/rm/approvals"
                  style={{
                    display: "flex",
                    gap: 12,
                    padding: "13px 14px",
                    borderRadius: 9,
                    background: i % 2 === 1 ? "#FBFAF6" : "transparent",
                    textDecoration: "none",
                    color: "inherit",
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: dotColour(item),
                      marginTop: 5,
                      flex: "none",
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13.5, color: "#141E3C", fontWeight: 600 }}>{item.title}</div>
                    <div style={{ fontSize: 12, color: "#707A8A", marginTop: 2 }}>
                      {item.client_name} · {item.detail}
                    </div>
                    <div style={{ marginTop: 7, display: "flex", gap: 7, alignItems: "center" }}>
                      <span style={{ fontSize: 10.5, background: badge.bg, color: badge.color, fontWeight: 600, padding: "2px 8px", borderRadius: 999 }}>
                        {badge.label}
                      </span>
                      <span style={{ fontSize: 10.5, color: "#A6ADBB" }}>
                        {item.kind === "flag" ? "Today" : "This week"}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#707A8A", fontWeight: 600 }}>
        {label}
      </span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: "9px 12px",
          borderRadius: 8,
          border: "1px solid #E4DFD3",
          background: "#fff",
          color: "#141E3C",
          fontSize: 13,
          fontFamily: "Archivo, sans-serif",
        }}
      />
    </label>
  );
}
