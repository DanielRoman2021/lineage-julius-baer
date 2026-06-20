# Lineage

**Julius Baer SwissHacks 2026 — Reimagining Online and Mobile Banking in Private Banking. Team LangGang.**

Lineage turns the one-way KYC onboarding process into a living wealth story the client co-owns. The same intake that a client provides for compliance produces two things at once: a verified, risk-screened intelligence file for the bank, and a personal narrative (a wealth story, a Wheel of Life, and a life-plan feasibility view) for the client. A pipeline of AI specialists reads the documents, screens for risk, routes anything sensitive to the right human expert, and drafts the story and the action points. The AI does the bureaucracy; a named human owns every risk decision through approval gates, with a full audit trail.

- **Live app (client + RM):** https://lineage-31i.pages.dev
- **Live API:** https://lineage-api-h1gi.onrender.com (health: `/api/health`)

---

## 1. What it does

- **Intake.** A client opens a secure onboarding link, uploads documents, and the pipeline runs.
- **Verification.** A KYC agent screens identity and document text against mock PEP / sanctions / adverse-media / social datasets, raises structured risk flags, and a router sends each flag to the right human role with a plain-English reason.
- **Human-in-the-loop.** Every flag, finding, and action waits for a named human to approve, re-route, or override. Each decision writes an audit entry.
- **Client value.** Out of the same intake comes a narrative wealth story with dated milestones, an ownership graph, a Wheel of Life across ten dimensions, and a life-plan feasibility projection.
- **RM cockpit.** A relationship trust score, a cross-client verification overview, an approvals queue, and the live agent-verification flow graph.

The AI flags, extracts, drafts, and writes. It never makes a risk decision on its own, and it does not touch payments or IBANs.

---

## 2. The agent pipeline

`parse` is a service (PDF text extraction), not an LLM agent. The ten agents below each have a prompt in `wealth_story_ai/prompts/`, call the Anthropic SDK with a forced structured output schema, and have a canned fallback for offline mode.

| # | Agent | Model tier | What it does |
|---|-------|-----------|--------------|
| 1 | **KYC** | Sonnet 4.6 | Classifies each mock screening hit (true match vs false positive), writes the rationale, extracts identity fields, raises `RiskFlag`s |
| 2 | **Compliance Router** | Sonnet 4.6 | Maps each flag / finding to a human role and writes the human-readable reason; confidence below 0.70 auto-escalates |
| 3 | **Advisor** | Sonnet 4.6 | Reviews suitability and relationship items, drafts notes |
| 4 | **Wealth Planner** | Sonnet 4.6 | Reviews assets, holdings, and source of wealth |
| 5 | **Tax** | Sonnet 4.6 | Reviews domicile, cross-border, and residency-tax exposure |
| 6 | **Compliance** | Sonnet 4.6 | Reviews routed flags and drafts a recommendation for a human (never the decision itself) |
| 7 | **Wealth Story** | Opus 4.8 | Writes the client narrative plus dated milestones with source citations |
| 8 | **Goal** | Opus 4.8 | Extracts goals and assumptions; deterministic projection math computes feasibility; the LLM writes the verdict |
| 9 | **Graph** | Sonnet 4.6 | Builds the ownership / entity graph (people, companies, trusts, foundations, properties) |
| 10 | **Action** | Opus 4.8 | Synthesises everything into prioritised, role-owned action points |

A standalone **Conversation** agent (Opus 4.8) fires when a client re-prioritises a Wheel-of-Life dimension and produces talking points for the RM.

### Orchestration

```
Stage A (sequential):   parse -> KYC -> Compliance Router
Stage B (parallel):     Advisor | Wealth Planner | Tax | Compliance | Wealth Story | Goal | Graph
Stage C (sequential):   Action
Finalise:               recompute trust score, build verification summary
```

Stage B runs concurrently with `asyncio` and streams each agent's completion as it finishes. The orchestrator (`wealth_story_ai/orchestrator.py`) mutates a single `ClientState` in place, so the GET endpoints always reflect live progress.

### Routing criteria (deterministic mapping, LLM explains)

| Trigger | Routed to |
|---------|-----------|
| PEP / sanctions / adverse-media (financial crime), unresolved identity mismatch | Compliance Officer |
| Opaque source of wealth, unusual structures (trusts, holdcos) | Wealth Planner |
| Cross-border domicile, multi-jurisdiction income | Tax Expert |
| Suitability, relationship, data-quality, missing documents | Advisor (RM) |
| Confidence below 0.70 on any extraction or classification | auto-escalate to the relevant human |

### Human approval model

- Each routed flag, risk finding, and proposed action becomes an item in the approvals queue, assigned to its role.
- An approval card shows the staged recommendation, confidence, the source citation, and the guardrail. Approve / Re-route / Override are equal-effort.
- Every decision writes an `Approval` and an `AuditEntry` (input snapshot, model and version, confidence, reviewer, timestamp, rationale). A human decision is recorded with `model_version = "human-decision"`.
- The verification gate on the flow page turns green only once a real human approval is recorded, never from criteria math.

### Trust score

A transparent 0-100 score from four components, each capped at 25:

- `kyc_completeness` — documents parsed
- `data_freshness` — a pipeline has run
- `engagement` — the client completed their values DNA and goals
- `risk_cleared` — no open (unresolved) risk flags; contributes 0 until the pipeline has actually run

### Mocked vs real

External lookups are the only thing faked. `wealth_story_ai/data/` holds canned `pep_list`, `sanctions_list`, `adverse_media`, and `social_signals` datasets. `services/screening.py` fuzzy-matches a client's name (and substring-matches document text) against them and returns raw hits. The LLM does all the reasoning over those hits (severity, true match vs false positive, rationale). The intelligence is real; the data source is mocked and clearly labelled.

---

## 3. Tech stack

**Backend (`wealth_story_ai/`)**
- Python 3.12, FastAPI, Uvicorn
- Pydantic v2 + pydantic-settings (typed models and config)
- Anthropic Python SDK with structured outputs and adaptive thinking
- `sse-starlette` for the SSE stream; a background-task + polling path for hosting that buffers SSE (see Operational notes)
- `pdfplumber` for parsing uploaded documents, `reportlab` for generating the sample PDFs
- `pymongo` + `dnspython` for MongoDB Atlas

**Frontend (`frontend/`)**
- Next.js 15 (App Router), React 19, TypeScript 5
- Tailwind CSS 3
- `@xyflow/react` (React Flow) for the agent-verification node graph and the ownership graph
- `recharts` for the feasibility projection and trust gauge, custom SVG for the Wheel of Life
- `framer-motion` for motion, `lucide-react` for icons

**Models (Anthropic Claude)**
- `claude-opus-4-8` (synthesis tier): Wealth Story, Goal, Action, Conversation
- `claude-sonnet-4-6` (specialist tier): KYC, Compliance Router, Advisor, Wealth Planner, Tax, Compliance, Graph
- Adaptive thinking only, structured outputs (the SDK parse helper), confidence threshold 0.70
- No API key set falls back to high-quality canned artifacts (demo mode), so the whole flow runs offline and identically

**Data**
- MongoDB Atlas (database `lineage`): clients, staff, relationship notes, and pre-computed pipeline results
- Falls back to the bundled JSON seed when no Mongo URI is set

---

## 4. Repository layout

```
.
├── wealth_story_ai/            # FastAPI backend
│   ├── app.py                  # API routes, CORS, SSE + background run
│   ├── orchestrator.py         # stage A -> B -> C pipeline
│   ├── anthropic_client.py     # structured-output wrapper + canned fallback
│   ├── config.py               # env, model tiers, thresholds
│   ├── store.py                # Mongo-backed client store (+ JSON fallback)
│   ├── db.py                   # Mongo connection helpers
│   ├── agents/                 # one module per agent
│   ├── prompts/                # one prompt per agent
│   ├── models/client.py        # all Pydantic models
│   ├── services/               # pdf_parser, screening, feasibility, trust_score,
│   │                           #   verification, sample_docs, people
│   ├── data/                   # mock datasets + clients_seed.json + people_seed.json
│   ├── documents/              # generated sample PDFs per client (gitignored)
│   └── scripts/                # seed / add / delete / blank-onboarding helpers
├── frontend/                   # Next.js app (App Router)
│   ├── app/                    # routes (see below)
│   ├── components/             # shared UI (graph, switcher, states, ...)
│   ├── lib/                    # api.ts (client), types.ts (mirror of backend models)
│   ├── .env.production         # NEXT_PUBLIC_API_URL -> Render (committed)
│   └── wrangler.toml           # Cloudflare Pages config
├── render.yaml                 # Render blueprint for the backend
├── run-demo.ps1                # launch backend + frontend locally (Windows)
└── DEMO_RUNBOOK.md             # demo script
```

---

## 5. Backend API

Base path `/api`.

**Clients and pipeline**
- `GET /clients` — list with trust score, open flags, pending actions, `has_run`
- `POST /clients` — create a new onboarding client
- `GET /clients/{id}` — full `ClientState` (the aggregate payload)
- `POST /clients/{id}/documents` — upload PDFs (multipart)
- `POST /clients/{id}/run` — run the pipeline, **SSE** stream of stage events
- `POST /clients/{id}/start` — run the pipeline as a **background task** (poll `/pipeline`)
- `GET /clients/{id}/pipeline` — current run + per-stage status
- `GET /clients/{id}/verification` — KYC sub-checks, specialist statuses, criteria counts, `status` (`blocked` / `not_started` / `complete`)

**Client value**
- `GET /clients/{id}/wheel`, `POST /clients/{id}/dna`
- `GET /clients/{id}/wealth-story`
- `GET /clients/{id}/feasibility`, `POST /clients/{id}/feasibility/simulate`
- `POST /clients/{id}/conversation-signal`

**Risk decisions (always a human's)**
- `GET /clients/{id}/flags`, `POST /clients/{id}/flags/{flagId}/decision`
- `POST /clients/{id}/findings/{findingId}/decision`
- `GET /clients/{id}/actions`, `POST .../actions/{id}/approve`, `POST .../actions/{id}/reroute`

**Cross-cutting**
- `GET /clients/{id}/trust-score`, `GET /clients/{id}/audit`
- `GET /clients/{id}/notes`, `POST /clients/{id}/notes`
- `GET /approvals` (cross-client queue + oversight integrity), `GET /people`
- `GET /health`

### Key data models (`models/client.py`)

`Client`, `Document`, `RiskFlag`, `RoutingDecision`, `Finding`, `WealthStory` + `Milestone`, `WealthGraph` + `GraphNode` + `GraphEdge`, `Goal`, `Feasibility`, `WheelOfLife`, `ActionPoint`, `Approval`, `AuditEntry`, `TrustScore`, `PipelineRun` + `PipelineStage`, `Verification` + `SubCheck` + `SpecialistReview`, and `ClientState` (everything the GET payload returns).

---

## 6. Frontend routes

**Client companion (mobile-styled)**
- `/onboard/[id]` — welcome, upload, analysing, reveal (the onboarding flow)
- `/client/[id]` — home, with tabs `/story`, `/wheel`, `/feasibility`, `/graph`, `/chat`
- `/client/intake` — intake and DNA questionnaire

**RM cockpit (desktop)**
- `/rm` — dashboard: client list, trust score, action points, approvals widget
- `/rm/clients/[id]` — Client 360, plus `/vault`, `/flow`, `/story`, `/structure`
- `/rm/clients/[id]/flow` — the live agent-verification node graph (the showpiece)
- `/rm/verification` — cross-client verification overview
- `/rm/approvals` — approvals queue, approval cards, oversight integrity, audit drawer

---

## 7. Deployments

| Piece | Host | URL | Notes |
|-------|------|-----|-------|
| Backend | Render (Blueprint `render.yaml`) | https://lineage-api-h1gi.onrender.com | Python 3.12.7, free plan, `autoDeploy` on push to `main`, health `/api/health` |
| Frontend | Cloudflare Pages (next-on-pages) | https://lineage-31i.pages.dev | `wrangler.toml` with `nodejs_compat`, auto-deploys on push to `main` |
| Database | MongoDB Atlas | shared by local + deployed | database `lineage` |

Both auto-deploy from `main` on the fork. Backend secrets (`ANTHROPIC_API_KEY`, `MONGODB_URI`) are set in the Render dashboard, never in the repo.

**Backend env vars:** `ANTHROPIC_API_KEY`, `MONGODB_URI`, `MONGODB_DB` (default `lineage`), `CORS_ORIGINS`, `ANTHROPIC_MODEL_SYNTHESIS`, `ANTHROPIC_MODEL_SPECIALIST`, `CONFIDENCE_THRESHOLD`.

**Frontend env var:** `NEXT_PUBLIC_API_URL`. The production build reads it from the committed `frontend/.env.production` (the Render URL). Local dev uses `frontend/.env.local` (`http://localhost:8000`), which is gitignored and only loaded by `next dev`.

---

## 8. Run locally

**Backend**
```bash
cd wealth_story_ai
python -m venv .venv && . .venv/Scripts/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                                   # optional: add ANTHROPIC_API_KEY + MONGODB_URI
uvicorn app:app --reload --port 8000
```

**Frontend**
```bash
cd frontend
npm install
# .env.local already points NEXT_PUBLIC_API_URL at http://localhost:8000
npm run dev                                            # http://localhost:3000
```

On Windows, `run-demo.ps1` launches both.

**Offline / demo mode.** With no `ANTHROPIC_API_KEY` and no internet, every agent serves a canned artifact, so the entire flow still runs, instantly and identically. With no `MONGODB_URI`, the backend loads the bundled JSON seed instead of Atlas.

---

## 9. Operational notes

- **Render free tier sleeps** after 15 minutes idle (about a 50 second cold start). Warm it before a demo by loading the site once. The starter plan stays warm.
- **Run progress uses polling, not SSE, in the browser.** Render's proxy buffers streamed responses over HTTP/2 (which every browser uses), so the SSE `/run` events never reach the browser. The frontend therefore starts the run with `POST /start` and polls `GET /pipeline`, which works through any proxy. The SSE `/run` endpoint is kept for local use and curl (HTTP/1.1 streams fine).
- **New clients are seen after a restart.** The backend caches clients at first seed per process, so a client created directly in Mongo appears on a running instance only after a redeploy or restart.

---

## 10. Test clients

- **Henrik Lindqvist** (`/onboard/henrik_lindqvist`) — a clean onboarding that passes screening with nothing flagged.
- **Stefan Novak** (`/onboard/stefan_novak`) — onboarding where the KYC name screen matches a watchlist entry, raising a sanctions and adverse-media flag that routes to Compliance for a human to review and clear as a name overlap.

Both start blank (no documents). Their sample PDFs are generated on the server and can be regenerated for manual upload with `wealth_story_ai/scripts/setup_blank_onboarding.py <client_id>`.
