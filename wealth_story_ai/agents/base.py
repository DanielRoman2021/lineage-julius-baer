"""Shared contract for all pipeline agents.

The orchestrator depends ONLY on this interface:
  - each agent module exposes ``AGENT_TYPE`` (an AgentType) and
    ``async def run(ctx: PipelineContext) -> AgentResult``.

Everything an agent produces is returned inside ``AgentResult``; the orchestrator
merges it into the shared context and the per-client store. Each agent is free
to define its own internal Anthropic output schema — only AgentResult is shared.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

from config import BASE_DIR
from models.client import (
    ActionPoint,
    Client,
    Document,
    Feasibility,
    FeasibilityAssumptions,
    Finding,
    Goal,
    RiskFlag,
    RoutingDecision,
    WealthStory,
    WheelOfLife,
)

PROMPTS_DIR = BASE_DIR / "prompts"


def load_prompt(name: str) -> str:
    """Load a system prompt from prompts/<name>.md (empty string if missing)."""
    path = PROMPTS_DIR / f"{name}.md"
    try:
        return path.read_text(encoding="utf-8")
    except Exception:
        return ""


@dataclass
class PipelineContext:
    """Everything agents read from / write to during one pipeline run."""

    client: Client
    documents: list[Document]
    dna_wheel: WheelOfLife
    goals: list[Goal]
    assumptions: FeasibilityAssumptions

    # Pre-computed mock screening (orchestrator fills before KYC runs).
    screening_identity: list[dict] = field(default_factory=list)        # identity hits
    screening_text: dict[str, list[dict]] = field(default_factory=dict)  # doc_id -> hits
    social: list[dict] = field(default_factory=list)

    # Stage outputs (filled as the pipeline progresses).
    flags: list[RiskFlag] = field(default_factory=list)
    routing: list[RoutingDecision] = field(default_factory=list)
    findings: list[Finding] = field(default_factory=list)
    wealth_story: Optional[WealthStory] = None
    feasibility: Optional[Feasibility] = None
    actions: list[ActionPoint] = field(default_factory=list)

    # ----- convenience accessors used by agents when building prompts ----- #
    def doc_by_type(self, doc_type: str) -> Optional[Document]:
        return next((d for d in self.documents if d.doc_type == doc_type), None)

    def documents_digest(self, max_chars: int = 1400) -> str:
        """A compact text digest of all parsed documents for prompts."""
        parts: list[str] = []
        for d in self.documents:
            body = (d.extracted_text or "").strip()
            if len(body) > max_chars:
                body = body[:max_chars] + " …"
            parts.append(f"### {d.filename} ({d.doc_type})\n{body or '[no text extracted]'}")
        return "\n\n".join(parts)

    def client_block(self) -> str:
        """A reusable plain-text description of the client for any agent prompt."""
        c = self.client
        dna = ", ".join(f"{d.name} {d.score}/10" for d in self.dna_wheel.dimensions)
        goals = "; ".join(
            f"{g.title}"
            + (f" (~CHF {int(g.estimated_cost):,}, {g.target_year})" if g.estimated_cost else "")
            for g in self.goals
        )
        return (
            f"Client: {c.name}\n"
            f"Domicile: {c.domicile}\n"
            f"Family: {c.marital_status}\n"
            f"Segment: {c.segment}; Net worth: {c.currency} {int(c.net_worth):,}\n"
            f"Relationship manager: {c.rm_name}\n"
            f"Values (Wheel of Life, 1-10): {dna}\n"
            f"Stated goals: {goals}\n"
            f"Headline: {c.headline}"
        )


@dataclass
class AgentResult:
    """What an agent hands back to the orchestrator."""

    summary: str = ""                 # one-line status shown on the graph node
    mode: str = "demo"                # "live" | "demo"
    flags: list[RiskFlag] = field(default_factory=list)
    routing: list[RoutingDecision] = field(default_factory=list)
    findings: list[Finding] = field(default_factory=list)
    wealth_story: Optional[WealthStory] = None
    goals: list[Goal] = field(default_factory=list)
    feasibility: Optional[Feasibility] = None
    actions: list[ActionPoint] = field(default_factory=list)
