# Backend Architecture

**Requirement:** The backend is a modular monolith exposing a versioned REST API over FastAPI, with Celery workers for long-running processing and an SSE endpoint for streamed negotiation. It must be implementable by a single capable coding agent and deployable as one container image (API+jobs share code) plus a worker container.

**Why:** The product is small-team buildable (master prompt §59). Microservices, Kubernetes, Kafka, and a separate graph database are explicitly forbidden. A layered modular monolith gives clean boundaries without operational complexity.

## 1. Layered Architecture

```
API Layer              FastAPI routers — validation, auth extraction, delegation
Application Layer      app/services — use-case orchestration (one class per use case)
Domain Layer           app/domain — pure Python: rules, AST types, graph algos, risk math
Infrastructure Layer   app/repositories, app/storage, app/ai, app/processing, app/workers
```

Dependency direction is strictly inward: API → services → domain ← repositories/processing. The domain layer imports nothing from FastAPI, Celery, or boto3. Domain types are Pydantic models and plain dataclasses, so they are usable by both services and workers without coupling.

**Route handler contract (hard rule):**

```python
@router.post("/sessions/{session_id}/negotiate")
async def start_negotiation(
    session_id: UUID, payload: NegotiationRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_auth),
):
    result = await NegotiationService(db, current_user).start(session_id, payload)
    return result   # never raise DomainError here; services raise typed exceptions
```

Handlers may only: extract auth, validate the Pydantic body/path, call one service method, serialize the result. No loops, no DB queries, no branching on business rules.

## 2. Component Map

| Component | Implementation | Entry Point |
|---|---|---|
| API server | FastAPI app factory (`app.main.create_app`) | `uvicorn app.main:app` |
| Worker | Celery app (`app.workers.celery_app`) consuming the same codebase | `celery -A app.workers worker` |
| Scheduler | Celery Beat (one instance) | `celery -A app.workers beat` |
| Realtime | SSE endpoint mounted on the API app | `/api/v1/negotiate/{negotiation_id}/stream` |
| Migrations | Alembic, async driver | `alembic upgrade head` |

The API app and the worker import from the same package. Workers call **services** (not routes), so business logic is exercised identically in both contexts — this is how idempotency and transaction rules stay consistent (`background-jobs.md`, `validation.md`).

## 3. Request Flow — The Canonical Path

```
Client → API Layer (auth + schema validation + rate limit)
       → Service.use_case(...)                [application layer]
          → Repository query/mutate            [infrastructure, transaction scoped]
          → DomainFunction(...)                [pure, testable]
          → dispatch_celery_task(...)          [enqueue, returns job id]
       → Service returns {job_id} or result
API Layer → 202 Accepted (or 201/200 for sync results)
```

Synchronous threshold: any operation that may exceed **5 seconds** P95 must be a background job or an SSE stream. The async decision table is in root `ARCHITECTURE.md` §6 and is exhaustive.

## 4. Concurrency Model

FastAPI is async-first (`async def` handlers, SQLAlchemy async engine). Celery workers are synchronous threads. The boundary between them is the task envelope: tasks receive **ids and minimal metadata**, never large payloads or ORM sessions. Tasks open their own sessions, do their work, commit, and log progress through the progress service (`realtime.md`).

Database concurrency notes:
- Session state updates use `UPDATE ... WHERE last_activity_at = :old` style optimistic writes where races matter (rare; Redis holds hot session state — `caching.md`).
- Job idempotency uses PostgreSQL advisory-style unique constraints on `task_name + business_key` (`background-jobs.md`).
- Negotiation lock: one active negotiation per clause per session via DB row (`negotiations.status = RUNNING` unique partial index).

## 5. Cross-Cutting Concerns and Where They Live

| Concern | Home |
|---|---|
| Error taxonomy | root `ERROR_HANDLING.md`; typed exceptions `app/core/exceptions.py`; mapping `backend/error-handling.md` |
| Validation | `backend/validation.md` |
| AuthN/AuthZ | `backend/authentication.md`, `backend/authorization.md` |
| Logging/metrics | `backend/observability.md` |
| Secrets/config | `backend/configuration.md` |
| Security/privacy | `backend/security.md`, `backend/privacy.md` |
| Redis usage | `backend/caching.md` |

## 6. Failure Model Summary

Every failure ends as one of: (a) a typed exception mapped to a canonical error code (synchronous path), (b) a job failure with retries and then a persisted failure state queryable by the frontend (background path), or (c) a `negotiation.failed` SSE event (streaming path). The client never sees internal retries. Details: `backend/error-handling.md`, `backend/background-jobs.md`, `backend/realtime.md`.

## Implementation Notes

- FastAPI dependency-injection is used for repositories and services; avoid over-using it — services are constructed explicitly in tests.
- Keep `app/main.py` thin: app factory, CORS, middleware registration, router inclusion, exception handlers. Target < 150 lines.
- The domain layer must remain importable without postgres/redis available — all infrastructure imports are guarded behind service/worker modules so domain unit tests run with zero fixtures.

## Security

No business logic in handlers (injection surface stays small and uniform). Rate limiting lives in middleware before routing. Typed exceptions guarantee error codes are machine-stable and never leak traces (`backend/error-handling.md`).

## Testing

Architectural conformance tests: (1) domain layer has zero imports of `fastapi`, `celery`, `boto3`; (2) every router endpoint calls exactly one service method (static analysis test using AST inspection); (3) a handler cannot read the request body twice without going through the validated Pydantic model.
