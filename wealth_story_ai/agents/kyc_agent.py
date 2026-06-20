"""KYC agent — reasons over mock watchlist hits and emits structured risk flags.

The external lookups (PEP / sanctions / adverse-media) are mocked upstream; this
agent does the *intelligence*: true-match vs false-positive, severity, rationale.
"""
from __future__ import annotations

from agents.base import AgentResult, PipelineContext, load_prompt
from agents.schemas import KYCItemOut, KYCOut
from anthropic_client import agenerate
from models.client import (
    AgentType,
    HumanRole,
    RiskCategory,
    RiskFlag,
    Severity,
    SourceCitation,
)
from services.people import person_for_role

AGENT_TYPE = AgentType.kyc

_SEV = {s.value: s for s in Severity}
_CAT = {c.value: c for c in RiskCategory}
_ROLE = {r.value: r for r in HumanRole}

_TITLE = {
    "adverse_media": "Adverse media, possible name match",
    "pep": "PEP screening match",
    "sanctions": "Sanctions list match",
    "criminal": "Criminal record signal",
    "social": "Social signal",
}
_CHECKED = {
    "adverse_media": "Adverse media and sanctions",
    "pep": "PEP lists",
    "sanctions": "Sanctions lists",
    "criminal": "Criminal records",
    "social": "Social signals",
}


def _role_for(category: str, suggested: str) -> HumanRole:
    if category in ("criminal", "pep", "sanctions", "adverse_media"):
        return HumanRole.compliance
    return _ROLE.get(suggested, HumanRole.compliance)


def _canned(ctx: PipelineContext) -> KYCOut:
    """Build believable flags directly from the mock screening hits (no LLM)."""
    items: list[KYCItemOut] = []
    seen: set[tuple[str, str]] = set()

    def add(cat: str, sev: str, entity: str, rationale: str, conf: float, role: str = "compliance") -> None:
        key = (cat, entity)
        if key in seen:
            return
        seen.add(key)
        items.append(KYCItemOut(
            category=cat, severity=sev, matched_entity=entity, rationale=rationale,
            confidence=conf, is_true_match=False, recommended_role=role,
        ))

    for hit in ctx.screening_identity:
        src = hit["source"]
        if src == "social":
            continue  # benign, not a risk flag
        entry = hit["entry"]
        name = entry.get("name", "")
        if src == "pep":
            add("pep", "medium", f"{name}, {entry.get('position', 'PEP')}",
                "Name match to a politically exposed person with a different profile. "
                "Confirm the date of birth before treating it as a real match.", 0.5)
        elif src == "sanctions":
            add("sanctions", "critical", name,
                "Possible sanctions-list match. Confirm before onboarding.", 0.6)
        elif src == "adverse_media":
            add("adverse_media", "medium", entry.get("entity", name),
                entry.get("summary", "Adverse-media name match. A human needs to confirm "
                "the date of birth and nationality, then it can be cleared."), 0.42)
    for _doc_id, hits in ctx.screening_text.items():
        for hit in hits:
            entry = hit["entry"]
            sev = "high" if entry.get("sentiment") == "high_negative" else "medium"
            add(entry.get("category", "adverse_media"), sev,
                entry.get("entity", entry.get("name", "")),
                entry.get("summary", "Adverse-media mention found in a document."), 0.45)
    return KYCOut(items=items)


async def run(ctx: PipelineContext) -> AgentResult:
    if not (ctx.screening_identity or ctx.screening_text):
        return AgentResult(summary="No watchlist hits — clean screen.", mode="demo")

    system = load_prompt("kyc")
    hits_text = _format_hits(ctx)
    user = (
        f"{ctx.client_block()}\n\n"
        f"=== RAW SCREENING HITS (already looked up; reason over them) ===\n{hits_text}\n\n"
        f"Return structured risk flags. Omit benign social/press signals."
    )
    out, mode = await agenerate(
        system=system, user=user, output_model=KYCOut, canned=lambda: _canned(ctx),
        tier="specialist", max_tokens=1600,
    )

    flagged_doc = next((d for d in ctx.documents if d.flagged), None)
    flags: list[RiskFlag] = []
    for it in out.items:
        cat = _CAT.get(it.category, RiskCategory.adverse_media)
        role = _role_for(it.category, it.recommended_role)
        person = person_for_role(role.value)
        flags.append(RiskFlag(
            client_id=ctx.client.id,
            document_id=flagged_doc.id if flagged_doc else None,
            category=cat,
            severity=_SEV.get(it.severity, Severity.medium),
            title=_TITLE.get(it.category, "Risk flag"),
            matched_entity=it.matched_entity,
            rationale=it.rationale,
            confidence=max(0.0, min(1.0, it.confidence)),
            checked_against=_CHECKED.get(it.category, "Watchlists"),
            source_ref=SourceCitation(
                label=flagged_doc.filename if flagged_doc else "Identity screening",
                doc_id=flagged_doc.id if flagged_doc else None,
            ),
            routed_to_role=role,
            routed_to_id=person["id"],
            routed_to_name=person["name"],
            routed_to_initials=person["initials"],
        ))

    summary = (
        f"{len(flags)} flag(s) raised — {flags[0].category.value.upper()} routed for human review"
        if flags else "No risk flags."
    )
    return AgentResult(summary=summary, mode=mode, flags=flags)


def _format_hits(ctx: PipelineContext) -> str:
    lines: list[str] = []
    for hit in ctx.screening_identity:
        e = hit["entry"]
        lines.append(
            f"- [{hit['source']}] match_score {hit['match_score']} | {e.get('name')} "
            f"| {e.get('position') or e.get('signal') or e.get('program', '')} "
            f"| {e.get('country', '')} | note: {e.get('note', '')}"
        )
    for doc_id, hits in ctx.screening_text.items():
        for hit in hits:
            e = hit["entry"]
            lines.append(
                f"- [{hit['source']} in document {doc_id}] {e.get('entity') or e.get('name')} "
                f"| {e.get('headline', '')} | sentiment {e.get('sentiment', '')} | {e.get('summary', '')}"
            )
    return "\n".join(lines) if lines else "(none)"
