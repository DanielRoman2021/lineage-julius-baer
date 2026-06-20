"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { ClientSummary } from "@/lib/types";

const SPECTRAL = { fontFamily: "Spectral, serif" } as const;

function initialsOf(name: string): string {
  const parts = name.split(" ").filter((w) => w && !/^(dr|mr|mrs|ms|prof)\.?$/i.test(w));
  const use = parts.length ? parts : name.split(" ");
  return use.map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

const STATUS_TONE: Record<string, { bg: string; fg: string }> = {
  onboarding: { bg: "#FBF1E4", fg: "#A8854A" },
  review: { bg: "#F7EAE1", fg: "#9F5E3A" },
  active: { bg: "#E7EFE8", fg: "#436B52" },
};

/** Click the client name/avatar to open a dropdown of every client and jump to
 *  the same page for the one you pick. Used in the header of the RM client
 *  pages so they are no longer stuck on a single client. */
export function ClientSwitcher({
  currentId,
  hrefFor,
  subtitle,
}: {
  currentId: string;
  hrefFor: (id: string) => string;
  subtitle?: string;
}) {
  const router = useRouter();
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    api.listClients().then((r) => { if (alive) setClients(r.clients); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const current = clients.find((c) => c.id === currentId);
  const name = current?.name ?? "Sarah Keller";

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{ display: "flex", alignItems: "center", gap: 14, background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}
      >
        <span style={{ width: 40, height: 40, borderRadius: "50%", background: "#1B2A4A", color: "#F7F5F0", display: "grid", placeItems: "center", ...SPECTRAL, fontSize: 15 }}>
          {initialsOf(name)}
        </span>
        <span>
          <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ ...SPECTRAL, fontSize: 18, color: "#141E3C" }}>{name}</span>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#A6ADBB" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }}>
              <path d="M6 9l6 6 6-6" />
            </svg>
          </span>
          {subtitle ? <span style={{ display: "block", fontSize: 12, color: "#707A8A" }}>{subtitle}</span> : null}
        </span>
      </button>

      {open ? (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
          <div style={{ position: "absolute", top: 54, left: 0, zIndex: 50, width: 290, background: "#fff", border: "1px solid #E4DFD3", borderRadius: 12, boxShadow: "0 12px 32px rgba(20,30,60,0.14)", padding: 6, maxHeight: 400, overflowY: "auto" }}>
            <div style={{ fontSize: 10.5, letterSpacing: "0.12em", textTransform: "uppercase", color: "#A6ADBB", fontWeight: 700, padding: "8px 12px 6px" }}>Switch client</div>
            {clients.map((c) => {
              const sel = c.id === currentId;
              const tone = STATUS_TONE[c.status] ?? STATUS_TONE.onboarding;
              return (
                <button
                  key={c.id}
                  onClick={() => { setOpen(false); router.push(hrefFor(c.id)); }}
                  style={{ display: "flex", alignItems: "center", gap: 11, width: "100%", padding: "9px 12px", borderRadius: 9, border: "none", background: sel ? "#F4EFE6" : "transparent", cursor: "pointer", textAlign: "left" }}
                >
                  <span style={{ width: 32, height: 32, borderRadius: "50%", background: "#1B2A4A", color: "#F7F5F0", display: "grid", placeItems: "center", ...SPECTRAL, fontSize: 12.5 }}>
                    {initialsOf(c.name)}
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 13.5, color: "#141E3C", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</span>
                    <span style={{ display: "block", fontSize: 11.5, color: "#707A8A" }}>{c.currency} {Math.round(c.net_worth / 1_000_000)}M</span>
                  </span>
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: tone.fg, background: tone.bg, padding: "3px 8px", borderRadius: 999, textTransform: "capitalize" }}>{c.status}</span>
                </button>
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
}
