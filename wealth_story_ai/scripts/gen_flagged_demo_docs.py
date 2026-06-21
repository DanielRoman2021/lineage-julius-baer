"""Generate a standalone set of PDFs for a DEMO client that flags on screening.

These are NOT a seeded persona. Create the client from the UI (suggested name
"Tomas Berg"), then upload these PDFs. The source-of-wealth and company-profile
documents name "Northbridge Maritime FZE", a counterparty that is already on the
mock sanctions + adverse-media lists, so the KYC text screen raises a flag and
routes it to Compliance, regardless of the client name you type.

Output: ~/Downloads/flagged-demo-client-documents/
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from services.sample_docs import _write_pdf  # noqa: E402

DEST = Path.home() / "Downloads" / "flagged-demo-client-documents"
DEST.mkdir(parents=True, exist_ok=True)

DOCS: list[tuple[str, str, list[str]]] = [
    ("berg_passport.pdf", "Passport", [
        "Swiss Confederation passport.",
        "Surname: Berg.  Given name: Tomas.",
        "Nationality: Swiss.  Born: 9 February 1976, Basel.",
        "Place of residence: Zug, Switzerland.",
        "Identity verified by video ident on onboarding.",
        "No discrepancies in name, date of birth, or nationality.",
    ]),
    ("berg_source_of_wealth.pdf", "Source of Wealth Declaration", [
        "Client: Tomas Berg. Swiss national, born 9 February 1976 in Basel.",
        "Source of wealth: founded and sold a commodities and freight trading business.",
        "2006: founded Helvetic Bulk Trading AG (Basel), dry-bulk commodities and freight.",
        "2015 to 2017: chartered vessels through Northbridge Maritime FZE on several dry-bulk routes.",
        "2018: ended the chartering relationship with Northbridge Maritime FZE and moved to other carriers.",
        "2021: sold Helvetic Bulk Trading AG to a Swiss commodities group for CHF 165 million.",
        "",
        "Note for compliance: Northbridge Maritime FZE was later named on a sanctions list in 2021,",
        "after the client had already exited the relationship in 2018. The chartering was arm's length",
        "freight service, paid by invoice, and predates the listing. The client retains no stake in,",
        "and no contract with, Northbridge Maritime FZE.",
        "",
        "Current net worth about CHF 140 million, held through Berg Capital AG (Zug).",
    ]),
    ("berg_financials_2024.pdf", "Statement of Net Worth 2024", [
        "Holder: Tomas Berg, through Berg Capital AG (Zug).",
        "Cash and money market: CHF 70 million (sale proceeds, 2021).",
        "Listed securities portfolio: CHF 38 million.",
        "Private equity and venture: CHF 14 million.",
        "Residential property (Zug, Verbier): CHF 18 million.",
        "Total net worth: about CHF 140 million.",
        "No leverage against the portfolio.",
        "Annual income about CHF 2.0 million; annual spending about CHF 1.1 million.",
    ]),
    ("berg_asset_summary.pdf", "Asset and Structure Summary", [
        "Ownership: Berg Capital AG (Zug, Switzerland). Ultimate beneficial owner: Tomas Berg.",
        "Berg Capital AG holds the cash proceeds, the securities portfolio, and the two properties.",
        "No trust and no nominee arrangements; ownership is direct and transparent.",
        "Historical business: Helvetic Bulk Trading AG (sold 2021).",
        "Historical counterparty named for screening: Northbridge Maritime FZE (chartering, 2015 to 2017).",
        "Cross-border footprint: Switzerland only; no foreign tax residency.",
    ]),
    ("berg_company_profile.pdf", "Company Profile, Helvetic Bulk Trading AG", [
        "Helvetic Bulk Trading AG, Basel, founded 2006 by Tomas Berg.",
        "Dry-bulk commodities and freight trading across European and Mediterranean routes.",
        "Between 2015 and 2017 the firm chartered tonnage through Northbridge Maritime FZE.",
        "The firm grew to about 40 staff and a stable book of industrial clients.",
        "Acquired by a Swiss commodities group in 2021 for CHF 165 million.",
        "Tomas Berg stepped back from operations after the sale.",
    ]),
]

for fname, title, lines in DOCS:
    _write_pdf(DEST / fname, title, lines)

print(f"wrote {len(DOCS)} PDFs to {DEST}")
for p in sorted(DEST.glob("*.pdf")):
    print(" ", p.name)
