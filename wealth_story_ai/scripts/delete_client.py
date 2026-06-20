"""Remove ONE client (and its results + notes) from Mongo by id.

Housekeeping for stray test clients created via the New-client form during a
demo. The running backend keeps the client in memory until its next restart.

Usage:  python scripts/delete_client.py elena_marchetti_2
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import db  # noqa: E402

cid = sys.argv[1] if len(sys.argv) > 1 else ""
if not cid:
    print("usage: python scripts/delete_client.py <client_id>")
    sys.exit(1)
if not db.available():
    print("MongoDB not reachable.")
    sys.exit(1)

database = db.get_db()
c = database[db.CLIENTS].delete_one({"id": cid})
r = database[db.RESULTS].delete_many({"client_id": cid})
n = database[db.NOTES].delete_many({"client_id": cid})
print(f"deleted '{cid}': clients={c.deleted_count} results={r.deleted_count} notes={n.deleted_count}")
print("clients remaining:", database[db.CLIENTS].count_documents({}))
