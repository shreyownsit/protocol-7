# Background Jobs (Celery)

**Requirement:** Celery handles all long-running operations. This file specifies every job: input, output, retry strategy, timeout, idempotency, failure behavior, logging, and progress updates. Redis is the broker (and result backend **disabled** — job results live in the database, never Redis: Redis is not a second database).

**Why:** OCR, AST, compliance, graph, audio, export, diff, and cleanup all exceed request latency budgets. One broker, one worker type (concurrency via worker count), beat scheduler for cleanup.

## 1. Job Registry

| Task name | Trigger | Timeout | Retries | Idempotency Key |
|---|---|---|---|---|
| `document_ingestion` | upload endpoint | 10 min | 2 | `document_id` |
| `ocr_processing` | ingestion | 10 min / 50 pages | 2 | `document_id` |
| `ast_generation` | ocr | 5 min | 2 | `document_id` |
| `diff_generation` | diff endpoint | 5 min | 2 | `(doc_a, doc_b)` |
| `compliance_analysis` | pipeline | 5 min | 2 | `(session_id, rule_version_set)` |
| `graph_generation` | pipeline | 5 min | 2 | `(session_id, ast_version)` |
| `analysis_pipeline` | ast / compliance-check endpoint | 20 min | 2 | `session_id` (stage-scoped) |
| `audio_generation` | narrate endpoint | 5 min | 2 (+provider fallback) | `audio_request_id` |
| `export_generation` | export endpoint | 5 min | 2 | `(session_id, contents_hash)` |
| `cleanup_expired_sessions` | beat, every 15 min | 30 min | 0 (reschedule) | per-session status guard |
| `purge_session` | cleanup | 10 min | 3 | `session_id` |

## 2. Task Contract (every task)

```
Input:  minimal envelope {ids..., actor_hint, request_id}
Output: DB state mutation (never Celery result backend)
Logging: structured, request_id + job_id + session_id; never document text
Progress: progress_service.emit(resource_type, resource_id, event, payload)
Failure: typed exception → status mutation + terminal progress event
```

- **Input discipline:** tasks receive ids only; they load entities from the DB themselves (no stale snapshots across retries).
- **Result discipline:** the job's "result" is the updated DB rows (document.status, negotiation.status, export row...). `app.result_backend = Disabled`.
- **Timeout:** hard `time_limit`/`soft_time_limit` per registry row; exceeded → worker kills + retry.
- **Retry:** exponential backoff (30s, 2min); retries only on transient errors (provider 5xx, storage blips, DB deadlocks) — validation and deterministic failures fail immediately, no retry.
- **Idempotency:** the task function begins with `if already_done(idempotency_key): return` — a guard query on the business state (e.g., document.status == ready). Re-delivery after crash can never duplicate persisted records. Unique constraint backing each key makes the guard atomic.
- **Failure behavior:** max retries exhausted → terminal state mutation (`document.status=failed` + `processing_error_code`, `export.status=failed`...), terminal progress event emitted, `audit_events` record, alert-class log. The user sees a retry affordance; retries re-enqueue idempotently.

## 3. `analysis_pipeline` (the coordinator)

The pipeline task chains stages within one task body (not Celery chains — explicit staging gives better progress semantics and per-stage restart):

```
analysis_pipeline(session_id)
  ├─ stage compliance_analysis  → compliance_results + findings
  ├─ stage graph_generation     → graph_payload + contradiction findings
  ├─ stage ai_analysis          → LangGraph workflow → summary + flags
  └─ stage risk_evaluation      → risk model (uses compliance+graph findings)
  each stage: emit pipeline.progress; on stage failure → session.analysis_status=failed
              at that stage, earlier stages' results remain visible
```

Stage-scoped idempotency: each stage checks its own done-flag (`compliance_results` populated at current rule version, etc.) before running.

## 4. Cleanup Jobs

- `cleanup_expired_sessions`: query expired actives → mark → fan out `purge_session` (inline if < 10, else subtasks with a concurrency cap of 4).
- `purge_session`: storage deletion (all keys from DB rows) → Redis key destruction → row purge → status `purged`. Order matters: **storage first, metadata last** — a purge that deletes metadata first could strand encrypted binaries forever.
- Both are idempotent via status guards; failures never delete metadata (privacy-conservative: over-retention is safer than under-purge, with alerting).

## 5. Worker Deployment and Concurrency

Worker container runs `celery -A app.workers.celery_app worker --concurrency=${CELERY_CONCURRENCY:-4} --loglevel=INFO`. Beat runs only on one designated instance (`--detach` avoided; single beat process in compose; in production, exactly one beat via singleton deploy setting). Prefetch `prefetch_multiplier=1` (long tasks). Ack late (after commit) so redelivery semantics match idempotency design.

## 6. Logging

Every task logs: `job_id` (celery task id), `request_id` (from envelope), `session_id`, stage, duration ms. `audit_events` for user-visible job outcomes (upload processed, export generated, purge completed). No extracted text in logs, ever.

## 7. Failure Modes (summary)

Per-job canonical codes on exhaustion: `OCR_FAILED`, `PARSER_FAILED`, `DIFF_FAILED`, `COMPLIANCE_FAILED`, `GRAPH_FAILED`, `ANALYSIS_PIPELINE_FAILED`, `AUDIO_FAILED`, `EXPORT_FAILED` — surfaced to users via document/export/audio status + `processing_error_code`, and to support via audit events.

## Security

Tasks run in the same trust boundary as the API; no additional privileges. Cleanup runs with storage delete scope only (`file-storage.md`). Task payloads never contain secrets.

## Testing

Unit: idempotency guard semantics (double call = single effect) via mocked repos. Integration (with test worker via `CELERY_TASK_ALWAYS_EAGER=false` + real broker): each job's happy path end-to-end against MinIO/test DB; failure-path assertions (max retries → terminal state + audit event + no duplicate rows under redelivery via forced redeliver test). Progress emission order test per job. Cleanup end-to-end: expire a session → run beat → purged state + 404 on storage keys.
