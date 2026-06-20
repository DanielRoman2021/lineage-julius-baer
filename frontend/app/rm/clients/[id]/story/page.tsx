"use client";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { money } from "@/lib/format";
import { LoadingState, ErrorState } from "@/components/states";
import type { ClientState, WealthStory } from "@/lib/types";

function stripMarkdown(s: string): string {
  return (s || "")
    .replace(/\*\*/g, "")
    .replace(/__/g, "")
    .trim();
}

export default function LivingWealthStory() {
  const params = useParams<{ id: string }>();
  const id = params?.id || "sarah_keller";
  const [story, setStory] = useState<WealthStory | null>(null);
  const [state, setState] = useState<ClientState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [s, c] = await Promise.all([api.getStory(id), api.getClient(id)]);
      setStory(s);
      setState(c);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    reload();
  }, [reload]);

  if (loading) {
    return (
      <div className="p-7">
        <LoadingState label="Loading wealth story" />
      </div>
    );
  }

  if (error || !story || !state) {
    return (
      <div className="p-7">
        <ErrorState onRetry={reload} />
      </div>
    );
  }

  const c = state.client;
  const initials = c.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const paragraphs = stripMarkdown(story.narrative_markdown)
    .split(/\n{2,}/)
    .map((p) => p.replace(/\n/g, " ").trim())
    .filter(Boolean);
  const milestones = [...story.milestones].sort((a, b) => a.year - b.year);

  return (
    <div style={{ background: "#F7F5F0", color: "#3C4456", fontFamily: "Archivo, sans-serif" }}>
      {/* Sub-header strip */}
      <div
        style={{
          height: 68,
          borderBottom: "1px solid #E4DFD3",
          background: "#FBFAF6",
          display: "flex",
          alignItems: "center",
          padding: "0 32px",
          gap: 18,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: "#1B2A4A",
            color: "#F7F5F0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "Spectral, serif",
            fontSize: 16,
          }}
        >
          {initials}
        </div>
        <div>
          <div style={{ fontFamily: "Spectral, serif", fontSize: 18, color: "#141E3C" }}>{c.name}</div>
          <div style={{ fontSize: 12, color: "#707A8A" }}>Living Wealth Story</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 14 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              fontSize: 12,
              color: "#436B52",
              background: "#EAF0EB",
              padding: "6px 13px",
              borderRadius: 999,
              fontWeight: 600,
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#5E806B" }} />
            Updated 2 days ago
          </span>
          <span style={{ fontSize: 13, color: "#707A8A", display: "inline-flex", alignItems: "center", gap: 7 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#707A8A" strokeWidth="1.6">
              <path d="M4 4h11l5 5v11H4z" />
            </svg>
            Export
          </span>
        </div>
      </div>

      <div style={{ padding: "36px 44px 56px" }}>
        {/* hero */}
        <div style={{ display: "flex", gap: 32, alignItems: "center", marginBottom: 40 }}>
          <div
            style={{
              width: 118,
              height: 118,
              flex: "none",
              borderRadius: "50%",
              background: "radial-gradient(circle at 35% 30%, #25365C, #141E3C)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 0 1.5px #C9A86A, 0 0 0 9px #FBF7EE",
            }}
          >
            <span style={{ fontFamily: "Spectral, serif", fontSize: 40, color: "#F4F1EA" }}>{initials}</span>
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 11,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "#A8854A",
                fontWeight: 700,
              }}
            >
              Living Wealth Story
            </div>
            <div
              style={{
                fontFamily: "Spectral, serif",
                fontWeight: 300,
                fontSize: 40,
                color: "#141E3C",
                lineHeight: 1.12,
                marginTop: 8,
              }}
            >
              {story.headline}
            </div>
            <div style={{ display: "flex", gap: 22, marginTop: 14, fontSize: 13, color: "#707A8A", flexWrap: "wrap" }}>
              <span>{c.domicile}</span>
              <span style={{ color: "#D8CFBC" }}>·</span>
              <span>{c.marital_status}</span>
              <span style={{ color: "#D8CFBC" }}>·</span>
              <span style={{ color: "#141E3C", fontFamily: "Spectral, serif", fontSize: 15 }}>
                {money(c.net_worth, c.currency)}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 44, alignItems: "start" }}>
          {/* narrative */}
          <div>
            {paragraphs.map((p, i) =>
              i === 0 ? (
                <div
                  key={i}
                  style={{
                    fontFamily: "Spectral, serif",
                    fontWeight: 300,
                    fontSize: 21,
                    lineHeight: 1.62,
                    color: "#2C3344",
                  }}
                >
                  {p}
                </div>
              ) : (
                <div
                  key={i}
                  style={{ marginTop: 18, fontSize: 15.5, lineHeight: 1.78, color: "#3C4456" }}
                >
                  {p}
                </div>
              ),
            )}

            {/* milestone timeline */}
            <div
              style={{
                marginTop: 36,
                fontSize: 11,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "#A8854A",
                fontWeight: 700,
              }}
            >
              Milestones
            </div>
            <div style={{ marginTop: 18, position: "relative", paddingLeft: 26 }}>
              <div
                style={{
                  position: "absolute",
                  left: 5,
                  top: 4,
                  bottom: 4,
                  width: 2,
                  background: "#E4DFD3",
                }}
              />
              <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
                {milestones.map((m, i) => (
                  <div key={i} style={{ position: "relative" }}>
                    <div
                      style={{
                        position: "absolute",
                        left: -26,
                        top: 4,
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        background: "#C9A86A",
                        boxShadow: "0 0 0 3px #FBF7EE",
                      }}
                    />
                    <div
                      style={{
                        fontSize: 11,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        color: "#A8854A",
                        fontWeight: 600,
                      }}
                    >
                      {m.year}
                    </div>
                    <div
                      style={{
                        fontFamily: "Spectral, serif",
                        fontSize: 17,
                        color: "#141E3C",
                        marginTop: 3,
                      }}
                    >
                      {m.title}
                    </div>
                    <div style={{ marginTop: 4, fontSize: 14.5, lineHeight: 1.7, color: "#3C4456" }}>
                      {m.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* attribution line */}
            <div
              style={{
                margin: "32px 0 0",
                padding: "22px 26px",
                borderLeft: "3px solid #C9A86A",
                background: "#FBF7EE",
                borderRadius: "0 10px 10px 0",
              }}
            >
              <div style={{ fontSize: 12, color: "#9F8A5E", letterSpacing: "0.04em" }}>
                Drafted by the Wealth Story Agent · approved by Markus Brunner
              </div>
            </div>
          </div>

          {/* structured profile */}
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ background: "#141E3C", borderRadius: 12, padding: "22px 24px", color: "#F4F1EA" }}>
              <div
                style={{
                  fontSize: 10.5,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "#C9A86A",
                  fontWeight: 700,
                  marginBottom: 14,
                }}
              >
                Snapshot
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "8px 0",
                  borderBottom: "1px solid rgba(255,255,255,.08)",
                }}
              >
                <span style={{ fontSize: 13, color: "#9BA6BC" }}>Net worth</span>
                <span style={{ fontFamily: "Spectral, serif", fontSize: 16 }}>{money(c.net_worth, c.currency)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}>
                <span style={{ fontSize: 13, color: "#9BA6BC" }}>Domicile</span>
                <span style={{ fontSize: 14 }}>{c.domicile}</span>
              </div>
            </div>

            {c.tags.length > 0 && (
              <div style={{ background: "#fff", border: "1px solid #E4DFD3", borderRadius: 12, padding: "20px 22px" }}>
                <div
                  style={{
                    fontSize: 10.5,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "#A8854A",
                    fontWeight: 700,
                    marginBottom: 14,
                  }}
                >
                  Themes
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {c.tags.map((t) => (
                    <span
                      key={t}
                      style={{
                        fontSize: 12,
                        color: "#7A6533",
                        background: "#FBF7EE",
                        border: "1px solid #EAD9B8",
                        padding: "5px 11px",
                        borderRadius: 999,
                        fontWeight: 600,
                      }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {story.sources.length > 0 && (
              <div style={{ background: "#fff", border: "1px solid #E4DFD3", borderRadius: 12, padding: "20px 22px" }}>
                <div
                  style={{
                    fontSize: 10.5,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "#A8854A",
                    fontWeight: 700,
                    marginBottom: 14,
                  }}
                >
                  Sources
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                  {story.sources.map((s, i) => (
                    <div key={i} style={{ fontSize: 12.5, color: "#3C4456", lineHeight: 1.5 }}>
                      <span style={{ color: "#141E3C", fontWeight: 600 }}>{s.label}</span>
                      {s.quote ? <span style={{ color: "#707A8A" }}> · {s.quote}</span> : null}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ background: "#FBF7EE", border: "1px solid #EAD9B8", borderRadius: 12, padding: "16px 20px" }}>
              <div style={{ fontSize: 11.5, color: "#9F8A5E", lineHeight: 1.6 }}>
                Story extracted by the{" "}
                <span style={{ fontWeight: 600, color: "#7A6533" }}>Wealth Planner Agent</span>, cross-checked by Tax
                &amp; Compliance, and approved by Markus Brunner. It updates automatically as new documents and life
                events arrive.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
