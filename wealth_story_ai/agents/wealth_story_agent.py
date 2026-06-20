"""Wealth Story agent — turns verified documents + values into a living narrative."""
from __future__ import annotations

from agents.base import AgentResult, PipelineContext, load_prompt
from agents.schemas import MilestoneOut, WealthStoryOut
from anthropic_client import agenerate
from models.client import AgentType, Milestone, SourceCitation, WealthStory

AGENT_TYPE = AgentType.wealth_story


def _canned(ctx: PipelineContext) -> WealthStoryOut:
    c = ctx.client
    first = c.name.split()[0]
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
            MilestoneOut(year=2010, title="Founded the company", description="Started a Zurich technology venture."),
            MilestoneOut(year=2023, title="Successful exit", description="Sold the company; wealth becomes liquid."),
            MilestoneOut(year=2024, title="Turn to legacy", description="Shifts focus to family, foundation and impact."),
        ],
    )


async def run(ctx: PipelineContext) -> AgentResult:
    system = load_prompt("wealth_story")
    sow = ctx.doc_by_type("source_of_wealth")
    assets = ctx.doc_by_type("asset_summary")
    social = "; ".join(s.get("summary", "") for s in ctx.social) or "(none)"
    user = (
        f"{ctx.client_block()}\n\n"
        f"=== SOURCE OF WEALTH ===\n{(sow.extracted_text if sow else '')[:1200]}\n\n"
        f"=== ASSET SUMMARY ===\n{(assets.extracted_text if assets else '')[:800]}\n\n"
        f"=== PUBLIC / SOCIAL SIGNALS ===\n{social}\n\n"
        f"Write the living wealth story."
    )
    out, mode = await agenerate(
        system=system, user=user, output_model=WealthStoryOut,
        canned=lambda: _canned(ctx), tier="synthesis", max_tokens=1200,
    )
    story = WealthStory(
        client_id=ctx.client.id,
        headline=out.headline,
        narrative_markdown=out.narrative_markdown,
        milestones=[Milestone(year=m.year, title=m.title, description=m.description) for m in out.milestones],
        sources=[SourceCitation(label=sow.filename, doc_id=sow.id)] if sow else [],
    )
    return AgentResult(summary="Living wealth story drafted", mode=mode, wealth_story=story)
