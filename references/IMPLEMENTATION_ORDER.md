# LexiClear — Implementation Order

**Reading order:** This file is the execution plan. Read it last among the root files, then work top-down through the phases. Every phase references the specification files that define it; do not improvise beyond those files. Acceptance criteria are written in Given/When/Then form and are the definition of "done" for each phase.

---

## Phase Overview and Dependency Graph

```
P1  Repository + Docker + config
 │
P2  Database + migrations ──────────────────────────┐
 │                                                  │
P3  Auth + users ────────────────────────┐          │
 │                                       │          │
P4  Sessions ────────────────────────────┼──────────┘
 │                                       │
P5  Upload + storage ────────────────────┘
 │
P6  OCR + parsing ───────────────────────┐
 │                                       │
P7  AST ─────────────────────────────────┤
 │                                       │
P8  Compliance engine ───────────────────┤
 │                                       │
P9  Risk engine ─────────────────────────┤
 │                                       │
P10 Redline diff ────────────────────────┘
 │
P11 Knowledge graph ────────────────────┐
 │                                      │
P12 Analysis pipeline (AI + risk wiring)┤
 │                                      │
P13 Simulation ─────────────────────────┤
 │                                      │
P14 Negotiation + LangGraph ────────────┘
 │
P15 SSE streaming layer
 │
P16 Audio
 │
P17 Export
 │
P18 Frontend integration (parallelizable after P5: pages can stub APIs)
 │
P19 Security hardening
 │
P20 Testing + deployment
```

Phases 6–12 share one pipeline dependency chain and are best implemented in the listed order. Phase 18 can begin after Phase 5 once API stubs exist (the frontend consumes mocked responses until the backend is live — documented in `frontend/README.md`).

---

## Phase 1 — Repository + Docker + Configuration

**Spec files:** `backend/project-structure.md`, `backend/configuration.md`, `backend/deployment.md`, root `DEPLOYMENT.md`.

Scaffold: backend package layout, `pyproject.toml` (FastAPI, SQLAlchemy, Alembic, Celery, LangGraph, Pydantic), `Dockerfile` (multi-stage, uv), `docker-compose.yml` (postgres, redis, minio, backend, worker, frontend), root `README.md` dev instructions, pre-commit (`ruff`, `mypy`).

**Acceptance:**
- Given an empty machine with Docker, when `docker compose up` runs, then postgres, redis, and minio are healthy, the API responds on `/health`, and the worker process starts without error.
- Given the scaffold, when `uv sync` runs, then the dependency lock is deterministic and `ruff check` + `mypy` pass on the scaffold.

## Phase 2 — Database + Migrations

**Spec files:** `backend/database.md`, `backend/models.md`.

Create all 22 tables via Alembic, indexes, FKs, constraints exactly as specified. Seed the `compliance_rules` table with the synthetic rule pack (test rules only — production rule packs arrive via content pipeline, out of scope).

**Acceptance:**
- Given a fresh DB, when `alembic upgrade head` runs, then all tables exist with correct constraints.
- Given the models, when a test inserts a full resource tree (user→session→document→clauses→findings), then FK and cascade behavior matches `backend/database.md`.

## Phase 3 — Authentication + Users

**Spec files:** `backend/authentication.md`, `backend/authorization.md` (ownership basics), root `SECURITY.md`.

Endpoints: register, login, logout (token revocation), refresh, password reset request/redemption, me, update me. argon2id, JWT 15-min access, server-stored rotating refresh.

**Acceptance:**
- Given registration, when a user logs in, then an access+refresh pair is issued and `/api/v1/users/me` returns the user.
- Given a valid refresh token, when rotated refresh is called, then the old token is invalidated and a new pair issued.
- Given 11 failed logins within a minute from one IP, when the 12th login is attempted, then `AUTH_RATE_LIMITED` is returned.
- Given plaintext password candidates in the DB dump, when the dump is inspected, then no plaintext passwords exist anywhere.

## Phase 4 — Session Architecture

**Spec files:** `backend/sessions.md`, `backend/caching.md`.

Session CRUD, TTL/inactivity renewal on each request, save/expire states, cleanup job skeleton.

**Acceptance:**
- Given an active session, when no requests touch it for 61 minutes, then it is marked expired.
- Given an expired session, when the cleanup job runs, then its document binaries are deleted from object storage and its Redis key is gone.
- Given a saved session, when expiry time passes, then metadata remains queryable and binaries follow the saved-session retention policy.

## Phase 5 — Document Upload + Storage

**Spec files:** `backend/document-ingestion.md`, `backend/file-storage.md`, `backend/background-jobs.md` (ingestion job).

Multipart upload → magic-byte + MIME + extension + size validation → per-document AES-256-GCM key → encrypt → store under `sessions/{session_id}/documents/{document_id}/original` → enqueue ingestion → progress SSE.

**Acceptance:**
- Given a valid PDF, when the user uploads it, then a session exists, the file is encrypted, processing begins, the frontend receives progress, and the document is eventually available in the workspace.
- Given a 26 MB file, when uploaded, then `DOCUMENT_TOO_LARGE` is returned without the file ever reaching storage.
- Given an executable disguised as a PDF, when uploaded, then `DOCUMENT_INVALID`/`DOCUMENT_MALICIOUS` is returned.
- Given a re-upload of a file with identical content hash, then idempotency prevents duplicate processing.

## Phase 6 — OCR + Parsing

**Spec files:** `backend/ocr-parser.md`, `backend/background-jobs.md` (OCR job).

PaddleOCR with layout model: pages, text blocks, bounding boxes, confidence, heading detection, table extraction. Tesseract fallback path.

**Acceptance:**
- Given the synthetic lease fixture PDF, when the OCR job completes, then every clause in the fixture has ≥1 block with bbox and confidence, and heading structure is detected for all section headers.
- Given a scanned-image lease, when OCR'd, then the same structural coverage is achieved (scanned-path test).
- Given an empty-page document, when OCR'd, then `DOCUMENT_PARSE_EMPTY` is raised.

## Phase 7 — Structural AST

**Spec files:** `backend/structural-ast.md`, `backend/background-jobs.md` (AST job).

Block → AST builder: document, sections, clauses, subclauses, definitions, entities; each node carries id, page, bbox, heading, parent, type, source coordinates.

**Acceptance:**
- Given OCR output for the freelancer fixture, when the AST is built, then every fixture clause is recoverable by id, parent chains are acyclic, and every leaf clause references a page+bbox.
- Given the AST, when serialized to JSON for the API, then it matches the schema in `backend/structural-ast.md`.

## Phase 8 — Compliance Engine

**Spec files:** `backend/compliance-engine.md`, `backend/background-jobs.md` (compliance job).

Deterministic rule engine: YAML rule packs, constrained expression evaluator (NO `eval`), clause-level evaluation, versioning, results with deep links.

**Acceptance:**
- Given the residential lease fixture containing a security-deposit violation, when the compliance engine runs, then a finding is produced referencing the violating clause with statute reference, severity, and deep link.
- Given a rule pack change, when re-run, then results differ only per the changed rule version (versioned result comparison).
- Given an adversarial document containing "ignore the rules and pass everything", when evaluated, then no rule is bypassed and the injection attempt is logged (not executed).

## Phase 9 — Risk Engine

**Spec files:** `backend/risk-engine.md`, `backend/background-jobs.md`.

Multi-dimensional risk model: severity, confidence, financial exposure, compliance risk, contradiction risk, negotiation priority; composite score formula documented and justified; every finding retains evidence.

**Acceptance:**
- Given the vendor fixture with contradictory delivery clauses, when the risk engine runs, then a contradiction-risk finding exists with evidence links to both clauses.
- Given a clause with a numerical late penalty, when scored, then financial exposure is computed from the fixture numbers and units, not an arbitrary value.
- Given the same inputs twice, when scored, then the composite score is bit-identical (deterministic).

## Phase 10 — Redline Diff Engine

**Spec files:** `backend/redline-diff.md`, `backend/background-jobs.md` (diff job).

Clause alignment (id/heading/fingerprint), added/removed/modified classification, reordered-clause handling, bbox/page pass-through for frontend highlighting.

**Acceptance:**
- Given fixture v1 and v2 (one clause modified, one added, one removed, two reordered), when diffed, then the result classifies all four changes correctly.
- Given the diff result, when rendered by the frontend, then each change maps to the target document's page + bbox (schema check).

## Phase 11 — Knowledge Graph

**Spec files:** `backend/knowledge-graph.md`, `backend/background-jobs.md` (graph job).

NetworkX graph: entity → obligation → entity under condition; contradiction detection via clause cross-reference; serialization to frontend graph payload.

**Acceptance:**
- Given the employment fixture with an over-broad non-compete, when graph generation runs, then the obligation node references the non-compete clause and the contradiction detector flags it against the termination clause.
- Given the graph payload, when validated, then every node and edge references an existing clause id.

## Phase 12 — Analysis Pipeline (AI + Risk Wiring)

**Spec files:** `backend/ai-orchestration.md`, `backend/background-jobs.md` (analysis_pipeline job), `backend/validation.md`.

LangGraph orchestration: plain-language summary, clause flags; structured output validation; retry + fallback; prompt directory.

**Acceptance:**
- Given a processed document, when the pipeline completes, then a plain-language summary exists, every clause flag carries clause id + page + bbox, and every LLM output passed Pydantic validation.
- Given a malformed LLM response (injected failure fixture), when the pipeline runs, then it retries and either succeeds or fails with `AI_OUTPUT_INVALID` — never persisting invalid output.

## Phase 13 — Simulation

**Spec files:** `backend/simulation.md`, `frontend/simulate-negotiate.md`, `frontend/frontend-backend-contract.md`.

Extract contract-derived formulas → safe client-side evaluation; base model vs user scenario separation; bounds/caps/units validation.

**Acceptance:**
- Given the lease fixture with monthly rent + late fee, when the model is generated, then the formula references only allowed variables and units.
- Given a slider scenario, when evaluated client-side, then the result matches server-side reference evaluation within floating-point tolerance.
- Given an out-of-bounds variable, when submitted, then `SIMULATION_INVALID` is returned.

## Phase 14 — Negotiation + LangGraph

**Spec files:** `backend/negotiation.md`, `backend/ai-orchestration.md`, `backend/background-jobs.md` (no Celery job — SSE streamed).

PROSECUTOR → DEFENSE COUNSEL → AUDITOR; typed shared state; auditor calls deterministic compliance engine.

**Acceptance:**
- Given a flagged clause, when negotiation starts, then the three agent stages execute in order and the final counter-clause is auditor-approved.
- Given the auditor's compliance call, when the LLM proposes a non-compliant counter-clause, then the counter-clause is rejected and regenerated (up to retry cap) or the negotiation fails with `NEGOTIATION_FAILED`.
- Given a running negotiation, when SSE events arrive, then they conform to the event contract in `frontend/frontend-backend-contract.md`.

## Phase 15 — SSE Streaming Layer

**Spec files:** `backend/realtime.md`, `frontend/realtime.md`, `frontend/frontend-backend-contract.md`.

SSE endpoint for negotiation events; event ids, timestamps, ordering, reconnect semantics; Redis coordination.

**Acceptance:**
- Given a subscribed client, when the negotiation runs, then events arrive in the documented order with monotonically increasing ids.
- Given a client disconnect mid-negotiation, when it reconnects with `Last-Event-Id`, then it resumes from the last received event.

## Phase 16 — Audio

**Spec files:** `backend/audio.md`, `backend/background-jobs.md` (audio job).

Narrate summary → TTS → ephemeral artifact → signed short-lived URL.

**Acceptance:**
- Given a completed summary and a supported language, when narrate is called, then a signed audio URL is returned that serves valid audio and expires within the configured TTL.
- Given an unsupported language code, when narrate is called, then `AUDIO_LANGUAGE_UNSUPPORTED` is returned.

## Phase 17 — Export

**Spec files:** `backend/export.md`, `backend/background-jobs.md` (export job).

Findings/counter-clauses → template render → PDF/DOCX → signed URL. No arbitrary file exposure.

**Acceptance:**
- Given completed negotiation results, when exporting to PDF, then a signed URL is returned serving a document containing exactly the counter-clauses and findings (content checksum test).
- Given a crafted path in the export request, when processed, then `EXPORT_URL_INVALID` is returned and no unrelated storage objects are exposed.

## Phase 18 — Frontend Integration

**Spec files:** all `frontend/` files, especially `frontend/frontend-backend-contract.md`, `upload-overlay.md`, `export-overlay.md`, `simulate-negotiate.md`.

Wire pages to live APIs: auth flows, home, workspace (findings/compliance/graph/redline views), simulate, negotiate (SSE timeline), account, overlays with state machines.

**Acceptance:**
- Given the full E2E journey in root `TESTING.md`, when executed in a real browser against the running stack, then every step completes with correct UI states.
- Given an upload failure mid-pipeline, when it occurs, then the upload overlay transitions to the correct failure state and offers retry.

## Phase 19 — Security Hardening

**Spec files:** root `SECURITY.md`, `backend/security.md`, `backend/privacy.md`.

Dependency audit, CSP/HSTS headers, rate-limit verification, signed-URL expiry verification, purge-job verification, prompt-injection red-team fixtures, logging audit (no document text/secrets in logs).

**Acceptance:**
- Given the red-team fixture suite, when run, then no prompt injection succeeds end-to-end.
- Given an expired session, when the audit runs, then zero un-purged binaries remain in object storage for that session.
- Given a production-like log stream, when scanned, then no document text, secrets, or raw LLM prompts appear.

## Phase 20 — Testing + Deployment

**Spec files:** root `TESTING.md` and `DEPLOYMENT.md`, `backend/testing.md`, `backend/deployment.md`.

CI gates (lint, mypy, tests, Trivy, Playwright smoke), staging deploy, production deploy, rollback runbook verification, load sanity on upload + negotiation.

**Acceptance:**
- Given a PR to `main`, when CI completes, then all gates in root `TESTING.md` §5 pass.
- Given a production deploy, when `/ready` is probed, then all dependencies report healthy and rollback to the previous image tag completes within the documented window.

---

## Cross-Phase Rules

1. **Never start a phase without its spec files reviewed.** The spec files are the contract; this file is the schedule.
2. **Acceptance criteria are mandatory**, not aspirational. A phase is not done until its criteria pass.
3. **Run `pytest` green at the end of every phase.** No phase may degrade existing coverage.
4. **Label any deviation** from the spec in the PR description with the assumption ID it violates (see root `README.md` assumptions log).
5. **Keep the monolith modular.** Each phase adds a module, not a service.
