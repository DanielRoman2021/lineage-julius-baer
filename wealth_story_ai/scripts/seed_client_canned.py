"""Compute and persist ONE client's pipeline result through the deterministic
canned path, then store it in Mongo RESULTS.

Used for demo clients whose routing must be reliable (e.g. a multi-flag client
that must route to several named humans every time). Forcing the canned path
makes the specialist routing deterministic instead of depending on a live LLM
run. The running backend picks it up on its next start.

Usage:  python scripts/seed_client_canned.py viktor_sokolenko
"""
from __future__ import annotations

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config import settings  # noqa: E402

settings.anthropic_api_key = ""  # force canned/demo for this process only

import db  # noqa: E402
import orchestrator  # noqa: E402
import store  # noqa: E402

cid = sys.argv[1] if len(sys.argv) > 1 else "viktor_sokolenko"

store.seed()
state = store.get_state(cid)
if state is None:
    print(f"client '{cid}' not found")
    sys.exit(1)
assumptions = store.assumptions_for(cid)

asyncio.run(orchestrator.run(state, assumptions))
store.persist_results(state)

roles = {}
for f in state.findings:
    roles.setdefault(f.agent_role, []).append(f.status)
print(f"seeded canned result for {cid}")
print(f"  flags: {len(state.flags)} (roles: {sorted({f.routed_to_name for f in state.flags})})")
print(f"  findings by role: {{r: rs for r, rs in roles.items()}}".replace("rs", "..."))
for r, statuses in roles.items():
    print(f"   - {r}: {statuses}")
print(f"  trust: {state.trust.score if state.trust else '-'}")
if db.available():
    print("  persisted to Mongo RESULTS")
