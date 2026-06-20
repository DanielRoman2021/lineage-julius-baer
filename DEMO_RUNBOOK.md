# Lineage, demo runbook

Lineage turns the one-way KYC intake into a living wealth story the client co-owns.
A multi-agent pipeline verifies the intake, every risk goes to a named human, and the
client gets back a story, a Wheel of Life, and a life plan. The relationship manager
gets a trust score, next actions, and an approvals queue.

## Run it locally

First time:

```
cd wealth_story_ai
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env        # optional: set ANTHROPIC_API_KEY and MONGODB_URI

cd ..\frontend
npm install
```

Every time:

```
.\run-demo.ps1
```

Backend on http://localhost:8000, frontend on http://localhost:3000. With no
`ANTHROPIC_API_KEY` the app runs in demo mode with prepared answers, fully offline.
With a key set it runs the real agents (badge shows "Live AI"). With no `MONGODB_URI`
it falls back to the bundled JSON seed.

## 60 second demo

1. Landing, choose "Enter as relationship manager".
2. Dashboard, open Sarah Keller.
3. Client 360, point at the trust gauge and the relationship memory. Add a note, it saves.
4. Click "Run verification". The four columns fill in live. KYC clears criminal, PEP,
   and social, and finds one adverse-media hit on the source of funds. The tax agent
   flags a cross border Swiss and UK question. Two items route to people, Daniel Roth
   in compliance and Léa Fontaine in tax. Markus stays the final approver. The guardrail
   chip reads "Human only, the AI cannot execute".
5. Action Points, open the compliance card, read the audit trail (input, model version,
   reviewer, reason), press Approve. The item clears, the trust score moves.
6. "View as client". Sarah sees her wealth story, her Wheel of Life with the two low
   dimensions called out, her life plan with the levers, and a note from Markus she can
   reply to in secure chat.

## What is real, and what is mocked

Real:

- The multi-agent pipeline. Nine agents in three stages, streamed to the screen over SSE.
- Live Anthropic calls when a key is set. Structured JSON via `messages.parse`, Sonnet 4.6
  for the specialists, Opus 4.8 for the writing and synthesis.
- Human in the loop. Approve, override, re-route, with an audit line for every decision,
  a relationship trust score, and named owners. All persisted.
- MongoDB Atlas for clients, staff, notes, and pipeline results.
- The life-plan feasibility projection (plain math) and the live simulator levers.
- PDF text extraction (pdfplumber) of the sample documents.
- The full two-faced app, every screen clickable.

Mocked:

- The external watchlists (PEP, sanctions, adverse media, social) are canned datasets.
  The lookups are simple matches. The reasoning on top is the real model.
- The sample client documents are generated, not real client files.
- With no API key, every agent returns a prepared answer so the demo runs offline.
- Secure chat replies are local to the screen.
- No KYC or AML decision is automated, and there are no IBANs, payments, or trades, by design.
