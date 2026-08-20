# Backend Project Structure

**Requirement:** An exact directory layout for the backend package with a responsibility statement for every directory and file. Claude Opus 5 scaffolds this layout in Phase 1 (`IMPLEMENTATION_ORDER.md`).

## 1. Complete Tree

```
backend/
│
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI app factory, middleware, exception handlers
│   │
│   ├── api/
│   │   ├── __init__.py
│   │   ├── router.py           # Versioned APIRouter prefix=/api/v1, includes sub-routers
│   │   ├── routes/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py         # /auth/* endpoints
│   │   │   ├── users.py        # /users/* endpoints
│   │   │   ├── sessions.py     # /sessions/* endpoints
│   │   │   ├── upload.py       # /upload
│   │   │   ├── documents.py    # /documents/* endpoints
│   │   │   ├── diff.py         # /diff
│   │   │   ├── compliance.py   # /compliance-check
│   │   │   ├── graph.py        # /graph/* endpoints
│   │   │   ├── risk.py         # /risk-model/* endpoints
│   │   │   ├── simulation.py   # /simulations/* endpoints
│   │   │   ├── negotiate.py    # /negotiate/* + SSE stream
│   │   │   ├── audio.py        # /narrate
│   │   │   └── export.py       # /export/* endpoints
│   │   └── dependencies.py     # get_db, require_auth, get_current_user, get_redis,
│   │                           # rate_limit deps — no business logic
│   │
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py           # Pydantic BaseSettings — all env vars (see configuration.md)
│   │   ├── security.py         # argon2id helpers, JWT encode/decode, refresh rotation
│   │   ├── logging.py          # structured JSON logger setup, request-id context var
│   │   └── exceptions.py       # TypedAppError hierarchy + canonical codes registry
│   │
│   ├── domain/                 # PURE PYTHON — zero framework imports
│   │   ├── __init__.py
│   │   ├── users/              # User value objects, password policy
│   │   ├── sessions/           # Session state machine, TTL arithmetic
│   │   ├── documents/          # File metadata types, MIME allowlist
│   │   ├── clauses/            # AST node types, clause type taxonomy
│   │   ├── findings/           # Finding, evidence, severity types
│   │   ├── compliance/         # Rule types, expression AST types, evaluator
│   │   ├── simulation/         # Formula, variable, bound, unit types
│   │   ├── negotiation/        # Counter-clause types, agent output types
│   │   └── exports/            # Export template types
│   │
│   ├── services/               # Use-case orchestration (one class per use case)
│   │   ├── __init__.py
│   │   ├── auth_service.py
│   │   ├── session_service.py
│   │   ├── document_service.py
│   │   ├── ingestion_service.py
│   │   ├── analysis_service.py
│   │   ├── diff_service.py
│   │   ├── compliance_service.py
│   │   ├── graph_service.py
│   │   ├── risk_service.py
│   │   ├── simulation_service.py
│   │   ├── negotiation_service.py
│   │   ├── audio_service.py
│   │   ├── export_service.py
│   │   └── progress_service.py # SSE progress emission helpers
│   │
│   ├── repositories/           # SQLAlchemy data access, ownership-checked queries
│   │   ├── __init__.py
│   │   ├── base.py             # generic CRUD + ownership mixin
│   │   ├── user_repo.py
│   │   ├── session_repo.py
│   │   ├── document_repo.py
│   │   ├── clause_repo.py
│   │   ├── finding_repo.py
│   │   ├── compliance_repo.py
│   │   ├── graph_repo.py
│   │   ├── simulation_repo.py
│   │   ├── negotiation_repo.py
│   │   ├── audio_repo.py
│   │   ├── export_repo.py
│   │   └── audit_repo.py
│   │
│   ├── schemas/                # Pydantic request/response DTOs (see api.md)
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── common.py           # envelope, pagination cursors, error envelope
│   │   ├── sessions.py
│   │   ├── documents.py
│   │   ├── clauses.py
│   │   ├── findings.py
│   │   ├── compliance.py
│   │   ├── graph.py
│   │   ├── risk.py
│   │   ├── simulation.py
│   │   ├── negotiation.py
│   │   ├── audio.py
│   │   └── export.py
│   │
│   ├── workers/                # Celery app + task definitions
│   │   ├── __init__.py
│   │   ├── celery_app.py       # Celery app, Redis broker config, task routes
│   │   ├── tasks/
│   │   │   ├── __init__.py
│   │   │   ├── ingestion.py
│   │   │   ├── ocr.py
│   │   │   ├── ast.py
│   │   │   ├── diff.py
│   │   │   ├── compliance.py
│   │   │   ├── graph.py
│   │   │   ├── pipeline.py     # analysis_pipeline (orchestrates 6-9)
│   │   │   ├── audio.py
│   │   │   ├── export.py
│   │   │   └── cleanup.py      # cleanup_expired_sessions (beat-scheduled)
│   │   └── progress.py         # emits progress SSE events to Redis pub/sub
│   │
│   ├── ai/                     # LLM orchestration
│   │   ├── __init__.py
│   │   ├── client.py           # Claude client wrapper, structured output, retries
│   │   ├── graph_workflow.py   # LangGraph state graph definition
│   │   ├── agents/             # node functions: prosecutor, defense, auditor
│   │   ├── prompts/            # prompt templates (Jinja2 .md.j2)
│   │   │   ├── prosecutor/
│   │   │   ├── defense/
│   │   │   ├── auditor/
│   │   │   └── summarization/
│   │   └── validators.py       # Pydantic schemas for every LLM output shape
│   │
│   ├── processing/             # Document processing pipeline (pure-ish domain tools)
│   │   ├── __init__.py
│   │   ├── ocr_engine.py       # PaddleOCR wrapper + Tesseract fallback
│   │   ├── layout.py           # block hierarchy + heading detection
│   │   ├── ast_builder.py      # blocks → AST
│   │   ├── diff_engine.py      # clause-aligned diff
│   │   ├── rule_engine.py      # deterministic compliance evaluator
│   │   ├── graph_builder.py    # AST → NetworkX graph + contradiction detection
│   │   ├── risk_model.py       # risk scoring formulas
│   │   ├── formula_extractor.py# clause text → simulation formulas
│   │   └── safe_eval.py        # client-safe math evaluator (server reference)
│   │
│   ├── storage/                # Object storage + encryption
│   │   ├── __init__.py
│   │   ├── client.py           # S3 wrapper, key naming, listing prevention
│   │   ├── crypto.py           # AES-256-GCM per-document keys, envelope storage
│   │   └── signed_url.py       # presigned GET URLs, expiry caps
│   │
│   └── utils/
│       ├── __init__.py
│       ├── ids.py              # uuid7 generation
│       ├── pagination.py       # cursor encode/decode
│       └── file_magic.py       # MIME sniffing
│
├── tests/
│   ├── conftest.py             # DB/Redis/MinIO fixtures (testcontainers)
│   ├── unit/                   # domain + processing tests (no infra)
│   ├── integration/            # API flows, jobs, storage
│   ├── fixtures/
│   │   ├── contracts/          # synthetic contracts (4 types)
│   │   └── ai/                 # recorded LLM responses per prompt version
│   └── e2e/                    # Playwright (runs against full stack)
│
├── migrations/                 # Alembic versions + env.py
├── docker/
│   ├── Dockerfile.api
│   ├── Dockerfile.worker
│   └── entrypoints/
├── scripts/
│   ├── seed_rules.py           # seed synthetic compliance rule pack
│   └── purge_check.py          # verify no orphaned binaries
├── alembic.ini
├── pyproject.toml
├── uv.lock
├── Dockerfile
└── docker-compose.yml          # local stack: postgres, redis, minio, api, worker, frontend
```

## 2. Responsibility of Every Directory

| Directory | Responsibility | May Import From | Must Not Import From |
|---|---|---|---|
| `app/` | Package root + app factory | core | domain (directly), services |
| `api/` | HTTP surface only: routing, validation, auth extraction | core, schemas, services | processing, storage, ai, workers |
| `api/routes/` | One router file per resource group | schemas, services, dependencies | repositories directly |
| `core/` | Settings, crypto primitives, logging setup, typed exceptions | (stdlib, pydantic-settings) | domain, services |
| `domain/` | Pure business types and rules; the only layer testable with zero infra | (stdlib) | everything below it |
| `services/` | Use-case orchestration: repos + domain + task dispatch + progress | repositories, domain, workers (dispatch only), storage, ai | api |
| `repositories/` | DB access; ownership-checked queries; transaction scope | core (config), domain types | services |
| `schemas/` | Request/response DTOs shared by api and services | domain | services, repositories |
| `workers/` | Celery app and task bodies; call services, never routes | services, processing, storage, ai | api |
| `ai/` | LLM client, LangGraph workflow, agent nodes, prompt loading | domain, core | api, services (services call ai) |
| `processing/` | Deterministic document processing algorithms | domain | services, api, workers |
| `storage/` | Encrypted object storage operations | core (config), domain | services |
| `utils/` | Deterministic helpers (ids, pagination, magic bytes) | (stdlib) | domain |
| `tests/` | Test layers per root `TESTING.md` | all | — |
| `migrations/` | Alembic DB migrations | — | app code must not import migrations |
| `docker/` | Containerization per env | — | — |
| `scripts/` | One-off operational scripts | app | — |

## 3. Import Rule (Enforced by Test)

Services may construct repositories directly (DI is explicit, not via FastAPI Depends, except in route handlers). The import rule above is enforced by the architectural conformance tests in `backend/architecture.md` §Testing.

## Implementation Notes

- `app/main.py` stays under ~150 lines: factory, CORS (allowed origins from config), middleware (request-id, rate limit, security headers), routers, exception handlers.
- `schemas/` is the shared contract with the frontend — regenerate/keep in sync with `frontend/frontend-backend-contract.md` DTO definitions.
- `domain/` uses plain dataclasses and Pydantic models only; no SQLAlchemy, no HTTP.
- `workers/tasks/` files are thin: deserialize input, call one service method, commit, log. Heavy logic always lives in `services/` or `processing/`.
