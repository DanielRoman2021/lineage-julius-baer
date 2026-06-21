"""Pull headline financial figures out of parsed document text.

A client created from the UI has no net worth on file (it defaults to 0). The
figures are in the documents the client uploads, so after parsing we read the
net worth, annual income, and annual spending straight from the text and use
them to fill in the client profile and the feasibility assumptions. Deterministic
and offline, so it works the same in demo (canned) mode.
"""
from __future__ import annotations

import re
from typing import Iterable, Optional

_SCALE = {
    "thousand": 1e3, "k": 1e3,
    "million": 1e6, "mn": 1e6, "m": 1e6,
    "billion": 1e9, "bn": 1e9, "b": 1e9,
}

# A currency amount, optionally scaled: "CHF 140 million", "CHF 165,000,000", "EUR 2.0m".
_AMOUNT = re.compile(
    r"(?:CHF|EUR|USD|GBP)\s*([0-9][0-9.,]*)\s*(thousand|million|billion|mn|bn|m|k|b)?",
    re.IGNORECASE,
)


def _to_number(num: str, scale: Optional[str]) -> Optional[float]:
    try:
        n = float(num.replace(",", ""))
    except ValueError:
        return None
    if scale:
        n *= _SCALE.get(scale.lower(), 1.0)
    return n if n > 0 else None


def _money_near(text: str, keywords: Iterable[str], window: int = 90) -> Optional[float]:
    """Largest currency amount that appears just after one of the keywords."""
    low = text.lower()
    best: Optional[float] = None
    for m in _AMOUNT.finditer(text):
        pre = low[max(0, m.start() - window):m.start()]
        if any(k in pre for k in keywords):
            val = _to_number(m.group(1), m.group(2))
            if val and (best is None or val > best):
                best = val
    return best


def extract_financials(documents) -> dict[str, Optional[float]]:
    """Read net worth / income / spending from a client's document text."""
    text = "\n".join(d.extracted_text for d in documents if getattr(d, "extracted_text", ""))
    return {
        "net_worth": _money_near(text, (
            "net worth", "total net worth", "net assets", "total assets", "total wealth",
        )),
        "annual_income": _money_near(text, ("annual income", "income about", "income of")),
        "annual_spending": _money_near(text, (
            "annual spending", "spending about", "annual expenditure", "annual spend",
        )),
    }
