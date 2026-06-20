"""Clean re-seed in deterministic mode.

Wipes test artifacts and rebuilds curated people, clients, notes, and results
for every client in the seed (including the multi-route client), using the
deterministic canned artifacts so the demo baseline is identical every run.
The backend stays in live mode, so live generation is still shown on demand
through the Run pipeline button.

Run from the wealth_story_ai directory:  python scripts/reseed_canned.py
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config import settings  # noqa: E402

settings.anthropic_api_key = ""  # force deterministic canned artifacts for the seed

import seed_mongo  # noqa: E402

seed_mongo.main()
