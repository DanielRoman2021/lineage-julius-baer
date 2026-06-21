"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, runPipelinePolled } from "@/lib/api";
import type { ClientState, Verification, SubCheck, SpecialistReview, DocumentRec, Finding, RiskFlag, AuditEntry } from "@/lib/types";

// A normalized item a human must clear on the gate: either an open risk flag
// (raised by KYC, cleared via the flag endpoint) or a specialist finding that
// requires approval. Both render the same way and both write an audit entry.
type ReviewItem = {
  id: string;
  kind: "flag" | "finding";
  title: string;
  summary: string;
  draftNote?: string;
  confidence: number;
  checkedAgainst: string;
  routedToName: string;
};
function flagToItem(f: RiskFlag): ReviewItem {
  return { id: f.id, kind: "flag", title: f.title, summary: f.rationale, confidence: f.confidence, checkedAgainst: f.checked_against, routedToName: f.routed_to_name };
}
function findingToItem(f: Finding): ReviewItem {
  return { id: f.id, kind: "finding", title: f.title, summary: f.summary, draftNote: f.draft_note, confidence: f.confidence, checkedAgainst: f.checked_against, routedToName: f.routed_to_name };
}
import { LoadingState, ErrorState } from "@/components/states";
import { ClientSwitcher } from "@/components/client-switcher";

const REVIEWER_NAME = "Markus Brunner";
const REVIEWER_SHORT = "M. Brunner";
const REVIEWER_ROLE = "advisor";

const LABEL: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "#707A8A",
  fontWeight: 600,
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function specialistBadge(status: string): { text: string; color: string; bg: string } {
  if (status === "pass") return { text: "Pass", color: "#5E806B", bg: "#E7EFE8" };
  if (status === "needs_review") return { text: "Needs review", color: "#9F5E3A", bg: "#F7EAE1" };
  return { text: "Flagged", color: "#9F5E3A", bg: "#F7EAE1" };
}

export default function AgentVerificationFlow() {
  const { id: routeId } = useParams<{ id: string }>();
  const id = routeId || "sarah_keller";

  const [state, setState] = useState<ClientState | null>(null);
  const [verif, setVerif] = useState<Verification | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [running, setRunning] = useState(false);
  const [liveStatus, setLiveStatus] = useState<Record<string, string>>({});

  // Human-approval state, keyed by specialist role.
  const [busyRole, setBusyRole] = useState<string | null>(null);
  const [decidedRole, setDecidedRole] = useState<Record<string, boolean>>({});
  const [gateBusy, setGateBusy] = useState(false);
  const [decideError, setDecideError] = useState<string | null>(null);
  // Evidence/audit drawer — holds the matched finding (or null when closed).
  const [drawerItem, setDrawerItem] = useState<ReviewItem | null>(null);
  const [audit, setAudit] = useState<AuditEntry[]>([]);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const cs = await api.getClient(id);
      // Verification may be a transient "not started / blocked" view for an un-run
      // client; never let a hiccup here blank the whole page.
      let v: Verification | null = null;
      try {
        v = await api.getVerification(id);
      } catch {
        v = null;
      }
      setState(cs);
      setVerif(
        v ?? {
          client_id: id,
          status: "blocked",
          subchecks: [],
          specialists: [],
          criteria_total: 0,
          criteria_cleared: 0,
          criteria_to_human: 0,
          approver_id: "rm_markus",
          approver_name: "Markus Brunner",
          approver_initials: "MB",
          guardrail: "Human only, the AI cannot execute",
        },
      );
      setAudit(cs.audit || []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function onRun() {
    if (running) return;
    setRunning(true);
    setLiveStatus({});
    try {
      // Poll-based run (robust against proxies that buffer SSE to the browser).
      await runPipelinePolled(id, (stages) => {
        setLiveStatus(
          Object.fromEntries(stages.map((s) => [s.agent, s.status])),
        );
      });
      // Pull the finished verification + state so the canvas reflects the run.
      await reload();
    } finally {
      setRunning(false);
    }
  }

  if (error) {
    return (
      <div className="px-8 py-7">
        <ErrorState message="We could not load the verification flow. Check that the backend is running, then try again." onRetry={reload} minHeight={420} />
      </div>
    );
  }

  if (loading || !state || !verif) {
    return (
      <div className="px-8 py-7">
        <LoadingState label="Loading verification flow" minHeight={420} />
      </div>
    );
  }

  const client = state.client;
  const docs: DocumentRec[] = state.documents || [];
  const subchecks: SubCheck[] = verif.subchecks || [];
  const specialists: SpecialistReview[] = verif.specialists || [];
  const findings: Finding[] = state.findings || [];
  const routed = specialists.filter((s) => s.status !== "pass" && s.status !== "pending");

  // Two facts gate everything: documents must exist and the pipeline must have run.
  // Until both are true there is nothing to clear, pass, or approve.
  const hasDocs = docs.length > 0;
  const hasRun = !!state.pipeline;

  // Open risk flags routed to a role are the real items a human must clear.
  const openFlags: RiskFlag[] = (state.flags || []).filter((f) => f.status === "open");
  function flagsForRole(role: string): RiskFlag[] {
    return openFlags.filter((f) => f.routed_to_role === role);
  }
  // Match a routed specialist to the finding that backs it (same agent role, awaiting a human).
  function findingFor(sp: SpecialistReview): Finding | undefined {
    return findings.find((f) => f.agent_role === sp.role && f.requires_approval);
  }
  // Everything a human must clear for one routed specialist: its open flags plus any finding.
  function reviewItemsFor(sp: SpecialistReview): ReviewItem[] {
    const items = flagsForRole(sp.role).map(flagToItem);
    const fd = findingFor(sp);
    if (fd) items.push(findingToItem(fd));
    return items;
  }

  // Clear every open flag and approve every finding behind one routed specialist.
  async function clearRole(sp: SpecialistReview): Promise<void> {
    const flags = flagsForRole(sp.role);
    const fd = findingFor(sp);
    for (const fl of flags) {
      await api.decideFlag(id, fl.id, {
        decision: "approve",
        reviewer_name: sp.routed_to_name || REVIEWER_NAME,
        reviewer_role: sp.role,
        rationale: "Reviewed and cleared.",
      });
    }
    if (fd) {
      await api.decideFinding(id, fd.id, {
        decision: "approve",
        reviewer_name: REVIEWER_NAME,
        reviewer_role: REVIEWER_ROLE,
        rationale: "Reviewed and approved.",
      });
    }
    setDecidedRole((d) => ({ ...d, [sp.role]: true }));
  }

  async function approveRouted(sp: SpecialistReview) {
    if (!reviewItemsFor(sp).length) return;
    setBusyRole(sp.role);
    setDecideError(null);
    try {
      await clearRole(sp);
      await reload();
    } catch {
      setDecideError("That approval did not go through. Check the connection and try again.");
    } finally {
      setBusyRole(null);
    }
  }

  // The gate's Approve clears every routed specialist (flags and findings) in one pass.
  async function approveGate() {
    if (gateBusy) return;
    const pending = routed.filter((sp) => reviewItemsFor(sp).length);
    if (!pending.length) return;
    setGateBusy(true);
    setDecideError(null);
    try {
      for (const sp of pending) await clearRole(sp);
      await reload();
    } catch {
      setDecideError("That approval did not go through. Check the connection and try again.");
    } finally {
      setGateBusy(false);
    }
  }

  function openDrawer(item: ReviewItem) {
    setDrawerItem(item);
    // Pull the freshest audit so a just-written entry shows in the drawer.
    api.getAudit(id).then(setAudit).catch(() => {});
  }

  // The gate turns green ONLY when a human actually signed off. A real approval writes
  // an audit entry (model_version "human-decision"); criteria geometry alone never proves it.
  const humanApproved = (state.audit || []).some(
    (a) => (a.ref_type === "finding" || a.ref_type === "flag") && a.model_version === "human-decision",
  );
  const gateDone = hasRun && routed.length === 0 && humanApproved;
  // After a run with nothing routed to a human and no sign-off recorded, there is simply
  // nothing to approve — show a neutral note, not a fabricated approval.
  const gateNothingToReview = hasRun && routed.length === 0 && !humanApproved;

  // ---- Layout math, fully derived from the data so connectors can never drift. ----
  // Each column is a vertical stack with a known total height. We center every column on
  // one shared axis (axisY) so connectors run roughly horizontal, and we derive each
  // box's top from that — never from a literal. Every connector endpoint still reads the
  // SAME centerY/top that positions its box.

  const TOP_PAD = 56; // first box sits this far below the column headers (top:8)

  // Column 1 — Intake. All docs render plus the Values DNA chip, on a constant stride.
  const INTAKE_LEFT = 0;
  const INTAKE_WIDTH = 196;
  const CHIP_H = 52;
  const CHIP_STRIDE = 64; // 52 chip + 12 gap
  const intakeChipCount = docs.length + 1; // docs + Values DNA
  const intakeColHeight = (intakeChipCount - 1) * CHIP_STRIDE + CHIP_H;

  // Column 2 — KYC node. Content-driven height (min-height + no clip). We compute an
  // explicit height so the connector convergence point matches the rendered box center.
  const KYC_LEFT = 260;
  const KYC_WIDTH = 240;
  const KYC_HEADER_H = 52;
  const KYC_ROW_H = 46;
  const KYC_PAD = 16;
  const kycMinHeight = KYC_HEADER_H + KYC_PAD + subchecks.length * KYC_ROW_H;
  const kycHeight = Math.max(292, kycMinHeight);
  const KYC_RIGHT = KYC_LEFT + KYC_WIDTH;

  // Column 3 — Specialists. Constant stride; each node's center feeds the connectors.
  const SPEC_LEFT = 560;
  const SPEC_WIDTH = 230;
  const SPEC_H = 104;
  const SPEC_STRIDE = 120;
  const SPEC_RIGHT = SPEC_LEFT + SPEC_WIDTH;
  const specColHeight = specialists.length ? (specialists.length - 1) * SPEC_STRIDE + SPEC_H : 0;

  // Column 4 — Human approval gate + one routed card per routed specialist (stacked under it).
  const HUMAN_LEFT = 860;
  const HUMAN_WIDTH = 196;
  const GATE_H = 130;
  const ROUTED_CARD_H = 84; // identity row of the card; the connector aims at this band
  const ROUTED_CARD_FULL_H = 132; // including the Approve / View action row a routed card carries
  const GATE_GAP = 18; // space between the gate and the first routed card
  const ROUTED_GAP = 14; // space between routed cards
  const ROUTED_CARD_STRIDE = ROUTED_CARD_FULL_H + ROUTED_GAP;
  const routedStackHeight = routed.length
    ? routed.length * ROUTED_CARD_FULL_H + (routed.length - 1) * ROUTED_GAP
    : 0;
  const humanColHeight = GATE_H + (routed.length ? GATE_GAP + routedStackHeight : 0);

  // Shared centerline. Center every column on it so connectors stay near-horizontal.
  const maxColHeight = Math.max(intakeColHeight, kycHeight, specColHeight, humanColHeight);
  const axisY = TOP_PAD + maxColHeight / 2;

  type Chip = { top: number; height: number; centerY: number };

  // Intake chips, centered as a block on the axis.
  const intakeBaseTop = axisY - intakeColHeight / 2;
  const docChips: Chip[] = docs.map((_, i) => {
    const top = intakeBaseTop + i * CHIP_STRIDE;
    return { top, height: CHIP_H, centerY: top + CHIP_H / 2 };
  });
  const dnaTop = intakeBaseTop + docs.length * CHIP_STRIDE;
  const dnaChip: Chip = { top: dnaTop, height: CHIP_H, centerY: dnaTop + CHIP_H / 2 };
  const intakeSourceYs = [...docChips.map((c) => c.centerY), dnaChip.centerY];

  // KYC node, centered on the axis. Single convergence Y derived from the node itself.
  const KYC_TOP = axisY - kycHeight / 2;
  const kycCenterY = KYC_TOP + kycHeight / 2;

  // Specialist nodes, centered as a block on the axis.
  const specBaseTop = axisY - specColHeight / 2;
  const specNodes: Chip[] = specialists.map((_, i) => {
    const top = specBaseTop + i * SPEC_STRIDE;
    return { top, height: SPEC_H, centerY: top + SPEC_H / 2 };
  });

  // Human column, centered as a block on the axis: gate first, routed cards beneath.
  const humanBaseTop = axisY - humanColHeight / 2;
  const GATE_TOP = humanBaseTop;
  const gateCenterY = GATE_TOP + GATE_H / 2;
  const routedBaseTop = GATE_TOP + GATE_H + GATE_GAP;
  const routedCards = routed.map((sp) => {
    const specIndex = specialists.findIndex((s) => s.role === sp.role);
    const sourceY = specIndex >= 0 ? specNodes[specIndex].centerY : gateCenterY;
    return { sp, sourceY };
  });
  const routedCardTops = routedCards.map((_, i) => routedBaseTop + i * ROUTED_CARD_STRIDE);

  // Canvas grows to fit whichever column is tallest; floor drops when the right column is bare.
  const heightFloor = routed.length ? 600 : 420;
  const CANVAS_WIDTH = HUMAN_LEFT + HUMAN_WIDTH; // 1056
  const canvasHeight = Math.max(heightFloor, TOP_PAD + maxColHeight) + 40;

  // Tightened cubic: control points hug the endpoints so lines travel less.
  function curve(srcX: number, srcY: number, dstX: number, dstY: number): string {
    if (Math.abs(srcY - dstY) < 0.5) return `M${srcX} ${srcY} L ${dstX} ${dstY}`;
    const gap = dstX - srcX;
    const cp1x = srcX + gap * 0.35;
    const cp2x = dstX - gap * 0.35;
    return `M${srcX} ${srcY} C ${cp1x} ${srcY} ${cp2x} ${dstY} ${dstX} ${dstY}`;
  }

  return (
    <div className="px-8 py-7" style={{ fontFamily: "Archivo", color: "#3C4456" }}>
      {/* Client strip */}
      <div className="flex items-center gap-4" style={{ marginBottom: 4 }}>
        <ClientSwitcher currentId={id} hrefFor={(cid) => `/rm/clients/${cid}/flow`} subtitle={hasRun ? "Onboarding · Verification" : hasDocs ? "Onboarding · Not started yet" : "Onboarding · Awaiting documents"} />
        <div className="flex items-center gap-2" style={{ marginLeft: 18, fontSize: 12.5, color: "#707A8A" }}>
          <span style={{ color: "#A8854A" }}>Intake</span>
          <span style={{ color: "#C7C0B0" }}>›</span>
          <span style={{ color: "#141E3C", fontWeight: 600 }}>Verification</span>
          <span style={{ color: "#C7C0B0" }}>›</span>
          <span>Approval</span>
        </div>
        <div className="flex items-center gap-3" style={{ marginLeft: "auto" }}>
          <button
            onClick={onRun}
            disabled={running || !hasDocs}
            title={!hasDocs ? "Upload documents before running the pipeline" : undefined}
            style={{
              padding: "9px 18px",
              borderRadius: 8,
              background: running || !hasDocs ? "#D8CFBC" : "#141E3C",
              color: running || !hasDocs ? "#707A8A" : "#F7F5F0",
              fontSize: 13,
              fontWeight: 600,
              border: "none",
              cursor: running || !hasDocs ? "default" : "pointer",
            }}
          >
            {running ? "Running…" : hasRun ? "Re-run pipeline" : "Run pipeline"}
          </button>
          <div
            className="flex items-center gap-2"
            style={{ padding: "7px 14px", border: "1px solid #E4DFD3", borderRadius: 999, background: "#fff" }}
          >
            <span style={LABEL}>Trust</span>
            <span style={{ fontFamily: "Spectral", fontSize: 18, color: "#A8854A" }}>{client.trust_score}</span>
          </div>
        </div>
      </div>

      {/* Flow header */}
      <div className="flex items-end justify-between" style={{ marginTop: 22, marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "#A8854A", fontWeight: 700 }}>
            Orchestration
          </div>
          <div style={{ fontFamily: "Spectral", fontWeight: 400, fontSize: 29, color: "#141E3C", marginTop: 6 }}>
            Agent Verification Flow
          </div>
        </div>
        <div className="flex gap-2.5">
          {[
            { v: hasRun ? verif.criteria_total : "—", c: "#141E3C", l: "Criteria" },
            { v: hasRun ? verif.criteria_cleared : "—", c: "#5E806B", l: "Cleared" },
            { v: hasRun ? verif.criteria_to_human : "—", c: "#C8895E", l: "To human" },
          ].map((m) => (
            <div
              key={m.l}
              style={{ padding: "9px 16px", background: "#fff", border: "1px solid #E4DFD3", borderRadius: 8, textAlign: "center" }}
            >
              <div style={{ fontFamily: "Spectral", fontSize: 21, color: m.c }}>{m.v}</div>
              <div style={{ fontSize: 10.5, letterSpacing: "0.1em", textTransform: "uppercase", color: "#707A8A", fontWeight: 600 }}>
                {m.l}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center" style={{ gap: 24, paddingBottom: 8, fontSize: 12, color: "#707A8A" }}>
        <span className="inline-flex items-center" style={{ gap: 8 }}>
          <svg width="26" height="8">
            <line x1="0" y1="4" x2="26" y2="4" stroke="#1B2A4A" strokeWidth="2" strokeDasharray="4 5" />
          </svg>
          Automated pass
        </span>
        <span className="inline-flex items-center" style={{ gap: 8 }}>
          <svg width="26" height="8">
            <line x1="0" y1="4" x2="26" y2="4" stroke="#C8895E" strokeWidth="2" strokeDasharray="6 5" />
          </svg>
          Routed to human
        </span>
        <span className="inline-flex items-center" style={{ gap: 8 }}>
          <span style={{ width: 11, height: 11, borderRadius: 3, border: "1.5px solid #C9A86A", background: "#FBF3E2" }} />
          Human approval gate
        </span>
      </div>

      {/* decision failure */}
      {decideError && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: "#FBF1EA",
            border: "1px solid #E7CBB4",
            borderRadius: 10,
            padding: "12px 16px",
            marginTop: 12,
            fontSize: 13,
            color: "#9F5E3A",
          }}
        >
          <span style={{ flex: 1 }}>{decideError}</span>
          <button
            onClick={() => setDecideError(null)}
            style={{
              border: "none",
              background: "transparent",
              color: "#9F5E3A",
              fontSize: 12.5,
              fontWeight: 600,
              fontFamily: "Archivo, sans-serif",
              cursor: "pointer",
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* FLOW CANVAS — only meaningful once the pipeline has run on real documents */}
      {hasRun ? (
      <div style={{ paddingTop: 6, overflowX: "auto" }}>
        <div style={{ position: "relative", width: CANVAS_WIDTH, minWidth: CANVAS_WIDTH, height: canvasHeight }}>
          {/* connectors — every endpoint is derived from the same coordinate that
              positions its box (chip.centerY, kycCenterY, node.centerY, card top). */}
          <svg viewBox={`0 0 ${CANVAS_WIDTH} ${canvasHeight}`} width={CANVAS_WIDTH} height={canvasHeight} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
            <style>{`@keyframes flow{to{stroke-dashoffset:-26;}}`}</style>
            <g stroke="#1B2A4A" strokeWidth="2" fill="none" strokeDasharray="4 5" style={{ animation: "flow 1.2s linear infinite" }}>
              {/* stage 1 -> stage 2: one path per rendered intake chip, all converging on the KYC center */}
              {intakeSourceYs.map((y, i) => (
                <path key={`in-${i}`} d={curve(INTAKE_WIDTH, y, KYC_LEFT, kycCenterY)} />
              ))}
              {/* stage 2 -> stage 3: from the KYC center out to each specialist node's center */}
              {specNodes.map((n, i) => (
                <path key={`sp-${i}`} d={curve(KYC_RIGHT, kycCenterY, SPEC_LEFT, n.centerY)} />
              ))}
              {/* stage 3 -> stage 4 (passing specialists): converge on the human gate center */}
              {specialists.map((sp, i) =>
                sp.status === "pass" ? (
                  <path key={`gate-${i}`} d={curve(SPEC_RIGHT, specNodes[i].centerY, HUMAN_LEFT, gateCenterY)} />
                ) : null
              )}
            </g>
            {/* stage 3 -> stage 4 (routed): orange line from the routed node center to its own card center */}
            <g stroke="#C8895E" strokeWidth="2" fill="none" strokeDasharray="6 5">
              {routedCards.map((rc, i) => {
                const targetY = routedCardTops[i] + ROUTED_CARD_H / 2;
                return <path key={`rt-${i}`} d={curve(SPEC_RIGHT, rc.sourceY, HUMAN_LEFT, targetY)} />;
              })}
            </g>
          </svg>

          {/* column headers */}
          <div style={{ position: "absolute", left: INTAKE_LEFT, top: 8, width: INTAKE_WIDTH, textAlign: "center", fontSize: 10.5, letterSpacing: "0.16em", textTransform: "uppercase", color: "#A8854A", fontWeight: 700 }}>
            1 · Intake
          </div>
          <div style={{ position: "absolute", left: KYC_LEFT, top: 8, width: KYC_WIDTH, textAlign: "center", fontSize: 10.5, letterSpacing: "0.16em", textTransform: "uppercase", color: "#A8854A", fontWeight: 700 }}>
            2 · KYC Screening
          </div>
          <div style={{ position: "absolute", left: SPEC_LEFT, top: 8, width: SPEC_WIDTH, textAlign: "center", fontSize: 10.5, letterSpacing: "0.16em", textTransform: "uppercase", color: "#A8854A", fontWeight: 700 }}>
            3 · Specialist Review
          </div>
          <div style={{ position: "absolute", left: HUMAN_LEFT, top: 8, width: HUMAN_WIDTH, textAlign: "center", fontSize: 10.5, letterSpacing: "0.16em", textTransform: "uppercase", color: "#A8854A", fontWeight: 700 }}>
            4 · Human Approval
          </div>

          {/* INTAKE chips — all docs render; geometry comes from docChips[i] */}
          {docs.map((d, i) => {
            const flagged = d.flagged;
            const chip = docChips[i];
            return (
              <div
                key={d.id}
                style={{
                  position: "absolute",
                  left: INTAKE_LEFT,
                  top: chip.top,
                  width: INTAKE_WIDTH,
                  height: chip.height,
                  borderRadius: 8,
                  background: "#fff",
                  border: flagged ? "1px solid #EAD9C9" : "1px solid #E4DFD3",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "0 14px",
                }}
              >
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: flagged ? "#C8895E" : "#5E806B" }} />
                <span style={{ fontSize: 13, color: "#141E3C", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {d.doc_type}
                </span>
                {flagged ? (
                  <span style={{ marginLeft: "auto", fontSize: 11, color: "#9F5E3A", fontWeight: 600 }}>review</span>
                ) : (
                  <svg style={{ marginLeft: "auto" }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5E806B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                )}
              </div>
            );
          })}

          {/* Values DNA chip — sits after the last doc chip on the same stride */}
          <div
            style={{
              position: "absolute",
              left: INTAKE_LEFT,
              top: dnaChip.top,
              width: INTAKE_WIDTH,
              height: dnaChip.height,
              borderRadius: 8,
              background: "#FBF3E2",
              border: "1px solid #E7D4AE",
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "0 14px",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A8854A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v8M8 12h8" />
            </svg>
            <span style={{ fontSize: 13, color: "#141E3C", fontWeight: 500 }}>Values DNA</span>
          </div>

          {/* KYC node — content-driven height (no clip); all sub-checks render */}
          <div
            style={{
              position: "absolute",
              left: KYC_LEFT,
              top: KYC_TOP,
              width: KYC_WIDTH,
              minHeight: kycHeight,
              borderRadius: 11,
              background: "#fff",
              border: "1px solid #E4DFD3",
              boxShadow: "0 12px 30px -18px rgba(20,30,60,.4)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: "#141E3C", color: "#fff", borderTopLeftRadius: 11, borderTopRightRadius: 11 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 28, height: 28, borderRadius: 7, background: "rgba(201,168,106,.18)", border: "1px solid rgba(201,168,106,.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#C9A86A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6z" />
                  </svg>
                </span>
                <span style={{ fontFamily: "Spectral", fontSize: 16 }}>KYC Agent</span>
              </div>
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#5E806B", background: "#E7EFE8", padding: "3px 8px", borderRadius: 999 }}>
                {liveStatus["kyc"] === "running" ? "Running" : "Done"}
              </span>
            </div>
            <div style={{ padding: "6px 16px 10px" }}>
              {subchecks.map((sc, i) => {
                const hit = sc.status === "hit";
                return (
                  <div
                    key={sc.key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "11px 0",
                      borderBottom: i < subchecks.length - 1 ? "1px solid #F1ECE1" : "none",
                    }}
                  >
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: hit ? "#C8895E" : "#5E806B" }} />
                    <span style={{ fontSize: 13, color: "#3C4456" }}>
                      {sc.label}
                      {sc.optional && <span style={{ color: "#A6ADBB" }}> · opt.</span>}
                    </span>
                    <span style={{ marginLeft: "auto", fontSize: 11.5, color: hit ? "#9F5E3A" : "#5E806B", fontWeight: 600 }}>
                      {hit ? sc.detail || "1 hit" : "Clear"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Specialist nodes — geometry from specNodes[i] */}
          {specialists.map((sp, i) => {
            const b = specialistBadge(sp.status);
            const flagged = sp.status !== "pass";
            const node = specNodes[i];
            return (
              <div
                key={sp.role}
                style={{
                  position: "absolute",
                  left: SPEC_LEFT,
                  top: node.top,
                  width: SPEC_WIDTH,
                  height: node.height,
                  borderRadius: 10,
                  background: "#fff",
                  border: flagged ? "1.5px solid #E7CBB4" : "1px solid #E4DFD3",
                  padding: "14px 16px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontFamily: "Spectral", fontSize: 15.5, color: "#141E3C" }}>{sp.agent_label}</span>
                  <span style={{ fontSize: 10.5, color: b.color, fontWeight: 600, background: b.bg, padding: "3px 8px", borderRadius: 999 }}>
                    {b.text}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "#707A8A", marginTop: 7, lineHeight: 1.5 }}>
                  <span style={{ color: flagged ? "#9F5E3A" : "#3C4456" }}>{sp.note}</span>
                </div>
              </div>
            );
          })}

          {/* Human approval gate */}
          <div
            style={{
              position: "absolute",
              left: HUMAN_LEFT,
              top: GATE_TOP,
              width: HUMAN_WIDTH,
              minHeight: GATE_H,
              borderRadius: 11,
              background: gateDone ? "#F2F7F2" : "#FFFDF8",
              border: gateDone ? "1.5px solid #9DBBA4" : "1.5px solid #C9A86A",
              padding: "13px 16px",
              boxShadow: gateDone ? "0 12px 30px -18px rgba(67,107,82,.5)" : "0 12px 30px -18px rgba(168,133,74,.6)",
            }}
          >
            <div style={{ fontSize: 9.5, letterSpacing: "0.14em", textTransform: "uppercase", color: gateDone ? "#436B52" : "#A8854A", fontWeight: 700 }}>
              Human approval
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 9 }}>
              <span style={{ width: 30, height: 30, borderRadius: "50%", background: "#141E3C", color: "#F7F5F0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, boxShadow: gateDone ? "0 0 0 2px #5E806B" : "0 0 0 2px #C9A86A" }}>
                {verif.approver_initials}
              </span>
              <div>
                <div style={{ fontSize: 13, color: "#141E3C", fontWeight: 600 }}>{verif.approver_name}</div>
                <div style={{ fontSize: 11, color: "#707A8A" }}>Relationship manager</div>
              </div>
            </div>
            {gateDone ? (
              <div style={{ marginTop: 11 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    padding: "8px 0",
                    borderRadius: 7,
                    background: "#EAF0EB",
                    color: "#436B52",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#436B52" }} />
                  Approved by Markus
                </div>
                <div style={{ textAlign: "center", fontSize: 11, color: "#A6ADBB", marginTop: 6 }}>
                  Signed by {REVIEWER_SHORT}
                </div>
              </div>
            ) : gateNothingToReview ? (
              <div style={{ marginTop: 11 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    padding: "8px 0",
                    borderRadius: 7,
                    background: "#F4EFE4",
                    color: "#707A8A",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  Nothing needed human review
                </div>
                <div style={{ textAlign: "center", fontSize: 11, color: "#A6ADBB", marginTop: 6 }}>
                  Awaiting sign-off
                </div>
              </div>
            ) : (
              <div style={{ marginTop: 11, display: "flex", gap: 8 }}>
                <button
                  onClick={approveGate}
                  disabled={gateBusy || routed.length === 0}
                  style={{
                    flex: 1,
                    textAlign: "center",
                    padding: "7px 0",
                    borderRadius: 7,
                    border: "none",
                    background: "#C9A86A",
                    color: "#141E3C",
                    fontSize: 12,
                    fontWeight: 600,
                    fontFamily: "Archivo, sans-serif",
                    cursor: gateBusy || routed.length === 0 ? "default" : "pointer",
                    opacity: gateBusy || routed.length === 0 ? 0.6 : 1,
                  }}
                >
                  {gateBusy ? "Approving…" : "Approve"}
                </button>
                <button
                  onClick={() => {
                    const item = routed.flatMap(reviewItemsFor)[0];
                    if (item) openDrawer(item);
                  }}
                  disabled={!routed.some((sp) => reviewItemsFor(sp).length)}
                  style={{
                    padding: "7px 12px",
                    borderRadius: 7,
                    border: "1px solid #D8CFBC",
                    background: "#fff",
                    color: "#707A8A",
                    fontSize: 12,
                    fontWeight: 600,
                    fontFamily: "Archivo, sans-serif",
                    cursor: routed.some((sp) => reviewItemsFor(sp).length) ? "pointer" : "default",
                    opacity: routed.some((sp) => reviewItemsFor(sp).length) ? 1 : 0.6,
                  }}
                >
                  View
                </button>
              </div>
            )}
          </div>
          {/* guardrail chip */}
          <div
            style={{
              position: "absolute",
              left: HUMAN_LEFT,
              top: GATE_TOP - 13,
              zIndex: 3,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "#141E3C",
              color: "#F4F1EA",
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: "0.02em",
              padding: "4px 10px",
              borderRadius: 999,
              boxShadow: "0 4px 12px -4px rgba(20,30,60,.55)",
            }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#C9A86A" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="11" width="16" height="9" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
            {verif.guardrail || "Human only, the AI cannot execute"}
          </div>

          {/* Routed specialist review cards — one per routed specialist, top from routedCardTops[i] */}
          {routedCards.map(({ sp }, i) => {
            const top = routedCardTops[i];
            const ini = sp.routed_to_initials || initials(sp.routed_to_name);
            const items = reviewItemsFor(sp);
            const primary = items[0];
            const busy = busyRole === sp.role;
            const decided = !!decidedRole[sp.role];
            return (
              <div
                key={sp.role}
                style={{
                  position: "absolute",
                  left: HUMAN_LEFT,
                  top,
                  width: HUMAN_WIDTH,
                  minHeight: ROUTED_CARD_H,
                  borderRadius: 11,
                  background: "#fff",
                  border: "1px solid #E7CBB4",
                  padding: "12px 16px",
                  borderLeft: "3px solid #C8895E",
                  opacity: busy ? 0.55 : 1,
                  transition: "opacity .15s ease",
                }}
              >
                <div style={{ fontSize: 9.5, letterSpacing: "0.14em", textTransform: "uppercase", color: "#9F5E3A", fontWeight: 700 }}>
                  Human review
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 8 }}>
                  <span style={{ width: 28, height: 28, borderRadius: "50%", background: "#EFE7DA", color: "#9F5E3A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>
                    {ini}
                  </span>
                  <div>
                    <div style={{ fontSize: 12.5, color: "#141E3C", fontWeight: 600 }}>{sp.routed_to_name}</div>
                    <div style={{ fontSize: 11, color: "#707A8A" }}>{sp.action_label}</div>
                  </div>
                </div>
                {primary && (
                  <div style={{ display: "flex", gap: 7, marginTop: 11 }}>
                    {decided ? (
                      <div
                        style={{
                          flex: 1,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 7,
                          padding: "7px 0",
                          borderRadius: 7,
                          background: "#EAF0EB",
                          color: "#436B52",
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#436B52" }} />
                        Approved
                      </div>
                    ) : (
                      <button
                        onClick={() => approveRouted(sp)}
                        disabled={busy}
                        style={{
                          flex: 1,
                          padding: "7px 0",
                          borderRadius: 7,
                          border: "none",
                          background: "#C9A86A",
                          color: "#141E3C",
                          fontSize: 12,
                          fontWeight: 600,
                          fontFamily: "Archivo, sans-serif",
                          cursor: busy ? "default" : "pointer",
                          opacity: busy ? 0.6 : 1,
                        }}
                      >
                        {busy ? "Approving…" : "Approve"}
                      </button>
                    )}
                    <button
                      onClick={() => openDrawer(primary)}
                      style={{
                        padding: "7px 11px",
                        borderRadius: 7,
                        border: "1px solid #E0C9B5",
                        background: "#fff",
                        color: "#9F5E3A",
                        fontSize: 12,
                        fontWeight: 600,
                        fontFamily: "Archivo, sans-serif",
                        cursor: "pointer",
                      }}
                    >
                      View
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      ) : (
        <div style={{ paddingTop: 6 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              minHeight: 360,
              background: "#fff",
              border: "1px dashed #D8CFBC",
              borderRadius: 14,
              padding: "48px 32px",
            }}
          >
            <span
              style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                background: "#F4EFE4",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 18,
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#A8854A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                {hasDocs ? (
                  <>
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 8v8M8 12h8" />
                  </>
                ) : (
                  <>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <path d="M14 2v6h6" />
                  </>
                )}
              </svg>
            </span>
            <div style={{ fontFamily: "Spectral", fontSize: 22, color: "#141E3C" }}>
              {hasDocs ? "Verification has not run yet" : "No documents yet"}
            </div>
            <div style={{ fontSize: 14, color: "#707A8A", maxWidth: 470, marginTop: 10, lineHeight: 1.6 }}>
              {hasDocs
                ? `${docs.length} document${docs.length === 1 ? "" : "s"} ${docs.length === 1 ? "is" : "are"} ready. Run the pipeline to screen them, route anything sensitive to a human, and build the wealth story. Nothing is cleared, passed, or approved until then.`
                : "The client has not uploaded any documents. Verification cannot run on an empty file, so nothing here is screened or approved. Once the documents arrive, the pipeline can run."}
            </div>
            {hasDocs ? (
              <button
                onClick={onRun}
                disabled={running}
                style={{
                  marginTop: 22,
                  padding: "11px 24px",
                  borderRadius: 9,
                  background: running ? "#D8CFBC" : "#141E3C",
                  color: running ? "#707A8A" : "#F7F5F0",
                  fontSize: 13.5,
                  fontWeight: 600,
                  border: "none",
                  fontFamily: "Archivo, sans-serif",
                  cursor: running ? "default" : "pointer",
                }}
              >
                {running ? "Running…" : "Run pipeline"}
              </button>
            ) : (
              <div style={{ marginTop: 20, fontSize: 12.5, color: "#A6ADBB" }}>
                Waiting for the client to upload documents
              </div>
            )}
          </div>
        </div>
      )}

      {/* Evidence / audit drawer */}
      {drawerItem && (
        <>
          <div
            onClick={() => setDrawerItem(null)}
            style={{ position: "fixed", inset: 0, background: "rgba(20,30,60,.28)", zIndex: 40 }}
          />
          <div
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              bottom: 0,
              width: 420,
              maxWidth: "90vw",
              background: "#fff",
              borderLeft: "1px solid #E4DFD3",
              boxShadow: "-18px 0 40px -24px rgba(20,30,60,.5)",
              zIndex: 41,
              overflowY: "auto",
              fontFamily: "Archivo, sans-serif",
            }}
          >
            {/* drawer header */}
            <div style={{ background: "#141E3C", color: "#F7F5F0", padding: "20px 22px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "#C9A86A", fontWeight: 700 }}>
                  Evidence
                </div>
                <div style={{ fontFamily: "Spectral, serif", fontSize: 19, marginTop: 5, lineHeight: 1.3 }}>
                  {drawerItem.title}
                </div>
              </div>
              <button
                onClick={() => setDrawerItem(null)}
                style={{ border: "none", background: "transparent", color: "#9BA6BC", fontSize: 22, lineHeight: 1, cursor: "pointer", padding: 0 }}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div style={{ padding: "20px 22px", color: "#3C4456" }}>
              <div style={{ fontSize: 13.5, color: "#3C4456", lineHeight: 1.6 }}>{drawerItem.summary}</div>

              {drawerItem.draftNote && (
                <div style={{ marginTop: 16, background: "#FBFAF6", border: "1px solid #EDE7DA", borderRadius: 10, padding: "14px 16px" }}>
                  <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "#A6ADBB", fontWeight: 600 }}>Draft note</div>
                  <div style={{ fontSize: 12.5, color: "#3C4456", marginTop: 5, lineHeight: 1.55 }}>{drawerItem.draftNote}</div>
                </div>
              )}

              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 16, alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "#707A8A" }}>Confidence</span>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: "#3C4456", background: "#F4EFE4", padding: "3px 10px", borderRadius: 999 }}>
                  {Math.round(drawerItem.confidence * 100)}%
                </span>
                <span style={{ fontSize: 11, color: "#707A8A" }}>Checked against</span>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: "#3C4456", background: "#F4EFE4", padding: "3px 10px", borderRadius: 999 }}>
                  {drawerItem.checkedAgainst}
                </span>
              </div>

              <div style={{ display: "flex", gap: 9, marginTop: 12, alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "#707A8A" }}>Routed to</span>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: "#1B2A4A", background: "#EDEFF3", padding: "3px 10px", borderRadius: 999 }}>
                  {drawerItem.routedToName}
                </span>
              </div>

              {/* written audit, after approval */}
              {(() => {
                const entries = audit.filter((a) => a.ref_id === drawerItem.id);
                if (!entries.length) {
                  return (
                    <div style={{ marginTop: 20, borderTop: "1px solid #F1ECE1", paddingTop: 16, fontSize: 12.5, color: "#A6ADBB", lineHeight: 1.55 }}>
                      No audit entry yet. Approve this item to write one.
                    </div>
                  );
                }
                const a = entries[entries.length - 1];
                return (
                  <div style={{ marginTop: 20, borderTop: "1px solid #F1ECE1", paddingTop: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#1B2A4A", fontWeight: 600 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1B2A4A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 11l3 3L22 4" />
                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                      </svg>
                      Audit trail
                    </div>
                    <div
                      style={{
                        marginTop: 14,
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "14px 18px",
                        background: "#FBFAF6",
                        border: "1px solid #EDE7DA",
                        borderRadius: 10,
                        padding: "16px 18px",
                      }}
                    >
                      <div style={{ gridColumn: "1 / -1" }}>
                        <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "#A6ADBB", fontWeight: 600 }}>Input</div>
                        <div style={{ fontSize: 12.5, color: "#3C4456", marginTop: 3, lineHeight: 1.5 }}>{a.input_summary}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "#A6ADBB", fontWeight: 600 }}>Model and version</div>
                        <div style={{ fontSize: 12.5, color: "#3C4456", marginTop: 3 }}>{a.model_version}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "#A6ADBB", fontWeight: 600 }}>Confidence</div>
                        <div style={{ fontSize: 12.5, color: "#3C4456", marginTop: 3 }}>{Math.round(a.confidence * 100)}%</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "#A6ADBB", fontWeight: 600 }}>Reviewer</div>
                        <div style={{ fontSize: 12.5, color: "#3C4456", marginTop: 3 }}>{a.reviewer}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "#A6ADBB", fontWeight: 600 }}>Time</div>
                        <div style={{ fontSize: 12.5, color: "#3C4456", marginTop: 3 }}>{a.timestamp}</div>
                      </div>
                      <div style={{ gridColumn: "1 / -1" }}>
                        <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "#A6ADBB", fontWeight: 600 }}>Reason</div>
                        <div style={{ fontSize: 12.5, color: "#3C4456", marginTop: 3, lineHeight: 1.5 }}>{a.rationale}</div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
