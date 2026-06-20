"""Conversation agent — prepares the RM when a client changes a Wheel priority.

Standalone, not part of the pipeline fan-out. Given the changed pillar and the
direction it moved, it drafts talking points, future topics and who to bring in
for the next conversation. Read by the relationship manager, never the client.
"""
from __future__ import annotations

from typing import Optional

from agents.base import PipelineContext, load_prompt
from agents.schemas import ConversationSignalOut, PersonRefOut
from anthropic_client import agenerate
from models.client import ConversationSignal, PersonRef
from services.people import person_for_role


def _initials_from_name(name: str) -> str:
    parts = [p for p in name.split() if p]
    return "".join(p[0].upper() for p in parts[:2]) or "?"


def _direction(old: Optional[int], new: Optional[int]) -> str:
    if old is None or new is None or new >= old:
        return "up"
    return "down"


def _canned(
    ctx: PipelineContext,
    pillar: str,
    direction: str,
    old: Optional[int],
    new: Optional[int],
) -> ConversationSignalOut:
    first = ctx.client.name.split()[0]
    key = pillar.strip().lower()
    rose = direction == "up"

    if key == "family":
        return ConversationSignalOut(
            direction=direction,
            talking_points=[
                f"Family moved up the list for {first}. Open by asking what changed at home.",
                "Her two teenagers are 16 and 18. The older one is close to leaving for university.",
                "Worth asking how she wants the next generation to learn about the money before they inherit it.",
            ],
            future_topics=[
                "A simple education and gifting plan for both children.",
                "How and when to bring the children into a first conversation.",
            ],
            people_to_involve=[
                PersonRefOut(name="Clara Imhof", role="succession",
                             reason="Can shape the handover to the children at the right pace."),
                PersonRefOut(name="Sophie Brandt", role="wealth_planner",
                             reason="Can frame the gifting and education plan."),
            ],
            summary=f"Family is now {first}'s top priority, so steer the next call toward the children and a gentle handover.",
        )

    if key == "health":
        return ConversationSignalOut(
            direction=direction,
            talking_points=[
                f"Health climbed for {first}, and it was the lowest score on her wheel before this.",
                "Keep it light. Ask how she is feeling about her own time and energy lately.",
                "Tie it back to her plan to retire at 55, since health and that timing sit together.",
            ],
            future_topics=[
                "How an earlier wind-down changes the spending plan.",
                "Cover for the family if her own health takes a turn.",
            ],
            people_to_involve=[
                PersonRefOut(name="Sophie Brandt", role="wealth_planner",
                             reason="Can test an earlier retirement against the numbers."),
            ],
            summary=f"Health rose for {first}, the weakest spot on her wheel, so connect it to her wish to retire at 55.",
        )

    if key == "impact":
        return ConversationSignalOut(
            direction=direction,
            talking_points=[
                f"Impact matters more to {first} now. Ask which causes have been on her mind.",
                "She has said she wants her giving to show real results, not just write cheques.",
                "A foundation or a structured plan could give her giving more shape.",
            ],
            future_topics=[
                "A clear giving plan with a way to see the results.",
                "Whether the children join her in the giving.",
            ],
            people_to_involve=[
                PersonRefOut(name="Noah Berger", role="philanthropy",
                             reason="Can design a giving plan that shows real outcomes."),
                PersonRefOut(name="Léa Fontaine", role="tax",
                             reason="Can check the tax side of any foundation or large gift."),
            ],
            summary=f"Impact is rising for {first}, so bring a plan that lets her see what her giving achieves.",
        )

    if key == "freedom":
        return ConversationSignalOut(
            direction=direction,
            talking_points=[
                f"Freedom moved up for {first}. Ask what freedom looks like for her over the next few years.",
                "She wants to retire at 55, so this likely ties to stepping back on her terms.",
                "A large slice of her wealth sits in one stock. Spreading it would steady the plan.",
            ],
            future_topics=[
                "Easing out of the concentrated single stock without a tax shock.",
                "An income plan that holds up once she stops working.",
            ],
            people_to_involve=[
                PersonRefOut(name="Sophie Brandt", role="wealth_planner",
                             reason="Can build the path to retiring at 55."),
                PersonRefOut(name="Léa Fontaine", role="tax",
                             reason="Can plan the sale of the single stock with the least tax."),
            ],
            summary=f"Freedom is now front of mind for {first}, so talk about retiring at 55 and easing out of the single stock.",
        )

    # Sensible default for any other pillar.
    move = "rose" if rose else "slipped"
    return ConversationSignalOut(
        direction=direction,
        talking_points=[
            f"{pillar} {move} on {first}'s wheel. Open by asking what is behind the shift.",
            "Listen first. Let her name what changed before you bring solutions.",
            "Note one thing she says so the next call picks up where this one ends.",
        ],
        future_topics=[
            f"How the change in {pillar.lower()} reshapes her near-term plan.",
            "One small step she can take before the next review.",
        ],
        people_to_involve=[
            PersonRefOut(name="Sophie Brandt", role="wealth_planner",
                         reason="Can fold the change into the wider plan."),
        ],
        summary=f"{pillar} {move} for {first}, so use the next call to learn what changed and adjust the plan.",
    )


async def run(
    ctx: PipelineContext,
    *,
    pillar: str,
    old_score: Optional[int],
    new_score: Optional[int],
    recent_notes: list[str],
) -> ConversationSignal:
    direction = _direction(old_score, new_score)
    system = load_prompt("conversation")
    notes_digest = "\n".join(f"- {n}" for n in recent_notes if n) or "(no recent notes)"
    move = "rose" if direction == "up" else "fell"
    scores = ""
    if old_score is not None and new_score is not None:
        scores = f" (from {old_score}/10 to {new_score}/10)"
    user = (
        f"{ctx.client_block()}\n\n"
        f"=== RECENT RELATIONSHIP NOTES ===\n{notes_digest}\n\n"
        f"=== WHEEL CHANGE ===\n"
        f"The client just changed the priority they care about most. "
        f"The pillar '{pillar}' {move}{scores}. Direction: {direction}.\n\n"
        f"Prepare the relationship manager for the next conversation."
    )
    out, mode = await agenerate(
        system=system, user=user, output_model=ConversationSignalOut,
        canned=lambda: _canned(ctx, pillar, direction, old_score, new_score),
        tier="synthesis", max_tokens=900,
    )

    people: list[PersonRef] = []
    for p in out.people_to_involve:
        # Use the real specialist who owns the role, not whatever name the model
        # guessed. The model's reason is kept; the name and initials are canonical.
        match = person_for_role(p.role)
        name = match.get("name") or p.name
        initials = match.get("initials") or _initials_from_name(p.name)
        people.append(PersonRef(name=name, role=p.role, initials=initials, reason=p.reason))

    return ConversationSignal(
        client_id=ctx.client.id,
        pillar=pillar,
        direction=direction,
        old_score=old_score,
        new_score=new_score,
        talking_points=out.talking_points,
        future_topics=out.future_topics,
        people_to_involve=people,
        summary=out.summary,
        mode=mode,
    )
