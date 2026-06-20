"""Populate MongoDB Atlas with the full Lineage dataset.

Run from the wealth_story_ai directory:  python scripts/seed_mongo.py

Writes: people (staff), clients (profiles + DNA + goals + docs), notes
(relationship memory), and results (pre-computed pipeline output per client so
the app has rich data on day one). Idempotent — clears and rewrites each run.
"""
from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import db  # noqa: E402
import orchestrator  # noqa: E402
import store  # noqa: E402
from config import settings  # noqa: E402

SARAH_NOTES = [
    ("Wants to retire from operating roles at 55 — treats it as non-negotiable.", "insight", "rm_markus", "Markus Brunner", ["retirement", "goal"]),
    ("Impact philanthropy must be measurable, not symbolic. Pre-fund the Keller Foundation cycle.", "insight", "phil_noah", "Noah Berger", ["philanthropy"]),
    ("Eldest child starts university in 2026 — education funding milestone approaching.", "signal", "wp_sophie", "Sophie Brandt", ["education", "family"]),
    ("Source-of-funds adverse-media hit reviewed and cleared as immaterial.", "note", "comp_daniel", "Daniel Roth", ["kyc", "compliance"]),
    ("Sensitive to reputation — keep philanthropy and venture activity discreet.", "insight", "rm_markus", "Markus Brunner", ["reputation"]),
]

ADLER_NOTES = [
    ("Just inherited the family pharma group — onboarding fresh, no mandate yet. Wants to de-risk before any bold move.", "insight", "rm_markus", "Markus Brunner", ["onboarding", "inheritance"]),
    ("Roughly 60% of net worth is locked in Adler Pharma Distribution GmbH. Phased diversification is the first real conversation.", "insight", "wp_sophie", "Sophie Brandt", ["concentration", "planning"]),
    ("Sanctions/PEP screen returned a surname overlap with a sanctioned Russian national, Mikhail Adler — different first name, DOB, nationality. Treated as a false positive, pending compliance clearance.", "note", "comp_daniel", "Daniel Roth", ["kyc", "compliance", "screening"]),
    ("Recently divorced; wants a trust for his seven-year-old son, kept separate from the divorce settlement.", "signal", "wp_sophie", "Sophie Brandt", ["family", "trust"]),
    ("Open to a healthcare-access foundation to honour his father's name, but undecided. Keep it light until the estate settles.", "insight", "phil_noah", "Noah Berger", ["philanthropy"]),
]


def build_notes(clients: list[dict]) -> list[dict]:
    out: list[dict] = []
    for c in clients:
        cid = c["id"]
        if cid == "sarah_keller":
            items = SARAH_NOTES
        elif cid == "lukas_adler":
            items = ADLER_NOTES
        else:
            items = []
            if c.get("tags"):
                items.append((f"Relationship theme: {c['tags'][0].lower()}.", "insight", "rm_markus", "Markus Brunner", c["tags"][:1]))
            if c.get("goals"):
                items.append((f"Priority goal: {c['goals'][0]['title']}.", "note", "rm_markus", "Markus Brunner", ["goal"]))
        for i, (text, kind, aid, aname, tags) in enumerate(items):
            out.append({
                "id": f"note_{cid}_{i}", "client_id": cid, "author_id": aid,
                "author_name": aname, "text": text, "kind": kind, "tags": tags,
                "created_at": f"2026-06-0{(i % 9) + 1}T09:00:00+00:00",
            })
    return out


def main() -> None:
    if not db.available():
        print("MongoDB not reachable. Check MONGODB_URI in .env and Atlas network access.")
        return
    database = db.get_db()

    people = json.loads((settings.data_dir / "people_seed.json").read_text(encoding="utf-8"))
    clients = json.loads((settings.data_dir / "clients_seed.json").read_text(encoding="utf-8"))

    database[db.PEOPLE].delete_many({})
    database[db.PEOPLE].insert_many([dict(p) for p in people])

    database[db.CLIENTS].delete_many({})
    database[db.CLIENTS].insert_many([dict(c) for c in clients])

    database[db.NOTES].delete_many({})
    notes = build_notes(clients)
    if notes:
        database[db.NOTES].insert_many(notes)

    # Pre-compute pipeline results (canned, offline) and persist them.
    store.seed()
    database[db.RESULTS].delete_many({})
    for c in clients:
        cid = c["id"]
        s = store.get_state(cid)
        a = store.assumptions_for(cid)
        asyncio.run(orchestrator.run(s, a))
        res = {
            "client_id": cid,
            "trust": s.trust.model_dump(mode="json") if s.trust else None,
            "wheel": s.wheel.model_dump(mode="json") if s.wheel else None,
            "documents": [d.model_dump(mode="json") for d in s.documents],
            "flags": [f.model_dump(mode="json") for f in s.flags],
            "routing": [r.model_dump(mode="json") for r in s.routing],
            "findings": [f.model_dump(mode="json") for f in s.findings],
            "wealth_story": s.wealth_story.model_dump(mode="json") if s.wealth_story else None,
            "wealth_graph": s.wealth_graph.model_dump(mode="json") if s.wealth_graph else None,
            "feasibility": s.feasibility.model_dump(mode="json") if s.feasibility else None,
            "actions": [act.model_dump(mode="json") for act in s.actions],
            "audit": [e.model_dump(mode="json") for e in s.audit],
            "pipeline": s.pipeline.model_dump(mode="json") if s.pipeline else None,
            "verification": s.verification.model_dump(mode="json") if s.verification else None,
        }
        database[db.RESULTS].replace_one({"client_id": cid}, res, upsert=True)
        print(f"  seeded results · {cid} · trust {s.trust.score if s.trust else '-'} · {len(s.flags)} flag(s)")

    counts = {name: database[name].count_documents({}) for name in (db.PEOPLE, db.CLIENTS, db.NOTES, db.RESULTS)}
    print("DONE:", counts)


if __name__ == "__main__":
    main()
