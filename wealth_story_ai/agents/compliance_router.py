"""Compliance router — deterministic role mapping + an LLM plain-English reason.

The routing decision itself is rules-based (auditable); the LLM only writes the
human-readable explanation shown on the approval card.
"""
from __future__ import annotations

from agents.base import AgentResult, PipelineContext, load_prompt
from agents.schemas import RouterOut
from anthropic_client import agenerate
from models.client import AgentType, HumanRole, RiskFlag, RoutingDecision

AGENT_TYPE = AgentType.compliance_router

_CRITERION = {
    "pep": "PEP name match → four-eyes confirmation by Compliance before onboarding",
    "sanctions": "Sanctions-list match → mandatory Compliance review and clearance",
    "criminal": "Criminal-record signal → Compliance review",
    "adverse_media": "Adverse-media mention → Compliance materiality assessment",
    "social": "Social signal → advisor review",
}


def _criterion(flag: RiskFlag) -> str:
    base = _CRITERION.get(flag.category.value, "Risk flag → human review")
    if flag.confidence < 0.70:
        return base + f" (confidence {flag.confidence:.2f} below 0.70 → auto-escalated to a human)"
    return base


def _canned_explanations(flags: list[RiskFlag]) -> RouterOut:
    out = []
    for f in flags:
        out.append(
            f"Routed to {f.routed_to_role.value if f.routed_to_role else 'compliance'}: "
            f"{f.matched_entity}. {_criterion(f)}."
        )
    return RouterOut(explanations=out)


async def run(ctx: PipelineContext) -> AgentResult:
    flags = ctx.flags
    if not flags:
        return AgentResult(summary="Nothing to route — no open flags.", mode="demo")

    system = load_prompt("compliance_router")
    listing = "\n".join(
        f"{i+1}. [{f.category.value}] {f.matched_entity} → "
        f"{(f.routed_to_role.value if f.routed_to_role else 'compliance')} "
        f"({_criterion(f)})"
        for i, f in enumerate(flags)
    )
    user = f"Items to explain (one short sentence each, in order):\n{listing}"
    out, mode = await agenerate(
        system=system, user=user, output_model=RouterOut,
        canned=lambda: _canned_explanations(flags), tier="specialist", max_tokens=800,
    )

    explanations = out.explanations
    routing: list[RoutingDecision] = []
    for i, f in enumerate(flags):
        role = f.routed_to_role or HumanRole.compliance
        expl = explanations[i] if i < len(explanations) else _criterion(f)
        routing.append(RoutingDecision(
            item_id=f.id, item_type="flag", target_role=role,
            criterion=_criterion(f), explanation=expl,
        ))
    target = routing[0].target_role.value.replace("_", " ") if routing else "human"
    return AgentResult(
        summary=f"Routed {len(routing)} item(s) → {target}", mode=mode, routing=routing,
    )
