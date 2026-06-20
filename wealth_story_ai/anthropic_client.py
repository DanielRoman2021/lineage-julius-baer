"""Anthropic wrapper with structured output + graceful canned fallback.

Every agent calls ``agenerate`` with a Pydantic output schema. When a key is
present we make a real, structured Anthropic call (``messages.parse``); when it
is absent — or anything goes wrong — we return the agent's canned artifact so
the demo always works offline. The returned ``mode`` ("live" | "demo") is
surfaced in the UI so the story stays honest.

Models (Opus 4.8 / Sonnet 4.6): adaptive thinking only, no temperature/top_p,
no budget_tokens. Structured outputs are supported on both tiers.
"""
from __future__ import annotations

from typing import Awaitable, Callable, Type, TypeVar

from pydantic import BaseModel

from config import settings

T = TypeVar("T", bound=BaseModel)

_aclient = None


def _get_aclient():
    global _aclient
    if _aclient is None:
        import anthropic
        _aclient = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
    return _aclient


def _model_for(tier: str) -> str:
    return (
        settings.anthropic_model_synthesis
        if tier == "synthesis"
        else settings.anthropic_model_specialist
    )


async def agenerate(
    *,
    system: str,
    user: str,
    output_model: Type[T],
    canned: Callable[[], T],
    tier: str = "specialist",
    max_tokens: int = 2200,
) -> tuple[T, str]:
    """Return (artifact, mode). mode is "live" or "demo"."""
    if not settings.live_mode:
        return canned(), "demo"
    try:
        resp = await _get_aclient().messages.parse(
            model=_model_for(tier),
            max_tokens=max_tokens,
            system=system,
            messages=[{"role": "user", "content": user}],
            output_format=output_model,
        )
        parsed = getattr(resp, "parsed_output", None)
        if parsed is None:
            return canned(), "demo"
        return parsed, "live"
    except Exception:
        # Any failure (no SDK support, network, schema, rate limit) → canned.
        return canned(), "demo"
