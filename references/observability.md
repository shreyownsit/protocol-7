# Observability

**Requirement:** Structured logs with request/job/session IDs, metrics for processing/OCR/AI/export latency, error tracking, and processing-stage instrumentation — never leaking sensitive document text.

**Why:** The system's pipelines are multi-stage and async; without correlation IDs and stage metrics, failures are un-debuggable. At the same time, logs are the most likely leak vector for contract text.

## 1. Correlation IDs

| ID | Scope | Propagation |
|---|---|---|
| `request_id` | one HTTP request | generated at API boundary (or taken from `X-Request-Id`), echoed in responses, injected into Celery task envelope, attached to all logs in the chain |
| `job_id` | one Celery task execution | celery task id, logged with `request_id` |
| `session_id` | one analysis context | attached to every log within session-scoped work |

Context propagation: FastAPI middleware sets a `contextvars` context (`request_id`, `session_id`); the task envelope carries them into workers; `app.core.logging` attaches them automatically from context.

## 2. Structured Logging

JSON lines to stdout (`logging.config` in `app.core.logging`). Every record: `ts, level, logger, request_id, job_id?, session_id?, event, msg, duration_ms?, status?`. Log levels: INFO for lifecycle events, WARN for retries, ERROR for terminal failures.

**Forbidden in logs (enforced by lint rule + test):** raw document text, `source_text_raw`, clause `text` fields, counter-clause `counter_text`, LLM evidence quotes, passwords/tokens/keys (any value of a config field whose name contains `SECRET`, `KEY`, `TOKEN`, `PASSWORD`), prompt templates, LLM raw responses. The lint test scans the codebase for logging calls with text-field variables and fails CI on matches.

Logged-safe instead: clause ids, page numbers, bbox coordinates, counts, timings, error codes, config field *names* (not values).

## 3. Metrics (Prometheus via `prometheus_fastapi_instrumentator` + manual histograms)

| Metric | Type | Labels |
|---|---|---|
| `http_request_duration_seconds` | histogram | method, endpoint, status |
| `http_requests_total` | counter | method, endpoint, status |
| `lexiclear_stage_duration_seconds` | histogram | stage ∈ {upload, ocr, ast, compliance, graph, ai, risk, diff, audio, export} |
| `lexiclear_stage_total` | counter | stage, outcome ∈ {success, failed} |
| `lexiclear_llm_duration_seconds` | histogram | node ∈ {summary, prosecutor, defense, auditor} |
| `lexiclear_llm_tokens_total` | counter | node, type ∈ {input, output} |
| `lexiclear_ocr_pages_total` | counter | outcome |
| `lexiclear_sessions_active` | gauge | — |
| `lexiclear_cleanup_purge_duration_seconds` | histogram | — |
| `celery_task_duration_seconds` | histogram | task |

OCR latency = `ocr` stage; AI latency = `ai` stage + per-node `llm` histograms; export latency = `export` stage. P95 targets (config-logged, not enforced hard): OCR 30 s/page batch, AI analysis 90 s, export 30 s, upload validation 200 ms.

## 4. Error Tracking

Typed exceptions (root `ERROR_HANDLING.md`) map 1:1 to metric `outcome=failed` increments per stage. Optional Sentry integration (`SENTRY_DSN`): sends error class + code + request_id; **before_send scrubber removes** any field matching sensitive patterns (same pattern list as §2) — scrubber tested with synthetic payloads.

## 5. Processing-Stage Instrumentation

Each pipeline stage emits a structured `event: stage.{started,completed,failed}` log at entry/exit with `duration_ms`. Progress events to the frontend (`realtime.md`) reuse the same stage vocabulary so logs and UI progress are reconcilable.

## 6. Audit vs Ops Logs

`audit_events` (DB) is the tamper-resistant security audit trail (logins, uploads, exports, purges, authz violations, cleanup failures). Application logs are operational only. Audit rows never contain document text (`database.md` audit_events metadata rule).

## Implementation Notes

- Metrics endpoint: `/metrics` (Prometheus exposition) — dev/staging only in v1? **No** — expose in production too; no secret in metric names/values.
- Log aggregation is platform-provided (Render/Vercel sinks); no self-hosted ELK.
- Health endpoints intentionally minimal (`api.md` §1); readiness failures are the primary alert signal.

## Security

The forbidden-field lint + scrubber + `before_send` test together form the anti-leak guarantee. Log sinks (platform) are assumed TLS-transported; no log shipping to third parties beyond the platform in v1.

## Testing

Unit: forbidden-field lint test (CI gate). Integration: run upload+analysis with a log-capturing handler → assert no clause text, no quotes, no config values appear; assert request_id consistent across API→job logs; metrics present for each stage after a pipeline run; Sentry scrubber test with crafted payloads.
