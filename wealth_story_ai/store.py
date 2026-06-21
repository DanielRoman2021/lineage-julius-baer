"""Client store — MongoDB-backed with a JSON fallback.

On first access we load clients, staff and notes from MongoDB (or the bundled
JSON seed if Mongo isn't configured), build per-client state, and hydrate any
pre-computed pipeline results. Live pipeline runs and new notes persist back to
Mongo when it's available.
"""
from __future__ import annotations

import json
import re
from typing import Optional

import db
from config import settings
from models.client import (
    ActionPoint,
    AuditEntry,
    Client,
    ClientState,
    ConversationSignal,
    Document,
    Feasibility,
    FeasibilityAssumptions,
    Finding,
    Goal,
    GoalType,
    Note,
    Person,
    PipelineRun,
    RiskFlag,
    RoutingDecision,
    TrustScore,
    Verification,
    WealthGraph,
    WealthStory,
    WheelDimension,
    WheelOfLife,
)
from services import pdf_parser, sample_docs, trust_score

_STATES: dict[str, ClientState] = {}
_ASSUMPTIONS: dict[str, FeasibilityAssumptions] = {}
_PEOPLE: list[Person] = []
_seeded = False
_use_mongo = False

_GOAL_TYPES = {gt.value: gt for gt in GoalType}

# The ten Wheel of Life dimensions. A client created from the UI starts with these
# at a neutral 5 so the wheel renders and the client can move the sliders, rather
# than showing an empty ring.
_WHEEL_DIMENSIONS = [
    "Legacy", "Impact", "Family", "Security", "Health",
    "Freedom", "Growth", "Lifestyle", "Wealth", "Business",
]
_DEFAULT_DNA = [{"name": n, "score": 5, "note": ""} for n in _WHEEL_DIMENSIONS]


def _load_json(name: str) -> list[dict]:
    with open(settings.data_dir / name, "r", encoding="utf-8") as fh:
        return json.load(fh)


def _build_state(c: dict) -> tuple[ClientState, FeasibilityAssumptions]:
    client = Client(
        id=c["id"], name=c["name"], photo_url=c.get("photo_url"),
        headline=c.get("headline", ""), domicile=c.get("domicile", ""),
        marital_status=c.get("marital_status", ""), segment=c.get("segment", "UHNW"),
        net_worth=c.get("net_worth", 0.0), currency=c.get("currency", "CHF"),
        rm_id=c.get("rm_id", "rm_markus"), rm_name=c.get("rm_name", "Markus Brunner"),
        status=c.get("status", "onboarding"), tags=c.get("tags", []),
        trust_score=c.get("trust_score", 0),
    )
    wheel = WheelOfLife(
        client_id=client.id,
        # A client with no values DNA yet (created from the UI) gets the ten
        # dimensions at a neutral 5 so the wheel renders and is editable.
        dimensions=[WheelDimension(name=d["name"], score=d["score"], note=d.get("note", ""))
                    for d in (c.get("dna") or _DEFAULT_DNA)],
    )
    goals = [
        Goal(client_id=client.id, title=g["title"],
             goal_type=_GOAL_TYPES.get(g.get("goal_type", "other"), GoalType.other),
             target_year=g.get("target_year"), estimated_cost=g.get("estimated_cost"),
             notes=g.get("notes", ""))
        for g in c.get("goals", [])
    ]
    docs: list[Document] = []
    folder = settings.documents_dir / client.id
    for d in c.get("documents", []):
        text, pages = pdf_parser.parse_pdf(folder / d["filename"])
        docs.append(Document(
            client_id=client.id, filename=d["filename"], doc_type=d.get("doc_type", "document"),
            pages=pages, extracted_text=text, parse_status="parsed", flagged=bool(d.get("flagged")),
        ))
    fa = c.get("feasibility_assumptions", {})
    assumptions = FeasibilityAssumptions(
        current_assets=fa.get("current_assets", client.net_worth),
        annual_income=fa.get("annual_income", 0.0), annual_spending=fa.get("annual_spending", 0.0),
        growth_rate=fa.get("growth_rate", 0.045), inflation=fa.get("inflation", 0.02),
        current_age=fa.get("current_age", 52), retirement_age=fa.get("retirement_age", 65),
    )
    state = ClientState(client=client, documents=docs, wheel=wheel, goals=goals)
    state.trust = trust_score.compute_trust(state)
    client.trust_score = state.trust.score
    return state, assumptions


def _hydrate(state: ClientState, res: dict) -> None:
    """Populate a freshly-built state with pre-computed pipeline output from Mongo."""
    state.flags = [RiskFlag(**f) for f in res.get("flags", [])]
    state.routing = [RoutingDecision(**r) for r in res.get("routing", [])]
    state.findings = [Finding(**f) for f in res.get("findings", [])]
    state.actions = [ActionPoint(**a) for a in res.get("actions", [])]
    state.audit = [AuditEntry(**e) for e in res.get("audit", [])]
    if res.get("wealth_story"):
        state.wealth_story = WealthStory(**res["wealth_story"])
    if res.get("feasibility"):
        state.feasibility = Feasibility(**res["feasibility"])
    if res.get("pipeline"):
        state.pipeline = PipelineRun(**res["pipeline"])
    if res.get("verification"):
        state.verification = Verification(**res["verification"])
    if res.get("latest_signal"):
        state.latest_signal = ConversationSignal(**res["latest_signal"])
    if res.get("wealth_graph"):
        state.wealth_graph = WealthGraph(**res["wealth_graph"])
    if res.get("trust"):
        state.trust = TrustScore(**res["trust"])
        state.client.trust_score = state.trust.score


def seed() -> None:
    global _seeded, _use_mongo, _PEOPLE
    if _seeded:
        return
    _use_mongo = db.available()

    if _use_mongo:
        clients = db.find_all(db.CLIENTS) or _load_json("clients_seed.json")
        people = db.find_all(db.PEOPLE) or _load_json("people_seed.json")
        notes = db.find_all(db.NOTES)
        results = {r["client_id"]: r for r in db.find_all(db.RESULTS)}
    else:
        clients = _load_json("clients_seed.json")
        people = _load_json("people_seed.json")
        notes = []
        results = {}

    _PEOPLE = [Person(**p) for p in people]
    sample_docs.ensure_documents(clients)

    for c in clients:
        state, assumptions = _build_state(c)
        state.notes = [Note(**n) for n in notes if n.get("client_id") == c["id"]]
        if c["id"] in results:
            _hydrate(state, results[c["id"]])
        _STATES[c["id"]] = state
        _ASSUMPTIONS[c["id"]] = assumptions

    _seeded = True


def _slug_id(name: str) -> str:
    """Build a stable slug id from a name, made unique against existing states."""
    base = re.sub(r"[^a-z0-9]+", "_", (name or "").lower()).strip("_") or "client"
    cid = base
    n = 2
    while cid in _STATES:
        cid = f"{base}_{n}"
        n += 1
    return cid


def create_client(name: str, email: str = "") -> ClientState:
    """Create a new onboarding client, register its state, and persist (best-effort)."""
    seed()
    cid = _slug_id(name)
    raw = {
        "id": cid, "name": name, "status": "onboarding",
        "rm_id": "rm_markus", "rm_name": "Markus Brunner",
        "dna": [dict(d) for d in _DEFAULT_DNA], "goals": [], "documents": [], "tags": [], "trust_score": 0,
    }
    state, assumptions = _build_state(raw)
    _STATES[cid] = state
    _ASSUMPTIONS[cid] = assumptions
    if _use_mongo:
        try:
            doc = dict(raw)
            doc["email"] = email
            db.upsert(db.CLIENTS, "id", doc)
        except Exception:
            pass
    return state


def list_states() -> list[ClientState]:
    seed()
    return list(_STATES.values())


def get_state(client_id: str) -> Optional[ClientState]:
    seed()
    return _STATES.get(client_id)


def assumptions_for(client_id: str) -> Optional[FeasibilityAssumptions]:
    seed()
    return _ASSUMPTIONS.get(client_id)


def list_people() -> list[Person]:
    seed()
    return _PEOPLE


def person(person_id: str) -> Optional[Person]:
    return next((p for p in list_people() if p.id == person_id), None)


def add_note(note: Note) -> Note:
    seed()
    state = _STATES.get(note.client_id)
    if state is not None:
        state.notes.insert(0, note)
    if _use_mongo:
        try:
            db.insert(db.NOTES, note.model_dump(mode="json"))
        except Exception:
            pass
    return note


def persist_dna(state: ClientState) -> None:
    """Persist the client's Wheel of Life (DNA) back to Mongo so a client's own
    adjustments survive a restart (best-effort)."""
    if not _use_mongo or not state.wheel:
        return
    dna = [{"name": d.name, "score": d.score, "note": d.note} for d in state.wheel.dimensions]
    try:
        db.get_db()[db.CLIENTS].update_one(
            {"id": state.client.id},
            {"$set": {"dna": dna, "trust_score": state.client.trust_score}},
        )
    except Exception:
        pass


def _doc_type_from_name(name: str) -> str:
    """Guess a doc_type from the filename so uploads land in the right bucket."""
    n = name.lower()
    if "passport" in n or "id" in n:
        return "passport"
    if "address" in n:
        return "proof_of_address"
    if "wealth" in n or "fund" in n or "source" in n:
        return "source_of_wealth"
    if "financ" in n or "asset" in n or "balance" in n:
        return "financials"
    if "trust" in n or "deed" in n:
        return "trust_deed"
    if "news" in n or "press" in n or "profile" in n:
        return "news"
    return "document"


def add_uploaded_document(client_id: str, filename: str, data: bytes) -> Optional[Document]:
    """Save an uploaded file to disk, parse it, and append it to the client's state."""
    seed()
    state = _STATES.get(client_id)
    if state is None:
        return None
    import os
    safe = os.path.basename(filename)
    folder = settings.documents_dir / client_id
    folder.mkdir(parents=True, exist_ok=True)
    (folder / safe).write_bytes(data)
    text, pages = pdf_parser.parse_bytes(data)
    doc = Document(
        client_id=client_id, filename=safe, doc_type=_doc_type_from_name(safe),
        pages=pages, extracted_text=text, parse_status="parsed" if text else "error",
        flagged=False,
    )
    state.documents.append(doc)
    persist_results(state)
    return doc


def persist_results(state: ClientState) -> None:
    """Persist a completed pipeline run back to Mongo (best-effort)."""
    if not _use_mongo:
        return
    res = {
        "client_id": state.client.id,
        "trust": state.trust.model_dump(mode="json") if state.trust else None,
        "wheel": state.wheel.model_dump(mode="json") if state.wheel else None,
        "documents": [d.model_dump(mode="json") for d in state.documents],
        "flags": [f.model_dump(mode="json") for f in state.flags],
        "routing": [r.model_dump(mode="json") for r in state.routing],
        "findings": [f.model_dump(mode="json") for f in state.findings],
        "wealth_story": state.wealth_story.model_dump(mode="json") if state.wealth_story else None,
        "feasibility": state.feasibility.model_dump(mode="json") if state.feasibility else None,
        "actions": [a.model_dump(mode="json") for a in state.actions],
        "audit": [e.model_dump(mode="json") for e in state.audit],
        "pipeline": state.pipeline.model_dump(mode="json") if state.pipeline else None,
        "verification": state.verification.model_dump(mode="json") if state.verification else None,
        "latest_signal": state.latest_signal.model_dump(mode="json") if state.latest_signal else None,
        "wealth_graph": state.wealth_graph.model_dump(mode="json") if state.wealth_graph else None,
    }
    try:
        db.get_db()[db.RESULTS].replace_one({"client_id": state.client.id}, res, upsert=True)
        # Persist profile fields the pipeline can change (net worth read from docs,
        # trust score) so they survive a restart and show on every screen.
        db.get_db()[db.CLIENTS].update_one(
            {"id": state.client.id},
            {"$set": {
                "net_worth": state.client.net_worth,
                "currency": state.client.currency,
                "trust_score": state.client.trust_score,
            }},
        )
    except Exception:
        pass


def persist_signal(state: ClientState) -> None:
    """Persist the client's latest conversation signal back to Mongo (best-effort)."""
    if not _use_mongo:
        return
    signal = state.latest_signal.model_dump(mode="json") if state.latest_signal else None
    try:
        db.get_db()[db.RESULTS].update_one(
            {"client_id": state.client.id},
            {"$set": {"client_id": state.client.id, "latest_signal": signal}},
            upsert=True,
        )
    except Exception:
        pass
