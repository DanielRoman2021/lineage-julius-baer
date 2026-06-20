"""Shared logic for the four specialist review agents (advisor, wealth planner,
tax, compliance). Each produces human-approvable findings from the same context,
with a status the verification flow reads: pass, needs_review, or flagged.
"""
from __future__ import annotations

from agents.base import AgentResult, PipelineContext, load_prompt
from agents.schemas import FindingOut, ReviewOut
from anthropic_client import agenerate
from models.client import Finding, HumanRole, Severity, SourceCitation
from services.people import person_for_role

_SEV = {s.value: s for s in Severity}

# Default status and the watchlist or topic each role checks against.
_DEFAULT_STATUS = {
    HumanRole.advisor: "pass",
    HumanRole.wealth_planner: "pass",
    HumanRole.tax: "needs_review",
    HumanRole.compliance: "flagged",
}
_CHECKED = {
    HumanRole.advisor: "Suitability and risk profile",
    HumanRole.wealth_planner: "Goal and liquidity coherence",
    HumanRole.tax: "Swiss and UK tax",
    HumanRole.compliance: "Adverse media and sanctions",
}


def _canned(ctx: PipelineContext, role: HumanRole) -> ReviewOut:
    c = ctx.client
    if role == HumanRole.advisor:
        if c.id == "viktor_sokolenko":
            items = [FindingOut(
                title="Suitability gap: illiquid single-sector concentration",
                summary="About 70 percent sits in one energy and metals group held through an opaque "
                        "offshore chain. That does not fit a first-time onboarding profile.",
                draft_note="For the advisor. Review suitability before any mandate; the concentration "
                           "and illiquidity need a documented rationale.",
                severity="medium", requires_approval=True, status="needs_review",
            )]
        else:
            items = [FindingOut(
                title="Preferences are captured",
                summary="She wants capital kept safe first, then legacy. Lead with that, not with upside.",
                draft_note="Onboarding after a liquidity event. Keep proposals calm and legacy-led for now.",
                severity="low", requires_approval=False, status="pass",
            )]
    elif role == HumanRole.wealth_planner:
        if c.id == "viktor_sokolenko":
            items = [FindingOut(
                title="Opaque source of wealth and offshore nominee structure",
                summary="The wealth runs through a Cyprus and BVI chain with nominee shareholders, "
                        "so the ultimate beneficial owner is not visible and the source of wealth "
                        "is not yet evidenced.",
                draft_note="For the wealth planner. Establish the beneficial owner and a path to a "
                           "transparent structure before onboarding completes.",
                severity="high", requires_approval=True, status="needs_review",
            )]
        else:
            items = [FindingOut(
                title="Source of wealth is clear",
                summary="The company sale explains the wealth. There is room for a phased sell-down of the single stock.",
                draft_note="Source of wealth supports onboarding. Next, plan a phased sell-down and the foundation funding.",
                severity="low", requires_approval=False, status="pass",
            )]
    elif role == HumanRole.tax:
        if c.id in ("sarah_keller", "eleanor_ashford", "viktor_sokolenko"):
            items = [FindingOut(
                title="Cross border Swiss and UK exposure",
                summary="Her eldest may study in the UK, which changes how gifted assets are taxed. A specialist should confirm.",
                draft_note="For the tax specialist. Confirm the Swiss and UK treatment before any gift or transfer.",
                severity="medium", requires_approval=True, status="needs_review",
            )]
        else:
            items = [FindingOut(
                title="Tax position looks straightforward",
                summary="One residence, no obvious cross border issue. No specialist needed yet.",
                draft_note="No action needed for now.",
                severity="low", requires_approval=False, status="pass",
            )]
    else:  # compliance
        if ctx.flags:
            f = ctx.flags[0]
            items = [FindingOut(
                title=f.title or "Adverse media, possible name match",
                summary=f.rationale,
                draft_note="Recommend clearing once the date of birth and nationality are confirmed. Log the decision.",
                severity=f.severity.value, requires_approval=True, status="flagged",
            )]
        else:
            items = [FindingOut(
                title="No compliance hits",
                summary="Screening came back clean.",
                draft_note="No action needed.", severity="low", requires_approval=False, status="pass",
            )]
    return ReviewOut(findings=items)


async def run_reviewer(ctx: PipelineContext, role: HumanRole, prompt_name: str) -> AgentResult:
    system = load_prompt(prompt_name)
    extra = ""
    if role == HumanRole.compliance and ctx.flags:
        extra = "\n\nItems routed to you:\n" + "\n".join(
            f"- {f.title}: {f.rationale} (confidence {f.confidence:.2f})" for f in ctx.flags
        )
    user = (
        f"{ctx.client_block()}\n\nDocuments:\n{ctx.documents_digest()}{extra}\n\n"
        f"Write your findings."
    )
    out, mode = await agenerate(
        system=system, user=user, output_model=ReviewOut,
        canned=lambda: _canned(ctx, role), tier="specialist", max_tokens=1500,
    )

    findings: list[Finding] = []
    for f in out.findings:
        status = f.status if f.status in ("pass", "needs_review", "flagged") else _DEFAULT_STATUS.get(role, "pass")
        routed = person_for_role(role.value) if status in ("needs_review", "flagged") else {"id": None, "name": "", "initials": ""}
        findings.append(Finding(
            client_id=ctx.client.id, agent_role=role, title=f.title, summary=f.summary,
            draft_note=f.draft_note, severity=_SEV.get(f.severity, Severity.low), status=status,
            checked_against=_CHECKED.get(role, ""), requires_approval=bool(f.requires_approval),
            source_refs=[SourceCitation(label="Onboarding pack")],
            routed_to_id=routed["id"], routed_to_name=routed["name"], routed_to_initials=routed["initials"],
        ))
    label = role.value.replace("_", " ")
    return AgentResult(summary=f"{len(findings)} {label} finding(s)", mode=mode, findings=findings)
