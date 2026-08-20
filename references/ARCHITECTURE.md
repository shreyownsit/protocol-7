# LexiClear — System Architecture

**Reading order:** Read this file after `README.md` and before `IMPLEMENTATION_ORDER.md`. All backend modules are specified in `backend/`; all frontend modules in `frontend/`.

---

## 1. System Overview

LexiClear is a **session-centered, modular monolith** backend (FastAPI + Celery workers) serving a Next.js single-page frontend. The defining product unit is a **session**: one active contract-analysis context. Every workflow — upload, parse, compliance, graph, risk, simulation, negotiation, audio, export — happens inside a session. Sessions are ephemeral by default: document binaries are encrypted, TTL-bound, and purged on expiry unless the user explicitly saves the session.

### High-Level Topology

```
                        ┌─────────────────────────────────────┐
                        │           FRONTEND (Next.js)        │
                        │  Pages + overlays + SSE consumer    │
                        └──────────────────────┬──────────────┘
                                               │ HTTPS
                                               ▼
                        ┌──────────────────────────────────────┐
                        │        FastAPI API Layer (/api/v1)   │
                        │  Auth, validation, routing, SSE hub  │
                        └──────────────┬───────────────────────┘
                 ┌─────────────────────┼────────────────────────┐
                 ▼                     ▼                        ▼
          Services             Celery Workers              SSE Endpoint
          (sync use-cases)     (async pipelines)         (stream negotiate)
                 │                     │                        │
                 └─────────────────────┼────────────────────────┘
                                       ▼
                                 Domain Layer
                     (pure Python: rules, AST, graph, risk,
                      simulation formulas, compliance eval)
                                       │
                    ┌────────────────────┼────────────────────┐
                    ▼                    ▼                    ▼
               PostgreSQL            Redis           Object Storage
               (metadata)        (cache/keys/broker) (encrypted binaries)
                                       │
                                       ▼
                              AI / Processing
                        (Claude API, OCR engine, TTS)
```

### Layering Rule (Hard Constraint)

```
API Layer  →  Application / Use-Case Layer  →  Domain Layer  →  Infrastructure Layer
```

**Business logic never lives in FastAPI route handlers.** Route handlers: validate request schema, call one service use-case, return response. Services orchestrate repositories, domain functions, and Celery tasks. The domain layer is pure Python with zero FastAPI, zero HTTP, zero infrastructure imports — it is unit-testable in isolation.

## 2. Data Flow — The Core Pipeline

```
1.  UPLOAD            Client POST /api/v1/upload  → multipart file
2.  SESSION           Session created/reused; document metadata row
3.  INGESTION         Validate → encrypt → store (ephemeral bucket) → enqueue
4.  OCR / PARSING     Celery task: PDF/image → pages, blocks, bboxes, confidence
5.  AST               Structural AST (document/sections/clauses/definitions)
6.  COMPLIANCE        Deterministic rule engine over AST (NO LLM)
7.  GRAPH             NetworkX graph: entities→obligations under conditions
8.  AI ANALYSIS       Claude: plain-language summary, clause flags
9.  RISK              Risk model from findings + contradictions + exposure
10. SIMULATION        Formula extraction → client-evaluated what-if sliders
11. NEGOTIATION       LangGraph (PROSECUTOR→DEFENSE→AUDITOR), SSE-streamed
12. AUDIT             Auditor node validates against deterministic compliance
13. EXPORT            Celery: template render → PDF/DOCX → signed URL
```

Steps 6–9 run as one coordinated Celery pipeline (`analysis_pipeline`) once the AST exists. Step 10 is synchronous metadata prep + client-side evaluation. Step 11 is SSE-streamed, not Celery. Step 13 is a Celery job returning a signed URL.

## 3. Session-Centered Architecture

A session is the root of a resource tree: `session → documents → (pages, clauses, findings, risk) → graph, compliance results, simulation, negotiation, audio, export`.

- **Create:** POST `/api/v1/sessions` (auth required) or auto-created on first upload for anonymous users (token-scoped).
- **Renewal:** every authenticated API request touching a session bumps `last_activity_at`; TTL resets.
- **Expiration:** 24 h default lifetime (`SESSION_TTL`), 60 min inactivity (`SESSION_INACTIVITY_TTL`). `cleanup_expired_sessions` Celery job purges binaries and marks sessions `expired`.
- **Save:** user explicitly saves → `save_state=SAVED`, metadata persisted indefinitely, binary retained per retention policy (`backend/privacy.md`).
- **Resume:** opening `/workspace/{id}` re-hydrates all analysis results from persisted analysis metadata (not re-processing).

Full spec: `backend/sessions.md`, `frontend/routing.md`, `frontend/document-workspace.md`.

## 4. Backend Module Map

| Module | File | Responsibility |
|---|---|---|
| API layer | `backend/api.md` | All endpoints, auth, validation, error mapping |
| Auth | `backend/authentication.md` | Registration, login, JWT access + refresh, password reset |
| Authorization | `backend/authorization.md` | Ownership enforcement at service/repository boundary |
| Sessions | `backend/sessions.md` | Lifecycle, TTL, save/expire, cleanup |
| Ingestion | `backend/document-ingestion.md` | Upload validation, encryption, storage keys |
| Storage | `backend/file-storage.md` | Ephemeral encrypted object storage, signed URLs, purge |
| OCR | `backend/ocr-parser.md` | Layout-aware OCR: blocks, bboxes, confidence |
| AST | `backend/structural-ast.md` | Contract AST schema and builder |
| Redline | `backend/redline-diff.md` | Clause-aligned diff between two ASTs |
| Compliance | `backend/compliance-engine.md` | Deterministic rule engine (never LLM) |
| Graph | `backend/knowledge-graph.md` | NetworkX entity-obligation graph, contradiction detection |
| Risk | `backend/risk-engine.md` | Multi-dimensional risk model with evidence |
| Simulation | `backend/simulation.md` | Contract-derived formulas, client-safe evaluation |
| AI orchestration | `backend/ai-orchestration.md` | LangGraph architecture, prompt system, validation |
| Negotiation | `backend/negotiation.md` | Three-agent workflow, SSE events |
| Audio | `backend/audio.md` | Vernacular narration, signed short-lived URL |
| Export | `backend/export.md` | PDF/DOCX generation, signed URLs |
| Workers | `backend/background-jobs.md` | Celery tasks spec (9 jobs) |
| Cache | `backend/caching.md` | Redis keyspaces, TTLs, invalidation |
| Observability | `backend/observability.md` | Structured logs, metrics, request/job/session IDs |
| Security | `backend/security.md` | Threat model, file validation, prompt injection defense |
| Privacy | `backend/privacy.md` | Ephemeral binary lifecycle, retention, purges |
| Validation | `backend/validation.md` | Request schema + AI output validation policy |
| Error handling | `backend/error-handling.md` | Canonical error codes, envelope, mapping |
| Testing | `backend/testing.md` | Backend test layers and fixtures |
| Deployment | `backend/deployment.md` | Docker, envs, health checks, worker deploy |
| Config | `backend/configuration.md` | Environment variables, env differences |

## 5. Frontend Module Map

| Module | File | Responsibility |
|---|---|---|
| Architecture | `frontend/architecture.md` | App shell, tech stack wiring, module boundaries |
| Shell | `frontend/application-shell.md` | Layout, nav, overlay host |
| Routing | `frontend/routing.md` | Page routes, guards, overlays as URL-or-internal state |
| State | `frontend/state-management.md` | Server vs client state split, per-workspace scoping |
| API client | `frontend/api-client.md` | Single typed fetch wrapper, auth injection, error mapping |
| Auth UI | `frontend/authentication.md` | Login/signup/reset flows, token storage |
| Home | `frontend/home.md` | Saved sessions list, upload entry |
| Workspace | `frontend/document-workspace.md` | Document, findings, compliance, graph, redline views |
| Simulate/Negotiate | `frontend/simulate-negotiate.md` | Simulation sliders, negotiation timeline UI |
| Account | `frontend/account.md` | Profile, preferences, saved sessions management |
| Upload overlay | `frontend/upload-overlay.md` | Upload state machine UI |
| Export overlay | `frontend/export-overlay.md` | Export state machine UI |
| Realtime | `frontend/realtime.md` | SSE client, reconnect, event rendering |
| Contract | `frontend/frontend-backend-contract.md` | Canonical DTOs, SSE events, error envelopes |

## 6. Async Decision Table (Hard Rule)

| Operation | Mechanism | Rationale |
|---|---|---|
| Metadata read (session, document, findings list) | Synchronous REST | Fast, deterministic |
| Upload | Async (upload fast, process in background) | Binary is large, processing slow |
| OCR | Celery background | Seconds–minutes |
| Full analysis (compliance+graph+AI+risk) | Celery background pipeline | Minutes |
| Negotiation | SSE stream from LangGraph | User watches agent progress |
| Diff generation | Celery background | Multi-page comparison |
| Audio | Celery background, signed URL | Provider latency |
| Export | Celery background, signed URL | Rendering latency |
| Progress feedback | SSE progress events + polling fallback | Realtime without WS complexity |

## 7. Cross-Cutting Contracts

- **Errors:** single envelope `{error:{code, message, request_id}}`, canonical codes in root `ERROR_HANDLING.md`.
- **Auth:** Bearer JWT access (15 min) + rotating refresh; CSRF-safe via header-only token (no cookies) — see `SECURITY.md`.
- **Ids:** all public ids are `uuid7` (time-sortable UUID v7) to enable cursor pagination.
- **Pagination:** cursor-based on all list endpoints (`backend/api.md`, section on pagination).
- **Evidence links:** every finding, risk item, graph node, diff hunk carries `clause_id`, `page`, and where applicable `bbox`.

## 8. What Is Explicitly Out of Scope (v1)

- Team/organization multi-user sharing (A9).
- Multiple LLM providers beyond Claude.
- Real-time collaborative editing.
- A graph database — NetworkX in memory is the mandated implementation.
- Microservices, Kubernetes, Kafka, service mesh.

Violating these is overengineering; do not introduce them.
