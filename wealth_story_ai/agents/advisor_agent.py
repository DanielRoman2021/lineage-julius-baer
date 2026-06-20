from __future__ import annotations

from agents.base import AgentResult, PipelineContext
from agents.reviewers import run_reviewer
from models.client import AgentType, HumanRole

AGENT_TYPE = AgentType.advisor


async def run(ctx: PipelineContext) -> AgentResult:
    return await run_reviewer(ctx, HumanRole.advisor, "advisor")
