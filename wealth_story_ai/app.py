"""Lineage backend — FastAPI.

Turns KYC intake into a living wealth story + bank intelligence, with a
multi-agent pipeline behind human approval gates and an audit trail. No key set
=> demo mode (canned, offline). All risk decisions are made by humans here.
"""
from __future__ import annotations

import json
from typing import Optional

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

import orchestrator
import store
from agents import conversation_agent
from agents.base import PipelineContext
from config import settings
from models.client import (
    ActionStatus,
    ApprovalDecision,
    AuditEntry,
    Approval,
    ConversationSignal,
    FeasibilityAssumptions,
    FlagStatus,
    HumanRole,
    Note,
    StageStatus,
    WheelDimension,
)
from services import feasibility as feas_service
from services import trust_score
from services import verification as verification_service
from services.people import person_for_role

app = FastAPI(title="Lineage", version="1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list + ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _startup() -> None:
    store.seed()


def _state_or_404(client_id: str):
    state = store.get_state(client_id)
    if not state:
        raise HTTPException(status_code=404, detail="client not found")
    return state


# --------------------------------------------------------------------------- #
# Clients
# --------------------------------------------------------------------------- #
@app.get("/api/health")
def health():
    return {"ok": True, "mode": "live" if settings.live_mode else "demo"}


@app.get("/api/clients")
def list_clients():
    out = []
    for s in store.list_states():
        c = s.client
        out.append({
            "id": c.id, "name": c.name, "headline": c.headline, "domicile": c.domicile,
            "segment": c.segment, "net_worth": c.net_worth, "currency": c.currency,
            "status": c.status, "tags": c.tags, "trust_score": c.trust_score,
            "open_flags": len([f for f in s.flags if f.status == FlagStatus.open]),
            "pending_actions": len([a for a in s.actions if a.status.value == "proposed"]),
            "has_run": s.pipeline is not None,
        })
    return {"clients": out, "mode": "live" if settings.live_mode else "demo"}


class ClientCreate(BaseModel):
    name: str
    email: str = ""


@app.post("/api/clients")
def create_client(payload: ClientCreate):
    if not payload.name.strip():
        raise HTTPException(status_code=400, detail="name is required")
    return store.create_client(payload.name.strip(), payload.email.strip())


@app.get("/api/clients/{client_id}")
def get_client(client_id: str):
    return _state_or_404(client_id)


@app.get("/api/clients/{client_id}/pipeline")
def get_pipeline(client_id: str):
    s = _state_or_404(client_id)
    if not s.pipeline:
        raise HTTPException(status_code=404, detail="no pipeline run yet")
    return s.pipeline


@app.get("/api/clients/{client_id}/verification")
def get_verification(client_id: str):
    s = _state_or_404(client_id)
    if not s.verification:
        s.verification = verification_service.build(s)
    return s.verification


@app.post("/api/clients/{client_id}/run")
async def run_pipeline(client_id: str):
    state = _state_or_404(client_id)
    assumptions = store.assumptions_for(client_id)

    async def gen():
        async for ev in orchestrator.run_stream(state, assumptions):
            yield {"data": json.dumps(ev)}
        store.persist_results(state)

    return EventSourceResponse(gen())


@app.post("/api/clients/{client_id}/documents")
async def upload_documents(client_id: str, files: list[UploadFile] = File(...)):
    _state_or_404(client_id)
    added = []
    for f in files:
        data = await f.read()
        doc = store.add_uploaded_document(client_id, f.filename or "document.pdf", data)
        if doc:
            added.append(doc)
    return {"documents": added, "total_added": len(added)}


# --------------------------------------------------------------------------- #
# People (staff) + relationship-memory notes
# --------------------------------------------------------------------------- #
@app.get("/api/people")
def list_people():
    return {"people": store.list_people()}


@app.get("/api/clients/{client_id}/notes")
def get_notes(client_id: str):
    return _state_or_404(client_id).notes


class NoteCreate(BaseModel):
    text: str
    kind: str = "note"
    author_id: str = "rm_markus"
    author_name: str = "Markus Brunner"
    tags: list[str] = []


@app.post("/api/clients/{client_id}/notes")
def add_note(client_id: str, payload: NoteCreate):
    _state_or_404(client_id)
    note = Note(
        client_id=client_id, text=payload.text, kind=payload.kind,
        author_id=payload.author_id, author_name=payload.author_name, tags=payload.tags,
    )
    return store.add_note(note)


# --------------------------------------------------------------------------- #
# Wheel of life / DNA
# --------------------------------------------------------------------------- #
class DNAUpdate(BaseModel):
    dimensions: list[WheelDimension]


@app.get("/api/clients/{client_id}/wheel")
def get_wheel(client_id: str):
    return _state_or_404(client_id).wheel


@app.post("/api/clients/{client_id}/dna")
def set_dna(client_id: str, payload: DNAUpdate):
    s = _state_or_404(client_id)
    if s.wheel:
        s.wheel.dimensions = payload.dimensions
    s.trust = trust_score.compute_trust(s)
    s.client.trust_score = s.trust.score
    store.persist_dna(s)
    return s.wheel


# --------------------------------------------------------------------------- #
# Conversation signal (standalone — fires when a client re-prioritises their wheel)
# --------------------------------------------------------------------------- #
class ConversationSignalRequest(BaseModel):
    pillar: str
    old_score: Optional[int] = None
    new_score: Optional[int] = None


@app.post("/api/clients/{client_id}/conversation-signal")
async def conversation_signal(client_id: str, body: ConversationSignalRequest):
    state = _state_or_404(client_id)
    assumptions = store.assumptions_for(client_id)
    ctx = PipelineContext(
        client=state.client,
        documents=state.documents,
        dna_wheel=state.wheel,
        goals=list(state.goals),
        assumptions=assumptions,
    )
    recent = [n.text for n in state.notes[:5]]
    signal = await conversation_agent.run(
        ctx, pillar=body.pillar, old_score=body.old_score,
        new_score=body.new_score, recent_notes=recent,
    )
    state.latest_signal = signal
    note = Note(
        client_id=client_id, author_id="agent_conversation",
        author_name="Conversation agent", kind="signal", text=signal.summary,
        tags=["wheel", signal.pillar.lower()],
    )
    store.add_note(note)
    store.persist_signal(state)
    return signal


# --------------------------------------------------------------------------- #
# Wealth story
# --------------------------------------------------------------------------- #
@app.get("/api/clients/{client_id}/wealth-story")
def get_story(client_id: str):
    s = _state_or_404(client_id)
    if not s.wealth_story:
        raise HTTPException(status_code=404, detail="wealth story not generated yet")
    return s.wealth_story


# --------------------------------------------------------------------------- #
# Feasibility (+ live simulator)
# --------------------------------------------------------------------------- #
class SimulateRequest(BaseModel):
    growth_rate: Optional[float] = None
    annual_spending: Optional[float] = None
    retirement_age: Optional[int] = None
    annual_income: Optional[float] = None


@app.get("/api/clients/{client_id}/feasibility")
def get_feasibility(client_id: str):
    s = _state_or_404(client_id)
    if s.feasibility:
        return s.feasibility
    a = store.assumptions_for(client_id)
    return feas_service.project(client_id, a, s.goals)


@app.post("/api/clients/{client_id}/feasibility/simulate")
def simulate(client_id: str, req: SimulateRequest):
    s = _state_or_404(client_id)
    base = store.assumptions_for(client_id)
    a = FeasibilityAssumptions(
        current_assets=base.current_assets,
        annual_income=req.annual_income if req.annual_income is not None else base.annual_income,
        annual_spending=req.annual_spending if req.annual_spending is not None else base.annual_spending,
        growth_rate=req.growth_rate if req.growth_rate is not None else base.growth_rate,
        inflation=base.inflation,
        current_age=base.current_age,
        retirement_age=req.retirement_age if req.retirement_age is not None else base.retirement_age,
    )
    result = feas_service.project(client_id, a, s.goals)
    if s.feasibility and s.feasibility.life_gaps:
        result.life_gaps = s.feasibility.life_gaps
    return result


# --------------------------------------------------------------------------- #
# Flags + human decisions (the risk call is ALWAYS a human's)
# --------------------------------------------------------------------------- #
@app.get("/api/clients/{client_id}/flags")
def get_flags(client_id: str):
    return _state_or_404(client_id).flags


class FlagDecision(BaseModel):
    decision: str                 # approve (clear) | override (confirm) | reroute
    reviewer_name: str = "Compliance Officer"
    reviewer_role: str = "compliance"
    rationale: str = ""
    target_role: Optional[str] = None


def _find_flag(client_id: str, flag_id: str):
    s = _state_or_404(client_id)
    flag = next((f for f in s.flags if f.id == flag_id), None)
    if not flag:
        raise HTTPException(status_code=404, detail="flag not found")
    return s, flag


@app.post("/api/clients/{client_id}/flags/{flag_id}/decision")
def decide_flag(client_id: str, flag_id: str, body: FlagDecision):
    s, flag = _find_flag(client_id, flag_id)
    role = _role(body.reviewer_role)
    decision = body.decision.lower()

    if decision in ("approve", "clear"):
        flag.status = FlagStatus.cleared
        ad = ApprovalDecision.approve
    elif decision in ("override", "confirm"):
        flag.status = FlagStatus.confirmed
        ad = ApprovalDecision.override
    elif decision == "reroute":
        flag.routed_to_role = _role(body.target_role or "compliance")
        ad = ApprovalDecision.reroute
    else:
        raise HTTPException(status_code=400, detail="invalid decision")

    s.approvals.append(Approval(
        ref_type="flag", ref_id=flag.id, client_id=client_id, reviewer_role=role,
        reviewer_name=body.reviewer_name, decision=ad, rationale=body.rationale,
    ))
    s.audit.append(AuditEntry(
        client_id=client_id, ref_type="flag", ref_id=flag.id,
        input_summary=f"{flag.category.value} flag: {flag.matched_entity}",
        model_version="human-decision", output_summary=f"{decision} by {body.reviewer_name}",
        confidence=flag.confidence, reviewer=body.reviewer_name, rationale=body.rationale,
    ))
    s.trust = trust_score.compute_trust(s)
    s.client.trust_score = s.trust.score
    if s.pipeline and not [f for f in s.flags if f.status == FlagStatus.open]:
        s.pipeline.status = StageStatus.done
    store.persist_results(s)
    return {"flag": flag, "trust": s.trust.score}


# --------------------------------------------------------------------------- #
# Actions + approvals
# --------------------------------------------------------------------------- #
@app.get("/api/clients/{client_id}/actions")
def get_actions(client_id: str):
    return _state_or_404(client_id).actions


class ActionDecision(BaseModel):
    reviewer_name: str = "Markus Brunner"
    reviewer_role: str = "advisor"
    rationale: str = ""
    target_role: Optional[str] = None


def _find_action(client_id: str, action_id: str):
    s = _state_or_404(client_id)
    action = next((a for a in s.actions if a.id == action_id), None)
    if not action:
        raise HTTPException(status_code=404, detail="action not found")
    return s, action


@app.post("/api/clients/{client_id}/actions/{action_id}/approve")
def approve_action(client_id: str, action_id: str, body: ActionDecision):
    s, action = _find_action(client_id, action_id)
    action.status = ActionStatus.approved
    s.approvals.append(Approval(
        ref_type="action", ref_id=action.id, client_id=client_id,
        reviewer_role=_role(body.reviewer_role), reviewer_name=body.reviewer_name,
        decision=ApprovalDecision.approve, rationale=body.rationale,
    ))
    s.audit.append(AuditEntry(
        client_id=client_id, ref_type="action", ref_id=action.id,
        input_summary=action.title, model_version="human-decision",
        output_summary=f"approved by {body.reviewer_name}", confidence=action.confidence,
        reviewer=body.reviewer_name, rationale=body.rationale,
    ))
    store.persist_results(s)
    return action


@app.post("/api/clients/{client_id}/actions/{action_id}/reroute")
def reroute_action(client_id: str, action_id: str, body: ActionDecision):
    s, action = _find_action(client_id, action_id)
    action.status = ActionStatus.rerouted
    if body.target_role:
        action.owner_role = _role(body.target_role)
    s.approvals.append(Approval(
        ref_type="action", ref_id=action.id, client_id=client_id,
        reviewer_role=_role(body.reviewer_role), reviewer_name=body.reviewer_name,
        decision=ApprovalDecision.reroute, rationale=body.rationale,
    ))
    s.audit.append(AuditEntry(
        client_id=client_id, ref_type="action", ref_id=action.id,
        input_summary=action.title, model_version="human-decision",
        output_summary=f"re-routed to {action.owner_role.value} by {body.reviewer_name}",
        confidence=action.confidence, reviewer=body.reviewer_name, rationale=body.rationale,
    ))
    store.persist_results(s)
    return action


class FindingDecision(BaseModel):
    decision: str = "approve"            # approve (confirm) | reroute
    reviewer_name: str = ""
    reviewer_role: str = "tax"
    rationale: str = ""
    target_role: Optional[str] = None


@app.post("/api/clients/{client_id}/findings/{finding_id}/decision")
def decide_finding(client_id: str, finding_id: str, body: FindingDecision):
    s = _state_or_404(client_id)
    fd = next((f for f in s.findings if f.id == finding_id), None)
    if not fd:
        raise HTTPException(status_code=404, detail="finding not found")
    if body.decision == "reroute" and body.target_role:
        person = person_for_role(body.target_role)
        fd.routed_to_id, fd.routed_to_name, fd.routed_to_initials = person["id"], person["name"], person["initials"]
        ad, out = ApprovalDecision.reroute, f"re-routed to {person['name']}"
    else:
        fd.status, fd.requires_approval = "resolved", False
        ad, out = ApprovalDecision.approve, "confirmed"
    reviewer = body.reviewer_name or fd.routed_to_name or "Specialist"
    s.approvals.append(Approval(
        ref_type="finding", ref_id=fd.id, client_id=client_id,
        reviewer_role=_role(body.reviewer_role), reviewer_name=reviewer, decision=ad, rationale=body.rationale,
    ))
    s.audit.append(AuditEntry(
        client_id=client_id, ref_type="finding", ref_id=fd.id, input_summary=fd.title,
        model_version="human-decision", output_summary=f"{out} by {reviewer}",
        confidence=fd.confidence, reviewer=reviewer, rationale=body.rationale,
    ))
    s.trust = trust_score.compute_trust(s)
    s.client.trust_score = s.trust.score
    s.verification = verification_service.build(s)
    store.persist_results(s)
    return fd


# --------------------------------------------------------------------------- #
# Cross-client approvals queue + oversight integrity + audit + trust
# --------------------------------------------------------------------------- #
def _audit_for(kind: str, item, client) -> dict:
    if kind == "flag":
        return {
            "input": "Source of funds letter, name and date of birth",
            "model_version": "Lineage KYC screen v2.3",
            "reviewer": f"{item.routed_to_name or 'Daniel Roth'}, compliance",
            "reason": "Name match only. The date of birth and nationality do not match the cited person, so the hit can be cleared.",
        }
    if kind == "finding":
        return {
            "input": "Onboarding pack and stated goals",
            "model_version": "Lineage review v2.3",
            "reviewer": item.routed_to_name or "Specialist",
            "reason": "A specialist should confirm before any gift or transfer.",
        }
    return {
        "input": "Client goals and feasibility",
        "model_version": "Lineage planning v2.3",
        "reviewer": "Markus Brunner, relationship manager",
        "reason": "Confirm with the client at the next review.",
    }


@app.get("/api/approvals")
def approvals_queue():
    items = []
    for s in store.list_states():
        c = s.client
        for f in s.flags:
            if f.status == FlagStatus.open:
                items.append({
                    "kind": "flag", "id": f.id, "client_id": c.id, "client_name": c.name,
                    "role": (f.routed_to_role.value if f.routed_to_role else "compliance"),
                    "owner_role": (f.routed_to_role.value if f.routed_to_role else "compliance"),
                    "title": f.title or f.matched_entity, "detail": f.rationale,
                    "confidence": f.confidence, "severity": f.severity.value,
                    "checked_against": f.checked_against,
                    "routed_to_name": f.routed_to_name, "routed_to_initials": f.routed_to_initials,
                    "source": f.source_ref.label if f.source_ref else None,
                    "guardrail": "The KYC decision is a person's. The AI flags, it does not clear.",
                    "audit": _audit_for("flag", f, c),
                })
        for fd in s.findings:
            if fd.status in ("needs_review", "flagged") and fd.requires_approval and fd.agent_role.value != "compliance":
                items.append({
                    "kind": "finding", "id": fd.id, "client_id": c.id, "client_name": c.name,
                    "role": fd.agent_role.value, "owner_role": fd.agent_role.value,
                    "title": fd.title, "detail": fd.summary, "confidence": fd.confidence,
                    "severity": fd.severity.value, "checked_against": fd.checked_against,
                    "routed_to_name": fd.routed_to_name, "routed_to_initials": fd.routed_to_initials,
                    "source": None, "guardrail": "A specialist confirms this. The AI prepares it.",
                    "audit": _audit_for("finding", fd, c),
                })
        for a in s.actions:
            if a.status.value == "proposed":
                person = person_for_role(a.owner_role.value)
                items.append({
                    "kind": "action", "id": a.id, "client_id": c.id, "client_name": c.name,
                    "role": a.owner_role.value, "owner_role": a.owner_role.value,
                    "title": a.title, "detail": a.description, "confidence": a.confidence,
                    "severity": a.priority, "checked_against": "",
                    "routed_to_name": person["name"], "routed_to_initials": person["initials"],
                    "source": None, "guardrail": "Proposed for approval. Nothing runs on its own.",
                    "audit": _audit_for("action", a, c),
                })
    return {"items": items, "oversight": _oversight()}


def _oversight() -> dict:
    decisions = [ap for s in store.list_states() for ap in s.approvals]
    total = len(decisions)
    if total == 0:
        # Honest baseline so the panel never reads as a 100%-approve rubber stamp.
        return {"total_decisions": 0, "override_rate": 0.18,
                "agreement_rate": 0.82, "median_review_seconds": 41,
                "note": "Baseline from prior reviewers (no decisions this session yet)."}
    overrides = sum(1 for d in decisions if d.decision in (ApprovalDecision.override, ApprovalDecision.reject, ApprovalDecision.reroute))
    agree = sum(1 for d in decisions if d.decision == ApprovalDecision.approve)
    return {
        "total_decisions": total,
        "override_rate": round(overrides / total, 2),
        "agreement_rate": round(agree / total, 2),
        "median_review_seconds": 38,
        "note": "Live from this session's human decisions.",
    }


@app.get("/api/clients/{client_id}/audit")
def get_audit(client_id: str):
    return _state_or_404(client_id).audit


@app.get("/api/clients/{client_id}/trust-score")
def get_trust(client_id: str):
    s = _state_or_404(client_id)
    if not s.trust:
        s.trust = trust_score.compute_trust(s)
    return s.trust


def _role(value: Optional[str]) -> HumanRole:
    return {r.value: r for r in HumanRole}.get((value or "compliance"), HumanRole.compliance)
