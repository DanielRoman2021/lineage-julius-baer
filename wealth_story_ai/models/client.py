"""Lineage data model.

All types are Pydantic v2. Field names are snake_case end-to-end (the Next.js
frontend consumes the same names) to avoid serialization drift. Timestamps are
ISO-8601 strings produced by ``now_iso()`` so artifacts serialize cleanly.
"""
from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Optional
from uuid import uuid4

from pydantic import BaseModel, Field


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id(prefix: str = "id") -> str:
    return f"{prefix}_{uuid4().hex[:10]}"


# The 10 Wheel-of-Life dimensions (exact order, scored 1-10).
WHEEL_DIMENSIONS: list[str] = [
    "Legacy", "Impact", "Family", "Security", "Health",
    "Freedom", "Growth", "Lifestyle", "Wealth", "Business",
]


# --------------------------------------------------------------------------- #
# Enums
# --------------------------------------------------------------------------- #
class HumanRole(str, Enum):
    compliance = "compliance"        # Compliance Officer
    advisor = "advisor"              # Relationship Manager / Advisor
    wealth_planner = "wealth_planner"
    tax = "tax"                      # Tax Expert


class AgentType(str, Enum):
    parse = "parse"
    kyc = "kyc"
    compliance_router = "compliance_router"
    advisor = "advisor"
    wealth_planner = "wealth_planner"
    tax = "tax"
    compliance = "compliance"
    wealth_story = "wealth_story"
    goal = "goal"
    action = "action"


class StageStatus(str, Enum):
    queued = "queued"
    running = "running"
    done = "done"
    awaiting_approval = "awaiting_approval"
    approved = "approved"
    blocked = "blocked"
    error = "error"


class RiskCategory(str, Enum):
    criminal = "criminal"
    pep = "pep"
    sanctions = "sanctions"
    adverse_media = "adverse_media"
    social = "social"


class Severity(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class FlagStatus(str, Enum):
    open = "open"
    cleared = "cleared"        # human confirmed false-positive / immaterial
    confirmed = "confirmed"    # human confirmed true match


class GoalType(str, Enum):
    education = "education"
    travel = "travel"
    property = "property"
    retirement = "retirement"
    philanthropy = "philanthropy"
    other = "other"


class ActionStatus(str, Enum):
    proposed = "proposed"
    approved = "approved"
    rejected = "rejected"
    rerouted = "rerouted"


class ApprovalDecision(str, Enum):
    approve = "approve"
    reject = "reject"
    reroute = "reroute"
    override = "override"


# --------------------------------------------------------------------------- #
# Documents & extraction
# --------------------------------------------------------------------------- #
class SourceCitation(BaseModel):
    label: str
    doc_id: Optional[str] = None
    page: Optional[int] = None
    quote: Optional[str] = None


class Document(BaseModel):
    id: str = Field(default_factory=lambda: new_id("doc"))
    client_id: str
    filename: str
    doc_type: str = "document"          # passport | proof_of_address | source_of_wealth | asset_summary | news
    uploaded_at: str = Field(default_factory=now_iso)
    pages: int = 1
    extracted_text: str = ""
    extracted_fields: dict[str, Any] = Field(default_factory=dict)
    parse_status: str = "pending"       # pending | parsed | error
    flagged: bool = False               # convenience: does this doc carry the demo flag


# --------------------------------------------------------------------------- #
# Risk, routing, findings
# --------------------------------------------------------------------------- #
class RiskFlag(BaseModel):
    id: str = Field(default_factory=lambda: new_id("flag"))
    client_id: str
    document_id: Optional[str] = None
    category: RiskCategory
    severity: Severity
    title: str = ""                       # short headline, e.g. "Adverse media, possible name match"
    matched_entity: str
    rationale: str
    confidence: float = 0.5
    checked_against: str = ""             # e.g. "Adverse media and sanctions"
    source_ref: Optional[SourceCitation] = None
    status: FlagStatus = FlagStatus.open
    routed_to_role: Optional[HumanRole] = None
    routed_to_id: Optional[str] = None
    routed_to_name: str = ""
    routed_to_initials: str = ""


class RoutingDecision(BaseModel):
    id: str = Field(default_factory=lambda: new_id("route"))
    item_id: str                        # flag id or finding id
    item_type: str = "flag"             # flag | finding
    target_role: HumanRole
    criterion: str                      # the deterministic rule that fired
    explanation: str                    # LLM plain-English why


class Finding(BaseModel):
    id: str = Field(default_factory=lambda: new_id("find"))
    client_id: str
    agent_role: HumanRole
    title: str
    summary: str
    draft_note: str = ""
    severity: Severity = Severity.low
    status: str = "pass"                  # pass | needs_review | flagged
    checked_against: str = ""
    confidence: float = 0.8
    source_refs: list[SourceCitation] = Field(default_factory=list)
    requires_approval: bool = False
    routed_to_id: Optional[str] = None
    routed_to_name: str = ""
    routed_to_initials: str = ""


# --------------------------------------------------------------------------- #
# Wealth story
# --------------------------------------------------------------------------- #
class Milestone(BaseModel):
    year: int
    title: str
    description: str


class WealthStory(BaseModel):
    client_id: str
    headline: str = ""
    narrative_markdown: str = ""
    milestones: list[Milestone] = Field(default_factory=list)
    sources: list[SourceCitation] = Field(default_factory=list)


# --------------------------------------------------------------------------- #
# Goals & feasibility
# --------------------------------------------------------------------------- #
class Goal(BaseModel):
    id: str = Field(default_factory=lambda: new_id("goal"))
    client_id: str
    title: str
    goal_type: GoalType = GoalType.other
    target_year: Optional[int] = None
    estimated_cost: Optional[float] = None
    funded_status: str = "unknown"      # funded | partial | at_risk | unknown
    notes: str = ""


class GoalOutcome(BaseModel):
    goal_id: str
    goal_title: str
    feasible: bool
    gap_amount: float = 0.0
    suggestion: str = ""


class ProjectionPoint(BaseModel):
    year: int
    age: int
    assets: float
    liabilities: float = 0.0

    @property
    def net(self) -> float:
        return self.assets - self.liabilities


class FeasibilityAssumptions(BaseModel):
    current_assets: float
    annual_income: float
    annual_spending: float
    growth_rate: float = 0.045          # nominal portfolio growth
    inflation: float = 0.02
    current_age: int = 52
    retirement_age: int = 65


class Feasibility(BaseModel):
    client_id: str
    assumptions: FeasibilityAssumptions
    projection: list[ProjectionPoint] = Field(default_factory=list)
    goal_outcomes: list[GoalOutcome] = Field(default_factory=list)
    verdict: str = ""
    life_gaps: list[str] = Field(default_factory=list)


# --------------------------------------------------------------------------- #
# Wheel of life
# --------------------------------------------------------------------------- #
class WheelDimension(BaseModel):
    name: str
    score: int = Field(ge=1, le=10)
    note: str = ""


class WheelOfLife(BaseModel):
    client_id: str
    dimensions: list[WheelDimension] = Field(default_factory=list)
    updated_at: str = Field(default_factory=now_iso)


# --------------------------------------------------------------------------- #
# Actions, approvals, audit
# --------------------------------------------------------------------------- #
class ActionPoint(BaseModel):
    id: str = Field(default_factory=lambda: new_id("act"))
    client_id: str
    title: str
    description: str
    owner_role: HumanRole
    priority: str = "medium"            # low | medium | high
    status: ActionStatus = ActionStatus.proposed
    confidence: float = 0.8
    source_refs: list[SourceCitation] = Field(default_factory=list)


class Approval(BaseModel):
    id: str = Field(default_factory=lambda: new_id("apr"))
    ref_type: str                       # flag | action | finding
    ref_id: str
    client_id: str
    reviewer_role: HumanRole
    reviewer_name: str
    decision: ApprovalDecision
    rationale: str = ""
    timestamp: str = Field(default_factory=now_iso)


class AuditEntry(BaseModel):
    id: str = Field(default_factory=lambda: new_id("aud"))
    client_id: str
    ref_type: str
    ref_id: str
    input_summary: str
    model_version: str
    output_summary: str
    confidence: float
    reviewer: str = "system"
    timestamp: str = Field(default_factory=now_iso)
    rationale: str = ""


class TrustScoreComponents(BaseModel):
    kyc_completeness: int = 0
    data_freshness: int = 0
    engagement: int = 0
    risk_cleared: int = 0


class TrustScore(BaseModel):
    client_id: str
    score: int = 0                      # 0-100
    components: TrustScoreComponents = Field(default_factory=TrustScoreComponents)
    trend: str = "flat"                 # up | down | flat


# --------------------------------------------------------------------------- #
# Pipeline
# --------------------------------------------------------------------------- #
class PipelineStage(BaseModel):
    agent: AgentType
    label: str
    status: StageStatus = StageStatus.queued
    depends_on: list[AgentType] = Field(default_factory=list)
    summary: str = ""
    started_at: Optional[str] = None
    finished_at: Optional[str] = None


class PipelineRun(BaseModel):
    id: str = Field(default_factory=lambda: new_id("run"))
    client_id: str
    status: StageStatus = StageStatus.queued
    stages: list[PipelineStage] = Field(default_factory=list)
    started_at: Optional[str] = None
    finished_at: Optional[str] = None
    mode: str = "demo"                  # live | demo


# --------------------------------------------------------------------------- #
# Verification summary (the Agent Verification Flow screen)
# --------------------------------------------------------------------------- #
class SubCheck(BaseModel):
    key: str                            # criminal | pep | sanctions | adverse_media | social
    label: str
    status: str = "clear"               # clear | hit
    detail: str = ""
    optional: bool = False


class SpecialistReview(BaseModel):
    role: HumanRole
    agent_label: str                    # e.g. "Advisor agent"
    note: str = ""                      # one line shown on the node
    status: str = "pass"                # pass | needs_review | flagged
    routed_to_id: Optional[str] = None
    routed_to_name: str = ""
    routed_to_initials: str = ""
    action_label: str = ""              # e.g. "Tax, Swiss and UK structure"


class Verification(BaseModel):
    client_id: str
    subchecks: list[SubCheck] = Field(default_factory=list)
    specialists: list[SpecialistReview] = Field(default_factory=list)
    criteria_total: int = 0
    criteria_cleared: int = 0
    criteria_to_human: int = 0
    approver_id: str = "rm_markus"
    approver_name: str = "Markus Brunner"
    approver_initials: str = "MB"
    guardrail: str = "Human only, the AI cannot execute"


# --------------------------------------------------------------------------- #
# Client + aggregate state
# --------------------------------------------------------------------------- #
class Client(BaseModel):
    id: str
    name: str
    photo_url: Optional[str] = None
    headline: str = ""                  # short relationship one-liner
    domicile: str = ""
    marital_status: str = ""
    segment: str = "UHNW"
    net_worth: float = 0.0
    currency: str = "CHF"
    rm_id: str = "rm_markus"
    rm_name: str = "Markus Brunner"
    status: str = "onboarding"          # onboarding | active | review
    tags: list[str] = Field(default_factory=list)
    trust_score: int = 0


class Person(BaseModel):
    """A member of the bank's team — an RM or a specialist who owns approvals."""
    id: str
    name: str
    initials: str
    role: str = "advisor"          # rm | advisor | wealth_planner | tax | compliance | succession | philanthropy
    title: str = ""
    email: str = ""
    avatar_tone: str = "navy"      # navy | gold | emerald | terracotta


class Note(BaseModel):
    """Relationship-memory note / insight captured by a human or an agent."""
    id: str = Field(default_factory=lambda: new_id("note"))
    client_id: str
    author_id: str = "rm_markus"
    author_name: str = "Markus Brunner"
    text: str = ""
    kind: str = "note"             # note | insight | signal
    tags: list[str] = Field(default_factory=list)
    created_at: str = Field(default_factory=now_iso)


class PersonRef(BaseModel):
    name: str
    role: str = ""
    initials: str = ""
    reason: str = ""


class ConversationSignal(BaseModel):
    client_id: str
    pillar: str = ""
    direction: str = "up"
    old_score: Optional[int] = None
    new_score: Optional[int] = None
    talking_points: list[str] = Field(default_factory=list)
    future_topics: list[str] = Field(default_factory=list)
    people_to_involve: list[PersonRef] = Field(default_factory=list)
    summary: str = ""
    mode: str = "demo"
    created_at: str = Field(default_factory=now_iso)


class ClientState(BaseModel):
    """Everything the API knows about one client (the GET /clients/{id} payload)."""
    client: Client
    documents: list[Document] = Field(default_factory=list)
    notes: list[Note] = Field(default_factory=list)
    flags: list[RiskFlag] = Field(default_factory=list)
    routing: list[RoutingDecision] = Field(default_factory=list)
    findings: list[Finding] = Field(default_factory=list)
    wealth_story: Optional[WealthStory] = None
    goals: list[Goal] = Field(default_factory=list)
    feasibility: Optional[Feasibility] = None
    wheel: Optional[WheelOfLife] = None
    actions: list[ActionPoint] = Field(default_factory=list)
    approvals: list[Approval] = Field(default_factory=list)
    audit: list[AuditEntry] = Field(default_factory=list)
    trust: Optional[TrustScore] = None
    pipeline: Optional[PipelineRun] = None
    verification: Optional[Verification] = None
    latest_signal: Optional[ConversationSignal] = None
