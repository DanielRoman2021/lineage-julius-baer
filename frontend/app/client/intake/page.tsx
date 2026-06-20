"use client";
import { useRouter } from "next/navigation";
import { Check, FileText, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { ClientState, WheelDimension } from "@/lib/types";
import { MobileFrame } from "@/components/mobile-frame";
import { WheelOfLife } from "@/components/wheel";
import { LoadingState, ErrorState } from "@/components/states";

const DEMO_ID = "sarah_keller";

export default function Intake() {
  const router = useRouter();
  const [state, setState] = useState<ClientState | null>(null);
  const [dims, setDims] = useState<WheelDimension[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const reload = useCallback(() => {
    let alive = true;
    setLoading(true);
    setError(false);
    api
      .getClient(DEMO_ID)
      .then((s) => {
        if (!alive) return;
        setState(s);
        setDims(s.wheel?.dimensions ?? []);
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
  }, []);

  useEffect(() => reload(), [reload]);

  function setScore(name: string, score: number) {
    setDims((d) => d.map((x) => (x.name === name ? { ...x, score } : x)));
  }

  async function submit() {
    setSubmitting(true);
    try {
      await api.setDna(DEMO_ID, dims);
      router.push(`/rm/clients/${DEMO_ID}/flow`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <MobileFrame title="Intake">
      <div className="bg-navy px-5 pb-5 pt-8 text-ivory">
        <p className="text-xs text-ivory/60">Welcome to Julius Baer</p>
        <h1 className="display text-2xl font-medium">Let&apos;s begin your story</h1>
        <p className="mt-1 text-xs text-ivory/60">Two minutes. Your documents, then what matters to you.</p>
      </div>

      {loading ? (
        <div style={{ background: "#F7F5F0" }}>
          <LoadingState label="Loading your intake" minHeight={480} />
        </div>
      ) : error ? (
        <div style={{ background: "#F7F5F0" }}>
          <ErrorState onRetry={reload} minHeight={480} />
        </div>
      ) : (
      <div className="space-y-6 p-5">
        {/* Documents */}
        <section>
          <p className="label mb-2">1 · Your documents</p>
          {(state?.documents ?? []).length === 0 ? (
            <p className="rounded-xl border border-dashed border-ivory-300 px-3 py-3 text-[12.5px] text-slate-muted">
              No documents yet. Add one below to get started.
            </p>
          ) : (
          <div className="space-y-2">
            {state?.documents.map((d) => (
              <div key={d.id} className="flex items-center justify-between rounded-xl border border-ivory-300 bg-white px-3 py-2.5">
                <span className="flex items-center gap-2 text-[13px] text-slate-ink">
                  <FileText size={15} className="text-gold-600" />{d.filename}
                </span>
                <Check size={15} className="text-emerald" />
              </div>
            ))}
          </div>
          )}
        </section>

        {/* DNA */}
        <section>
          <p className="label mb-2">2 · Your values (Wheel of Life)</p>
          <WheelOfLife dimensions={dims} size={320} />
          <div className="mt-3 space-y-3">
            {dims.map((d) => (
              <div key={d.name}>
                <div className="mb-1 flex items-center justify-between text-[12.5px]">
                  <span className="text-slate-ink">{d.name}</span>
                  <span className={`font-medium ${d.score <= 5 ? "text-amber" : "text-navy"}`}>{d.score}</span>
                </div>
                <input
                  type="range" min={1} max={10} step={1} value={d.score}
                  onChange={(e) => setScore(d.name, Number(e.target.value))}
                  className="w-full accent-[#C9A86A]"
                />
              </div>
            ))}
          </div>
        </section>

        <button onClick={submit} disabled={submitting} className="btn-primary w-full">
          {submitting ? <><Loader2 size={16} className="animate-spin" /> Handing off to Markus…</> : "Submit & run verification"}
        </button>
        <p className="-mt-3 text-center text-[11px] text-slate-muted">
          Your relationship manager reviews everything. Nothing is decided without a human.
        </p>
      </div>
      )}
    </MobileFrame>
  );
}
