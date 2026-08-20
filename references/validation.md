# Validation

**Requirement:** A consistent request validation policy: Pydantic for HTTP input, AI output schema validation, idempotency documentation per endpoint, and transaction boundary rules. Validation errors return `VALIDATION_ERROR` with field-level `details`.

**Why:** Validation is scattered across ingestion, auth, simulation, export, and AI stages; a single policy keeps error surfaces uniform and prevents the classic gap where one subsystem trusts another's unvalidated input.

## 1. HTTP Request Validation (FastAPI + Pydantic)

- Every request/response schema is a Pydantic v2 model in `app/schemas/` (per route module). FastAPI validates automatically and returns `422 VALIDATION_ERROR` with `details: [{field, message}]` for type/format failures.
- Business validation (uniqueness, ownership, state checks) happens in services and raises typed exceptions (`VALIDATION_ERROR` with `details`, or domain codes like `DOCUMENT_TOO_LARGE`, `SIMULATION_INVALID`) — never generic 500s.
- Standard validation rules:
  - Strings: length-bounded (display_name ≤100, titles ≤200, text fields ≤4000 per subsystem); no leading/trailing whitespace acceptance without explicit trim documentation.
  - Enums: strict membership, errors name allowed values.
  - IDs: uuid7 format validated at schema level; unknown ids resolve to `*_NOT_FOUND` in services.
  - Pagination: `limit` clamped 1–50 at schema level.
  - Currency amounts: non-negative where applicable, ≤10⁹ cap with `VALIDATION_ERROR`.

## 2. AI Output Validation

Recap of the binding rule (`ai-orchestration.md` §5): every LLM response is validated against a Pydantic schema **before** entering shared state. Malformed → node retry; exhausted → `AI_OUTPUT_INVALID`; invalid output is **never persisted**. Output schemas are versioned alongside prompts (fixtures regenerate on schema change — detected by fixture-manifest checksum in CI).

## 3. Idempotency Registry

Every mutating endpoint declares its idempotency key; duplicates return the original outcome (same status class — 202→202 with existing id — or 200 with existing resource):

| Endpoint | Key | Collision Behavior |
|---|---|---|
| `POST /upload` | content hash + session_id | 200 existing document |
| `POST /compliance-check` | session_id (+ rule version set) | returns existing results |
| `POST /negotiate` | session_id + clause_id + context hash | returns existing negotiation if terminal; 409 if running |
| `POST /export` | session_id + contents hash | returns existing export if not expired |
| `POST /narrate` | session_id + language + voice + summary_version | returns existing audio_request if ready |
| `POST /diff` | (document_a, document_b) | returns existing diff |
| Celery tasks | per-task key (`background-jobs.md`) | guard-query no-op |

Idempotency implementation: unique partial indexes on the key columns + a `SELECT` guard inside the creating service method (transaction-scoped). Documented in the endpoint spec, never implicit.

## 4. Transaction Boundaries

- **One business operation = one transaction.** Examples: negotiation creation (negotiation row + step seed); counter-clause approval (counter_clauses row + status transition); simulation creation (model row + variable rows + formula rows); export generation (artifact storage commit + row status); user deletion (all sessions purge + token revocation + tombstone).
- **Cross-resource coordination uses outbox semantics:** when a transaction must also trigger a job/external action (e.g., upload → enqueue), the enqueue happens after commit; failure to enqueue after commit is detected by a "pending job" watchdog query (every job table has `queued_at` + a status; sessions with documents `uploading` >15 min without a running job are re-enqueued idempotently).
- **No write-skew:** status machines (`sessions`, `documents`, `negotiations`, `exports`) use `CHECK` constraints on status values plus service-layer transitions; two concurrent transitions to the same resource are serialized by `SELECT ... FOR UPDATE` in the service method.
- **Celery ack late** (`background-jobs.md` §1): redelivery can replay a task; idempotency guards (§3) absorb it.

## 5. Validation Error Contract

All validation failures funnel to the canonical envelope: `422 VALIDATION_ERROR` with `details: [{field, code, message}]`; subsystem-specific codes (`SIMULATION_INVALID`, `EXPORT_TYPE_UNSUPPORTED`, `DOCUMENT_MALICIOUS`...) are subtypes of the same envelope shape with `details` carrying the specifics. Frontend renders `details` field-by-field (`frontend/frontend-backend-contract.md`).

## Testing

Unit: Pydantic schema boundary suite (every model: min/max/invalid samples). Integration: `VALIDATION_ERROR` responses contain `details` for malformed payloads across all mutating endpoints (TestClient matrix). Idempotency: each key collision per §3 asserted (repeat call returns original id; no duplicate rows under concurrency — run two concurrent calls via threading). Transaction boundary: concurrent status transitions on one resource → exactly one succeeds; watchdog re-enqueue test.
