"""Generate realistic sample client PDFs (so the parser has real text to read).

Called at startup; only writes files that don't already exist, so the demo runs
on a fresh clone with no manual step. Uses reportlab; degrades gracefully if it
isn't installed (the parser then returns empty text and agents still run).
"""
from __future__ import annotations

import textwrap
from pathlib import Path

from config import settings

try:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import cm
    from reportlab.pdfgen import canvas
    _HAS_RL = True
except Exception:  # pragma: no cover
    _HAS_RL = False


def _write_pdf(path: Path, title: str, lines: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(path), pagesize=A4)
    width, height = A4
    y = height - 3 * cm
    c.setFont("Helvetica-Bold", 14)
    c.drawString(2.5 * cm, y, title)
    y -= 1.2 * cm
    c.setFont("Helvetica", 10)
    for ln in lines:
        for wrapped in (textwrap.wrap(ln, 95) or [""]):
            c.drawString(2.5 * cm, y, wrapped)
            y -= 0.52 * cm
            if y < 3 * cm:
                c.showPage()
                c.setFont("Helvetica", 10)
                y = height - 3 * cm
    c.showPage()
    c.save()


def _content(client: dict, doc: dict) -> tuple[str, list[str]]:
    name = client["name"]
    dom = client.get("domicile", "")
    dt = doc["doc_type"]
    if dt == "passport":
        if client["id"] == "sarah_keller":
            return ("Identity Document, Swiss Passport", [
                "Issuing authority: Swiss Confederation, Federal Office of Police (fedpol).",
                "Document type: Passport, machine readable, biometric.",
                "Full name: Sarah Keller.",
                "Nationality: Swiss.",
                "Sex: Female.",
                "Date of birth: 12 March 1973.",
                "Place of birth: Zurich, Switzerland.",
                "Place of origin: Zurich ZH.",
                "Passport number: X1234567.",
                "Date of issue: 03 May 2021.",
                "Date of expiry: 02 May 2031.",
                "Authority: Kanton Zurich.",
                "Identity verified at onboarding via remote video identification (video-ID).",
                "Document checks passed: machine readable zone consistent, photograph matches "
                "the live video session, no signs of tampering.",
                "The name, date of birth, and nationality on this passport are the reference "
                "identity for all screening and know your customer checks.",
            ])
        if client["id"] == "lukas_adler":
            return ("Identity Document, German Passport", [
                "Issuing authority: Federal Republic of Germany, Bundesdruckerei.",
                "Document type: Passport, machine readable, biometric.",
                "Full name: Lukas Adler.",
                "Nationality: German.",
                "Sex: Male.",
                "Date of birth: 09 February 1985.",
                "Place of birth: Munich, Germany.",
                "Passport number: C2LX7K3M9.",
                "Date of issue: 18 June 2022.",
                "Date of expiry: 17 June 2032.",
                "Authority: Stadt Munchen, Kreisverwaltungsreferat.",
                "Identity verified at onboarding via remote video identification (video-ID).",
                "Document checks passed: machine readable zone consistent, photograph matches "
                "the live video session, no signs of tampering.",
                "The name, date of birth, and nationality on this passport are the reference "
                "identity for all screening and know your customer checks.",
            ])
        if client["id"] == "viktor_sokolenko":
            return ("Identity Document, Cypriot Passport", [
                "Issuing authority: Republic of Cyprus, Civil Registry and Migration Department.",
                "Document type: Passport, machine readable, biometric.",
                "Full name: Viktor Sokolenko.",
                "Nationality: Cypriot (naturalised). Former nationality: Ukrainian.",
                "Sex: Male.",
                "Date of birth: 21 July 1971.",
                "Place of birth: Kharkiv, Ukraine.",
                "Identity verified at onboarding via remote video identification (video-ID).",
                "Document checks passed: machine readable zone consistent, photograph matches "
                "the live video session, no signs of tampering.",
                "Screening note for compliance: this person is a politically exposed person. He "
                "served as a regional energy commissioner and was a board member of a state energy "
                "enterprise before moving into private trading. The PEP status must be confirmed "
                "and approved by compliance before onboarding can proceed.",
                "The name, date of birth, and nationality on this passport are the reference "
                "identity for all screening and know your customer checks.",
            ])
        if client["id"] == "elena_marchetti":
            return ("Identity Document, Swiss Passport", [
                "Issuing authority: Swiss Confederation, Federal Office of Police (fedpol).",
                "Document type: Passport, machine readable, biometric.",
                "Full name: Elena Marchetti. Title: Doctor.",
                "Nationality: Swiss.",
                "Sex: Female.",
                "Date of birth: 04 April 1977.",
                "Place of birth: Lugano, Ticino, Switzerland.",
                "Place of origin: Lugano TI.",
                "Passport number: F7781204.",
                "Date of issue: 11 January 2023.",
                "Date of expiry: 10 January 2033.",
                "Authority: Kanton Zurich.",
                "Residential domicile on file: Zurich, Switzerland.",
                "Identity verified at onboarding via remote video identification (video-ID).",
                "Document checks passed: machine readable zone consistent, photograph matches "
                "the live video session, no signs of tampering.",
                "The name, date of birth, and nationality on this passport are the reference "
                "identity for all screening and know your customer checks.",
            ])
        if client["id"] == "henrik_lindqvist":
            return ("Identity Document, Swedish Passport", [
                "Issuing authority: Kingdom of Sweden, Swedish Police Authority (Polismyndigheten).",
                "Document type: Passport, machine readable, biometric.",
                "Full name: Henrik Lindqvist.",
                "Nationality: Swedish.",
                "Sex: Male.",
                "Date of birth: 26 August 1978.",
                "Place of birth: Stockholm, Sweden.",
                "Passport number: 88204517.",
                "Date of issue: 14 April 2022.",
                "Date of expiry: 13 April 2032.",
                "Authority: Swedish Police Authority, Stockholm.",
                "Residential domicile on file: Zug, Switzerland.",
                "Identity verified at onboarding via remote video identification (video-ID).",
                "Document checks passed: machine readable zone consistent, photograph matches "
                "the live video session, no signs of tampering.",
                "The name, date of birth, and nationality on this passport are the reference "
                "identity for all screening and know your customer checks.",
            ])
        return ("Identity Document — Passport", [
            f"Full name: {name}", "Document type: Passport (machine-readable)",
            f"Nationality: {'Swiss' if 'Switzerland' in dom else 'See record'}",
            "Date of birth: 12 March 1973", "Place of birth: Zurich",
            "Document number: X1234567", "Expiry: 2031-04-30",
            "Verified at onboarding via video identification.",
        ])
    if dt == "proof_of_address":
        return ("Proof of Address — Utility Statement", [
            f"Account holder: {name}", f"Service address: {dom}",
            "Statement period: Q1 2026", "Provider: ewz (Elektrizitätswerk der Stadt Zürich)",
            "This statement confirms the residential address for KYC purposes.",
        ])
    if dt == "financials":
        if client["id"] == "sarah_keller":
            return ("Financial Statements 2023, Summary Balance Sheet", [
                f"Client: {name}.",
                "Reporting date: 31 December 2023. Reporting currency: Swiss francs (CHF).",
                "Total consolidated net worth: approximately CHF 180 million.",
                "",
                "Assets by class, approximate values and shares of the portfolio.",
                "Listed equity, single name, Atlas Software Group: CHF 40 million, about 22 percent. "
                "This holding was received as part of the consideration for the 2023 sale of "
                "Helvetia SaaS AG and is the largest single position in the portfolio.",
                "Fixed income, investment grade government and corporate bonds: CHF 63 million, "
                "about 35 percent.",
                "Global equities, diversified funds and direct lines: CHF 45 million, about 25 percent.",
                "Cash and short term deposits: CHF 18 million, about 10 percent.",
                "Private and alternative assets, including a small private equity allocation: "
                "CHF 14 million, about 8 percent.",
                "",
                "The single name position in Atlas Software Group is a 22 percent concentration in "
                "one listed stock and is the principal risk in the portfolio. A phased reduction "
                "and diversification of this position is under discussion.",
                "",
                "Annual income: approximately CHF 4.5 million, mainly investment income, dividends, "
                "and bond coupons.",
                "Annual spending: approximately CHF 1.8 million, covering household, lifestyle, and "
                "philanthropic commitments.",
                "Net annual surplus is reinvested in line with the mandate.",
                "",
                "Mandate: balanced, with capital preservation as the first objective. The client "
                "prefers to protect capital over reaching for higher returns.",
            ])
        if client["id"] == "lukas_adler":
            return ("Financial Statements 2025, Summary Balance Sheet", [
                f"Client: {name}.",
                "Reporting date: 31 December 2025. Reporting currency: Swiss francs (CHF).",
                "Total consolidated net worth: approximately CHF 240 million.",
                "",
                "Assets by class, approximate values and shares of the portfolio.",
                "Shareholding in Adler Pharma Distribution GmbH, the family operating company: "
                "CHF 145 million, about 60 percent. This stake was inherited in full and is the "
                "largest position in the estate.",
                "Commercial and residential real estate in and around Munich: CHF 55 million, "
                "about 23 percent.",
                "Listed securities and diversified funds: CHF 24 million, about 10 percent.",
                "Cash and short term deposits: CHF 16 million, about 7 percent.",
                "",
                "The holding in Adler Pharma Distribution GmbH is a 60 percent concentration in a "
                "single private operating company and is the principal risk in the estate. A phased "
                "diversification is under discussion.",
                "",
                "Annual income: approximately CHF 5.2 million, mainly dividends from the GmbH and "
                "rental income from the property portfolio.",
                "Annual spending: approximately CHF 2.2 million, covering household, child support, "
                "and lifestyle.",
                "",
                "Mandate: not yet set; the client wants to de-risk before committing to a strategy.",
            ])
        if client["id"] == "viktor_sokolenko":
            return ("Financial Statements 2025, Summary Balance Sheet", [
                f"Client: {name}.",
                "Reporting date: 31 December 2025. Reporting currency: Swiss francs (CHF).",
                "Total consolidated net worth: approximately CHF 410 million.",
                "",
                "Assets by class, approximate values and shares of the portfolio.",
                "Interest in Meridian Energy Holdings Ltd, an energy and metals trading group: "
                "CHF 287 million, about 70 percent. The holding is held through an offshore chain "
                "of Cyprus and BVI companies with nominee shareholders, so the ultimate beneficial "
                "owner is not visible on the face of the structure.",
                "Listed securities and diversified funds: CHF 70 million, about 17 percent.",
                "Cash and short term deposits: CHF 53 million, about 13 percent.",
                "",
                "The 70 percent concentration in a single energy and metals group, held through an "
                "opaque nominee arrangement, is the principal risk in the portfolio. The source of "
                "wealth has not yet been evidenced to the bank.",
                "This allocation does not match a first-time, balanced onboarding profile and "
                "raises a suitability question for the advisor.",
                "",
                "Annual income: approximately CHF 7.8 million. Annual spending: approximately "
                "CHF 3.1 million.",
            ])
        if client["id"] == "elena_marchetti":
            return ("Financial Statements 2024, Summary Balance Sheet", [
                f"Client: {name}.",
                "Reporting date: 31 December 2024. Reporting currency: Swiss francs (CHF).",
                "Total consolidated net worth: approximately CHF 200 million.",
                "",
                "Most assets are now held through Marchetti Holding SA, a holding company "
                "incorporated in Luxembourg. Elena Marchetti is the ultimate beneficial owner of "
                "the holding. The Marchetti Family Trust, settled in Jersey in February 2024, "
                "owns shares of Marchetti Holding SA.",
                "",
                "Assets held under Marchetti Holding SA, approximate values.",
                "Cash and short term deposits from the company sale: CHF 180 million. These are the "
                "net proceeds of the November 2023 sale of Helvetia Robotics AG.",
                "100 percent of Alpine Ventures GmbH, a Swiss venture capital firm acquired by the "
                "holding in 2025: carried at CHF 6 million.",
                "Commercial property, Bahnhofstrasse 14, Zurich: CHF 9 million.",
                "Residential property, Villa Lugano, Ticino: CHF 5 million.",
                "",
                "Held outside the holding and the trust: the Marchetti Education Foundation, funded "
                "with CHF 8 million, sits separately. Elena is its Founder and Principal. Foundation "
                "assets are not part of her personal net worth.",
                "",
                "Annual income: approximately CHF 3.2 million. Annual spending: approximately "
                "CHF 1.9 million.",
                "Mandate: capital preservation first, with a measured redeployment into ventures.",
            ])
        if client["id"] == "henrik_lindqvist":
            return ("Financial Statements 2024, Summary Balance Sheet", [
                f"Client: {name}.",
                "Reporting date: 31 December 2024. Reporting currency: Swiss francs (CHF).",
                "Total consolidated net worth: approximately CHF 220 million.",
                "",
                "Most assets are now held through Lindqvist Capital AG, a holding company "
                "incorporated in Zug, Switzerland. Henrik Lindqvist is the ultimate beneficial "
                "owner of the holding. The Lindqvist Family Trust, settled in Liechtenstein in "
                "2022, owns the shares of Lindqvist Capital AG.",
                "",
                "Assets held under Lindqvist Capital AG, approximate values.",
                "Cash and short term deposits from the company sale: about CHF 200 million. These "
                "are the net proceeds of the 2021 sale of Nordpay AB for CHF 290 million.",
                "Residual stake in Nordpay AB, retained at the sale: about CHF 8 million.",
                "Residential property, a Stockholm apartment: about CHF 5 million.",
                "Residential property, a Zermatt chalet: about CHF 7 million.",
                "",
                "Held outside the holding and the trust: the Lindqvist Code Foundation, funded "
                "with CHF 6 million, sits separately. Henrik is its Founder and Chairman. "
                "Foundation assets are not part of his personal net worth.",
                "",
                "Annual income: approximately CHF 3 million. Annual spending: approximately "
                "CHF 1.7 million.",
                "Mandate: capital preservation first, with the exit proceeds ring-fenced.",
            ])
        return ("Financial statements", [
            f"Client: {name}", f"Net worth, about {client['currency']} {int(client['net_worth']):,}.",
        ])
    if dt == "trust_deed":
        if client["id"] == "sarah_keller":
            return ("Keller Family Trust, Trust Deed Summary", [
                "Instrument: irrevocable discretionary family trust, governed by Swiss law.",
                "Date of settlement: 2023.",
                f"Settlor: {name}.",
                "Trustees: Helvetia Trust Company AG, a professional corporate trustee in Zurich, "
                "acting together with the settlor's longstanding family lawyer as co-trustee.",
                "Protector: a family adviser is named as protector with limited oversight powers.",
                "Beneficiaries: the settlor's two children, a daughter aged 18 and a son aged 16. "
                "The settlor is a beneficiary of last resort.",
                "Purpose: to hold part of the family estate and provide for an orderly, multi "
                "generational transfer of wealth to the next generation, with distributions at the "
                "trustees' discretion for education, health, and welfare.",
                "Trust assets: a portion of the proceeds of the 2023 sale of Helvetia SaaS AG, "
                "together with related investments.",
                "Note: the eldest child, the daughter aged 18, is expected to begin university "
                "studies in the United Kingdom. A child resident or studying in the UK raises a "
                "cross border Swiss and UK tax question that should be reviewed before any "
                "distribution is made to her.",
            ])
        if client["id"] == "lukas_adler":
            return ("Inheritance Deed, Estate of Heinrich Adler, Summary", [
                "Instrument: notarial certificate of inheritance (Erbschein), German law.",
                "Date: 2025.",
                "Deceased: Heinrich Adler, founder of Adler Pharma Distribution GmbH.",
                f"Sole heir: {name}, the only child of the deceased.",
                "Estate assets: a 100 percent shareholding in Adler Pharma Distribution GmbH, a "
                "portfolio of commercial and residential property in the Munich area, and listed "
                "securities and cash held at German banks.",
                "Effect: the heir succeeds to the full estate, becoming sole shareholder of the "
                "GmbH and owner of the property portfolio.",
                "German inheritance tax (Erbschaftsteuer) on the estate has been assessed and the "
                "first instalment settled; a payment plan covers the balance.",
                "Note: the client intends to settle part of the estate into a trust for his young "
                "son. No trust is in place yet. The structure should be reviewed for German tax and "
                "for the terms of the divorce settlement before any assets are moved.",
            ])
        if client["id"] == "viktor_sokolenko":
            return ("Sokolenko Family Trust, Trust Deed Summary", [
                "Instrument: discretionary trust governed by British Virgin Islands law.",
                f"Settlor: {name}.",
                "Trustee: a BVI licensed corporate trustee.",
                "Underlying assets: the trust sits over a holding chain of Cyprus and BVI "
                "companies, which in turn hold the interest in Meridian Energy Holdings Ltd.",
                "Shareholders of the underlying companies are nominee shareholders, so the "
                "ultimate beneficial owner is not visible on the face of the structure.",
                "Note for the wealth planner: the offshore nominee arrangement is opaque. The "
                "ultimate beneficial owner must be established and the structure reviewed before "
                "the bank can see through it.",
                "Cross border note: the eldest child is resident in the United Kingdom, the client "
                "plans to acquire a London residence, the client is Swiss domiciled, and the "
                "structure is Cyprus tax resident. This Swiss, UK, and Cyprus exposure must be "
                "confirmed by the tax specialist before any gift, distribution, or purchase.",
            ])
        if client["id"] == "elena_marchetti":
            return ("Marchetti Family Trust, Trust Deed Summary", [
                "Instrument: irrevocable discretionary family trust, governed by the law of Jersey.",
                "Date of settlement: February 2024.",
                f"Settlor: {name}.",
                "Trustee: a Jersey licensed corporate trustee.",
                "Directors of the trustee arrangement: Marco Marchetti is named as a director.",
                "Beneficiaries: Elena Marchetti and her husband Marco Marchetti. Marco is a "
                "co-beneficiary of the trust. No children are named.",
                "Trust property: the trust owns shares of Marchetti Holding SA, a holding company "
                "incorporated in Luxembourg. Further holding shares are to be settled into the "
                "trust to complete the funding.",
                "Control chain: the Marchetti Family Trust (Jersey) sits at the top. It owns shares "
                "of Marchetti Holding SA (Luxembourg), whose ultimate beneficial owner is Elena "
                "Marchetti. The holding in turn owns 100 percent of Alpine Ventures GmbH, holds the "
                "CHF 180 million sale cash, and owns the Bahnhofstrasse 14 Zurich commercial "
                "property and the Villa Lugano Ticino residential property.",
                "Outside the structure: the Marchetti Education Foundation is not held by the trust "
                "or the holding. Elena is its Founder and Principal.",
                "Purpose: to ring-fence and protect the proceeds of the 2023 company sale and to "
                "provide for an orderly multi generational transfer of wealth.",
            ])
        if client["id"] == "henrik_lindqvist":
            return ("Lindqvist Family Trust, Trust Deed Summary", [
                "Instrument: irrevocable discretionary family trust, governed by the law of "
                "Liechtenstein.",
                "Date of settlement: 2022.",
                f"Settlor: {name}.",
                "Trustee: a Liechtenstein licensed corporate trustee.",
                "Directors of the trustee arrangement: Astrid Lindqvist is named as a director.",
                "Beneficiaries: Henrik Lindqvist and his wife Astrid Lindqvist. Astrid is a "
                "co-beneficiary of the trust. No children are named.",
                "Trust property: the trust owns the shares of Lindqvist Capital AG, a holding "
                "company incorporated in Zug, Switzerland. Further holding shares are to be "
                "settled into the trust to complete the funding.",
                "Control chain: the Lindqvist Family Trust (Liechtenstein) sits at the top. It "
                "owns the shares of Lindqvist Capital AG (Zug, Switzerland), whose ultimate "
                "beneficial owner is Henrik Lindqvist. The holding in turn holds the CHF 290 "
                "million cash proceeds of the 2021 Nordpay AB sale, the residual stake in Nordpay "
                "AB, and the two properties, a Stockholm apartment and a Zermatt chalet.",
                "Outside the structure: the Lindqvist Code Foundation is not held by the trust "
                "or the holding. Henrik is its Founder and Chairman.",
                "Purpose: to ring-fence and protect the proceeds of the 2021 company sale and to "
                "provide for an orderly multi generational transfer of wealth.",
            ])
        return ("Family trust deed (summary)", [
            f"Settlor: {name}", "A family trust holds part of the estate for the next generation.",
            "Beneficiaries, the settlor's children.",
            "Purpose, an orderly transfer of wealth across generations.",
        ])
    if dt == "source_of_wealth":
        if client["id"] == "sarah_keller":
            return ("Source of Funds Letter", [
                f"Re: Sarah Keller, primary source of funds and source of wealth.",
                "",
                "This letter sets out the origin of the funds and assets placed under management.",
                "",
                f"Sarah Keller founded and led Helvetia SaaS AG, a Zurich based enterprise software "
                "company, from 2010. As founder and Chief Executive Officer she built the company "
                "to profitability over more than a decade.",
                "In 2023 she sold Helvetia SaaS AG to Atlas Software Group. The sale generated net "
                "proceeds of approximately CHF 190 million to Sarah Keller. This sale is the "
                "principal source of her private wealth.",
                "Co-investor: Lakeside Ventures held a minority stake in Helvetia SaaS AG and fully "
                "exited its position at the close of the transaction.",
                "Part of the consideration was paid in listed stock of Atlas Software Group, which "
                "is now the largest single holding in the portfolio.",
                "",
                "The proceeds are legitimate proceeds from the sale of a company the client founded "
                "and operated. No borrowed funds and no third party funds were used to build or "
                "acquire this wealth.",
                "",
                "Screening note for compliance: a 2019 local news article names an unrelated person, "
                "an S. Keller, in connection with a fraud case. That individual has a different date "
                "of birth and a different nationality from the client and is most likely a name "
                "overlap only. This is to be confirmed and cleared by compliance.",
                "",
                "Supporting documentation, including the share sale agreement and proof of receipt "
                "of proceeds, has been provided to the bank.",
            ])
        if client["id"] == "lukas_adler":
            return ("Source of Funds Letter", [
                f"Re: Lukas Adler, primary source of funds and source of wealth.",
                "",
                "This letter sets out the origin of the funds and assets placed under management.",
                "",
                "Lukas Adler inherited his entire estate in 2025 from his late father, Heinrich "
                "Adler, who founded and built Adler Pharma Distribution GmbH, a Munich based "
                "pharmaceutical wholesale and distribution group, over four decades.",
                "The estate comprises a 100 percent shareholding in the GmbH, a Munich property "
                "portfolio, and listed securities and cash. The inheritance is the principal source "
                "of the client's wealth.",
                "The underlying business is an established, regulated pharmaceutical distributor "
                "with audited accounts. No borrowed funds and no third party funds were used to "
                "build this wealth.",
                "",
                "Screening note for compliance: the automated sanctions and PEP screen returned a "
                "surname overlap match against a sanctioned Russian national, Mikhail Adler. That "
                "individual has a different first name, a different date of birth, and a different "
                "nationality from the client, and no connection to the client or the family "
                "business has been found. This appears to be a name overlap only and is to be "
                "confirmed and cleared by compliance.",
                "",
                "Supporting documentation, including the certificate of inheritance and the GmbH "
                "audited accounts, has been provided to the bank.",
            ])
        if client["id"] == "viktor_sokolenko":
            return ("Source of Funds Letter", [
                f"Re: Viktor Sokolenko, primary source of funds and source of wealth.",
                "",
                "The client's wealth derives from his interest in Meridian Energy Holdings Ltd, "
                "an energy and metals trading group active across several jurisdictions.",
                "The holding is held through an offshore chain of Cyprus and BVI companies with "
                "nominee shareholders. The source of wealth has not yet been evidenced to the "
                "bank with underlying records.",
                "",
                "Screening note for compliance: the PEP screen returned a true profile match. The "
                "client served as a regional energy commissioner and was a board member of a state "
                "energy enterprise. This is a confirmed match on the person, not a name overlap, "
                "and requires four-eyes compliance approval.",
                "",
                "Adverse media note: Meridian Energy Holdings Ltd has been linked in reporting to "
                "opaque cross-border trades and to a procurement inquiry. This must be reviewed by "
                "compliance alongside the PEP match.",
                "",
                "Supporting documentation to evidence the source of wealth is still outstanding.",
            ])
        if client["id"] == "elena_marchetti":
            return ("Source of Funds Letter", [
                f"Re: Dr. Elena Marchetti, primary source of funds and source of wealth.",
                "",
                "This letter sets out the origin of the funds and assets placed under management, "
                "with a dated history of the business she built and sold.",
                "",
                "In March 2008 Elena Marchetti founded Helvetia Robotics AG, a Zurich based "
                "industrial robotics company.",
                "In September 2014 the company raised a Series A round of CHF 22 million, led by "
                "Alpine Ventures GmbH.",
                "In 2019 Helvetia Robotics AG expanded across Europe.",
                "In November 2023 she sold Helvetia Robotics AG for CHF 180 million. This sale is "
                "the principal source of her private wealth.",
                "In February 2024 she settled the Marchetti Family Trust in Jersey.",
                "In May 2024 she funded the Marchetti Education Foundation with CHF 8 million for "
                "STEM scholarships across Ticino and Lombardy.",
                "In 2025 Marchetti Holding SA, her Luxembourg holding company, acquired Alpine "
                "Ventures GmbH, the venture firm that had backed her Series A.",
                "",
                "The proceeds are legitimate proceeds from the sale of a company the client founded "
                "and operated. No borrowed or third party funds were used to build this wealth.",
                "",
                "Screening note for compliance: source of wealth evidence, including the share sale "
                "agreement and proof of receipt of the CHF 180 million, is to be confirmed and "
                "cleared by compliance before onboarding completes.",
            ])
        if client["id"] == "henrik_lindqvist":
            return ("Source of Funds Letter", [
                f"Re: Henrik Lindqvist, primary source of funds and source of wealth.",
                "",
                "This letter sets out the origin of the funds and assets placed under management, "
                "with a dated history of the business he built and sold.",
                "",
                "In 2009 Henrik Lindqvist founded Nordpay AB, a payments company based in "
                "Stockholm, Sweden.",
                "In 2016 the company raised a Series B funding round of CHF 40 million.",
                "In 2021 he sold Nordpay AB to a United States payments group for CHF 290 million, "
                "keeping a small residual stake. This sale is the principal source of his private "
                "wealth.",
                "In 2022 he settled the Lindqvist Family Trust in Liechtenstein.",
                "In 2023 he launched the Lindqvist Code Foundation, funding it with CHF 6 million "
                "for coding education for youth in Sweden and Switzerland.",
                "",
                "Ownership chain: the Lindqvist Family Trust (Liechtenstein) owns the shares of "
                "Lindqvist Capital AG (Zug, Switzerland), whose ultimate beneficial owner is "
                "Henrik Lindqvist. The holding holds the CHF 290 million cash proceeds, the "
                "residual stake in Nordpay AB, and the two properties, a Stockholm apartment and "
                "a Zermatt chalet. Astrid Lindqvist is a co-beneficiary and a director of the "
                "trust.",
                "",
                "The proceeds are legitimate proceeds from the sale of a company the client "
                "founded and operated. No borrowed or third party funds were used to build this "
                "wealth.",
                "",
                "Screening note for compliance: an automated adverse media screen returned a name "
                "overlap match on the surname Lindqvist, against an unrelated H. Lindqvist named "
                "in a 2018 local matter. That individual has a different first name, a different "
                "date of birth, and a different nationality from the client. This is most likely "
                "a name overlap only and is to be confirmed and cleared by compliance.",
            ])
        return ("Source of Wealth — Statement", [
            f"Subject: {name}", f"Domicile: {dom}",
            "Declared source of wealth: proceeds from a privately owned operating business and "
            "long-term investment returns.", "Supporting documentation provided to the bank.",
        ])
    if dt == "asset_summary":
        if client["id"] == "sarah_keller":
            return ("Asset Summary — Consolidated Balance Sheet (Summary)", [
                f"Client: {name}", "Total net worth: approximately CHF 180 million.",
                "Allocation: 22% single-name concentration in Atlas Software Group listed stock "
                "(received as part of the 2023 sale consideration).",
                "Remainder: diversified across bonds (35%), global equities (25%), cash (10%), and "
                "private/alternative assets (8%).", "Mandate: balanced, capital preservation.",
                "Note: the single-name concentration is the principal portfolio risk and the basis "
                "for a proposed phased liquidity programme.",
            ])
        if client["id"] == "elena_marchetti":
            return ("Asset Summary — Ownership and Control Chain", [
                f"Client: {name}", "Total net worth: approximately CHF 200 million.",
                "Top of the structure: the Marchetti Family Trust, settled in Jersey in February "
                "2024. It owns shares of Marchetti Holding SA.",
                "Marchetti Holding SA is incorporated in Luxembourg. Elena Marchetti is the "
                "ultimate beneficial owner. Her husband Marco Marchetti is a co-beneficiary of the "
                "trust and a director.",
                "Held by Marchetti Holding SA: 100 percent of Alpine Ventures GmbH (a Swiss venture "
                "capital firm acquired in 2025); the CHF 180 million cash from the November 2023 "
                "sale of Helvetia Robotics AG; the commercial property at Bahnhofstrasse 14, "
                "Zurich; and the residential property Villa Lugano in Ticino.",
                "Held outside the holding and the trust: the Marchetti Education Foundation, funded "
                "with CHF 8 million for STEM scholarships across Ticino and Lombardy. Elena is its "
                "Founder and Principal. Foundation assets are not part of her personal net worth.",
                "Note: funding of the Jersey trust with the remaining holding shares is still to be "
                "completed.",
            ])
        if client["id"] == "henrik_lindqvist":
            return ("Asset Summary — Ownership and Control Chain", [
                f"Client: {name}", "Total net worth: approximately CHF 220 million.",
                "Top of the structure: the Lindqvist Family Trust, settled in Liechtenstein in "
                "2022. It owns the shares of Lindqvist Capital AG.",
                "Lindqvist Capital AG is incorporated in Zug, Switzerland. Henrik Lindqvist is "
                "the ultimate beneficial owner. His wife Astrid Lindqvist is a co-beneficiary of "
                "the trust and a director.",
                "Held by Lindqvist Capital AG: the CHF 290 million cash proceeds from the 2021 "
                "sale of Nordpay AB to a United States payments group; the residual stake in "
                "Nordpay AB; a Stockholm apartment; and a Zermatt chalet.",
                "Held outside the holding and the trust: the Lindqvist Code Foundation, funded "
                "with CHF 6 million for coding education for youth in Sweden and Switzerland. "
                "Henrik is its Founder and Chairman. Foundation assets are not part of his "
                "personal net worth.",
                "Note: funding of the Liechtenstein trust with the remaining holding shares is "
                "still to be completed.",
            ])
        return ("Asset Summary", [
            f"Client: {name}", f"Total net worth: approximately {client['currency']} "
            f"{int(client['net_worth']):,}.", "Mandate: see relationship file.",
        ])
    if dt == "news":
        if client["id"] == "sarah_keller":
            return ("Board and Press Profile", [
                f"Subject: {name}.",
                f"{name} is the founder and former Chief Executive Officer of Helvetia SaaS AG, a "
                "Zurich enterprise software company she sold in 2023.",
                "She now sits on the board of the Keller Foundation, the family's impact "
                "philanthropy vehicle, which supports education and technology access programmes.",
                "She is a frequent and well regarded speaker on next generation wealth and impact "
                "giving at Zurich foundation and family office events.",
                "She angel invests in impact aligned ventures, backing early stage founders working "
                "on education, health, and climate technology.",
                "Press coverage to date is consistently positive and focuses on her record as a "
                "technology founder and her philanthropic work.",
                "No adverse media relating to the client herself has been identified in this "
                "compilation. Her public reputation is positive.",
            ])
        if client["id"] == "lukas_adler":
            return ("Company and Press Profile", [
                f"Subject: {name}.",
                "Adler Pharma Distribution GmbH is a Munich based pharmaceutical wholesale and "
                "distribution group founded by Heinrich Adler in the 1980s. It supplies pharmacies "
                "and clinics across southern Germany.",
                f"{name} is the founder's only child. He took over as sole shareholder and acting "
                "chairman in 2025 after his father's death.",
                "Before stepping into the chairman role he worked in the group's commercial and "
                "logistics functions for several years.",
                "Trade press coverage of the succession has been factual and neutral, noting the "
                "founder's death and the handover to the next generation.",
                "He keeps a low public profile and has not sought media attention.",
                "No adverse media relating to the client himself has been identified in this "
                "compilation.",
            ])
        if client["id"] == "viktor_sokolenko":
            return ("Company and Press Profile", [
                f"Subject: {name}.",
                "Meridian Energy Holdings Ltd is an energy and metals trading group that the "
                "client controls through an offshore holding chain.",
                f"{name} is described in profiles as the industrialist behind the group, with a "
                "background in regional energy administration before moving into private trading.",
                "Adverse media reporting links Meridian Energy Holdings Ltd to opaque cross-border "
                "trades and names the group in connection with a procurement inquiry.",
                "Separate reporting names the client himself in connection with a cross-border "
                "trading and procurement inquiry.",
                "This adverse media is to be reviewed and confirmed by compliance.",
            ])
        if client["id"] == "elena_marchetti":
            return ("Company and Press Profile", [
                f"Subject: {name}.",
                "Dr. Elena Marchetti founded Helvetia Robotics AG in March 2008, a Zurich based "
                "industrial robotics company.",
                "In September 2014 the company raised a Series A of CHF 22 million, led by Alpine "
                "Ventures GmbH.",
                "In 2019 the company expanded across Europe.",
                "In November 2023 she sold Helvetia Robotics AG for CHF 180 million, a widely "
                "reported Swiss technology exit.",
                "After the sale she set up Marchetti Holding SA in Luxembourg to consolidate the "
                "proceeds, with herself as ultimate beneficial owner.",
                "In February 2024 she settled the Marchetti Family Trust in Jersey, with her "
                "husband Marco Marchetti as co-beneficiary and a director.",
                "In May 2024 she launched the Marchetti Education Foundation, funding it with "
                "CHF 8 million for STEM scholarships across Ticino and Lombardy. She serves as "
                "Founder and Principal of the foundation.",
                "In 2025 Marchetti Holding SA acquired Alpine Ventures GmbH, the firm that had led "
                "her Series A, and she now redeploys into early stage robotics through it.",
                "Press coverage is consistently positive and focuses on her record as a robotics "
                "founder and her STEM philanthropy. No adverse media relating to the client has "
                "been identified.",
            ])
        if client["id"] == "henrik_lindqvist":
            return ("Company and Press Profile", [
                f"Subject: {name}.",
                "Henrik Lindqvist founded Nordpay AB in 2009, a payments company based in "
                "Stockholm, Sweden.",
                "In 2016 the company raised a Series B funding round of CHF 40 million.",
                "In 2021 he sold Nordpay AB to a United States payments group for CHF 290 "
                "million, keeping a small residual stake, a widely reported Nordic fintech exit.",
                "After the sale he set up Lindqvist Capital AG in Zug, Switzerland to consolidate "
                "the proceeds, with himself as ultimate beneficial owner.",
                "In 2022 he settled the Lindqvist Family Trust in Liechtenstein, with his wife "
                "Astrid Lindqvist as co-beneficiary and a director.",
                "In 2023 he launched the Lindqvist Code Foundation, funding it with CHF 6 million "
                "for coding education for youth in Sweden and Switzerland. He serves as Founder "
                "and Chairman of the foundation.",
                "He has stepped back from running the company and now holds a holding company and "
                "a residual stake, and he wants to back young founders.",
                "Press coverage is consistently positive and focuses on his record as a payments "
                "founder and his coding-education philanthropy. No adverse media relating to the "
                "client has been identified.",
            ])
        return ("Public Profile (Press Compilation)", [
            f"Subject: {name}.", "No material adverse media identified in the compilation.",
        ])
    return (doc["filename"], [f"Document for {name}."])


def ensure_documents(seed: list[dict]) -> None:
    if not _HAS_RL:
        return
    for client in seed:
        folder = settings.documents_dir / client["id"]
        for doc in client.get("documents", []):
            path = folder / doc["filename"]
            if path.exists():
                continue
            title, lines = _content(client, doc)
            try:
                _write_pdf(path, title, lines)
            except Exception:
                pass
