"""Mock external screening.

This is the ONLY place the "external world" is faked. We match a client's
identity and document text against canned PEP / sanctions / adverse-media /
social datasets and return raw hits. The *reasoning* over these hits (is it a
true match? how severe? false positive?) is done by the KYC agent (the LLM),
never here — keeping the intelligence real while the data is mocked.
"""
from __future__ import annotations

import json
from difflib import SequenceMatcher
from functools import lru_cache
from typing import Any

from config import settings


def _load(name: str) -> list[dict[str, Any]]:
    path = settings.data_dir / name
    with open(path, "r", encoding="utf-8") as fh:
        return json.load(fh)


@lru_cache
def _datasets() -> dict[str, list[dict[str, Any]]]:
    return {
        "pep": _load("pep_list.json"),
        "sanctions": _load("sanctions_list.json"),
        "adverse_media": _load("adverse_media.json"),
        "social": _load("social_signals.json"),
    }


def _norm(s: str) -> str:
    return " ".join(s.lower().replace(".", " ").split())


def _name_ratio(a: str, b: str) -> float:
    return SequenceMatcher(None, _norm(a), _norm(b)).ratio()


def _names_of(entry: dict[str, Any]) -> list[str]:
    names = [entry.get("name", "")]
    names += entry.get("aliases", [])
    return [n for n in names if n]


def screen_identity(full_name: str, threshold: float = 0.78) -> list[dict[str, Any]]:
    """Fuzzy-match a person's name against PEP / sanctions / social datasets."""
    hits: list[dict[str, Any]] = []
    for source in ("pep", "sanctions", "adverse_media", "social"):
        for entry in _datasets()[source]:
            best = max((_name_ratio(full_name, n) for n in _names_of(entry)), default=0.0)
            terms = entry.get("match_terms")
            if terms:
                best = max(best, max((_name_ratio(full_name, t) for t in terms), default=0.0))
            if best >= threshold:
                hits.append({
                    "source": source,
                    "match_score": round(best, 3),
                    "matched_name": full_name,
                    "entry": entry,
                })
    return hits


def screen_text(text: str) -> list[dict[str, Any]]:
    """Substring-match entities (companies, names) mentioned in a document."""
    low = text.lower()
    hits: list[dict[str, Any]] = []
    for source in ("sanctions", "adverse_media"):
        for entry in _datasets()[source]:
            terms = entry.get("match_terms") or [entry.get("entity") or entry.get("name", "")]
            for term in terms:
                if term and term.lower() in low:
                    hits.append({
                        "source": source,
                        "match_score": 1.0,
                        "matched_term": term,
                        "entry": entry,
                    })
                    break
    return hits


def social_enrichment(full_name: str) -> list[dict[str, Any]]:
    """Benign social/press signals used to enrich the wealth story (not risk)."""
    out: list[dict[str, Any]] = []
    for entry in _datasets()["social"]:
        terms = entry.get("match_terms") or [entry.get("subject", "")]
        if any(_name_ratio(full_name, t) >= 0.8 for t in terms if t):
            out.append(entry)
    return out
