"""Goal agent — runs the deterministic feasibility projection, then has the LLM
interpret it: a plain verdict + the real (often non-financial) life gaps.
"""
from __future__ import annotations

from agents.base import AgentResult, PipelineContext, load_prompt
from agents.schemas import GoalAnalysisOut
from anthropic_client import agenerate
from models.client import AgentType, Feasibility
from services.feasibility import project

AGENT_TYPE = AgentType.goal


def _canned(ctx: PipelineContext, feas: Feasibility) -> GoalAnalysisOut:
    low = sorted(ctx.dna_wheel.dimensions, key=lambda d: d.score)
    gaps = [
        f"{d.name} scores {d.score} out of 10. The money is there, the time and the headspace are not yet."
        for d in low if d.score <= 5
    ][:3]
    if any(not o.feasible for o in feas.goal_outcomes):
        gaps.insert(0, "One goal needs a phased drawdown or a later date to close the gap.")
    if not gaps:
        gaps = ["No real gaps. The plan is well balanced."]
    return GoalAnalysisOut(verdict=feas.verdict, life_gaps=gaps)


async def run(ctx: PipelineContext) -> AgentResult:
    feas = project(ctx.client.id, ctx.assumptions, ctx.goals)

    system = load_prompt("goal")
    outcomes = "\n".join(
        f"- {o.goal_title}: " + ("feasible" if o.feasible else f"GAP of ~CHF {int(o.gap_amount):,}")
        for o in feas.goal_outcomes
    )
    ending = feas.projection[-1].assets if feas.projection else ctx.assumptions.current_assets
    user = (
        f"{ctx.client_block()}\n\n"
        f"=== COMPUTED FEASIBILITY (do not recompute) ===\n"
        f"Ending reserve at age 95: ~CHF {int(ending):,}\n"
        f"Goal outcomes:\n{outcomes}\n\n"
        f"Interpret this. Give a plain verdict and 2-4 concrete life gaps (look beyond money)."
    )
    out, mode = await agenerate(
        system=system, user=user, output_model=GoalAnalysisOut,
        canned=lambda: _canned(ctx, feas), tier="synthesis", max_tokens=900,
    )
    feas.verdict = out.verdict
    feas.life_gaps = out.life_gaps

    status = {o.goal_id: ("funded" if o.feasible else "at_risk") for o in feas.goal_outcomes}
    goals = []
    for g in ctx.goals:
        g2 = g.model_copy()
        g2.funded_status = status.get(g.id, g2.funded_status)
        goals.append(g2)

    return AgentResult(
        summary="Life-plan feasibility computed", mode=mode, feasibility=feas, goals=goals,
    )
