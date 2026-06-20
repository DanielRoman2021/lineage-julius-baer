"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import type { WealthStory } from "@/lib/types";
import { MobileFrame } from "@/components/mobile-frame";
import { LoadingState, ErrorState } from "@/components/states";

function splitNarrative(markdown: string): string[] {
  return (markdown || "")
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\*\*/g, "").trim())
    .filter(Boolean);
}

export default function ClientStoryPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id || "sarah_keller";
  const [story, setStory] = useState<WealthStory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const reload = useCallback(() => {
    let alive = true;
    setLoading(true);
    setError(false);
    api
      .getStory(id)
      .then((s) => {
        if (alive) setStory(s);
      })
      .catch(() => {
        if (alive) {
          setStory(null);
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

  const paragraphs = story ? splitNarrative(story.narrative_markdown) : [];
  const lead = paragraphs[0] || "";
  const rest = paragraphs.slice(1);

  return (
    <MobileFrame title="My Wealth Story">
      <div
        className="scroll"
        style={{
          height: "100%",
          overflowY: "auto",
          padding: "6px 22px 30px",
          fontFamily: "Archivo, sans-serif",
          background: "#F7F5F0",
        }}
      >
        {loading ? (
          <LoadingState label="Loading your story" minHeight={620} />
        ) : error ? (
          <ErrorState onRetry={reload} minHeight={620} />
        ) : (
          <>
            {/* header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "4px 2px 16px",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#A8854A",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    fontWeight: 700,
                  }}
                >
                  My story
                </div>
                <div
                  style={{
                    fontFamily: "Spectral, serif",
                    fontSize: 25,
                    color: "#141E3C",
                    marginTop: 3,
                  }}
                >
                  How I built it
                </div>
              </div>
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
                  fontFamily: "Spectral, serif",
                  fontSize: 15,
                }}
              >
                SK
              </span>
            </div>

            {/* note from Markus */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                margin: "0 2px 14px",
                fontSize: 12,
                color: "#707A8A",
              }}
            >
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: "#1B2A4A",
                  color: "#F7F5F0",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "Spectral, serif",
                  fontSize: 10,
                }}
              >
                MB
              </span>
              <span>Prepared for you by Markus Brunner</span>
            </div>

            {/* story card */}
            <div
              style={{
                background: "#141E3C",
                borderRadius: 20,
                padding: "24px 22px",
                color: "#F4F1EA",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  fontFamily: "Spectral, serif",
                  fontWeight: 300,
                  fontSize: 20,
                  lineHeight: 1.55,
                }}
              >
                {lead ||
                  '"Over fourteen years you built a company from nothing, and in 2023 you chose to step back, on your own terms."'}
              </div>
              {rest.map((p, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: 13,
                    color: "#AAB4C8",
                    lineHeight: 1.65,
                    marginTop: 14,
                  }}
                >
                  {p}
                </div>
              ))}
              <div
                style={{
                  marginTop: 18,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  fontSize: 13,
                  color: "#C9A86A",
                  fontWeight: 600,
                }}
              >
                Read the full story
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#C9A86A"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </div>
            </div>

            {/* goals */}
            <div
              style={{
                marginTop: 24,
                display: "flex",
                alignItems: "center",
                gap: 9,
                marginBottom: 14,
              }}
            >
              <span
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: 3,
                  background: "#C9A86A",
                }}
              />
              <div
                style={{
                  fontFamily: "Spectral, serif",
                  fontSize: 18,
                  color: "#141E3C",
                }}
              >
                What you&apos;re building next
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
              <GoalCard
                title="Step back by 55"
                badge="On track"
                badgeColor="#436B52"
                badgeBg="#E7EFE8"
                note="Five years of freedom, fully funded with room to spare."
                pct={70}
                barColor="#5E806B"
              />
              <GoalCard
                title="Lena & Max's education"
                badge="Secured"
                badgeColor="#436B52"
                badgeBg="#E7EFE8"
                note="Two degrees set aside and ring-fenced, nothing to worry about."
                pct={100}
                barColor="#5E806B"
              />
              <GoalCard
                title="A multi-generational legacy"
                badge="Taking shape"
                badgeColor="#A8854A"
                badgeBg="#FBF3E2"
                note="Your family trust is drafted; Markus will walk you through it next."
                pct={45}
                barColor="#C9A86A"
              />
              <GoalCard
                title="Impact philanthropy"
                badge="Let's begin"
                badgeColor="#9F5E3A"
                badgeBg="#F7EAE1"
                note="Your intent is clear, but not yet structured. A first conversation is waiting."
                pct={20}
                barColor="#C8895E"
                border="#EBD9C9"
              />
            </div>

            {/* milestones */}
            <div
              style={{
                marginTop: 24,
                display: "flex",
                alignItems: "center",
                gap: 9,
                marginBottom: 12,
              }}
            >
              <span
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: 3,
                  background: "#1B2A4A",
                }}
              />
              <div
                style={{
                  fontFamily: "Spectral, serif",
                  fontSize: 18,
                  color: "#141E3C",
                }}
              >
                Your milestones
              </div>
            </div>
            <div
              style={{
                position: "relative",
                paddingLeft: 24,
                paddingBottom: 6,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: 6,
                  top: 6,
                  bottom: 6,
                  width: 1.5,
                  background: "#E4DFD3",
                }}
              />
              {(story && story.milestones.length > 0
                ? story.milestones.map((m, i) => ({
                    label: `${m.year} · ${m.title}`,
                    desc: m.description,
                    open: i === story.milestones.length - 1,
                  }))
                : [
                    {
                      label: "2023 · You sold the company",
                      desc: "The beginning of this next chapter.",
                      open: false,
                    },
                    {
                      label: "Autumn 2026 · Lena starts university",
                      desc: "Funded and ready.",
                      open: false,
                    },
                    {
                      label: "2031 · The year you step back",
                      desc: "Your freedom milestone.",
                      open: true,
                    },
                  ]
              ).map((m, i, arr) => (
                <div
                  key={i}
                  style={{
                    position: "relative",
                    marginBottom: i === arr.length - 1 ? 0 : 16,
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      left: -24,
                      top: 2,
                      width: 11,
                      height: 11,
                      borderRadius: "50%",
                      background: m.open ? "#F7F5F0" : i === 0 ? "#C9A86A" : "#1B2A4A",
                      border: m.open
                        ? "2px solid #C9A86A"
                        : "2px solid #F7F5F0",
                      boxShadow: m.open ? undefined : "0 0 0 1px #C9A86A",
                    }}
                  />
                  <div
                    style={{
                      fontSize: 13.5,
                      fontWeight: 600,
                      color: "#141E3C",
                    }}
                  >
                    {m.label}
                  </div>
                  <div style={{ fontSize: 12, color: "#707A8A" }}>{m.desc}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </MobileFrame>
  );
}

function GoalCard({
  title,
  badge,
  badgeColor,
  badgeBg,
  note,
  pct,
  barColor,
  border = "#E8E1D3",
}: {
  title: string;
  badge: string;
  badgeColor: string;
  badgeBg: string;
  note: string;
  pct: number;
  barColor: string;
  border?: string;
}) {
  return (
    <div
      style={{
        background: "#fff",
        border: `1px solid ${border}`,
        borderRadius: 16,
        padding: "17px 18px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ fontSize: 15, color: "#141E3C", fontWeight: 600 }}>
          {title}
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: badgeColor,
            background: badgeBg,
            padding: "3px 10px",
            borderRadius: 999,
          }}
        >
          {badge}
        </span>
      </div>
      <div
        style={{
          fontSize: 12.5,
          color: "#6B7488",
          marginTop: 6,
          lineHeight: 1.5,
        }}
      >
        {note}
      </div>
      <div
        style={{
          height: 7,
          background: "#EFEADF",
          borderRadius: 999,
          marginTop: 12,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: barColor,
            borderRadius: 999,
          }}
        />
      </div>
    </div>
  );
}
