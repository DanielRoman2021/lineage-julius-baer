"""Set up a seeded client as a BLANK onboarding test user.

It does three things so a human can drive the onboarding page end to end:
  1. Generates the client's sample PDFs on disk (from the full seed entry).
  2. Copies those PDFs into ~/Downloads/<id>-documents so they're easy to upload.
  3. Upserts the client into Mongo CLIENTS with an EMPTY documents array (and clears
     any prior RESULTS), so the app shows "no documents / not started" until the
     human uploads the files and runs the pipeline.

Usage:  python scripts/setup_blank_onboarding.py henrik_lindqvist
"""
from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import db  # noqa: E402
from config import settings  # noqa: E402
from services import sample_docs  # noqa: E402

cid = sys.argv[1] if len(sys.argv) > 1 else ""
if not cid:
    print("usage: python scripts/setup_blank_onboarding.py <client_id>")
    sys.exit(1)

clients = json.loads((settings.data_dir / "clients_seed.json").read_text(encoding="utf-8"))
entry = next((c for c in clients if c.get("id") == cid), None)
if not entry:
    print(f"client '{cid}' not found in clients_seed.json")
    sys.exit(1)

# 1. Generate the sample PDFs on disk from the FULL seed entry.
sample_docs.ensure_documents([entry])
folder = settings.documents_dir / cid
pdfs = sorted(folder.glob("*.pdf"))
print(f"generated {len(pdfs)} PDF(s) in {folder}")

# 2. Copy them to the user's Downloads for easy uploading.
dest = Path.home() / "Downloads" / f"{cid}-documents"
dest.mkdir(parents=True, exist_ok=True)
for p in pdfs:
    shutil.copy2(p, dest / p.name)
print(f"copied {len(pdfs)} PDF(s) to {dest}")

# 3. Upsert into Mongo CLIENTS with EMPTY documents (blank onboarding) + clear RESULTS.
if not db.available():
    print("MongoDB not reachable. Check MONGODB_URI in .env.")
    sys.exit(1)
blank = dict(entry)
blank["documents"] = []
blank["trust_score"] = 0
db.upsert(db.CLIENTS, "id", blank)
db.get_db()[db.RESULTS].delete_many({"client_id": cid})
print(f"upserted blank '{cid}' into Mongo CLIENTS, cleared any prior RESULTS")
print("total clients now:", db.get_db()[db.CLIENTS].count_documents({}))
