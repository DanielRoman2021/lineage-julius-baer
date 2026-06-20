"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import type { ClientState, ActionPoint } from "@/lib/types";
import { MobileFrame } from "@/components/mobile-frame";
import { LoadingState, ErrorState } from "@/components/states";

const SPECTRAL = { fontFamily: "Spectral" } as const;

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function firstName(name: string): string {
  return (name || "").trim().split(/\s+/)[0] || "there";
}

function initials(name: string): string {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "SK";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// three accent treatments, cycled across the "what is next" list
const ACCENTS = [
  {
    bg: "#EAF0EB",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#5E806B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6L9 17l-5-5" />
      </svg>
    ),
  },
  {
    bg: "#FBF3E2",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#A8854A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 5h16M4 12h16M4 19h10" />
      </svg>
    ),
  },
  {
    bg: "#F7EAE1",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9F5E3A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 16V5" />
        <path d="M8 9l4-4 4 4" />
        <path d="M5 19h14" />
      </svg>
    ),
  },
];

// fallback copy matches the design verbatim when the backend has no actions
const FALLBACK_NEXT: { title: string; sub: string }[] = [
  { title: "Confirm your plan to step back by 55", sub: "Agreed with Markus, ready to sign off" },
  { title: "Review the family trust draft", sub: "Thursday, with Markus" },
  { title: "Confirm a detail on your source of funds", sub: "Markus has one quick question" },
];

const Chevron = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C2BBA9" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 6l6 6-6 6" />
  </svg>
);

export default function ClientHomePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id || "sarah_keller";

  const [state, setState] = useState<ClientState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const reload = useCallback(() => {
    let alive = true;
    setLoading(true);
    setError(false);
    api
      .getClient(id)
      .then((s) => {
        if (alive) setState(s);
      })
      .catch(() => {
        if (alive) {
          setState(null);
          setError(true);
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [id]);

  useEffect(() => reload(), [reload]);

  const name = state?.client.name ?? "Sarah Keller";
  const first = firstName(name);
  const inits = initials(name);

  // approved / agreed actions to surface, max 3
  const actions: ActionPoint[] = (state?.actions ?? [])
    .filter((a) => ["approved", "agreed", "ready", "done"].includes((a.status || "").toLowerCase()))
    .slice(0, 3);

  const nextItems: { title: string; sub: string }[] =
    actions.length > 0
      ? actions.map((a) => ({ title: a.title, sub: a.description }))
      : FALLBACK_NEXT;

  return (
    <MobileFrame title="Home">
      {loading ? (
        <div style={{ background: "#F7F5F0" }}>
          <LoadingState label="Loading your home" minHeight={760} />
        </div>
      ) : error ? (
        <div style={{ background: "#F7F5F0" }}>
          <ErrorState onRetry={reload} minHeight={760} />
        </div>
      ) : (
        <div
          className="scroll"
          style={{
            background: "#F7F5F0",
            fontFamily: "Archivo, sans-serif",
            padding: "8px 22px 30px",
            overflowY: "auto",
            maxHeight: 760,
          }}
        >
          {/* header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 2px" }}>
            <div style={{ ...SPECTRAL, fontSize: 18, letterSpacing: "0.2em", color: "#141E3C" }}>LINEAGE</div>
            <span
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: "#1B2A4A",
                color: "#F7F5F0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                ...SPECTRAL,
                fontSize: 15,
              }}
            >
              {inits}
            </span>
          </div>

          {/* greeting */}
          <div style={{ marginTop: 22 }}>
            <div style={{ fontSize: 12, color: "#A8854A", letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700 }}>
              {greeting()}
            </div>
            <div style={{ ...SPECTRAL, fontSize: 30, color: "#141E3C", marginTop: 4 }}>{first}</div>
            <div style={{ fontSize: 14, color: "#6B7488", lineHeight: 1.6, marginTop: 8 }}>
              Your onboarding is nearly done, and your plan is on track.
            </div>
          </div>

          {/* note from Markus */}
          <div style={{ marginTop: 22, background: "#141E3C", borderRadius: 20, padding: "20px 20px", color: "#F4F1EA" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
              <span
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  background: "#C9A86A",
                  color: "#141E3C",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                MB
              </span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#F7F5F0" }}>Markus Brunner</div>
                <div style={{ fontSize: 11.5, color: "#9BA6BC" }}>Your relationship manager</div>
              </div>
              <span style={{ marginLeft: "auto", fontSize: 10.5, color: "#9BA6BC" }}>Today</span>
            </div>
            <div style={{ fontSize: 14, color: "#E3E7F0", lineHeight: 1.65, marginTop: 14 }}>
              Hi {first}. Two small things left and your onboarding is finished. I have set aside time on Thursday to walk through the trust draft. No rush, and call me any time.
            </div>
          </div>

          {/* what's next */}
          <div style={{ marginTop: 24, display: "flex", alignItems: "center", gap: 9, marginBottom: 13 }}>
            <span style={{ width: 9, height: 9, borderRadius: 3, background: "#C9A86A" }} />
            <div style={{ ...SPECTRAL, fontSize: 18, color: "#141E3C" }}>What is next</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
            {nextItems.map((item, i) => {
              const accent = ACCENTS[i % ACCENTS.length];
              return (
                <div
                  key={i}
                  style={{
                    background: "#fff",
                    border: "1px solid #E8E1D3",
                    borderRadius: 15,
                    padding: "16px 18px",
                    display: "flex",
                    alignItems: "center",
                    gap: 13,
                  }}
                >
                  <span
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: "50%",
                      background: accent.bg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flex: "none",
                    }}
                  >
                    {accent.icon}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, color: "#141E3C", fontWeight: 600 }}>{item.title}</div>
                    <div style={{ fontSize: 12, color: "#707A8A", marginTop: 1 }}>{item.sub}</div>
                  </div>
                  {Chevron}
                </div>
              );
            })}
          </div>

          {/* explore buttons into story / wheel / feasibility */}
          <div style={{ marginTop: 22, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
            {[
              { href: `/client/${id}/story`, label: "Your story" },
              { href: `/client/${id}/wheel`, label: "Life wheel" },
              { href: `/client/${id}/feasibility`, label: "Your plan" },
              { href: `/client/${id}/graph`, label: "Ownership & structure" },
            ].map((b) => (
              <Link
                key={b.href}
                href={b.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  padding: "14px 8px",
                  borderRadius: 15,
                  background: "#fff",
                  border: "1px solid #E8E1D3",
                  color: "#141E3C",
                  textDecoration: "none",
                  fontSize: 12.5,
                  fontWeight: 600,
                  lineHeight: 1.3,
                }}
              >
                {b.label}
              </Link>
            ))}
          </div>

          {/* message Markus / chat */}
          <Link
            href={`/client/${id}/chat`}
            style={{
              marginTop: 13,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              padding: 16,
              borderRadius: 15,
              background: "#C9A86A",
              color: "#141E3C",
              textDecoration: "none",
              fontSize: 15,
              fontWeight: 600,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#141E3C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Message Markus
          </Link>
        </div>
      )}
    </MobileFrame>
  );
}
