"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { LoadingState, ErrorState } from "@/components/states";
import type { ApprovalItem, Oversight } from "@/lib/types";

const REVIEWER_NAME = "Markus Brunner";
const REVIEWER_SHORT = "M. Brunner";
const REVIEWER_ROLE = "advisor";

type Decision = "approved" | "rerouted";

function roleAccent(role: string): { color: string; bg: string } {
  const r = role.toLowerCase();
  if (r.includes("compliance") || r.includes("tax")) return { color: "#C8895E", bg: "#F7EAE1" };
  return { color: "#5E806B", bg: "#EAF0EB" };
}

const FILTERS = ["All roles", "Compliance", "Tax", "Wealth Planner", "Advisor"] as const;

function matchesFilter(item: ApprovalItem, filter: string): boolean {
  if (filter === "All roles") return true;
  return item.role.toLowerCase().includes(filter.toLowerCase());
}

export default function ApprovalsPage() {
  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [oversight, setOversight] = useState<Oversight | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("All roles");
  const [status, setStatus] = useState<Record<string, Decision>>({});
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [decideError, setDecideError] = useState<string | null>(null);

  async function refresh() {
    const a = await api.approvals();
    setItems(a.items);
    setOversight(a.oversight);
    // open the first item's audit trail by default
    setOpen((prev) => {
      if (Object.keys(prev).length || !a.items.length) return prev;
      return { [a.items[0].id]: true };
    });
  }

  const reload = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      await refresh();
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  async function decide(item: ApprovalItem, decision: Decision) {
    if (busy) return;
    setBusy(item.id);
    setDecideError(null);
    const rationale =
      decision === "approved" ? "Reviewed and approved." : "Sent for a closer look.";
    try {
      if (item.kind === "flag") {
        await api.decideFlag(item.client_id, item.id, {
          decision: decision === "approved" ? "approve" : "override",
          reviewer_name: REVIEWER_NAME,
          reviewer_role: REVIEWER_ROLE,
          rationale,
        });
      } else if (item.kind === "finding") {
        await api.decideFinding(item.client_id, item.id, {
          decision: decision === "approved" ? "approve" : "reroute",
          reviewer_name: REVIEWER_NAME,
          reviewer_role: REVIEWER_ROLE,
          rationale,
          target_role: item.owner_role,
        });
      } else if (decision === "approved") {
        await api.approveAction(item.client_id, item.id, {
          reviewer_name: REVIEWER_NAME,
          reviewer_role: REVIEWER_ROLE,
          rationale,
        });
      } else {
        await api.rerouteAction(item.client_id, item.id, {
          reviewer_name: REVIEWER_NAME,
          reviewer_role: REVIEWER_ROLE,
          rationale,
          target_role: item.owner_role,
        });
      }
      setStatus((s) => ({ ...s, [item.id]: decision }));
      await refresh();
    } catch {
      setDecideError("That decision did not go through. Check the connection and try again.");
    } finally {
      setBusy(null);
    }
  }

  const visible = useMemo(() => items.filter((i) => matchesFilter(i, filter)), [items, filter]);
  const pending = visible.filter((i) => !status[i.id]).length;
  const total = visible.length;

  if (loading) {
    return (
      <div className="px-8 py-7">
        <LoadingState label="Loading approvals" />
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

  return (
    <div className="px-8 py-7" style={{ fontFamily: "Archivo, sans-serif", color: "#3C4456" }}>
      {/* header */}
      <div className="flex items-end justify-between" style={{ marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "#A8854A", fontWeight: 700 }}>
            Human in the loop
          </div>
          <div style={{ fontFamily: "Spectral, serif", fontWeight: 400, fontSize: 29, color: "#141E3C", marginTop: 6 }}>
            Action Points &amp; Approvals
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: "Spectral, serif", fontSize: 26, color: "#141E3C" }}>
            {pending} <span style={{ fontSize: 15, color: "#707A8A" }}>of {total}</span>
          </div>
          <div style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "#707A8A", fontWeight: 600 }}>
            Awaiting you
          </div>
        </div>
      </div>

      {/* role filters */}
      <div className="flex" style={{ gap: 9, marginBottom: 20 }}>
        {FILTERS.map((f) => {
          const active = f === filter;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "8px 15px",
                borderRadius: 999,
                background: active ? "#141E3C" : "#fff",
                border: active ? "none" : "1px solid #DDD5C5",
                color: active ? "#F7F5F0" : "#707A8A",
                fontSize: 12.5,
                fontWeight: 600,
                fontFamily: "Archivo, sans-serif",
                cursor: "pointer",
              }}
            >
              {f}
            </button>
          );
        })}
      </div>

      {/* oversight */}
      {oversight && (
        <div
          style={{
            background: "#141E3C",
            borderRadius: 12,
            padding: "18px 24px",
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 36,
          }}
        >
          <div>
            <div style={{ fontFamily: "Spectral, serif", fontSize: 26, color: "#F4F1EA" }}>
              {Math.round(oversight.override_rate * 100)}%
            </div>
            <div style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "#9BA6BC", fontWeight: 600, marginTop: 2 }}>
              Override rate
            </div>
          </div>
          <div style={{ width: 1, height: 40, background: "rgba(255,255,255,.1)" }} />
          <div>
            <div style={{ fontFamily: "Spectral, serif", fontSize: 26, color: "#F4F1EA" }}>
              {(oversight.median_review_seconds / 60).toFixed(1)} min
            </div>
            <div style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "#9BA6BC", fontWeight: 600, marginTop: 2 }}>
              Median review time
            </div>
          </div>
          <div style={{ width: 1, height: 40, background: "rgba(255,255,255,.1)" }} />
          <div>
            <div style={{ fontFamily: "Spectral, serif", fontSize: 26, color: "#F4F1EA" }}>
              {Math.round(oversight.agreement_rate * 100)}%
            </div>
            <div style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "#9BA6BC", fontWeight: 600, marginTop: 2 }}>
              Reviewer agreement
            </div>
          </div>
          <div style={{ marginLeft: "auto", maxWidth: 250, fontSize: 12.5, color: "#AAB4C8", lineHeight: 1.55 }}>
            {oversight.note}
          </div>
        </div>
      )}

      {/* decision failure */}
      {decideError && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: "#FBF1EA",
            border: "1px solid #E7CBB4",
            borderRadius: 10,
            padding: "12px 16px",
            marginBottom: 16,
            fontSize: 13,
            color: "#9F5E3A",
          }}
        >
          <span style={{ flex: 1 }}>{decideError}</span>
          <button
            onClick={() => setDecideError(null)}
            style={{
              border: "none",
              background: "transparent",
              color: "#9F5E3A",
              fontSize: 12.5,
              fontWeight: 600,
              fontFamily: "Archivo, sans-serif",
              cursor: "pointer",
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* queue */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {visible.map((item) => {
          const st = status[item.id];
          const resolved = !!st;
          const approved = st === "approved";
          const accent = roleAccent(item.role);
          const border = resolved && approved ? "#CFE0D2" : "#E7CBB4";
          const isOpen = !!open[item.id];
          const a = item.audit;
          return (
            <div key={item.id} style={{ background: "#fff", border: `1px solid ${border}`, borderRadius: 12, padding: "20px 22px" }}>
              <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
                {/* agent chip column */}
                <div style={{ width: 130, flex: "none" }}>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "5px 10px", borderRadius: 7, background: accent.bg }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: accent.color }} />
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: "#141E3C" }}>{item.role}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "#A6ADBB", marginTop: 8 }}>{item.client_name}</div>
                </div>

                {/* body */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "Spectral, serif", fontSize: 18, color: "#141E3C" }}>{item.title}</div>
                  <div style={{ fontSize: 13.5, color: "#6B7488", lineHeight: 1.6, marginTop: 5 }}>{item.detail}</div>
                  <div style={{ display: "flex", gap: 9, marginTop: 11, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, color: "#707A8A" }}>Checked against</span>
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: "#3C4456", background: "#F4EFE4", padding: "3px 10px", borderRadius: 999 }}>
                      {item.checked_against}
                    </span>
                    <span style={{ fontSize: 11, color: "#C7C0B0" }}>→</span>
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: "#1B2A4A", background: "#EDEFF3", padding: "3px 10px", borderRadius: 999 }}>
                      {item.routed_to_name}
                    </span>
                  </div>
                </div>

                {/* actions */}
                <div style={{ width: 188, flex: "none", display: "flex", flexDirection: "column", gap: 9, alignItems: "stretch" }}>
                  {!resolved ? (
                    <>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          onClick={() => decide(item, "approved")}
                          disabled={busy === item.id}
                          style={{
                            flex: 1,
                            padding: "10px 0",
                            border: "none",
                            borderRadius: 8,
                            background: "#C9A86A",
                            color: "#141E3C",
                            fontSize: 13,
                            fontWeight: 600,
                            fontFamily: "Archivo, sans-serif",
                            cursor: busy === item.id ? "default" : "pointer",
                            opacity: busy === item.id ? 0.6 : 1,
                          }}
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => decide(item, "rerouted")}
                          disabled={busy === item.id}
                          style={{
                            flex: 1,
                            padding: "10px 0",
                            border: "1px solid #E0C9B5",
                            borderRadius: 8,
                            background: "#fff",
                            color: "#9F5E3A",
                            fontSize: 13,
                            fontWeight: 600,
                            fontFamily: "Archivo, sans-serif",
                            cursor: busy === item.id ? "default" : "pointer",
                            opacity: busy === item.id ? 0.6 : 1,
                          }}
                        >
                          {item.kind === "flag" ? "Override" : "Re-route"}
                        </button>
                      </div>
                      <div style={{ textAlign: "center", fontSize: 11.5, color: "#A6ADBB", cursor: "pointer" }}>View evidence</div>
                    </>
                  ) : (
                    <>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8,
                          padding: "11px 0",
                          borderRadius: 8,
                          background: approved ? "#EAF0EB" : "#F7EAE1",
                          color: approved ? "#436B52" : "#9F5E3A",
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                      >
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: approved ? "#436B52" : "#9F5E3A" }} />
                        {approved ? "Approved" : item.kind === "flag" ? "Overridden" : "Re-routed"}
                      </div>
                      <div style={{ textAlign: "center", fontSize: 11, color: "#A6ADBB" }}>
                        {approved ? `Signed by ${REVIEWER_SHORT}` : `By ${REVIEWER_SHORT}`}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* audit trail */}
              {a && (
                <div style={{ marginTop: 16, borderTop: "1px solid #F1ECE1", paddingTop: 14 }}>
                  <div
                    onClick={() => setOpen((o) => ({ ...o, [item.id]: !o[item.id] }))}
                    style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12, color: "#1B2A4A", fontWeight: 600 }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1B2A4A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 11l3 3L22 4" />
                      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                    </svg>
                    Audit trail
                    <span style={{ marginLeft: "auto", fontSize: 11, color: "#A6ADBB", fontWeight: 500 }}>{isOpen ? "Hide" : "Show"}</span>
                  </div>
                  {isOpen && (
                    <div
                      style={{
                        marginTop: 14,
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr 1fr",
                        gap: "14px 24px",
                        background: "#FBFAF6",
                        border: "1px solid #EDE7DA",
                        borderRadius: 10,
                        padding: "16px 18px",
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "#A6ADBB", fontWeight: 600 }}>Input</div>
                        <div style={{ fontSize: 12.5, color: "#3C4456", marginTop: 3 }}>{a.input}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "#A6ADBB", fontWeight: 600 }}>Model and version</div>
                        <div style={{ fontSize: 12.5, color: "#3C4456", marginTop: 3 }}>{a.model_version}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "#A6ADBB", fontWeight: 600 }}>Confidence</div>
                        <div style={{ fontSize: 12.5, color: "#3C4456", marginTop: 3 }}>{Math.round(item.confidence * 100)}%</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "#A6ADBB", fontWeight: 600 }}>Reviewer</div>
                        <div style={{ fontSize: 12.5, color: "#3C4456", marginTop: 3 }}>{a.reviewer}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "#A6ADBB", fontWeight: 600 }}>Time</div>
                        <div style={{ fontSize: 12.5, color: "#3C4456", marginTop: 3 }}>12 Jun, 14:26</div>
                      </div>
                      <div style={{ gridColumn: "1 / -1" }}>
                        <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "#A6ADBB", fontWeight: 600 }}>Reason given</div>
                        <div style={{ fontSize: 12.5, color: "#3C4456", marginTop: 3, lineHeight: 1.5 }}>{a.reason}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {visible.length === 0 && (
          <div style={{ background: "#fff", border: "1px solid #E4DFD3", borderRadius: 12, padding: "28px 22px", fontSize: 13.5, color: "#6B7488" }}>
            Nothing awaiting you here. The queue is clear.
          </div>
        )}
      </div>
    </div>
  );
}
