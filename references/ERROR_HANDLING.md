# LexiClear — Unified Error Taxonomy

**Reading order:** Read after `SECURITY.md`. Backend error handling implementation lives in `backend/error-handling.md`; the backend validation rules live in `backend/validation.md`. This root file is the **canonical registry** of every machine-readable error code. Both frontend and backend must stay byte-for-byte consistent with it via `frontend/frontend-backend-contract.md`.

---

## 1. Error Envelope (Canonical)

Every error response — and only error responses — uses this envelope. Successful responses never contain an `error` key.

```json
{
  "error": {
    "code": "SESSION_EXPIRED",
    "message": "Your analysis session has expired.",
    "request_id": "0195f2a1-7c04-7e82-b3d1-2f9a8c0e6b4d"
  }
}
```

Rules:

- `code`: one of the canonical codes below, always `SCREAMING_SNAKE_CASE`, stable across versions (never localize the code).
- `message`: human-readable English string, may be localized by the frontend; never include stack traces, internal paths, or raw exception text.
- `request_id`: the value of the `X-Request-Id` header echoed back; required on every error response; used for support correlation and log search.
- Validation error responses additionally include `details` (array of field-level violations) as specified in `backend/validation.md`.

HTTP responses set `Content-Type: application/json` and the status codes defined per code below. SSE negotiation errors use the `negotiation.failed` event with the same envelope (see `frontend/frontend-backend-contract.md`).

## 2. Canonical Error Code Registry

### 2.1 Authentication & Authorization

| Code | HTTP | Meaning | When Raised |
|---|---|---|---|
| `AUTH_INVALID_CREDENTIALS` | 401 | Bad email/password or invalid reset token | Login, reset token redemption |
| `AUTH_UNAUTHORIZED` | 403 | Authenticated but not owner of resource | Any service enforcing ownership |
| `AUTH_TOKEN_EXPIRED` | 401 | Access token expired | API layer, before route handler |
| `AUTH_TOKEN_INVALID` | 401 | Malformed/unsigned/revoked token | API layer |
| `AUTH_EMAIL_NOT_VERIFIED` | 403 | Account exists, email unverified (if verification enforced) | Login |
| `AUTH_PASSWORD_TOO_WEAK` | 422 | Password fails policy (≥12 chars, complexity) | Registration, password change |
| `AUTH_RATE_LIMITED` | 429 | Login/reset rate limit exceeded | Login, password reset |
| `AUTH_ACCOUNT_LOCKED` | 423 | Too many failed attempts; lockout active | Login after N failures |

### 2.2 Sessions

| Code | HTTP | Meaning | When Raised |
|---|---|---|---|
| `SESSION_NOT_FOUND` | 404 | Session id unknown or not owned | Any session-scoped endpoint |
| `SESSION_EXPIRED` | 410 | Session past TTL/inactivity or purged | Workspace access, upload to dead session |
| `SESSION_NOT_ACTIVE` | 409 | Session exists but not in `active` status | Upload to finished session |
| `SESSION_SAVE_FAILED` | 422 | Cannot persist save (e.g., already purged) | Save request |

### 2.3 Documents & Upload

| Code | HTTP | Meaning | When Raised |
|---|---|---|---|
| `DOCUMENT_INVALID` | 422 | File fails magic-byte/MIME/extension validation | Upload |
| `DOCUMENT_TOO_LARGE` | 413 | Exceeds `UPLOAD_MAX_SIZE` | Upload |
| `DOCUMENT_UNSUPPORTED` | 415 | MIME not in allowlist | Upload |
| `DOCUMENT_MALICIOUS` | 422 | Malware signature or embedded-script heuristic detected | Upload scanning |
| `DOCUMENT_NOT_FOUND` | 404 | Document id unknown or not owned | Document endpoints |
| `DOCUMENT_ALREADY_PROCESSED` | 409 | Re-upload of identical hash to same session rejected | Upload (idempotency) |
| `DOCUMENT_PARSE_EMPTY` | 422 | Parsed document contains no extractable text | Post-OCR validation |

### 2.4 Processing Pipeline

| Code | HTTP | Meaning | When Raised |
|---|---|---|---|
| `OCR_FAILED` | 500 | OCR engine failed after retries | Ingestion job |
| `PARSER_FAILED` | 500 | AST builder could not construct a valid AST | AST job |
| `DIFF_FAILED` | 500 | Redline diff could not align clauses | Diff job |
| `COMPLIANCE_FAILED` | 500 | Rule engine evaluation crashed (never LLM) | Compliance job |
| `GRAPH_FAILED` | 500 | Graph generation/contradiction detection crashed | Graph job |
| `SIMULATION_INVALID` | 422 | Formula/variable model fails validation or bounds | Simulation create/eval |
| `ANALYSIS_PIPELINE_FAILED` | 500 | Analysis pipeline (compliance+graph+AI+risk) exhausted retries | Pipeline job |
| `AI_OUTPUT_INVALID` | 424 | LLM output failed schema validation after max retries | AI orchestration |
| `AI_PROVIDER_UNAVAILABLE` | 503 | Claude API unavailable (backoff in effect) | AI orchestration |

### 2.5 Negotiation, Audio, Export

| Code | HTTP | Meaning | When Raised |
|---|---|---|---|
| `NEGOTIATION_FAILED` | 500 | Negotiation graph failed after retries (streamed via SSE) | Negotiation |
| `NEGOTIATION_IN_PROGRESS` | 409 | A negotiation already running on this clause/session | Start negotiation |
| `NEGOTIATION_NOT_STARTED` | 404 | SSE client requested stream for unknown negotiation | SSE subscribe |
| `AUDIO_FAILED` | 500 | TTS generation failed after retries | Audio job |
| `AUDIO_LANGUAGE_UNSUPPORTED` | 422 | Language code not in supported set | Narrate request |
| `EXPORT_FAILED` | 500 | Export render failed after retries | Export job |
| `EXPORT_TYPE_UNSUPPORTED` | 422 | Format not PDF/DOCX | Export request |
| `EXPORT_URL_EXPIRED` | 410 | Signed download URL expired | Download |
| `EXPORT_URL_INVALID` | 403 | Signature invalid / path traversal attempt | Download |

### 2.6 Infrastructure & General

| Code | HTTP | Meaning | When Raised |
|---|---|---|---|
| `RATE_LIMITED` | 429 | General API rate limit exceeded | Rate-limit middleware |
| `VALIDATION_ERROR` | 422 | Request body failed schema validation | API layer (`details` included) |
| `NOT_FOUND` | 404 | Generic resource not found (typed codes preferred) | API layer |
| `METHOD_NOT_ALLOWED` | 405 | Wrong HTTP method | Router |
| `INTERNAL_ERROR` | 500 | Unhandled exception (never expose details) | Exception handler |
| `SERVICE_UNAVAILABLE` | 503 | Dependency (DB/Redis/storage/LLM) unhealthy | Health/proxy layer |
| `REQUEST_TIMEOUT` | 408 | Request exceeded timeout | API layer |

## 3. Mapping Rules (Implementation)

1. Every exception raised inside a service must be one of the typed exceptions defined in `backend/core/exceptions.py`, each carrying its canonical code and an HTTP status.
2. The API layer's global exception handler maps typed exceptions to the envelope; `INTERNAL_ERROR` is the *only* mapping path for untyped exceptions — untyped exceptions must always log full detail server-side and return the generic envelope client-side.
3. Frontend mapping: each canonical code maps to a UI behavior (toast/banner/redirect) as documented in `frontend/api-client.md`. The frontend must never branch on `message` strings — only on `code`.
4. `request_id` is generated at the API boundary (`X-Request-Id` header, echoed in the envelope) and propagated into Celery job context and structured logs (`backend/observability.md`).
5. Retries are internal (worker → worker, LLM → LLM); the client never sees retry loops — it sees either success, a job-in-progress state, or one of the failure codes above after exhaustion.

## 4. Client-Side Error Behaviors (Contract)

| Code Group | Frontend Behavior |
|---|---|
| `AUTH_*` | Redirect to login (401), show inline error (403/422), throttle retry UI (429/423) |
| `SESSION_EXPIRED` / `SESSION_NOT_FOUND` | Banner + redirect to home with recovery suggestion; never silently re-authenticate |
| `DOCUMENT_*` / `VALIDATION_ERROR` | Show `details` in the upload overlay; allow re-select |
| `*_FAILED` (pipeline) | Retry action in workspace; progress overlay shows last failed stage |
| `RATE_LIMITED` | Show remaining-cooldown UI; no auto-retry storm |
| `INTERNAL_ERROR` / `SERVICE_UNAVAILABLE` | Generic error state with retry |
