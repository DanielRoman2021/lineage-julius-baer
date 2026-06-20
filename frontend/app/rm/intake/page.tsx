"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { WheelDimension } from "@/lib/types";
import { WheelOfLife } from "@/components/wheel";
import { LoadingState, ErrorState } from "@/components/states";

const CLIENT_ID = "sarah_keller";

type DocStatus = "verified" | "flagged";
const DOCUMENTS: { label: string; status: DocStatus }[] = [
  { label: "Passport · Swiss", status: "verified" },
  { label: "Proof of address", status: "verified" },
  { label: "Source of funds", status: "flagged" },
  { label: "Financial statements", status: "verified" },
  { label: "Board and press profile", status: "verified" },
];

const VALUE_CHIPS = [
  { label: "Provide for family", active: true },
  { label: "Create lasting impact", active: false },
  { label: "Buy freedom & time", active: false },
  { label: "Build something new", active: false },
];

export default function IntakeAndDnaPage() {
  const router = useRouter();
  const [dimensions, setDimensions] = useState<WheelDimension[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const w = await api.getWheel(CLIENT_ID);
      setDimensions(w.dimensions);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  function setScore(i: number, score: number) {
    setDimensions((prev) =>
      prev ? prev.map((d, idx) => (idx === i ? { ...d, score } : d)) : prev
    );
  }

  async function submit() {
    if (!dimensions) return;
    setSaving(true);
    setSaveError(null);
    try {
      await api.setDna(CLIENT_ID, dimensions);
      router.push(`/rm/clients/${CLIENT_ID}/flow`);
    } catch {
      setSaveError("We could not save the DNA. Check the connection and try again.");
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-7">
        <LoadingState label="Loading intake" />
      </div>
    );
  }

  if (error || !dimensions) {
    return (
      <div className="p-7">
        <ErrorState onRetry={reload} />
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "Archivo", color: "#3C4456" }}>
      {/* sub-header */}
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
            fontFamily: "Spectral",
            fontSize: 16,
          }}
        >
          SK
        </div>
        <div>
          <div style={{ fontFamily: "Spectral", fontSize: 18, color: "#141E3C" }}>Sarah Keller</div>
          <div style={{ fontSize: 12, color: "#707A8A" }}>New relationship · Intake</div>
        </div>
        <div
          style={{
            marginLeft: 18,
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12.5,
            color: "#707A8A",
          }}
        >
          <span style={{ color: "#141E3C", fontWeight: 600 }}>Intake</span>
          <span style={{ color: "#C7C0B0" }}>›</span>
          <span>Verification</span>
          <span style={{ color: "#C7C0B0" }}>›</span>
          <span>Approval</span>
        </div>
      </div>

      <div style={{ padding: "28px 32px 40px" }}>
        {/* page heading */}
        <div style={{ marginBottom: 22 }}>
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "#A8854A",
              fontWeight: 700,
            }}
          >
            Onboarding
          </div>
          <div
            style={{
              fontFamily: "Spectral",
              fontWeight: 400,
              fontSize: 29,
              color: "#141E3C",
              marginTop: 6,
            }}
          >
            Intake &amp; DNA
          </div>
          <div
            style={{
              fontSize: 14,
              color: "#707A8A",
              maxWidth: 640,
              lineHeight: 1.6,
              marginTop: 6,
            }}
          >
            Gather the essentials, then capture what wealth is <span style={{ fontStyle: "italic" }}>for</span>.
            Sarah's answers quietly shape her Wheel of Life, no forms she'll ever see.
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }}>
          {/* documents */}
          <div style={{ background: "#fff", border: "1px solid #E4DFD3", borderRadius: 12, padding: 24 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <div style={{ fontFamily: "Spectral", fontSize: 19, color: "#141E3C" }}>Essential documents</div>
              <span style={{ fontSize: 12, color: "#5E806B", fontWeight: 600 }}>4 of 5 verified</span>
            </div>
            <div
              style={{
                height: 6,
                background: "#EFEADF",
                borderRadius: 999,
                overflow: "hidden",
                marginBottom: 18,
              }}
            >
              <div style={{ width: "80%", height: "100%", background: "#C9A86A" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {DOCUMENTS.map((doc) => {
                const flagged = doc.status === "flagged";
                return (
                  <div
                    key={doc.label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 11,
                      padding: "11px 14px",
                      border: flagged ? "1px solid #EBD9C9" : "1px solid #EAE4D7",
                      background: flagged ? "#FDF8F2" : undefined,
                      borderRadius: 9,
                    }}
                  >
                    {flagged ? (
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#C8895E"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
                        <path d="M12 9v4M12 17h.01" />
                      </svg>
                    ) : (
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#5E806B"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    )}
                    <span style={{ fontSize: 13.5, color: "#141E3C" }}>{doc.label}</span>
                    <span
                      style={{
                        marginLeft: "auto",
                        fontSize: 11.5,
                        color: flagged ? "#9F5E3A" : "#5E806B",
                        fontWeight: flagged ? 600 : undefined,
                      }}
                    >
                      {flagged ? "Flagged" : "Verified"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* DNA */}
          <div style={{ background: "#fff", border: "1px solid #E4DFD3", borderRadius: 12, padding: 24 }}>
            <div style={{ fontFamily: "Spectral", fontSize: 19, color: "#141E3C", marginBottom: 4 }}>Values DNA</div>
            <div style={{ fontSize: 13, color: "#707A8A", lineHeight: 1.55, marginBottom: 18 }}>
              Where should her wealth lean? Adjust to reflect the conversation.
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
              <div style={{ order: 2, width: "100%", display: "flex", flexDirection: "column", gap: 16 }}>
                {dimensions.map((d, i) => (
                  <div key={d.name}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 13,
                        color: "#141E3C",
                        marginBottom: 8,
                      }}
                    >
                      <span>{d.name}</span>
                      <span style={{ fontWeight: 600 }}>{d.score}</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={d.score}
                      onChange={(e) => setScore(i, +e.target.value)}
                      style={{
                        WebkitAppearance: "none",
                        appearance: "none",
                        width: "100%",
                        height: 4,
                        borderRadius: 999,
                        background: "#E4DFD3",
                        outline: "none",
                      }}
                      className="dna-range"
                    />
                  </div>
                ))}
              </div>
              <div style={{ order: 1, width: "100%", textAlign: "center" }}>
                <div
                  style={{
                    fontSize: 11,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "#A6ADBB",
                    fontWeight: 600,
                    marginBottom: 10,
                  }}
                >
                  Live preview
                </div>
                <div style={{ maxWidth: 320, margin: "0 auto" }}>
                  <WheelOfLife dimensions={dimensions} size={320} />
                </div>
                <div style={{ fontSize: 12, color: "#707A8A", marginTop: 8, lineHeight: 1.5 }}>
                  Feeds Sarah's Wheel of Life
                </div>
              </div>
            </div>

            <div style={{ marginTop: 22, paddingTop: 18, borderTop: "1px solid #F1ECE1" }}>
              <div style={{ fontSize: 13, color: "#141E3C", marginBottom: 11, fontWeight: 600 }}>
                In Sarah's words, wealth is mostly here to…
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
                {VALUE_CHIPS.map((chip) => (
                  <span
                    key={chip.label}
                    style={{
                      padding: "9px 15px",
                      borderRadius: 999,
                      background: chip.active ? "#141E3C" : "#fff",
                      border: chip.active ? undefined : "1px solid #DDD5C5",
                      color: chip.active ? "#F7F5F0" : "#707A8A",
                      fontSize: 12.5,
                      fontWeight: 600,
                    }}
                  >
                    {chip.label}
                  </span>
                ))}
              </div>
            </div>

            {saveError && (
              <div
                style={{
                  marginTop: 18,
                  background: "#FBF1EA",
                  border: "1px solid #E7CBB4",
                  borderRadius: 9,
                  padding: "11px 14px",
                  fontSize: 12.5,
                  color: "#9F5E3A",
                }}
              >
                {saveError}
              </div>
            )}

            <div style={{ marginTop: 22, display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={submit}
                disabled={saving}
                style={{
                  padding: "11px 22px",
                  borderRadius: 9,
                  border: "none",
                  background: "#141E3C",
                  color: "#F7F5F0",
                  fontSize: 13.5,
                  fontWeight: 600,
                  fontFamily: "Archivo",
                  cursor: saving ? "default" : "pointer",
                  opacity: saving ? 0.6 : 1,
                  boxShadow: "inset 0 0 0 1px #C9A86A",
                }}
              >
                {saving ? "Saving…" : "Save DNA & continue"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .dna-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #141e3c;
          border: 3px solid #c9a86a;
          cursor: pointer;
        }
        .dna-range::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #141e3c;
          border: 3px solid #c9a86a;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
