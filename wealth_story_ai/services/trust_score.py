"""Relationship trust score.

A transparent 0-100 score from four components, each capped at 25:
  - kyc_completeness: documents parsed
  - data_freshness:   a pipeline has been run
  - engagement:       the client completed their values DNA + goals
  - risk_cleared:     no open (unresolved) risk flags
"""
from __future__ import annotations

from models.client import ClientState, TrustScore, TrustScoreComponents, FlagStatus


def compute_trust(state: ClientState) -> TrustScore:
    docs = state.documents
    parsed = [d for d in docs if d.parse_status == "parsed"]
    kyc = 25 if docs and len(parsed) == len(docs) else (
        round(25 * len(parsed) / len(docs)) if docs else 0
    )

    fresh = 25 if state.pipeline is not None else 0

    has_dna = bool(state.wheel and state.wheel.dimensions)
    has_goals = bool(state.goals)
    engagement = (13 if has_dna else 0) + (12 if has_goals else 0)

    open_flags = [f for f in state.flags if f.status == FlagStatus.open]
    if state.pipeline is None:
        risk = 0   # nothing screened yet — no credit until the pipeline actually runs
    elif not state.flags:
        risk = 18  # screened, nothing flagged
    elif open_flags:
        risk = max(0, 18 - 6 * len(open_flags))
    else:
        risk = 25  # all flags resolved by a human

    components = TrustScoreComponents(
        kyc_completeness=kyc,
        data_freshness=fresh,
        engagement=engagement,
        risk_cleared=risk,
    )
    total = kyc + fresh + engagement + risk
    prev = state.client.trust_score
    trend = "up" if total > prev else ("down" if total < prev else "flat")
    return TrustScore(client_id=state.client.id, score=total, components=components, trend=trend)
