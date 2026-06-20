"""Deterministic life-plan feasibility projection.

Pure math (no LLM): project net worth year by year, schedule goal costs at their
target years, and decide whether each goal is fundable without driving the plan
below a prudence floor. The Goal agent layers narrative + life-gaps on top.
"""
from __future__ import annotations

from models.client import (
    Feasibility,
    FeasibilityAssumptions,
    Goal,
    GoalOutcome,
    ProjectionPoint,
)

HORIZON_AGE = 95
PRUDENCE_FLOOR_RATIO = 0.15  # keep at least 15% of starting assets as reserve


def project(client_id: str, a: FeasibilityAssumptions, goals: list[Goal]) -> Feasibility:
    start_year = 2026
    floor = a.current_assets * PRUDENCE_FLOOR_RATIO

    # Map goal costs onto calendar years.
    goal_costs: dict[int, list[Goal]] = {}
    for g in goals:
        if g.target_year and g.estimated_cost:
            goal_costs.setdefault(g.target_year, []).append(g)

    assets = a.current_assets
    points: list[ProjectionPoint] = []
    funded_by_year: dict[int, bool] = {}

    years = HORIZON_AGE - a.current_age
    for i in range(years + 1):
        age = a.current_age + i
        year = start_year + i

        # Growth on the balance.
        assets *= (1 + a.growth_rate)
        # Income until retirement.
        if age < a.retirement_age:
            assets += a.annual_income
        # Inflated spending.
        assets -= a.annual_spending * ((1 + a.inflation) ** i)
        # Scheduled goals this year.
        for g in goal_costs.get(year, []):
            assets -= g.estimated_cost or 0.0
            funded_by_year[year] = assets >= floor

        points.append(ProjectionPoint(year=year, age=age, assets=round(max(assets, 0.0), 0)))

    # Per-goal outcome.
    outcomes: list[GoalOutcome] = []
    for g in goals:
        if not (g.target_year and g.estimated_cost):
            outcomes.append(GoalOutcome(
                goal_id=g.id, goal_title=g.title, feasible=True, gap_amount=0.0,
                suggestion="No discrete cost — tracked qualitatively.",
            ))
            continue
        ok = funded_by_year.get(g.target_year, True)
        # Assets available the year before the goal.
        idx = g.target_year - start_year
        available = points[idx - 1].assets if 0 < idx < len(points) else a.current_assets
        gap = max(0.0, (g.estimated_cost or 0.0) - (available - floor))
        outcomes.append(GoalOutcome(
            goal_id=g.id,
            goal_title=g.title,
            feasible=ok and gap <= 0,
            gap_amount=round(gap, 0),
            suggestion=(
                "Comfortably funded from the existing balance."
                if ok and gap <= 0 else
                "Schedule a phased drawdown or adjust the timeline to close the gap."
            ),
        ))

    all_ok = all(o.feasible for o in outcomes)
    ending = points[-1].assets if points else a.current_assets
    verdict = (
        f"All stated goals are financially feasible; the plan ends with roughly "
        f"CHF {ending/1e6:.0f}M of reserve at age {HORIZON_AGE}."
        if all_ok else
        "Most goals are feasible, but at least one needs a phased drawdown or a "
        "revised timeline — see the highlighted gap."
    )

    return Feasibility(
        client_id=client_id,
        assumptions=a,
        projection=points,
        goal_outcomes=outcomes,
        verdict=verdict,
        life_gaps=[],
    )
