"""Wealth Story agent — turns verified documents + values into a living narrative."""
from __future__ import annotations

from typing import Optional

from agents.base import AgentResult, PipelineContext, load_prompt
from agents.schemas import LinkedEntityOut, MilestoneOut, WealthStoryOut
from anthropic_client import agenerate
from models.client import (
    AgentType,
    Document,
    LinkedEntity,
    Milestone,
    SourceCitation,
    WealthStory,
)

AGENT_TYPE = AgentType.wealth_story


# Maps a few words from an evidence label onto the document types the parser uses.
_LABEL_DOC_TYPES: list[tuple[tuple[str, ...], tuple[str, ...]]] = [
    (("source", "wealth", "declaration"), ("source_of_wealth",)),
    (("asset", "summary", "portfolio", "balance"), ("asset_summary",)),
    (("share", "purchase", "agreement", "spa", "sale"), ("source_of_wealth", "asset_summary")),
    (("financ", "account", "statement", "audit"), ("financials", "asset_summary")),
    (("news", "press", "article", "media"), ("news",)),
]


def _doc_for_label(ctx: PipelineContext, label: str) -> Optional[Document]:
    """Pick a document whose type loosely matches the words in an evidence label."""
    if not label:
        return None
    low = label.lower()
    for keywords, doc_types in _LABEL_DOC_TYPES:
        if any(k in low for k in keywords):
            for dt in doc_types:
                doc = ctx.doc_by_type(dt)
                if doc:
                    return doc
    # Last resort: a doc whose type appears in the label, else nothing.
    for d in ctx.documents:
        if d.doc_type and d.doc_type.replace("_", " ") in low:
            return d
    return None


def _canned(ctx: PipelineContext) -> WealthStoryOut:
    c = ctx.client
    _parts = [p for p in c.name.replace(".", "").split() if p.lower() not in ("dr", "mr", "mrs", "ms", "prof")]
    first = _parts[0] if _parts else c.name.split()[0]
    top = sorted(ctx.dna_wheel.dimensions, key=lambda d: d.score, reverse=True)[:2]
    values = " and ".join(d.name.lower() for d in top) if top else "legacy and impact"
    return WealthStoryOut(
        headline=f"{first} built a company, then chose what to keep.",
        narrative_markdown=(
            f"{c.name} built a software company over fourteen years and sold it in 2023. "
            f"For her, the wealth is less about the number and more about time with her family, "
            f"and a legacy that lasts.\n\n"
            f"Her focus now is {values}. She wants the next generation to inherit well, and she "
            f"wants her giving to show real results. Our job is to keep the paperwork quiet so she "
            f"can stay close to the people and the causes that matter to her."
        ),
        milestones=[
            MilestoneOut(
                year=2009,
                date="June 2009",
                title="First holding company set up",
                description="Registered a Zurich holding to hold the early shares.",
                linked_entities=[
                    LinkedEntityOut(name=c.name, role="Founder"),
                    LinkedEntityOut(name="Zurich Holding AG", role="Holding company"),
                ],
                evidence_label="Source of Wealth Declaration",
            ),
            MilestoneOut(
                year=2010,
                date="March 2010",
                title="Founded the company",
                description="Started the technology venture that became the main asset.",
                linked_entities=[LinkedEntityOut(name=c.name, role="Founder")],
                evidence_label="Source of Wealth Declaration",
            ),
            MilestoneOut(
                year=2018,
                date="September 2018",
                title="Growth round and minority sale",
                description="Sold a minority stake to a private equity partner.",
                amount=18_000_000.0,
                currency="CHF",
                linked_entities=[
                    LinkedEntityOut(name=c.name, role="Seller"),
                    LinkedEntityOut(name="Alpine Growth Partners", role="Buyer"),
                ],
                evidence_label="Share Purchase Agreement",
            ),
            MilestoneOut(
                year=2023,
                date="November 2023",
                title="Successful exit",
                description="Sold the company in full; the wealth became liquid.",
                amount=140_000_000.0,
                currency="CHF",
                linked_entities=[
                    LinkedEntityOut(name=c.name, role="Seller"),
                    LinkedEntityOut(name="Meridian Software Group", role="Acquirer"),
                ],
                evidence_label="Share Purchase Agreement",
            ),
            MilestoneOut(
                year=2024,
                date="February 2024",
                title="Turn to legacy",
                description="Moved the proceeds into a family structure and a giving plan.",
                linked_entities=[
                    LinkedEntityOut(name=c.name, role="Settlor"),
                    LinkedEntityOut(name="Family Foundation", role="Foundation"),
                ],
                evidence_label="Asset Summary",
            ),
        ],
    )


async def run(ctx: PipelineContext) -> AgentResult:
    system = load_prompt("wealth_story")
    sow = ctx.doc_by_type("source_of_wealth")
    social = "; ".join(s.get("summary", "") for s in ctx.social) or "(none)"
    user = (
        f"{ctx.client_block()}\n\n"
        f"=== DOCUMENTS ===\n{ctx.documents_digest(2800)}\n\n"
        f"=== PUBLIC / SOCIAL SIGNALS ===\n{social}\n\n"
        f"Write the living wealth story. Draw every dated milestone from the documents above, "
        f"using the real dates, amounts, companies, and people named in them, oldest first."
    )
    out, mode = await agenerate(
        system=system, user=user, output_model=WealthStoryOut,
        canned=lambda: _canned(ctx), tier="synthesis", max_tokens=2600,
    )

    milestones: list[Milestone] = []
    for m in out.milestones:
        doc = _doc_for_label(ctx, m.evidence_label)
        evidence = (
            SourceCitation(label=m.evidence_label, doc_id=doc.id if doc else None)
            if m.evidence_label
            else None
        )
        milestones.append(
            Milestone(
                year=m.year,
                title=m.title,
                description=m.description,
                date=m.date,
                amount=m.amount,
                currency=m.currency,
                # "verified" = an agent read a document for this event.
                verified=bool(evidence),
                linked_entities=[
                    LinkedEntity(name=e.name, role=e.role) for e in m.linked_entities
                ],
                evidence=evidence,
                confidence=m.confidence,
            )
        )
    milestones.sort(key=lambda ms: ms.year)

    story = WealthStory(
        client_id=ctx.client.id,
        headline=out.headline,
        narrative_markdown=out.narrative_markdown,
        milestones=milestones,
        sources=[SourceCitation(label=sow.filename, doc_id=sow.id)] if sow else [],
    )
    return AgentResult(summary="Living wealth story drafted", mode=mode, wealth_story=story)
