"""Second flagged demo client: Claudia Moser.

Create the client from the UI (suggested name "Claudia Moser"), then upload these
PDFs. The source-of-wealth and company docs name "Meridian Energy Holdings Ltd",
a counterparty on the mock adverse-media list, so the KYC text screen raises an
adverse-media flag and routes it to Compliance (a softer, clearable flag than the
sanctions one in the first demo client). Net worth is stated so it is extracted.

Output: ~/Downloads/flagged-demo-client-2-documents/
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from services.sample_docs import _write_pdf  # noqa: E402

DEST = Path.home() / "Downloads" / "flagged-demo-client-2-documents"
DEST.mkdir(parents=True, exist_ok=True)

DOCS: list[tuple[str, str, list[str]]] = [
    ("moser_passport.pdf", "Passport", [
        "Swiss Confederation passport.",
        "Surname: Moser.  Given name: Claudia.",
        "Nationality: Swiss.  Born: 22 June 1981, Lucerne.",
        "Place of residence: Zug, Switzerland.",
        "Identity verified by video ident on onboarding.",
        "No discrepancies in name, date of birth, or nationality.",
    ]),
    ("moser_source_of_wealth.pdf", "Source of Wealth Declaration", [
        "Client: Claudia Moser. Swiss national, born 22 June 1981 in Lucerne.",
        "Source of wealth: founded and sold a renewable energy company.",
        "2009: founded Helio Grid AG (Lucerne), solar generation and battery storage.",
        "2019: took a CHF 30 million growth investment from Meridian Energy Holdings Ltd.",
        "2021: bought back the Meridian Energy Holdings Ltd stake to regain full ownership.",
        "2022: sold Helio Grid AG to a European utility for CHF 150 million.",
        "",
        "Note for compliance: Meridian Energy Holdings Ltd, a former minority investor,",
        "was later named in adverse media over a procurement inquiry. The investment was",
        "arm's length, the stake was bought back in 2021, and the matter concerns the",
        "investor, not the client. The client and Helio Grid AG are not party to it.",
        "",
        "Current net worth about CHF 120 million, held through Moser Capital AG (Zug).",
    ]),
    ("moser_financials_2024.pdf", "Statement of Net Worth 2024", [
        "Holder: Claudia Moser, through Moser Capital AG (Zug).",
        "Cash and money market: CHF 55 million (sale proceeds, 2022).",
        "Listed securities portfolio: CHF 34 million.",
        "Private equity and clean-energy funds: CHF 16 million.",
        "Residential property (Zug, Lucerne): CHF 15 million.",
        "Total net worth: about CHF 120 million.",
        "No leverage against the portfolio.",
        "Annual income about CHF 1.8 million; annual spending about CHF 1.0 million.",
    ]),
    ("moser_asset_summary.pdf", "Asset and Structure Summary", [
        "Ownership: Moser Capital AG (Zug, Switzerland). Ultimate beneficial owner: Claudia Moser.",
        "Moser Capital AG holds the cash proceeds, the securities portfolio, and the properties.",
        "No trust and no nominee arrangements; ownership is direct and transparent.",
        "Historical business: Helio Grid AG (sold 2022).",
        "Former minority investor named for screening: Meridian Energy Holdings Ltd (2019 to 2021).",
        "Cross-border footprint: Switzerland only; no foreign tax residency.",
    ]),
    ("moser_company_profile.pdf", "Company Profile, Helio Grid AG", [
        "Helio Grid AG, Lucerne, founded 2009 by Claudia Moser.",
        "Solar generation and battery storage for commercial and municipal clients.",
        "In 2019 the company raised growth capital from Meridian Energy Holdings Ltd.",
        "The founder bought back that stake in 2021 and ran the company independently.",
        "Acquired by a European utility in 2022 for CHF 150 million.",
        "Claudia Moser now focuses on clean-energy investing and mentoring.",
    ]),
]

for fname, title, lines in DOCS:
    _write_pdf(DEST / fname, title, lines)

print(f"wrote {len(DOCS)} PDFs to {DEST}")
for p in sorted(DEST.glob("*.pdf")):
    print(" ", p.name)
