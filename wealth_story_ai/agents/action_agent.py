"""Action agent — synthesises everything into a short, prioritised, human-owned
list of next actions (each proposed for approval, never auto-executed).
"""
from __future__ import annotations

from agents.base import AgentResult, PipelineContext, load_prompt
from agents.schemas import ActionItemOut, ActionOut
from anthropic_client import agenerate
from models.client import ActionPoint, AgentType, HumanRole

AGENT_TYPE = AgentType.action

_ROLE = {r.value: r for r in HumanRole}
_PRIO = {"low", "medium", "high"}


def _canned(ctx: PipelineContext) -> ActionOut:
    items: list[ActionItemOut] = []
    retire = next((g for g in ctx.goals if "retire" in g.title.lower()), None)
    if retire:
        items.append(ActionItemOut(
            title="Confirm goal, retire at 55",
            description="Check the date and the number with her, then lock the plan.",
            owner_role="wealth_planner", priority="high",
        ))
    items.append(ActionItemOut(
        title="Send the wealth story for her sign off",
        description="Share the draft and capture any change she wants before it is final.",
        owner_role="advisor", priority="medium",
    ))
    phil = next((g for g in ctx.goals if g.goal_type.value == "philanthropy"), None)
    if phil:
        items.append(ActionItemOut(
            title="Prepare the foundation funding options",
            description="Lay out the choices for the next grant round so she can decide.",
            owner_role="wealth_planner", priority="medium",
        ))
    if ctx.feasibility and ctx.feasibility.life_gaps:
        items.append(ActionItemOut(
            title="Talk about time, not money",
            description="The numbers work. Raise health and freedom at the next review.",
            owner_role="advisor", priority="low",
        ))
    return ActionOut(actions=items)


async def run(ctx: PipelineContext) -> AgentResult:
    system = load_prompt("action")
    flags_text = "\n".join(
        f"- [{f.category.value}] {f.matched_entity} → "
        f"{(f.routed_to_role.value if f.routed_to_role else 'compliance')}"
        for f in ctx.flags
    ) or "(none)"
    findings_text = "\n".join(
        f"- [{f.agent_role.value}] {f.title}: {f.summary}" for f in ctx.findings
    ) or "(none)"
    gaps = "; ".join(ctx.feasibility.life_gaps) if ctx.feasibility else ""
    user = (
        f"{ctx.client_block()}\n\n"
        f"FLAGS:\n{flags_text}\n\nFINDINGS:\n{findings_text}\n\nLIFE GAPS: {gaps}\n\n"
        f"Produce 3-6 prioritised, human-owned action points (clear blockers first)."
    )
    out, mode = await agenerate(
        system=system, user=user, output_model=ActionOut,
        canned=lambda: _canned(ctx), tier="synthesis", max_tokens=1100,
    )
    actions = [
        ActionPoint(
            client_id=ctx.client.id, title=a.title, description=a.description,
            owner_role=_ROLE.get(a.owner_role, HumanRole.advisor),
            priority=a.priority if a.priority in _PRIO else "medium",
        )
        for a in out.actions
    ]
    return AgentResult(summary=f"{len(actions)} action point(s) proposed", mode=mode, actions=actions)
