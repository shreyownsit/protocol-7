# Error Handling

**Requirement:** Typed exceptions, a mapping table from exception to HTTP code, error responses that always include request IDs, a retry policy, and links to subsystem-specific error codes. This is the backend's execution of the root `ERROR_HANDLING.md` contract.

**Why:** A consistent error surface is what makes the frontend's error UI (`frontend/frontend-backend-contract.md` §Errors) possible, and what makes production triage tractable.

## 1. Exception Hierarchy (`app/core/exceptions.py`)

```
LexiClearError(Exception)                # base; carries request_id, session_id
├── AuthError(LexiClearError)
│   ├── InvalidCredentials
│   ├── TokenExpired / TokenInvalid
│   ├── RateLimited / AccountLocked
│   └── PasswordTooWeak
├── OwnershipError(LexiClearError)       # NotFound (anti-enumeration), Unauthorized
│   ├── SessionNotFound / SessionExpired / SessionNotActive
│   ├── DocumentNotFound / AnalysisNotReady
│   └── AuthorizationViolation           # explicit cross-user attempt (logged)
├── ValidationError(LexiClearError)      # 422 + details
├── DocumentError(ValidationError)       # TooLarge / Unsupported / Invalid /
│                                        # Malicious / ParseEmpty
├── SimulationError(ValidationError)     # SimulationInvalid
├── ExportError(ValidationError)         # TypeUnsupported / UrlExpired / UrlInvalid
├── AudioError(ValidationError)          # LanguageUnsupported
├── NegotiationError(ValidationError)    # InProgress
├── ComplianceError(LexiClearError)      # ComplianceFailed
├── AIError(LexiClearError)              # OutputInvalid / ProviderUnavailable
├── PipelineError(LexiClearError)        # StageFailed (code carries stage)
└── ServiceUnavailable(LexiClearError)   # 503
```

Every exception carries `code` (canonical string), `message` (user-safe), `details` (field-level, optional), and — from contextvars — `request_id` / `session_id`.

## 2. Mapping Table

| Exception | HTTP | Envelope |
|---|---|---|
| `InvalidCredentials` | 401 | code `AUTH_INVALID_CREDENTIALS` |
| `TokenExpired` / `TokenInvalid` | 401 | `AUTH_TOKEN_EXPIRED` / `AUTH_TOKEN_INVALID` |
| `AccountLocked` | 423 | `AUTH_ACCOUNT_LOCKED` |
| `RateLimited` | 429 | `RATE_LIMITED` + `Retry-After` |
| `PasswordTooWeak` | 422 | `AUTH_PASSWORD_TOO_WEAK` + `details` |
| `SessionNotFound` / `DocumentNotFound` | 404 | `SESSION_NOT_FOUND` / `DOCUMENT_NOT_FOUND` |
| `SessionExpired` | 410 | `SESSION_EXPIRED` |
| `AuthorizationViolation` | 403 | `AUTH_UNAUTHORIZED` (logged) |
| `ValidationError` and subtypes | 422 | code varies per subtype, `details` present |
| `NegotiationError.InProgress` | 409 | `NEGOTIATION_IN_PROGRESS` |
| `AnalysisNotReady` | 409 | `DOCUMENT_PROCESSING` |
| `AIOutputInvalid` | 502 | `AI_OUTPUT_INVALID` |
| `AIProviderUnavailable` | 502 | `AI_PROVIDER_UNAVAILABLE` |
| `ComplianceFailed` / `PipelineError` | 500→422 semantics | `COMPLIANCE_FAILED` etc., mapped to user-facing retry affordance |
| `ServiceUnavailable` | 503 | `SERVICE_UNAVAILABLE` |
| Unhandled | 500 | `INTERNAL_ERROR` (logged fully, user gets generic message) |

Unhandled exceptions: global exception handler writes the full traceback to logs (request_id attached), returns `{"error":{"code":"INTERNAL_ERROR","message":"An internal error occurred","request_id":"..."}}`. The user can report the `request_id`; support can look it up.

## 3. Response Envelope

```json
{ "error": { "code": "DOCUMENT_TOO_LARGE",
             "message": "File exceeds the 25 MB limit.",
             "request_id": "01901abc-...",
             "details": [{"field": "file", "code": "too_large",
                          "message": "28.4 MB uploaded, 25 MB allowed"}] } }
```

`details` is optional and present only when field-level guidance is useful (validation, password policy). Message text is user-safe by construction (messages are constants in `app/core/messages.py`, never interpolated with user data beyond sizes/counts).

## 4. Retry Policy

| Layer | Policy |
|---|---|
| API (client-facing) | Never auto-retry mutating requests; idempotent endpoints document collision semantics (`validation.md` §3) |
| Celery tasks | 2 retries, exponential backoff 30s/2min; transient-only (`background-jobs.md`) |
| AI client | 2 retries on 5xx/rate-limit with jitter; fallback provider for TTS (`audio.md`) |
| DB deadlocks | 1 retry inside the transaction service wrapper |
| Redis | task fails fast if broker unreachable (alert); cache miss falls through to DB |

User-visible retry: the frontend's retry affordance re-calls the idempotent endpoint; the API never silently retries a user action.

## 5. Subsystem Error Codes (Index)

- Auth: `authentication.md` §6 · Ingestion: `document-ingestion.md` §2 · OCR/AST: `ocr-parser.md` §6, `structural-ast.md` §5 · Diff: `redline-diff.md` §5 · Compliance: `compliance-engine.md` §8 · Graph: `knowledge-graph.md` §6 · Simulations: `simulation.md` §7 · Negotiation: `negotiation.md` §7 · Audio: `audio.md` §7 · Export: `export.md` §6 · Storage: `file-storage.md` §7 · Pipeline/jobs: `background-jobs.md` §7.

## Security

Error messages never reveal internals (SQL, paths, stack traces) and never distinguish 404 vs 403 for ownership (`authorization.md`). `request_id` enables support lookup without exposing anything else.

## Testing

Unit: every exception maps to its HTTP code (table-driven test over the hierarchy). Integration: each canonical code is produced by at least one real endpoint scenario (TestClient matrix); unhandled exception → 500 with `INTERNAL_ERROR` and no traceback leakage. Envelope shape test: all error responses validate against the envelope schema. Retry test: transient failure → exactly 2 retries then terminal code; non-transient → zero retries.
