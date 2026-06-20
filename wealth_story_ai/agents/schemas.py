"""Small Pydantic schemas the LLM fills (kept flat & constraint-light so the
structured-output JSON schema stays simple). Agents map these onto the richer
domain models in models/client.py.
"""
from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class KYCItemOut(BaseModel):
    category: str            # criminal | pep | sanctions | adverse_media | social
    severity: str            # low | medium | high | critical
    matched_entity: str
    rationale: str
    confidence: float        # 0-1
    is_true_match: bool
    recommended_role: str    # compliance | advisor | wealth_planner | tax


class KYCOut(BaseModel):
    items: list[KYCItemOut]


class RouterOut(BaseModel):
    explanations: list[str]  # one plain-English line per routed item, in order


class FindingOut(BaseModel):
    title: str
    summary: str
    draft_note: str
    severity: str            # low | medium | high | critical
    requires_approval: bool
    status: str = "pass"     # pass | needs_review | flagged


class ReviewOut(BaseModel):
    findings: list[FindingOut]


class LinkedEntityOut(BaseModel):
    name: str
    role: str = ""


class MilestoneOut(BaseModel):
    year: int
    date: str = ""                # "May 2024"
    title: str
    description: str
    amount: Optional[float] = None
    currency: str = "CHF"
    linked_entities: list[LinkedEntityOut] = Field(default_factory=list)
    evidence_label: str = ""      # the document the event is drawn from
    confidence: float = 0.6       # 0-1


class WealthStoryOut(BaseModel):
    headline: str
    narrative_markdown: str
    milestones: list[MilestoneOut]


# --- Ownership & control graph ---
class GraphNodeOut(BaseModel):
    id: str                       # stable slug, e.g. "marchetti_holding"
    type: str                     # person | company | trust | property | foundation
    label: str
    sublabel: str = ""


class GraphEdgeOut(BaseModel):
    source: str
    target: str
    relation: str                 # OWNS | CONTROLS | DIRECTOR OF | SETTLOR OF | BENEFICIARY OF


class WealthGraphOut(BaseModel):
    nodes: list[GraphNodeOut]
    edges: list[GraphEdgeOut]


class GoalAnalysisOut(BaseModel):
    verdict: str
    life_gaps: list[str]


class ActionItemOut(BaseModel):
    title: str
    description: str
    owner_role: str          # compliance | advisor | wealth_planner | tax
    priority: str            # low | medium | high


class ActionOut(BaseModel):
    actions: list[ActionItemOut]


class PersonRefOut(BaseModel):
    name: str
    role: str
    reason: str


class ConversationSignalOut(BaseModel):
    direction: str
    talking_points: list[str]
    future_topics: list[str]
    people_to_involve: list[PersonRefOut]
    summary: str
