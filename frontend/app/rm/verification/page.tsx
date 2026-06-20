"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { LoadingState, ErrorState } from "@/components/states";
import type { ClientSummary, Verification } from "@/lib/types";

type Row = ClientSummary & { verification: Verification | null };

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function statusPill(status: string): { label: string; color: string; bg: string } {
  const s = status.toLowerCase();
  if (s === "review") return { label: "Review", color: "#9F5E3A", bg: "#F7EAE1" };
  if (s === "active") return { label: "Active", color: "#436B52", bg: "#EAF0EB" };
  return { label: "Onboarding", color: "#A8854A", bg: "rgba(201,168,106,.15)" };
}

export default function VerificationOverviewPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const { clients } = await api.listClients();
      const verifications = await Promise.all(
        clients.map((c) => api.getVerification(c.id).catch(() => null)),
      );
      setRows(clients.map((c, i) => ({ ...c, verification: verifications[i] })));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  if (loading) {
    return (
      <div className="px-8 py-7">
        <LoadingState label="Loading verification" />
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
    <div className="px-8 py-7" style={{ maxWidth: 1100, fontFamily: "Archivo, sans-serif", color: "#3C4456" }}>
      {/* header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "#A8854A", fontWeight: 700 }}>
          Human in the loop
        </div>
        <div style={{ fontFamily: "Spectral, serif", fontWeight: 400, fontSize: 29, color: "#141E3C", marginTop: 6 }}>
          Verification
        </div>
        <div style={{ fontSize: 13.5, color: "#707A8A", marginTop: 5 }}>
          Every client the desk is onboarding
        </div>
      </div>

      {/* table card */}
      <div style={{ background: "#fff", border: "1px solid #E4DFD3", borderRadius: 12, overflow: "hidden" }}>
        {/* column header */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2.2fr 1fr 1fr 1.5fr 0.9fr 0.9fr 28px",
            gap: 16,
            padding: "13px 22px",
            borderBottom: "1px solid #EDE7DA",
            background: "#FBFAF6",
            fontSize: 10.5,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "#A6ADBB",
            fontWeight: 700,
          }}
        >
          <div>Client</div>
          <div>Status</div>
          <div>Pipeline</div>
          <div>Criteria</div>
          <div>To human</div>
          <div>Open flags</div>
          <div />
        </div>

        {rows.length === 0 && (
          <div style={{ padding: "28px 22px", fontSize: 13.5, color: "#6B7488" }}>
            No clients on the desk yet.
          </div>
        )}

        {rows.map((c, i) => {
          const pill = statusPill(c.status);
          const v = c.verification;
          const total = v?.criteria_total ?? 0;
          const cleared = v?.criteria_cleared ?? 0;
          const toHuman = v?.criteria_to_human ?? 0;
          const pct = total > 0 ? Math.round((cleared / total) * 100) : 0;
          return (
            <Link
              key={c.id}
              href={`/rm/clients/${c.id}/flow`}
              style={{
                display: "grid",
                gridTemplateColumns: "2.2fr 1fr 1fr 1.5fr 0.9fr 0.9fr 28px",
                gap: 16,
                alignItems: "center",
                padding: "16px 22px",
                borderTop: i === 0 ? "none" : "1px solid #F1ECE1",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              {/* client */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                <span
                  style={{
                    flex: "none",
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "#141E3C",
                    color: "#F4F1EA",
                    display: "grid",
                    placeItems: "center",
                    fontSize: 12.5,
                    fontWeight: 700,
                  }}
                >
                  {initials(c.name)}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#141E3C", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {c.name}
                  </div>
                  <div style={{ fontSize: 11.5, color: "#A6ADBB", marginTop: 2 }}>{c.domicile}</div>
                </div>
              </div>

              {/* status */}
              <div>
                <span
                  style={{
                    display: "inline-block",
                    padding: "4px 11px",
                    borderRadius: 999,
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: pill.color,
                    background: pill.bg,
                  }}
                >
                  {pill.label}
                </span>
              </div>

              {/* pipeline */}
              <div style={{ fontSize: 12.5, color: c.has_run ? "#3C4456" : "#A6ADBB", fontWeight: c.has_run ? 600 : 400 }}>
                {c.has_run ? "Run" : "Not started"}
              </div>

              {/* criteria */}
              <div style={{ minWidth: 0 }}>
                <div style={{ height: 6, borderRadius: 999, background: "#EDEAE2", overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", borderRadius: 999, background: "#5E806B" }} />
                </div>
                <div style={{ fontSize: 11.5, color: "#707A8A", marginTop: 5 }}>
                  {cleared}/{total} cleared
                </div>
              </div>

              {/* to human */}
              <div>
                <span
                  style={{
                    display: "inline-block",
                    minWidth: 26,
                    textAlign: "center",
                    padding: "3px 9px",
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 600,
                    color: toHuman > 0 ? "#9F5E3A" : "#A6ADBB",
                    background: toHuman > 0 ? "#F7EAE1" : "#F4F1EA",
                  }}
                >
                  {toHuman}
                </span>
              </div>

              {/* open flags */}
              <div>
                <span
                  style={{
                    display: "inline-block",
                    minWidth: 26,
                    textAlign: "center",
                    padding: "3px 9px",
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 600,
                    color: c.open_flags > 0 ? "#9F5E3A" : "#A6ADBB",
                    background: c.open_flags > 0 ? "#F7EAE1" : "#F4F1EA",
                  }}
                >
                  {c.open_flags}
                </span>
              </div>

              {/* chevron */}
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C7C0B0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
