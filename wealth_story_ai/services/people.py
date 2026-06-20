"""Fixed mapping from a human role to the person who owns that role.

Keeps routing deterministic and matches the named approvers in the design
(Daniel Roth in Compliance, Léa Fontaine in Tax, Markus Brunner as the RM).
"""
from __future__ import annotations

PEOPLE_BY_ROLE: dict[str, dict[str, str]] = {
    "compliance": {"id": "comp_daniel", "name": "Daniel Roth", "initials": "DR"},
    "tax": {"id": "tax_lea", "name": "Léa Fontaine", "initials": "LF"},
    "wealth_planner": {"id": "wp_sophie", "name": "Sophie Brandt", "initials": "SB"},
    "advisor": {"id": "adv_thomas", "name": "Thomas Meier", "initials": "TM"},
    "succession": {"id": "succ_clara", "name": "Clara Imhof", "initials": "CI"},
    "philanthropy": {"id": "phil_noah", "name": "Noah Berger", "initials": "NB"},
    "rm": {"id": "rm_markus", "name": "Markus Brunner", "initials": "MB"},
}


def person_for_role(role: str) -> dict[str, str]:
    return PEOPLE_BY_ROLE.get(role, PEOPLE_BY_ROLE["rm"])
