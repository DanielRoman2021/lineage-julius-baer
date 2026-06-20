"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { ClientState, WheelDimension } from "@/lib/types";
import { MobileFrame } from "@/components/mobile-frame";
import { WheelOfLife } from "@/components/wheel";
import { ErrorState } from "@/components/states";

const SPECTRAL = { fontFamily: "Spectral" } as const;

export default function ClientWheelPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id || "sarah_keller";

  const [dims, setDims] = useState<WheelDimension[]>([]);
  const [priority, setPriority] = useState<string>("");
  const [name, setName] = useState("Sarah Keller");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [saved, setSaved] = useState<"idle" | "saving" | "done">("idle");

  const baseline = useRef<Record<string, number>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(() => {
    let alive = true;
    setLoading(true);
    setError(false);
    api.getClient(id).then((s: ClientState) => {
      if (!alive) return;
      const d = s.wheel?.dimensions ?? [];
      setDims(d);
      setName(s.client.name);
      baseline.current = Object.fromEntries(d.map((x) => [x.name, x.score]));
      const top = [...d].sort((a, b) => b.score - a.score)[0];
      setPriority(top?.name ?? "");
      setLoading(false);
    }).catch(() => {
      if (!alive) return;
      setError(true);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [id]);

  useEffect(() => load(), [load]);

  const first = name.split(" ")[0];

  // Persist the wheel and send a short signal note to the RM, debounced.
  const commit = useCallback(async (next: WheelDimension[], reason: string) => {
    setSaved("saving");
    try {
      await api.setDna(id, next);
      if (reason) {
        await api.addNote(id, {
          text: reason, kind: "signal", author_id: id, author_name: name, tags: ["wheel", "client"],
        });
      }
      baseline.current = Object.fromEntries(next.map((x) => [x.name, x.score]));
      setSaved("done");
      setTimeout(() => setSaved("idle"), 1600);
    } catch {
      setSaved("idle");
    }
  }, [id, name]);

  function scheduleCommit(next: WheelDimension[]) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const changed = next.filter((d) => d.score !== baseline.current[d.name]);
      let reason = "";
      if (changed.length === 1) {
        const c = changed[0];
        const old = baseline.current[c.name];
        reason = `${first} moved ${c.name} from ${old} to ${c.score}. ${c.score > old ? "They want more of this." : "This matters a little less now."}`;
      } else if (changed.length > 1) {
        reason = `${first} adjusted ${changed.length} areas of their Wheel of Life. Their priorities are shifting.`;
      }
      commit(next, reason);
    }, 1100);
  }

  function setScore(dimName: string, score: number) {
    setDims((prev) => {
      const next = prev.map((d) => (d.name === dimName ? { ...d, score } : d));
      scheduleCommit(next);
      return next;
    });
  }

  function scheduleNoteCommit(next: WheelDimension[], dimName: string) {
    if (noteTimer.current) clearTimeout(noteTimer.current);
    noteTimer.current = setTimeout(() => {
      const trimmedNote = (next.find((d) => d.name === dimName)?.note ?? "").trim();
      const reason = trimmedNote
        ? `${first} wrote about ${dimName}: "${trimmedNote}"`
        : "";
      commit(next, reason);
    }, 1400);
  }

  function setNote(dimName: string, note: string) {
    setDims((prev) => {
      const next = prev.map((d) => (d.name === dimName ? { ...d, note } : d));
      scheduleNoteCommit(next, dimName);
      return next;
    });
  }

  function choosePriority(dimName: string) {
    setPriority(dimName);
    const newScore = dims.find((d) => d.name === dimName)?.score;
    setSaved("saving");
    Promise.all([
      api.setDna(id, dims),
      api.conversationSignal(id, {
        pillar: dimName,
        old_score: baseline.current[dimName],
        new_score: newScore,
      }),
    ])
      .then(() => {
        setSaved("done");
        setTimeout(() => setSaved("idle"), 1600);
      })
      .catch(() => setSaved("idle"));
  }

  if (loading) {
    return (
      <MobileFrame title="Wheel of Life">
        <div className="grid h-[760px] place-items-center text-sm" style={{ color: "#707A8A" }}>Loading</div>
      </MobileFrame>
    );
  }

  if (error) {
    return (
      <MobileFrame title="Wheel of Life">
        <ErrorState onRetry={load} minHeight={760} />
      </MobileFrame>
    );
  }

  return (
    <MobileFrame title="Wheel of Life">
      <div style={{ background: "#F7F5F0", padding: "8px 22px 30px", maxHeight: 760, overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 2px" }}>
          <div style={{ ...SPECTRAL, fontSize: 18, letterSpacing: "0.2em", color: "#141E3C" }}>LINEAGE</div>
          <span style={{ width: 38, height: 38, borderRadius: "50%", background: "#1B2A4A", color: "#F7F5F0", display: "grid", placeItems: "center", ...SPECTRAL, fontSize: 14 }}>
            {first[0]}K
          </span>
        </div>

        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 11, color: "#A8854A", letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700 }}>Your life, today</div>
          <h1 style={{ ...SPECTRAL, fontSize: 26, color: "#141E3C", margin: "4px 0 6px" }}>Wheel of Life</h1>
          <p style={{ fontSize: 13.5, color: "#6B7488", lineHeight: 1.6 }}>
            Move a slider to raise or lower an area. Tap a slice to mark what matters most. Markus sees the change.
          </p>
        </div>

        <div style={{ marginTop: 8 }}>
          <WheelOfLife dimensions={dims} size={300} priorityName={priority} onSelect={choosePriority} />
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, fontSize: 12, color: "#707A8A", marginTop: 2 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 9, height: 9, borderRadius: 2, background: "#1B2A4A" }} /> On track</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 9, height: 9, borderRadius: 2, background: "#C8895E" }} /> Life gap</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 9, height: 9, borderRadius: 2, background: "#C0392B" }} /> Focus</span>
        </div>

        {priority && (
          <div style={{ marginTop: 14, borderRadius: 14, background: "#fff", border: "1px solid #E4DFD3", padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#C0392B" }} />
            <span style={{ fontSize: 13, color: "#3C4456" }}>
              Your focus right now is <strong style={{ color: "#C0392B" }}>{priority}</strong>.
            </span>
            <span style={{ marginLeft: "auto", fontSize: 11, color: saved === "done" ? "#5E806B" : "#A6ADBB" }}>
              {saved === "saving" ? "saving" : saved === "done" ? "sent to Markus" : ""}
            </span>
          </div>
        )}

        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 14 }}>
          {dims.map((d) => {
            const isFocus = d.name === priority;
            const low = d.score <= 5;
            const color = isFocus ? "#C0392B" : low ? "#9F5E3A" : "#141E3C";
            return (
              <div key={d.name}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <button
                    onClick={() => choosePriority(d.name)}
                    style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 13.5, color, fontWeight: isFocus ? 700 : 500 }}
                  >
                    {d.name}{isFocus ? "  ·  focus" : ""}
                  </button>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color }}>{d.score}</span>
                </div>
                <input
                  type="range" min={1} max={10} step={1} value={d.score}
                  onChange={(e) => setScore(d.name, Number(e.target.value))}
                  style={{ width: "100%" }}
                />
                <textarea
                  rows={2}
                  value={d.note ?? ""}
                  onChange={(e) => setNote(d.name, e.target.value)}
                  placeholder={`What does ${d.name} mean to you right now?`}
                  style={{
                    width: "100%", marginTop: 6, border: "1px solid #E4DFD3", borderRadius: 8,
                    padding: "6px 8px", fontSize: 12.5, color: "#3C4456", background: "#fff",
                    resize: "vertical", fontFamily: "inherit", boxSizing: "border-box",
                  }}
                />
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 18, display: "flex", gap: 10 }}>
          <Link href={`/client/${id}/feasibility`} style={{ flex: 1, textAlign: "center", textDecoration: "none", padding: "11px 0", borderRadius: 12, background: "#141E3C", color: "#F7F5F0", fontSize: 13, fontWeight: 600 }}>See the plan</Link>
          <Link href={`/client/${id}/chat`} style={{ flex: 1, textAlign: "center", textDecoration: "none", padding: "11px 0", borderRadius: 12, background: "#C9A86A", color: "#141E3C", fontSize: 13, fontWeight: 600 }}>Message Markus</Link>
        </div>
      </div>
    </MobileFrame>
  );
}
