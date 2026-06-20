"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Check, FileText, Loader2, UploadCloud } from "lucide-react";
import { api, runPipeline } from "@/lib/api";
import type { ClientState, Milestone, PipelineEvent } from "@/lib/types";
import { MobileFrame } from "@/components/mobile-frame";
import { LoadingState, ErrorState } from "@/components/states";

const SPECTRAL = "Spectral, serif";
const ARCHIVO = "Archivo, sans-serif";

type Step = 1 | 2 | 3 | 4;

function firstName(name?: string): string {
  const parts = (name || "").trim().split(/\s+/).filter((w) => w && !/^(dr|mr|mrs|ms|prof)\.?$/i.test(w));
  return parts[0] || (name || "").trim().split(/\s+/)[0] || "there";
}

// The Client type does not surface email; read it defensively when present.
function clientEmail(state: ClientState | null): string {
  if (!state) return "";
  const c = state.client as unknown as { email?: string };
  return c.email || "";
}

export default function OnboardPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id || "";

  const [step, setStep] = useState<Step>(1);

  return (
    <MobileFrame title="Onboarding">
      <div
        className="scroll"
        style={{
          minHeight: 560,
          padding: "0 0 28px",
          fontFamily: ARCHIVO,
          background: "#F7F5F0",
        }}
      >
        {step === 1 && <StepWelcome id={id} onBegin={() => setStep(2)} />}
        {step === 2 && <StepUpload id={id} onContinue={() => setStep(3)} />}
        {step === 3 && <StepAnalysing id={id} onComplete={() => setStep(4)} />}
        {step === 4 && <StepReveal id={id} />}
      </div>
    </MobileFrame>
  );
}

/* ---------- Step 1 · Welcome ---------- */

function StepWelcome({ id, onBegin }: { id: string; onBegin: () => void }) {
  // DEMO ONLY, simulated onboarding link, no real auth.
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
        if (alive) setError(true);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [id]);

  useEffect(() => reload(), [reload]);

  if (loading) return <LoadingState label="Opening your onboarding" minHeight={520} />;
  if (error) return <ErrorState onRetry={reload} minHeight={520} />;

  const name = state?.client.name;
  const email = clientEmail(state);

  return (
    <>
      <div style={{ background: "#141E3C", padding: "30px 24px 26px", color: "#F7F5F0" }}>
        <div style={{ fontSize: 12, color: "#9BA6BC" }}>Welcome to Julius Baer</div>
        <div style={{ fontFamily: SPECTRAL, fontSize: 27, fontWeight: 500, marginTop: 4 }}>
          Welcome, {firstName(name)}
        </div>
        {email && <div style={{ fontSize: 13, color: "#AAB4C8", marginTop: 8 }}>{email}</div>}
      </div>

      <div style={{ padding: "22px 24px" }}>
        <div style={{ fontSize: 14, color: "#3C4456", lineHeight: 1.6 }}>
          This is a secure onboarding link from your relationship manager.
        </div>

        <div
          style={{
            marginTop: 18,
            background: "#fff",
            border: "1px solid #E4DFD3",
            borderRadius: 14,
            padding: "16px 18px",
          }}
        >
          <Stepline n={1} label="Add your documents" />
          <Stepline n={2} label="We read them and build your story" />
          <Stepline n={3} label="Your relationship manager reviews" last />
        </div>

        <button
          onClick={onBegin}
          style={{
            marginTop: 22,
            width: "100%",
            padding: "13px 0",
            borderRadius: 12,
            border: "none",
            background: "#141E3C",
            color: "#F7F5F0",
            fontSize: 14,
            fontWeight: 600,
            fontFamily: ARCHIVO,
            cursor: "pointer",
            boxShadow: "inset 0 0 0 1px #C9A86A",
          }}
        >
          Begin
        </button>
      </div>
    </>
  );
}

function Stepline({ n, label, last }: { n: number; label: string; last?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: last ? 0 : 12 }}>
      <span
        style={{
          width: 24,
          height: 24,
          borderRadius: "50%",
          background: "#FBF3E2",
          color: "#A8854A",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: SPECTRAL,
          fontSize: 12,
          flex: "none",
        }}
      >
        {n}
      </span>
      <span style={{ fontSize: 13, color: "#3C4456" }}>{label}</span>
    </div>
  );
}

/* ---------- Step 2 · Upload ---------- */

function StepUpload({ id, onContinue }: { id: string; onContinue: () => void }) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploaded, setUploaded] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(false);

  function onPick(list: FileList | null) {
    if (!list) return;
    setFiles((prev) => [...prev, ...Array.from(list)]);
  }

  async function upload() {
    if (files.length === 0) return;
    setUploading(true);
    setError(false);
    try {
      const res = (await api.uploadDocuments(id, files)) as {
        documents?: { filename: string }[];
        total_added?: number;
      };
      const docs = res.documents ?? [];
      // Trust the server. If it accepted nothing, keep Continue disabled and flag it.
      if (docs.length === 0) {
        setUploaded([]);
        setError(true);
      } else {
        setUploaded(docs.map((d) => d.filename));
      }
    } catch {
      setError(true);
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <div style={{ background: "#141E3C", padding: "26px 24px 22px", color: "#F7F5F0" }}>
        <div style={{ fontSize: 12, color: "#9BA6BC" }}>Step 1 of 3</div>
        <div style={{ fontFamily: SPECTRAL, fontSize: 23, fontWeight: 500, marginTop: 4 }}>
          Add your documents
        </div>
        <div style={{ fontSize: 12.5, color: "#AAB4C8", marginTop: 6 }}>
          Passport, proof of address, anything that tells your story.
        </div>
      </div>

      <div style={{ padding: "20px 24px" }}>
        <label
          htmlFor="onboard-files"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            padding: "26px 18px",
            borderRadius: 14,
            border: "1.5px dashed #C9A86A",
            background: "#FBF3E2",
            cursor: "pointer",
            textAlign: "center",
          }}
        >
          <UploadCloud size={26} color="#A8854A" />
          <span style={{ fontSize: 13.5, color: "#141E3C", fontWeight: 600 }}>
            Tap to choose files
          </span>
          <span style={{ fontSize: 12, color: "#707A8A" }}>PDF or images, you can add several</span>
        </label>
        <input
          id="onboard-files"
          type="file"
          multiple
          accept="application/pdf,image/*"
          onChange={(e) => onPick(e.target.files)}
          style={{ display: "none" }}
        />

        {files.length > 0 && (
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            {files.map((f, i) => {
              const done = uploaded.includes(f.name);
              return (
                <div
                  key={`${f.name}-${i}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderRadius: 12,
                    border: "1px solid #E4DFD3",
                    background: "#fff",
                    padding: "10px 14px",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13, color: "#141E3C" }}>
                    <FileText size={15} color="#A8854A" />
                    {f.name}
                  </span>
                  {done ? (
                    <Check size={16} color="#5E806B" />
                  ) : (
                    <span style={{ fontSize: 11, color: "#A6ADBB" }}>Ready</span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {error && (
          <div style={{ marginTop: 12, fontSize: 12.5, color: "#9F5E3A" }}>
            Upload did not go through. Try again.
          </div>
        )}

        <button
          onClick={upload}
          disabled={files.length === 0 || uploading}
          style={{
            marginTop: 18,
            width: "100%",
            padding: "12px 0",
            borderRadius: 12,
            border: "1px solid #C9A86A",
            background: "#FBF3E2",
            color: "#A8854A",
            fontSize: 13.5,
            fontWeight: 600,
            fontFamily: ARCHIVO,
            cursor: files.length === 0 || uploading ? "default" : "pointer",
            opacity: files.length === 0 || uploading ? 0.5 : 1,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          {uploading ? (
            <>
              <Loader2 size={15} className="animate-spin" /> Uploading…
            </>
          ) : (
            "Upload documents"
          )}
        </button>

        <button
          onClick={onContinue}
          disabled={uploaded.length === 0}
          style={{
            marginTop: 12,
            width: "100%",
            padding: "13px 0",
            borderRadius: 12,
            border: "none",
            background: "#141E3C",
            color: "#F7F5F0",
            fontSize: 14,
            fontWeight: 600,
            fontFamily: ARCHIVO,
            cursor: uploaded.length === 0 ? "default" : "pointer",
            opacity: uploaded.length === 0 ? 0.5 : 1,
            boxShadow: "inset 0 0 0 1px #C9A86A",
          }}
        >
          Continue
        </button>
      </div>
    </>
  );
}

/* ---------- Step 3 · Analysing ---------- */

type StageRow = { agent: string; label: string; done: boolean };

function StepAnalysing({ id, onComplete }: { id: string; onComplete: () => void }) {
  const [stages, setStages] = useState<StageRow[]>([]);
  const [error, setError] = useState(false);
  const [slow, setSlow] = useState(false);
  // bump to re-trigger the run effect from the "Try again" button
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let finished = false;
    let firstEventSeen = false;

    // Cold starts can be slow. After a short wait with no event yet, reassure.
    setSlow(false);
    const slowTimer = setTimeout(() => {
      if (!firstEventSeen) setSlow(true);
    }, 8000);

    function noteFirstEvent() {
      if (!firstEventSeen) {
        firstEventSeen = true;
        clearTimeout(slowTimer);
        setSlow(false);
      }
    }

    function onEvent(e: PipelineEvent) {
      if (e.type === "run_started" || e.type === "stage" || e.type === "run_complete") {
        noteFirstEvent();
      }
      if (e.type === "stage") {
        const key = e.agent || e.label || "";
        const label = e.label || e.agent || "Working";
        const done = e.status === "done" || e.status === "approved";
        setStages((prev) => {
          const idx = prev.findIndex((s) => s.agent === key);
          if (idx === -1) return [...prev, { agent: key, label, done }];
          const next = [...prev];
          next[idx] = { agent: key, label, done: done || next[idx].done };
          return next;
        });
      } else if (e.type === "run_complete") {
        finished = true;
        // mark every collected stage as done before revealing
        setStages((prev) => prev.map((s) => ({ ...s, done: true })));
        onComplete();
      }
    }

    runPipeline(id, onEvent, controller.signal).catch(() => {
      if (!finished && !controller.signal.aborted) setError(true);
    });

    return () => {
      clearTimeout(slowTimer);
      controller.abort();
    };
    // re-run on mount, on client change, and on each retry attempt
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, attempt]);

  function retry() {
    setError(false);
    setStages([]);
    setAttempt((n) => n + 1);
  }

  return (
    <>
      <div style={{ background: "#141E3C", padding: "26px 24px 22px", color: "#F7F5F0" }}>
        <div style={{ fontSize: 12, color: "#9BA6BC" }}>Step 2 of 3</div>
        <div style={{ fontFamily: SPECTRAL, fontSize: 23, fontWeight: 500, marginTop: 4 }}>
          Reading your documents
        </div>
        <div style={{ fontSize: 12.5, color: "#AAB4C8", marginTop: 6 }}>
          Our team is going through everything you shared.
        </div>
      </div>

      <div style={{ padding: "20px 24px" }}>
        {error ? (
          <div>
            <div style={{ fontSize: 13, color: "#9F5E3A", lineHeight: 1.6 }}>
              Something interrupted the run. You can close this and your relationship manager will pick it
              up.
            </div>
            <button
              onClick={retry}
              style={{
                marginTop: 16,
                width: "100%",
                padding: "12px 0",
                borderRadius: 12,
                border: "1px solid #C9A86A",
                background: "#FBF3E2",
                color: "#A8854A",
                fontSize: 13.5,
                fontWeight: 600,
                fontFamily: ARCHIVO,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
          </div>
        ) : stages.length === 0 ? (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#707A8A" }}>
              <Loader2 size={16} className="animate-spin" color="#C9A86A" /> Starting…
            </div>
            {slow && (
              <div style={{ marginTop: 10, fontSize: 12.5, color: "#A6ADBB", lineHeight: 1.5 }}>
                This can take a moment on the first run.
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {stages.map((s) => (
              <div
                key={s.agent}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 11,
                  borderRadius: 12,
                  border: "1px solid #E4DFD3",
                  background: "#fff",
                  padding: "12px 14px",
                }}
              >
                {s.done ? (
                  <span
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      background: "#EAF0EB",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flex: "none",
                    }}
                  >
                    <Check size={13} color="#5E806B" />
                  </span>
                ) : (
                  <Loader2 size={18} className="animate-spin" color="#C9A86A" style={{ flex: "none" }} />
                )}
                <span style={{ fontSize: 13.5, color: "#141E3C", fontWeight: s.done ? 500 : 600 }}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

/* ---------- Step 4 · Reveal ---------- */

function StepReveal({ id }: { id: string }) {
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
        if (alive) setError(true);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [id]);

  useEffect(() => reload(), [reload]);

  if (loading) return <LoadingState label="Building your story" minHeight={520} />;
  if (error) return <ErrorState onRetry={reload} minHeight={520} />;

  const story = state?.wealth_story ?? null;
  const milestones: Milestone[] = story?.milestones ?? [];

  return (
    <>
      <div style={{ background: "#141E3C", padding: "28px 24px 24px", color: "#F7F5F0" }}>
        <div style={{ fontSize: 12, color: "#9BA6BC" }}>Your story is ready</div>
        <div style={{ fontFamily: SPECTRAL, fontSize: 24, fontWeight: 500, marginTop: 4 }}>
          {story?.headline || "How you built it"}
        </div>
      </div>

      <div style={{ padding: "20px 24px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            background: "#FBF3E2",
            border: "1px solid #EBD9C9",
            borderRadius: 12,
            padding: "12px 14px",
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#C9A86A", marginTop: 5, flex: "none" }} />
          <span style={{ fontSize: 12.5, color: "#7A6234", lineHeight: 1.5 }}>
            Your relationship manager is reviewing the details.
          </span>
        </div>

        {milestones.length > 0 ? (
          <div style={{ position: "relative", paddingLeft: 24, marginTop: 22 }}>
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
            {milestones.map((m, i) => (
              <div key={i} style={{ position: "relative", marginBottom: i === milestones.length - 1 ? 0 : 16 }}>
                <span
                  style={{
                    position: "absolute",
                    left: -24,
                    top: 2,
                    width: 11,
                    height: 11,
                    borderRadius: "50%",
                    background: m.verified ? "#C9A86A" : "#1B2A4A",
                    border: "2px solid #F7F5F0",
                    boxShadow: m.verified ? "0 0 0 1px #C9A86A" : undefined,
                  }}
                />
                <div style={{ fontSize: 13.5, fontWeight: 600, color: "#141E3C" }}>
                  {(m.date || String(m.year))} · {m.title}
                </div>
                {m.description && <div style={{ fontSize: 12, color: "#707A8A", marginTop: 1 }}>{m.description}</div>}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 13, color: "#707A8A", marginTop: 20, lineHeight: 1.6 }}>
            Your story is being prepared. Your relationship manager will share it with you shortly.
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 24 }}>
          <Link
            href={`/client/${id}`}
            style={{
              width: "100%",
              padding: "13px 0",
              borderRadius: 12,
              background: "#141E3C",
              color: "#F7F5F0",
              fontSize: 14,
              fontWeight: 600,
              textAlign: "center",
              textDecoration: "none",
              boxShadow: "inset 0 0 0 1px #C9A86A",
            }}
          >
            Open my companion
          </Link>
          <Link
            href={`/client/${id}/graph`}
            style={{
              width: "100%",
              padding: "12px 0",
              borderRadius: 12,
              border: "1px solid #E4DFD3",
              background: "#fff",
              color: "#3C4456",
              fontSize: 13.5,
              fontWeight: 600,
              textAlign: "center",
              textDecoration: "none",
            }}
          >
            See my ownership map
          </Link>
        </div>
      </div>
    </>
  );
}
