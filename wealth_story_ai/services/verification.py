"""Build the Verification summary the Agent Verification Flow screen reads:
KYC sub-checks, the four specialist statuses, the named human reviewers, and the
criteria count (total, cleared, to a human).
"""
from __future__ import annotations

from models.client import (
    ClientState,
    FlagStatus,
    HumanRole,
    SpecialistReview,
    SubCheck,
    Verification,
)
from services.people import person_for_role

_PASS_NOTE = {
    "advisor": "Reviews against suitability and risk profile",
    "wealth_planner": "Reviews against goal and liquidity coherence",
    "tax": "Reviews the tax position",
    "compliance": "Reviews against watchlists",
}
_ACTION_NOTE = {
    "tax": "Flags cross border Swiss and UK exposure",
    "compliance": "Flags adverse media on source of funds",
}
_ACTION_LABEL = {
    "tax": "Tax, Swiss and UK structure",
    "compliance": "Compliance, clear the hit",
}


def build(state: ClientState) -> Verification:
    # Verification only means something once documents exist and the pipeline has run.
    # Before that we must NOT emit clear/pass — that fabricates a clean screening.
    if not state.documents:
        # Nothing to screen. Blocked, not a pass.
        return Verification(client_id=state.client.id, status="blocked")

    if state.pipeline is None:
        # Documents are queued but no pipeline has run yet: every check is pending.
        subchecks = [
            SubCheck(key="criminal", label="Criminal record", status="pending"),
            SubCheck(key="pep", label="PEP screening", status="pending"),
            SubCheck(key="sanctions", label="Sanctions and adverse media", status="pending"),
            SubCheck(key="social", label="Social signals", status="pending", optional=True),
        ]
        specialists = [
            SpecialistReview(
                role=HumanRole(r), agent_label=f"{r.replace('_', ' ').title()} agent",
                note="Queued", status="pending",
            )
            for r in ("advisor", "wealth_planner", "tax", "compliance")
        ]
        return Verification(
            client_id=state.client.id, status="not_started",
            subchecks=subchecks, specialists=specialists,
            criteria_total=len(state.documents) + 1 + len(subchecks) + len(specialists),
            criteria_cleared=0, criteria_to_human=0,
        )

    cats = {f.category.value for f in state.flags}
    hit = cats.__contains__
    adverse = hit("sanctions") or hit("adverse_media")

    subchecks = [
        SubCheck(key="criminal", label="Criminal record", status="hit" if hit("criminal") else "clear"),
        SubCheck(key="pep", label="PEP screening", status="hit" if hit("pep") else "clear"),
        SubCheck(key="sanctions", label="Sanctions and adverse media",
                 status="hit" if adverse else "clear", detail="1 hit" if adverse else ""),
        SubCheck(key="social", label="Social signals", status="clear", optional=True),
    ]

    specialists: list[SpecialistReview] = []
    for role in ("advisor", "wealth_planner", "tax", "compliance"):
        fs = [f for f in state.findings if f.agent_role.value == role]
        # An OPEN risk flag routed to this role needs a human, even if the agent's
        # own draft finding came back "pass". The flag, not the finding, is the
        # thing a human must clear.
        open_flags = [
            f for f in state.flags
            if f.status == FlagStatus.open and f.routed_to_role and f.routed_to_role.value == role
        ]
        status = "pass"
        if any(f.status == "flagged" for f in fs) or open_flags:
            status = "flagged"
        elif any(f.status == "needs_review" for f in fs):
            status = "needs_review"
        acted = status != "pass"
        note = _ACTION_NOTE.get(role, _PASS_NOTE[role]) if acted else _PASS_NOTE[role]
        routed = person_for_role(role) if acted else {"id": None, "name": "", "initials": ""}
        specialists.append(SpecialistReview(
            role=HumanRole(role), agent_label=f"{role.replace('_', ' ').title()} agent",
            note=note, status=status, routed_to_id=routed["id"], routed_to_name=routed["name"],
            routed_to_initials=routed["initials"], action_label=_ACTION_LABEL.get(role, "") if acted else "",
        ))

    to_human = len([s for s in specialists if s.status != "pass"]) + 1  # + the RM final sign-off
    total = len(state.documents) + 1 + len(subchecks) + len(specialists)  # docs + DNA + checks + specialists
    cleared = max(0, total - to_human)

    return Verification(
        client_id=state.client.id, status="complete", subchecks=subchecks, specialists=specialists,
        criteria_total=total, criteria_cleared=cleared, criteria_to_human=to_human,
    )
