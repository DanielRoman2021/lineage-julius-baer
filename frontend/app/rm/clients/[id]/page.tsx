"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import type { ClientState, ConversationSignal, Finding, Note, PersonRef, RiskFlag } from "@/lib/types";
import { TrustGauge } from "@/components/trust-gauge";
import { LoadingState, ErrorState } from "@/components/states";
import { ClientSwitcher } from "@/components/client-switcher";
import { money } from "@/lib/format";

const LABEL = "11px";

function initialsOf(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** Short relative or "20 May" style date from an ISO string. */
function shortDate(iso: string): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return iso;
  const now = new Date();
  const diffMs = now.getTime() - then.getTime();
  const day = 24 * 60 * 60 * 1000;
  if (diffMs >= 0 && diffMs < day && now.getDate() === then.getDate()) return "today";
  if (diffMs >= 0 && diffMs < 2 * day) return "yesterday";
  return then.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

const KIND_LABEL: Record<string, string> = {
  insight: "Insight",
  signal: "Signal",
  note: "Note",
};

export default function Client360Page() {
  const { id } = useParams<{ id: string }>();
  const clientId = id || "sarah_keller";

  const [state, setState] = useState<ClientState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const s = await api.getClient(clientId);
      setState(s);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const addNote = useCallback(async () => {
    const text = draft.trim();
    if (!text || saving) return;
    setSaving(true);
    try {
      await api.addNote(clientId, {
        text,
        kind: "note",
        author_id: "rm_markus",
        author_name: "Markus Brunner",
        tags: [],
      });
      const notes = await api.getNotes(clientId);
      setState((prev) => (prev ? { ...prev, notes } : prev));
      setDraft("");
    } finally {
      setSaving(false);
    }
  }, [clientId, draft, saving]);

  if (loading) {
    return (
      <div className="p-8">
        <LoadingState label="Loading client" />
      </div>
    );
  }

  if (error || !state) {
    return (
      <div className="p-8">
        <ErrorState onRetry={reload} />
      </div>
    );
  }

  const client = state.client;
  const clientName = client.name;
  const firstName = clientName.split(" ")[0];
  const initials = initialsOf(clientName);
  const currency = client.currency ?? "CHF";
  const trustScore = state.trust?.score ?? 0;
  const flags = state.flags ?? [];
  const findings = state.findings ?? [];
  const notes = state.notes ?? [];
  const signal = state.latest_signal ?? null;

  const tags = client.tags ?? [];
  const metaParts = [
    client.domicile,
    client.headline,
    client.rm_name ? `Relationship manager, ${client.rm_name}` : null,
  ].filter(Boolean) as string[];

  return (
    <div style={{ fontFamily: "Archivo, sans-serif", color: "#3C4456" }}>
      {/* client header bar */}
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
        <ClientSwitcher
          currentId={clientId}
          hrefFor={(id) => `/rm/clients/${id}`}
          subtitle="Client 360 · relationship overview"
        />
        <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
          <Link
            href={`/rm/clients/${clientId}/flow`}
            style={{
              textDecoration: "none",
              padding: "8px 16px",
              background: "#141E3C",
              color: "#F7F5F0",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Run verification
          </Link>
          <Link
            href={`/rm/clients/${clientId}/vault`}
            style={{
              textDecoration: "none",
              padding: "8px 16px",
              background: "#fff",
              color: "#3C4456",
              border: "1px solid #E4DFD3",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Open document vault
          </Link>
          <Link
            href={`/rm/clients/${clientId}/story`}
            style={{
              textDecoration: "none",
              padding: "8px 16px",
              background: "#fff",
              color: "#3C4456",
              border: "1px solid #E4DFD3",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Wealth story
          </Link>
          <Link
            href={`/client/${clientId}`}
            style={{
              textDecoration: "none",
              padding: "8px 16px",
              background: "#fff",
              color: "#3C4456",
              border: "1px solid #E4DFD3",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            View as client
          </Link>
        </div>
      </div>

      <div style={{ padding: "28px 32px 44px" }}>
        {/* header card */}
        <div
          style={{
            background: "#fff",
            border: "1px solid #E4DFD3",
            borderRadius: 14,
            padding: "26px 28px",
            display: "flex",
            alignItems: "center",
            gap: 28,
          }}
        >
          <div
            style={{
              width: 74,
              height: 74,
              flex: "none",
              borderRadius: "50%",
              background: "radial-gradient(circle at 35% 30%, #25365C, #141E3C)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 0 1.5px #C9A86A, 0 0 0 6px #FBF7EE",
            }}
          >
            <span style={{ fontFamily: "Spectral, serif", fontSize: 27, color: "#F4F1EA" }}>{initials}</span>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div style={{ fontFamily: "Spectral, serif", fontSize: 28, color: "#141E3C" }}>{clientName}</div>
              {client.status ? (
                <span
                  style={{
                    fontSize: LABEL,
                    fontWeight: 600,
                    color: "#A8854A",
                    background: "#FBF3E2",
                    padding: "4px 11px",
                    borderRadius: 999,
                  }}
                >
                  {client.status}
                </span>
              ) : null}
              {tags.map((t) => (
                <span
                  key={t}
                  style={{
                    fontSize: LABEL,
                    fontWeight: 600,
                    color: "#707A8A",
                    background: "#F4EFE4",
                    padding: "4px 11px",
                    borderRadius: 999,
                  }}
                >
                  {t}
                </span>
              ))}
            </div>
            <div style={{ display: "flex", gap: 18, marginTop: 8, fontSize: 13, color: "#707A8A", flexWrap: "wrap" }}>
              {metaParts.map((p, i) => (
                <span key={p} style={{ display: "flex", gap: 18 }}>
                  {i > 0 ? <span style={{ color: "#D8CFBC" }}>·</span> : null}
                  <span>{p}</span>
                </span>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 34, alignItems: "center" }}>
            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  fontSize: LABEL,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "#707A8A",
                  fontWeight: 600,
                }}
              >
                Net worth
              </div>
              <div style={{ fontFamily: "Spectral, serif", fontSize: 30, color: "#141E3C", marginTop: 4 }}>
                {money(client.net_worth, currency)}
              </div>
            </div>
            <div style={{ width: 1, height: 64, background: "#EDE7DA" }} />
            <div style={{ textAlign: "center", width: 130 }}>
              <TrustGauge score={trustScore} width={118} />
              <div
                style={{
                  fontSize: LABEL,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "#707A8A",
                  fontWeight: 600,
                  marginTop: -2,
                }}
              >
                Trust
              </div>
            </div>
          </div>
        </div>

        {signal ? <NextConversationCard signal={signal} /> : null}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 446px",
            gap: 24,
            marginTop: 24,
            alignItems: "start",
          }}
        >
          {/* risks and openings */}
          <div>
            <div
              style={{
                fontSize: LABEL,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "#A8854A",
                fontWeight: 700,
                marginBottom: 14,
              }}
            >
              Risks and openings
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {flags.map((flag) => (
                <FlagCard key={flag.id} flag={flag} />
              ))}
              {findings.map((finding) => (
                <FindingCard key={finding.id} finding={finding} />
              ))}
              {flags.length === 0 && findings.length === 0 ? (
                <div
                  style={{
                    background: "#fff",
                    border: "1px solid #E4DFD3",
                    borderRadius: 11,
                    padding: "18px 20px",
                    fontSize: 13,
                    color: "#707A8A",
                  }}
                >
                  Nothing flagged right now. Run a verification to surface risks and openings.
                </div>
              ) : null}
            </div>
          </div>

          {/* relationship memory */}
          <div style={{ background: "#fff", border: "1px solid #E4DFD3", borderRadius: 14, padding: "22px 24px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <div style={{ fontFamily: "Spectral, serif", fontSize: 19, color: "#141E3C" }}>Relationship memory</div>
              <span style={{ fontSize: LABEL, color: "#707A8A", background: "#F4EFE4", padding: "3px 9px", borderRadius: 999 }}>
                {notes.length} notes
              </span>
            </div>
            <div style={{ fontSize: 12.5, color: "#707A8A", lineHeight: 1.55, marginBottom: 16 }}>
              What the team knows about {firstName}, kept in one place so nothing is lost between conversations.
            </div>

            {/* add a note */}
            <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addNote();
                }}
                placeholder={`Add a note about ${firstName}`}
                style={{
                  flex: 1,
                  minWidth: 0,
                  padding: "11px 14px",
                  border: "1px solid #E4DFD3",
                  borderRadius: 9,
                  fontFamily: "Archivo, sans-serif",
                  fontSize: 13,
                  color: "#141E3C",
                  outline: "none",
                  background: "#FBFAF6",
                }}
              />
              <button
                onClick={addNote}
                disabled={saving || draft.trim().length === 0}
                style={{
                  padding: "0 16px",
                  border: "none",
                  borderRadius: 9,
                  background: "#141E3C",
                  color: "#F7F5F0",
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: "Archivo, sans-serif",
                  cursor: saving || draft.trim().length === 0 ? "default" : "pointer",
                  opacity: saving || draft.trim().length === 0 ? 0.55 : 1,
                }}
              >
                {saving ? "Saving" : "Save"}
              </button>
            </div>

            {/* timeline */}
            <div style={{ position: "relative", paddingLeft: 26 }}>
              <div style={{ position: "absolute", left: 9, top: 6, bottom: 6, width: 1.5, background: "#EDE7DA" }} />
              {notes.length === 0 ? (
                <div style={{ fontSize: 13, color: "#A6ADBB" }}>No notes yet. Add the first one above.</div>
              ) : (
                notes.map((note) => <NoteRow key={note.id} note={note} />)
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NextConversationCard({ signal }: { signal: ConversationSignal }) {
  const dir = signal.direction.toLowerCase();
  const directionLabel = dir === "up" ? "now matters more" : dir === "down" ? "matters less" : signal.direction;
  const isLive = signal.mode.toLowerCase() === "live";
  const talkingPoints = signal.talking_points ?? [];
  const futureTopics = signal.future_topics ?? [];
  const people = signal.people_to_involve ?? [];

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #E4DFD3",
        borderLeft: "3px solid #C9A86A",
        borderRadius: 14,
        padding: "24px 28px",
        marginTop: 24,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <span
          style={{
            fontSize: LABEL,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#A8854A",
            fontWeight: 700,
          }}
        >
          Next conversation
        </span>
        <span style={{ fontSize: 13, color: "#3C4456" }}>
          <strong style={{ color: "#141E3C" }}>{signal.pillar}</strong> · {directionLabel}
        </span>
        <span
          style={{
            fontSize: 10,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            fontWeight: 600,
            color: isLive ? "#436B52" : "#707A8A",
            background: isLive ? "#EAF0EB" : "#F4EFE4",
            padding: "2px 8px",
            borderRadius: 999,
          }}
        >
          {isLive ? "live" : "demo"}
        </span>
      </div>

      <div style={{ fontFamily: "Spectral, serif", fontSize: 22, color: "#141E3C", marginTop: 12, lineHeight: 1.35 }}>
        {signal.summary}
      </div>

      {talkingPoints.length > 0 ? (
        <div style={{ marginTop: 18 }}>
          <div
            style={{
              fontSize: LABEL,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#707A8A",
              fontWeight: 700,
              marginBottom: 8,
            }}
          >
            Talking points
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
            {talkingPoints.map((point, i) => (
              <li key={i} style={{ fontSize: 13.5, color: "#3C4456", lineHeight: 1.55 }}>
                {point}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {futureTopics.length > 0 ? (
        <div style={{ marginTop: 18 }}>
          <div
            style={{
              fontSize: LABEL,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#707A8A",
              fontWeight: 700,
              marginBottom: 8,
            }}
          >
            Future topics
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {futureTopics.map((topic, i) => (
              <span
                key={i}
                style={{
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: "#A8854A",
                  background: "#FBF3E2",
                  padding: "5px 12px",
                  borderRadius: 999,
                }}
              >
                {topic}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {people.length > 0 ? (
        <div style={{ marginTop: 20 }}>
          <div
            style={{
              fontSize: LABEL,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#707A8A",
              fontWeight: 700,
              marginBottom: 12,
            }}
          >
            Who to involve
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 24 }}>
            {people.map((person, i) => (
              <PersonChip key={i} person={person} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PersonChip({ person }: { person: PersonRef }) {
  const initials = (person.initials || initialsOf(person.name)).toUpperCase();
  return (
    <div style={{ display: "flex", gap: 12, maxWidth: 280 }}>
      <div
        style={{
          width: 38,
          height: 38,
          flex: "none",
          borderRadius: "50%",
          background: "#1B2A4A",
          color: "#F7F5F0",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Spectral, serif",
          fontSize: 14,
        }}
      >
        {initials}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13.5, color: "#141E3C", fontWeight: 600 }}>{person.name}</div>
        <div style={{ fontSize: 12, color: "#707A8A" }}>{person.role}</div>
        {person.reason ? (
          <div style={{ fontSize: 12, color: "#6B7488", marginTop: 3, lineHeight: 1.5 }}>{person.reason}</div>
        ) : null}
      </div>
    </div>
  );
}

function FlagCard({ flag }: { flag: RiskFlag }) {
  const cleared = flag.status === "cleared" || flag.status === "approved";
  const statusLabel = cleared ? "Cleared" : flag.status === "in_review" ? "In review" : "Flagged";
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #E7CBB4",
        borderLeft: "3px solid #C8895E",
        borderRadius: 11,
        padding: "18px 20px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: LABEL, letterSpacing: "0.1em", textTransform: "uppercase", color: "#9F5E3A", fontWeight: 700 }}>
          Risk
        </div>
        <span
          style={{
            fontSize: LABEL,
            fontWeight: 600,
            color: "#9F5E3A",
            background: "#F7EAE1",
            padding: "3px 10px",
            borderRadius: 999,
          }}
        >
          {statusLabel}
        </span>
      </div>
      <div style={{ fontFamily: "Spectral, serif", fontSize: 18, color: "#141E3C", marginTop: 8 }}>{flag.title}</div>
      <div style={{ fontSize: 13, color: "#6B7488", marginTop: 5, lineHeight: 1.55 }}>
        {flag.rationale}
        {flag.routed_to_name ? ` Sent to ${flag.routed_to_name}.` : ""}
      </div>
    </div>
  );
}

function FindingCard({ finding }: { finding: Finding }) {
  const review = finding.status === "needs_review" || finding.requires_approval;
  const statusLabel = review ? "In review" : finding.status === "approved" ? "Cleared" : "Act now";
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #E4DFD3",
        borderLeft: "3px solid #C9A86A",
        borderRadius: 11,
        padding: "18px 20px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: LABEL, letterSpacing: "0.1em", textTransform: "uppercase", color: "#A8854A", fontWeight: 700 }}>
          Opening
        </div>
        <span
          style={{
            fontSize: LABEL,
            fontWeight: 600,
            color: review ? "#9F5E3A" : "#A8854A",
            background: review ? "#F7EAE1" : "#FBF3E2",
            padding: "3px 10px",
            borderRadius: 999,
          }}
        >
          {statusLabel}
        </span>
      </div>
      <div style={{ fontFamily: "Spectral, serif", fontSize: 18, color: "#141E3C", marginTop: 8 }}>{finding.title}</div>
      <div style={{ fontSize: 13, color: "#6B7488", marginTop: 5, lineHeight: 1.55 }}>
        {finding.summary}
        {finding.routed_to_name ? ` Sent to ${finding.routed_to_name}.` : ""}
      </div>
    </div>
  );
}

function NoteRow({ note }: { note: Note }) {
  const kindLabel = note.kind && note.kind !== "note" ? KIND_LABEL[note.kind] ?? note.kind : null;
  return (
    <div style={{ position: "relative", marginBottom: 18 }}>
      <span
        style={{
          position: "absolute",
          left: -26,
          top: 1,
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: "#EEF1F6",
          color: "#1B2A4A",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 9,
          fontWeight: 700,
          boxShadow: "0 0 0 3px #fff",
        }}
      >
        {initialsOf(note.author_name)}
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 14, color: "#2C3344", lineHeight: 1.5 }}>{note.text}</span>
        {kindLabel ? (
          <span
            style={{
              fontSize: 10,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              fontWeight: 600,
              color: "#A8854A",
              background: "#FBF3E2",
              padding: "2px 7px",
              borderRadius: 999,
            }}
          >
            {kindLabel}
          </span>
        ) : null}
      </div>
      <div style={{ fontSize: 11.5, color: "#A6ADBB", marginTop: 4 }}>
        {note.author_name} · {shortDate(note.created_at)}
      </div>
    </div>
  );
}
