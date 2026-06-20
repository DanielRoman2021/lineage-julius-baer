"""Insert or refresh ONE client from clients_seed.json into Mongo, leaving the
others untouched. Use after adding a new client to the seed when you don't want
to run the full destructive re-seed (which also re-runs the live pipeline).

The client appears on next backend start; sample_docs generates its PDFs then.

Usage:  python scripts/add_client.py lukas_adler
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import db  # noqa: E402
from config import settings  # noqa: E402

cid = sys.argv[1] if len(sys.argv) > 1 else "lukas_adler"

clients = json.loads((settings.data_dir / "clients_seed.json").read_text(encoding="utf-8"))
match = next((c for c in clients if c.get("id") == cid), None)
if not match:
    print(f"client '{cid}' not found in clients_seed.json")
    sys.exit(1)

if not db.available():
    print("MongoDB not reachable. Check MONGODB_URI in .env.")
    sys.exit(1)

db.upsert(db.CLIENTS, "id", match)
print(f"upserted client '{cid}' ({match['name']}) into Mongo CLIENTS")
print("total clients now:", db.get_db()[db.CLIENTS].count_documents({}))
