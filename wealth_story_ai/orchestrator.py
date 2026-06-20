"""Pipeline orchestrator.

Stage A (sequential): parse -> KYC -> compliance router
Stage B (parallel):   advisor, wealth planner, tax, compliance, wealth story, goal
Stage C (sequential): action synthesis

``run_stream`` is an async generator of progress events (consumed by the SSE
endpoint); it mutates the ClientState in place so GET endpoints reflect live
state. ``run`` drains the generator for non-streaming callers.
"""
from __future__ import annotations

import asyncio
from typing import AsyncIterator

from agents import (
    action_agent,
    advisor_agent,
    compliance_agent,
    compliance_router,
    goal_agent,
    graph_agent,
    kyc_agent,
    tax_agent,
    wealth_planner_agent,
    wealth_story_agent,
)
from agents.base import AgentResult, PipelineContext
from config import settings
from models.client import (
    AgentType,
    AuditEntry,
    ClientState,
    FeasibilityAssumptions,
    FlagStatus,
    HumanRole,
    PipelineRun,
    PipelineStage,
    StageStatus,
    now_iso,
)
from services import screening, trust_score, verification

AGENTS = {
    AgentType.kyc: kyc_agent,
    AgentType.compliance_router: compliance_router,
    AgentType.advisor: advisor_agent,
    AgentType.wealth_planner: wealth_planner_agent,
    AgentType.tax: tax_agent,
    AgentType.compliance: compliance_agent,
    AgentType.wealth_story: wealth_story_agent,
    AgentType.goal: goal_agent,
    AgentType.graph: graph_agent,
    AgentType.action: action_agent,
}

STAGE_DEFS: list[tuple[AgentType, str, list[AgentType]]] = [
    (AgentType.parse, "Parse documents", []),
    (AgentType.kyc, "KYC screening", [AgentType.parse]),
    (AgentType.compliance_router, "Compliance router", [AgentType.kyc]),
    (AgentType.advisor, "Advisor review", [AgentType.compliance_router]),
    (AgentType.wealth_planner, "Wealth planner", [AgentType.compliance_router]),
    (AgentType.tax, "Tax review", [AgentType.compliance_router]),
    (AgentType.compliance, "Compliance review", [AgentType.compliance_router]),
    (AgentType.wealth_story, "Wealth story", [AgentType.compliance_router]),
    (AgentType.goal, "Goals & feasibility", [AgentType.compliance_router]),
    (AgentType.graph, "Ownership graph", [AgentType.compliance_router]),
    (AgentType.action, "Action points", [
        AgentType.advisor, AgentType.wealth_planner, AgentType.tax,
        AgentType.compliance, AgentType.wealth_story, AgentType.goal,
        AgentType.graph,
    ]),
]

_STAGE_B = [
    AgentType.advisor, AgentType.wealth_planner, AgentType.tax,
    AgentType.compliance, AgentType.wealth_story, AgentType.goal,
    AgentType.graph,
]
# Staggered delays (canned mode is instant; spread completion so the graph animates).
_STAGE_B_DELAY = {t: (0.0 if settings.live_mode else 0.4 + 0.35 * i) for i, t in enumerate(_STAGE_B)}
_STEP_DELAY = 0.0 if settings.live_mode else 0.5


def _avg_conf(result: AgentResult) -> float:
    confs = [f.confidence for f in result.flags] + [f.confidence for f in result.findings]
    return round(sum(confs) / len(confs), 2) if confs else 0.9


def _audit(state: ClientState, agent: AgentType, result: AgentResult) -> None:
    state.audit.append(AuditEntry(
        client_id=state.client.id, ref_type="agent", ref_id=agent.value,
        input_summary=f"{agent.value} over the onboarding pack",
        model_version=(f"live:{settings.anthropic_model_specialist}" if result.mode == "live" else "demo-canned"),
        output_summary=result.summary, confidence=_avg_conf(result), reviewer="system",
    ))


def _merge(ctx: PipelineContext, state: ClientState, agent: AgentType, result: AgentResult) -> None:
    if result.flags:
        ctx.flags.extend(result.flags); state.flags.extend(result.flags)
    if result.routing:
        ctx.routing.extend(result.routing); state.routing.extend(result.routing)
    if result.findings:
        ctx.findings.extend(result.findings); state.findings.extend(result.findings)
    if result.wealth_story:
        ctx.wealth_story = result.wealth_story; state.wealth_story = result.wealth_story
    if result.wealth_graph:
        ctx.wealth_graph = result.wealth_graph; state.wealth_graph = result.wealth_graph
    if result.goals:
        ctx.goals = result.goals; state.goals = result.goals
    if result.feasibility:
        ctx.feasibility = result.feasibility; state.feasibility = result.feasibility
    if result.actions:
        ctx.actions.extend(result.actions); state.actions.extend(result.actions)
    _audit(state, agent, result)


def _build_run(client_id: str) -> PipelineRun:
    stages = [PipelineStage(agent=a, label=label, depends_on=deps) for a, label, deps in STAGE_DEFS]
    return PipelineRun(
        id=f"run_{client_id}", client_id=client_id, status=StageStatus.running,
        stages=stages, started_at=now_iso(), mode=("live" if settings.live_mode else "demo"),
    )


def _stage(run: PipelineRun, agent: AgentType) -> PipelineStage:
    return next(s for s in run.stages if s.agent == agent)


def _reset(state: ClientState) -> None:
    state.flags, state.routing, state.findings = [], [], []
    state.actions, state.audit, state.approvals = [], [], []
    state.wealth_story, state.feasibility = None, None
    state.wealth_graph = None


async def run_stream(state: ClientState, assumptions: FeasibilityAssumptions) -> AsyncIterator[dict]:
    _reset(state)
    client = state.client
    ctx = PipelineContext(
        client=client, documents=state.documents,
        dna_wheel=state.wheel, goals=list(state.goals), assumptions=assumptions,
    )
    ctx.screening_identity = screening.screen_identity(client.name)
    ctx.social = screening.social_enrichment(client.name)
    text_hits = {d.id: screening.screen_text(d.extracted_text) for d in state.documents if d.extracted_text}
    ctx.screening_text = {k: v for k, v in text_hits.items() if v}

    run = _build_run(client.id)
    state.pipeline = run
    yield {"type": "run_started", "run_id": run.id, "mode": run.mode}

    # ---- parse (already done at seed) ----
    ps = _stage(run, AgentType.parse)
    ps.status, ps.summary = StageStatus.done, f"{len(state.documents)} documents parsed"
    ps.finished_at = now_iso()
    yield _stage_event(ps)

    # ---- Stage A: KYC then router ----
    for agent in (AgentType.kyc, AgentType.compliance_router):
        st = _stage(run, agent)
        st.status, st.started_at = StageStatus.running, now_iso()
        yield _stage_event(st)
        await asyncio.sleep(_STEP_DELAY)
        result = await AGENTS[agent].run(ctx)
        _merge(ctx, state, agent, result)
        st.status, st.summary, st.finished_at = StageStatus.done, result.summary, now_iso()
        yield _stage_event(st)

    # ---- Stage B: parallel fan-out, streamed as each completes ----
    for agent in _STAGE_B:
        st = _stage(run, agent)
        st.status, st.started_at = StageStatus.running, now_iso()
        yield _stage_event(st)

    async def _wrapped(agent: AgentType):
        await asyncio.sleep(_STAGE_B_DELAY[agent])
        return agent, await AGENTS[agent].run(ctx)

    tasks = [asyncio.create_task(_wrapped(a)) for a in _STAGE_B]
    for fut in asyncio.as_completed(tasks):
        agent, result = await fut
        _merge(ctx, state, agent, result)
        st = _stage(run, agent)
        st.summary, st.finished_at = result.summary, now_iso()
        # Compliance node awaits a human if it surfaced open flags.
        open_compliance = any(
            f.status == FlagStatus.open and f.routed_to_role == HumanRole.compliance
            for f in state.flags
        )
        st.status = (
            StageStatus.awaiting_approval
            if agent == AgentType.compliance and open_compliance else StageStatus.done
        )
        yield _stage_event(st)

    # ---- Stage C: action synthesis ----
    st = _stage(run, AgentType.action)
    st.status, st.started_at = StageStatus.running, now_iso()
    yield _stage_event(st)
    await asyncio.sleep(_STEP_DELAY)
    result = await AGENTS[AgentType.action].run(ctx)
    _merge(ctx, state, AgentType.action, result)
    st.status, st.summary, st.finished_at = StageStatus.done, result.summary, now_iso()
    yield _stage_event(st)

    # ---- finalise ----
    state.trust = trust_score.compute_trust(state)
    client.trust_score = state.trust.score
    state.verification = verification.build(state)
    open_flags = [f for f in state.flags if f.status == FlagStatus.open]
    run.status = StageStatus.awaiting_approval if open_flags else StageStatus.done
    run.finished_at = now_iso()
    yield {
        "type": "run_complete", "trust": state.trust.score,
        "open_flags": len(open_flags), "actions": len(state.actions),
    }


def _stage_event(st: PipelineStage) -> dict:
    return {
        "type": "stage", "agent": st.agent.value, "label": st.label,
        "status": st.status.value, "summary": st.summary,
    }


async def run(state: ClientState, assumptions: FeasibilityAssumptions) -> None:
    async for _ in run_stream(state, assumptions):
        pass
