"""MongoDB access (lazy singleton). Falls back silently when no URI is set."""
from __future__ import annotations

from typing import Optional

from config import settings

_client = None

CLIENTS = "clients"          # client profiles + DNA + goals + documents + assumptions
PEOPLE = "people"            # staff: RMs, wealth planners, tax/compliance specialists, advisors
NOTES = "notes"              # relationship-memory notes / insights
RESULTS = "results"          # persisted pipeline output per client


def get_client():
    global _client
    if _client is None:
        from pymongo import MongoClient
        _client = MongoClient(settings.mongodb_uri, serverSelectionTimeoutMS=8000)
    return _client


def get_db():
    return get_client()[settings.mongodb_db]


def available() -> bool:
    """True if a URI is configured AND the cluster answers a ping."""
    if not settings.mongo_enabled:
        return False
    try:
        get_client().admin.command("ping")
        return True
    except Exception:
        return False


def find_all(collection: str) -> list[dict]:
    return list(get_db()[collection].find({}, {"_id": 0}))


def find_one(collection: str, key: str, value) -> Optional[dict]:
    return get_db()[collection].find_one({key: value}, {"_id": 0})


def upsert(collection: str, key: str, doc: dict) -> None:
    get_db()[collection].replace_one({key: doc[key]}, doc, upsert=True)


def insert(collection: str, doc: dict) -> None:
    get_db()[collection].insert_one(dict(doc))
