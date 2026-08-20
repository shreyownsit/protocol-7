# Realtime (SSE)

**Requirement:** Server-Sent Events stream negotiation progress (and upload/analysis progress) to the frontend with defined event types, payload schemas, ordering, ids, timestamps, and reconnect behavior. WebSocket is explicitly not used — SSE keeps the stack simple and works through all proxies.

**Why:** Negotiation is the one workflow the user watches live (master prompt §25). Progress feedback on uploads and analysis uses the same mechanism for consistency.

## 1. Transport

- Endpoint pattern: `GET /api/v1/{resource}/{id}/stream` (negotiate), `GET /api/v1/sessions/{id}/progress` (upload/analysis).
- `EventSourceResponse` (starlette-sse) with `ping` comments every 15 s, `retry: 3000`, `text/event-stream`.
- Auth: `Authorization` header carried via `EventSource` polyfill header support; the endpoint validates the token against the resource's ownership before streaming (re-check on every reconnect).
- Concurrency: one stream per client per resource; server keeps a bounded fan-out map keyed by resource id.

## 2. Redis Coordination

Producers (workers, negotiation nodes) publish events to Redis pub/sub channels `progress:{resource_type}:{id}`. The API endpoint subscribes on connection, forwards events, and buffers the **last N events** in Redis list `progress:buffer:{resource_type}:{id}` (max 100, TTL 1 h) so reconnecting clients with `Last-Event-Id` can replay the missed tail. Negotiation steps are also persisted in `negotiation_steps` (source of truth); the buffer is a convenience for mid-run reconnects.

## 3. Event Contract

Every event: `id: <monotonic uuid7>`, `event: <type>`, `data: <json payload with ts>`, `retry: 3000`.

### 3.1 Negotiation events (`/negotiate/{id}/stream`)

| Event | When | Payload |
|---|---|---|
| `negotiation.started` | stream opened / workflow queued | `{negotiation_id, clause_id, context_goals, ts}` |
| `prosecutor.started` | prosecutor node begins | `{negotiation_id, ts}` |
| `prosecutor.completed` | output validated | `{negotiation_id, issues:[{category, fragment_quote, severity, explanation}], ts}` |
| `defense.started` | defense begins | `{negotiation_id, ts}` |
| `defense.completed` | counter drafted | `{negotiation_id, counter_text, rationale, changes, ts}` |
| `auditor.started` | audit begins | `{negotiation_id, ts}` |
| `auditor.completed` | deterministic check done | `{negotiation_id, compliant, rule_hits:[rule_id], explanation, ts}` |
| `negotiation.retrying` | regeneration loop | `{negotiation_id, retry_count, reason, ts}` |
| `negotiation.completed` | counter approved | `{negotiation_id, counter_clause_id, ts}` |
| `negotiation.failed` | exhausted retries / crash | `{negotiation_id, error:{code,message,request_id}, ts}` |

Ordering: started → (prosecutor.started → completed) → (defense.started → completed) → (auditor.started → completed → retrying* → completed) → completed/failed. `retrying` may appear 0–2 times between auditor.completed (reject) and defense.started (regen).

### 3.2 Upload / analysis events (`/sessions/{id}/progress`)

`ingestion.progress {stage: validating|uploading|storing|ocr|ast|analysis, percent, ts}`, `ocr.progress {pages_done, pages_total, ts}`, `pipeline.progress {stage: compliance|graph|ai|risk, ts}`, `diff.progress`, `audio.progress {stage, ts}`, and terminal events `analysis.completed {session_id, status}`, `analysis.failed {error}`, `ingestion.failed {error}`.

## 4. Reconnect / Replay

- Client sends `Last-Event-Id` header; server replays buffered events with id > last seen (buffer list scan), then continues live.
- If the buffer is expired (client gone >1 h): negotiation clients fall back to `GET /negotiate/{id}` step log; upload clients fall back to `/documents/{id}/status` polling. Both paths are documented in the frontend contract.
- Server guards: channel subscription errors → close stream with `error` event; client count per resource capped at 20 (excess → 429-like SSE error event).

## 5. Failure Handling

Stream drops are the client's reconnect trigger (native `EventSource` reconnects automatically with `Last-Event-Id`). A negotiation that fails mid-stream emits `negotiation.failed` with the canonical error envelope — the same code the REST layer would use (`NEGOTIATION_FAILED`, `SESSION_EXPIRED`, `AI_OUTPUT_INVALID`).

## Implementation Notes

- SSE endpoint is thin: subscribe, forward, heartbeats. All event construction happens at the producer (workers emit via `workers/progress.py` helper that publishes to Redis + appends to buffer atomically enough for the 100-item ring).
- Negotiation events are additionally written to `negotiation_steps` by the node functions (source of truth); the stream is a projection.
- No W3C `EventSource` header support natively — the frontend uses a small SSE client wrapper (`frontend/realtime.md`) that sets the header.

## Security

Stream endpoints are ownership-checked on connect AND on every replay scan (re-check per §1). Event payloads never include raw clause text beyond ≤150-char evidence quotes. Channel names contain only ids (no user data).

## Testing

Unit: event payload schemas (Pydantic) for all 13 event types. Integration: run a recorded negotiation → subscribe → assert event sequence/order/ids monotonic; kill client mid-run → reconnect with `Last-Event-Id` → assert replay completeness vs `negotiation_steps`; buffer expiry → graceful fallback paths. Heartbeat receipt test. Ownership test: wrong user subscribes → stream closes with error event.
