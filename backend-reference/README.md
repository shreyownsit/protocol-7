# Backend — LexiClear Implementation Specification (Primary)

This directory is the **primary implementation specification** for the LexiClear backend. It is written for Claude Opus 5 and must be read in dependency order, not alphabetical order. The canonical reading order is:

1. `architecture.md` — layering, component map, async decision rules
2. `project-structure.md` — exact directory tree and per-directory responsibilities
3. `configuration.md` — environment variables and environment differences
4. `database.md` — full PostgreSQL schema design rationale
5. `models.md` — SQLAlchemy ORM models and Alembic strategy
6. `authentication.md` — auth endpoints and token strategy
7. `authorization.md` — ownership enforcement rules
8. `sessions.md` — session lifecycle architecture
9. `document-ingestion.md` — upload pipeline
10. `file-storage.md` — encrypted ephemeral object storage
11. `ocr-parser.md` — layout-aware OCR
12. `structural-ast.md` — contract AST schema
13. `redline-diff.md` — structural diff engine
14. `compliance-engine.md` — deterministic rule engine
15. `knowledge-graph.md` — NetworkX graph subsystem
16. `risk-engine.md` — multi-dimensional risk model
17. `simulation.md` — what-if simulation
18. `ai-orchestration.md` — LangGraph orchestration and prompt system
19. `negotiation.md` — three-agent negotiation workflow
20. `audio.md` — vernacular audio
21. `export.md` — PDF/DOCX export
22. `api.md` — complete API reference (every endpoint)
23. `realtime.md` — SSE layer
24. `background-jobs.md` — Celery job specifications
25. `caching.md` — Redis keyspaces and TTLs
26. `observability.md` — logs, metrics, IDs
27. `security.md` — threat model and defenses
28. `privacy.md` — ephemeral storage lifecycle and retention
29. `validation.md` — request and AI-output validation policy
30. `error-handling.md` — canonical error codes and mapping
31. `testing.md` — backend test layers and fixtures
32. `deployment.md` — Docker, health checks, worker deployment

Cross-cutting canonical references outside this directory that you MUST also read: root `ERROR_HANDLING.md` (canonical error code registry), root `SECURITY.md`, root `TESTING.md`, root `DEPLOYMENT.md`, root `IMPLEMENTATION_ORDER.md`, and `frontend/frontend-backend-contract.md` (joint contract).

## Guiding Conventions Used in Every File

Each subsystem file uses the implementation-friendly structure mandated by the master prompt:

```
Requirement / Why / Input / Output / Dependencies / Failure Modes /
Implementation Notes / Security / Testing
```

Not every section appears in every file, but none of these files contain vague product prose. If a section is omitted, the behavior is covered by a cross-reference to another file in this directory.

## Technology Summary

| Concern | Choice |
|---|---|
| Framework | FastAPI (Python 3.12+) |
| ORM / migrations | SQLAlchemy 2.0 (async, typed), Alembic |
| Validation | Pydantic v2 |
| Jobs | Celery 5, Redis broker, Redis result backend disabled (DB for results) |
| Orchestration | LangGraph |
| LLM | Anthropic Claude API, structured outputs |
| OCR | PaddleOCR + layout model (Tesseract fallback) |
| Graph | NetworkX (in-memory) |
| Storage | S3-compatible (boto3), AES-256-GCM client-side encryption |
| Realtime | SSE (starlette `EventSourceResponse`) |
| Tests | pytest, hypothesis, FastAPI TestClient, testcontainers |
| Lint/type | ruff, mypy (strict) |
| Package manager | uv |

## Hard Rules (Violating Any Is a Defect)

1. No business logic in route handlers. Handlers validate → call one service → return.
2. No raw `eval`/`exec` anywhere. The compliance engine uses the constrained evaluator in `compliance-engine.md`.
3. No LLM in the compliance verdict path. LLM may only *prepare* evidence for deterministic rules.
4. No document text in logs. Ever.
5. No plaintext secrets in code or config files.
6. No long-running DB transactions around async processing.
7. Ownership checks at the repository/service boundary, always, with the current user passed explicitly.
8. Every persisted AI-derived artifact carries its source evidence (clause id, page, bbox).
