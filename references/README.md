# LexiClear — Technical Specification Repository

**Purpose:** This repository is the complete technical source of truth for implementing **LexiClear**, a browser-based legal accessibility and contract execution platform. It is written for an elite implementation agent (Claude Opus 5) and must be consumed in the reading order defined below. It is not marketing documentation; it is a precise engineering blueprint.

**Author:** Manus AI (Principal Software Architect)

---

## What LexiClear Is

LexiClear transforms dense legal documents into plain-language summaries, visual risk analysis, compliance findings, structural redline comparisons, clause relationship mapping, interactive financial/legal simulation, multi-agent negotiation, vernacular audio, and exportable counter-offers. It is a **session-centered** application: one active session equals one active contract-analysis context, and the user always works within the context of their current contract session.

The core system flow is:

```
UPLOAD → SESSION → DOCUMENT INGESTION → LAYOUT-AWARE PARSING → STRUCTURAL
REPRESENTATION → DETERMINISTIC COMPLIANCE → KNOWLEDGE GRAPH → AI ANALYSIS →
RISK MODEL → SIMULATION → NEGOTIATION → AUDIT → EXPORT
```

User-facing surfaces are deliberately few:

| Surface | Type |
|---|---|
| Authentication | Page set (`/login`, `/signup`) |
| Home | Page (`/`) |
| Document Workspace | Page (`/workspace/[sessionId]`) |
| Simulate / Negotiate | Pages (`/workspace/[sessionId]/simulate` and sub-routes) |
| Account | Page (`/account`) |
| Upload New | Overlay/sheet (no standalone route) |
| Export | Overlay/sheet (no standalone route) |

---

## How to Consume This Repository

Read in this order. Do not skip files.

1. `README.md` (this file)
2. `ARCHITECTURE.md` — system shape, data flow, layering
3. `IMPLEMENTATION_ORDER.md` — the 20 implementation phases, dependencies, acceptance criteria
4. `SECURITY.md` — security principles and cross-cutting rules
5. `ERROR_HANDLING.md` — unified error taxonomy (canonical error codes live here)
6. `TESTING.md` — testing strategy, layers, fixtures
7. `DEPLOYMENT.md` — environments, infrastructure, CI/release
8. `frontend/` — frontend architecture and its contract with the backend (13 files)
9. `backend/` — primary implementation specification (27 files)

## Repository Structure

```
lexiclear/
│
├── README.md                       # This file
├── ARCHITECTURE.md                 # System architecture and data flow
├── IMPLEMENTATION_ORDER.md         # 20-phase implementation plan + acceptance criteria
├── SECURITY.md                     # Cross-cutting security principles
├── ERROR_HANDLING.md               # Unified error taxonomy, error envelopes, mapping
├── TESTING.md                      # Test strategy, layers, fixtures, CI gates
├── DEPLOYMENT.md                   # Environments, infra, release, rollback
│
├── frontend/                       # Frontend technical specification
│   ├── README.md
│   ├── architecture.md
│   ├── application-shell.md
│   ├── routing.md
│   ├── state-management.md
│   ├── api-client.md
│   ├── authentication.md
│   ├── home.md
│   ├── document-workspace.md
│   ├── simulate-negotiate.md
│   ├── account.md
│   ├── upload-overlay.md
│   ├── export-overlay.md
│   ├── realtime.md
│   └── frontend-backend-contract.md
│
└── backend/                        # Primary implementation specification
    ├── README.md
    ├── architecture.md
    ├── project-structure.md
    ├── configuration.md
    ├── database.md
    ├── models.md
    ├── authentication.md
    ├── authorization.md
    ├── sessions.md
    ├── document-ingestion.md
    ├── file-storage.md
    ├── ocr-parser.md
    ├── structural-ast.md
    ├── redline-diff.md
    ├── compliance-engine.md
    ├── knowledge-graph.md
    ├── risk-engine.md
    ├── simulation.md
    ├── ai-orchestration.md
    ├── negotiation.md
    ├── audio.md
    ├── export.md
    ├── api.md
    ├── realtime.md
    ├── background-jobs.md
    ├── caching.md
    ├── observability.md
    ├── security.md
    ├── privacy.md
    ├── validation.md
    ├── error-handling.md
    ├── testing.md
    └── deployment.md
```

## Technology Baseline (Fixed)

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router), React 19, TypeScript 5.x, Tailwind CSS, shadcn/ui, PDF.js / react-pdf, vis-network, Recharts, Browser MediaDevices API |
| API | Python 3.12+, FastAPI |
| Persistence | PostgreSQL 16 |
| Cache / session state | Redis 7 |
| Background jobs | Celery 5 (Redis broker) |
| AI orchestration | LangGraph |
| LLM | Anthropic Claude API (messages with structured output) |
| OCR | PaddleOCR (primary) with layout model; Tesseract fallback |
| Graph processing | NetworkX (in-memory) |
| Realtime | Server-Sent Events (SSE) |
| Storage | S3-compatible object storage (MinIO local, S3/R2 production) |
| Ephemeral artifacts | AES-256-GCM encrypted, TTL-bound storage |
| Infra | Docker, docker compose (local); Vercel (frontend); Render or AWS (backend) |

**Assumption A1 (labeled):** The PRD is the authoritative product source. Where the PRD is silent, this spec makes the *smallest reasonable engineering assumption* and labels it with an `A` number (A1–A20) so the implementer can challenge it without guessing.

## Non-Negotiable Principles

1. Deterministic compliance is separate from LLM reasoning. An LLM is never the source of truth for a compliance check.
2. Uploaded documents are untrusted data — contract text may contain prompt injection payloads.
3. Sensitive document binaries are ephemeral by default; purged on session expiry unless the user explicitly saves.
4. The frontend never becomes the authority for security or compliance.
5. All AI output is validated against typed schemas before persistence.
6. Every important result links back to source evidence (clause ID, page, bounding box).
7. Long-running tasks are asynchronous (background jobs or SSE streams).
8. Negotiation is streamable via SSE.
9. Exports are secure and time-limited (signed URLs).
10. The application remains centered on the user's current contract session.

## Do Not Overengineer

Modular monolith + Celery workers. No microservices, no Kubernetes, no Kafka, no service mesh, no separate graph database, no complex event bus, no multiple LLM providers (unless explicitly mandated later). The whole system must remain understandable to a single capable coding agent.

## Assumptions Log

| ID | Assumption | Where Resolved |
|---|---|---|
| A1 | PRD is authoritative; missing details get smallest reasonable engineering decisions | This file |
| A2 | Single LLM provider (Anthropic Claude API) is sufficient; provider abstraction kept minimal | `backend/ai-orchestration.md` |
| A3 | Anonymous (logged-out) sessions are supported with a local token-scoped session bucket | `frontend/authentication.md`, `backend/sessions.md` |
| A4 | Local dev object storage is MinIO via docker compose | `DEPLOYMENT.md`, `backend/deployment.md` |
| A5 | Default session TTL is 24h with 60-minute inactivity expiry; extended when saved | `backend/sessions.md` |
| A6 | Max upload size 25 MB (configurable via `UPLOAD_MAX_SIZE`) | `backend/document-ingestion.md` |
| A7 | Default jurisdiction for compliance rules is configurable; multi-jurisdiction supported but default install ships a single rule pack | `backend/compliance-engine.md` |
| A8 | Vernacular audio covers 10 launch languages via one TTS provider with a provider interface | `backend/audio.md` |
| A9 | No team/organization sharing in v1; strictly single-user ownership | `backend/authorization.md` |
| A10 | Cursor pagination for all list endpoints | `backend/api.md`, root `ERROR_HANDLING.md` |

---

# OPUS 5 IMPLEMENTATION READINESS

Self-assessed readiness of this specification, per the master prompt's required categories. Categories below 90 include explicit remediation; none fall below 90.

| Category | Score | Basis |
|---|---|---|
| Architecture clarity | 95 | Layered modular monolith diagram, every directory's responsibility enumerated in `backend/project-structure.md`; data flow traced end-to-end in `ARCHITECTURE.md`. |
| Database completeness | 94 | 22 tables with PK/FK, indexes, uniqueness, lifecycle, retention, nullable rules in `backend/database.md` + SQLAlchemy models in `backend/models.md`. |
| API completeness | 96 | 30+ endpoints, each with method, path, auth, authorization, request/response schema, status codes, validation, errors, side effects, emitted events in `backend/api.md`. |
| Security completeness | 95 | Password, token, CSRF, file validation, prompt injection, SSRF, secrets, logging, signed URLs, dependency scanning covered in `SECURITY.md` and `backend/security.md`. |
| AI architecture | 94 | LangGraph state graph, typed state, three-agent contract, prompt directory, output validation, retry/fallback in `backend/ai-orchestration.md` + `negotiation.md`. |
| Document processing | 95 | Ingestion pipeline, OCR layout blocks with bbox/confidence, AST node schema, diff algorithm in dedicated files. |
| Async processing | 94 | Sync vs. background vs. SSE decision table, 9 Celery tasks fully specified (input/output/retry/timeout/idempotency/progress) in `backend/background-jobs.md`. |
| Frontend/backend contracts | 95 | Jointly defined DTOs, SSE event contracts, state machines for upload/export, error envelopes in `frontend/frontend-backend-contract.md` matching `backend/api.md` byte-for-byte. |
| Testing | 92 | Unit/integration/AI/E2E layers, synthetic fixtures (4 contract types), property tests for compliance/risk, CI gates in `TESTING.md` + `backend/testing.md`. |
| Deployment | 93 | docker compose local stack (6 services), Vercel + Render/AWS production paths, migrations, health checks, rollback in `DEPLOYMENT.md` + `backend/deployment.md`. |
| Privacy | 95 | Encryption-at-rest for binaries, key TTL in Redis, purge lifecycle, save-vs-expire behavior, retention policy in `backend/privacy.md`. |
| Implementation readiness | 94 | `IMPLEMENTATION_ORDER.md` provides 20 phases with dependencies and acceptance criteria; a capable agent can begin at Phase 1 without an architecture session. |

### Remediation Notes (for categories under 100 — none under 90)

- **Database completeness (94):** Cross-table trigger-level enforcement of soft-delete cascades is documented as *application-managed* rather than DB trigger-managed. If implementers prefer trigger-based cascading for `documents`→`clauses`, that is an acceptable refinement, not a gap.
- **Testing (92):** AI regression fixtures require hand-built Claude response samples (provided as `tests/fixtures/ai/` JSON). Generation of additional regression fixtures is iterative and must be curated per prompt version; the spec documents the curation workflow rather than freezing infinite fixtures.
- **Deployment (93):** Production Redis and PostgreSQL sizing guidance (RAM/CPU) is environment-specific; the spec specifies selection criteria and defaults rather than fixed hardware, which is correct for portability across Render/AWS.
- **Implementation readiness (94):** The only pre-implementation question an agent might raise is vendor selection for the TTS provider (A8), which is a configuration choice, not an architectural question.

**Verdict:** The specification is complete enough that Claude Opus 5 can scaffold the repository, implement the database, implement APIs, implement workers, implement AI orchestration, connect frontend/backend, test, and deploy — without another architecture-design session.
