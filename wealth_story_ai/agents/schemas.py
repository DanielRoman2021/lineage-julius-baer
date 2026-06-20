"""Small Pydantic schemas the LLM fills (kept flat & constraint-light so the
structured-output JSON schema stays simple). Agents map these onto the richer
domain models in models/client.py.
"""
from __future__ import annotations

from pydantic import BaseModel


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


class MilestoneOut(BaseModel):
    year: int
    title: str
    description: str


class WealthStoryOut(BaseModel):
    headline: str
    narrative_markdown: str
    milestones: list[MilestoneOut]


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
