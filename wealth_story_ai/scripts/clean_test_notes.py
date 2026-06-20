"""Remove client-authored wheel-test notes, keeping the curated staff notes.

One-off housekeeping after interactive testing of the client Wheel of Life,
which writes a note authored by the client on every adjustment. The seeded
relationship-memory notes are all authored by staff, so deleting notes whose
author_id equals the client_id leaves the curated baseline intact.

Run from the wealth_story_ai directory:  python scripts/clean_test_notes.py
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import db  # noqa: E402

if not db.available():
    print("MongoDB not reachable.")
    sys.exit(1)

database = db.get_db()
before = database[db.NOTES].count_documents({})
# client-authored notes have author_id == client_id (the wheel writes these)
result = database[db.NOTES].delete_many({"$expr": {"$eq": ["$author_id", "$client_id"]}})
after = database[db.NOTES].count_documents({})
print(f"deleted {result.deleted_count} client-authored test notes ({before} -> {after})")
for cid in database[db.NOTES].distinct("client_id"):
    n = database[db.NOTES].count_documents({"client_id": cid})
    print(f"  {cid}: {n} note(s)")
