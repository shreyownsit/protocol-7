# API Reference

**Requirement:** Complete API surface for LexiClear v1. Versioning: URL-prefix `/api/v1/` (hardcoded, no negotiation — one client app, version bumps via new prefix when breaking; master prompt §32). Every endpoint below specifies method, path, authentication, authorization, request schema, response schema, status codes, validation, errors, side effects, and events. Pagination is cursor-based (§Pagination). All schemas align byte-for-byte with `frontend/frontend-backend-contract.md`.

**Conventions:** All IDs are `uuid7` strings. Timestamps ISO 8601 UTC. Errors use the canonical envelope (root `ERROR_HANDLING.md`). Auth: `Authorization: Bearer <access_token>` (anonymous sessions: `Authorization: Session <session_token>`). Rate limits per `configuration.md`.

---

## 1. `/api/v1/health`, `/api/v1/ready`

| Method | Path | Auth | Response |
|---|---|---|---|
| GET | `/health` | none | `200 {"status":"ok","version":"1.0.0"}` — process liveness only |
| GET | `/ready` | none | `200 {"status":"ready","checks":{"db":"ok","redis":"ok","storage":"ok","llm":"ok"}}` — dependency readiness; `503` with failing checks listed if any dependency unhealthy. No secrets or internal topology revealed. |

## 2. Auth — `api/routes/auth.py`

### POST `/auth/register`
- **Auth:** none. **Authorization:** n/a.
- **Request:** `{email, display_name, password}` — email format+length, password policy (≥12 chars, ≥1 letter, ≥1 digit).
- **Response 201:** `{user:{id,email,display_name}, access_token, refresh_token, expires_in}`.
- **Errors:** `VALIDATION_ERROR` (details), `AUTH_PASSWORD_TOO_WEAK`, `VALIDATION_ERROR` duplicate email (message only — no code distinguishing), `RATE_LIMITED`.
- **Side effects:** user row; `audit_events` `user.registered`; session created only on first upload (authn doesn't create sessions).
- **Events:** none.

### POST `/auth/login`
- **Auth:** none. **Request:** `{email, password}`. **Response 200:** same token pair shape. **Errors:** `AUTH_INVALID_CREDENTIALS` (401), `AUTH_EMAIL_NOT_VERIFIED` (403 if enforced), `AUTH_ACCOUNT_LOCKED` (423), `AUTH_RATE_LIMITED` (429). **Side effects:** failure counter; `audit_events` `user.logged_in` / `user.login_failed`.

### POST `/auth/logout`
- **Auth:** access. **Response:** 204. Revokes refresh family + access jti.

### POST `/auth/refresh`
- **Auth:** body `{refresh_token}`. **Response 200:** new pair. **Errors:** `AUTH_TOKEN_INVALID`/`AUTH_TOKEN_EXPIRED`. **Side effects:** old token revoked; replay → family revocation + `authz.violation` audit.

### POST `/auth/password-reset/request`
- **Auth:** none. **Request:** `{email}`. **Response:** always 202 `{message:"If the account exists, a reset link was sent."}` (anti-enumeration). Rate limit 3/h/email.

### POST `/auth/password-reset/redeem`
- **Request:** `{token, new_password}`. **Response 200:** token pair. **Errors:** `AUTH_INVALID_CREDENTIALS` (bad/expired token), `AUTH_PASSWORD_TOO_WEAK`.

### POST `/auth/email-verify/{token}`
- No-op stub (200) unless verification enforced.

## 3. Users — `api/routes/users.py`

### GET `/users/me`
- **Auth:** access. **Response 200:** `{id,email,display_name,email_verified,preferences:{language_code,...},created_at}`.

### PATCH `/users/me`
- **Request:** any subset of `{display_name, current_password, new_password, preferences:{language_code}}`. Password change requires `current_password` correct. **Response 200** updated profile. **Errors:** `VALIDATION_ERROR`, `AUTH_INVALID_CREDENTIALS` (bad current password), `AUTH_PASSWORD_TOO_WEAK`. **Events:** none.

## 4. Sessions — `api/routes/sessions.py`

### POST `/sessions`
- **Auth:** access. **Request:** `{title?}`. **Response 201:** session object. **Side effects:** session row, `audit_events` `session.created`.

### GET `/sessions`
- **Auth:** access. **Query:** `?cursor=...&limit=20` (max 50). **Response 200:** `{items:[session_summary], next_cursor}` — session summaries: id, title, document_name, status, save_state, analysis_status, created_at, expires_at. Cursor: opaque base64 `(expires_at, id)`, ordering newest-first.

### GET `/sessions/{id}`
- **Auth:** access. **Errors:** `SESSION_NOT_FOUND`, `SESSION_EXPIRED` (410). **Response 200:** full session + summary_text + analysis_status.

### POST `/sessions/{id}/save`
- **Auth:** access. Anonymous → `AUTH_UNAUTHORIZED`. **Response 200** saved session; **errors:** `SESSION_SAVE_FAILED`, `SESSION_NOT_FOUND`. **Side effects:** status transitions, retention policy applied, `audit_events` `session.saved`.

### POST `/sessions/{id}/unsave`
- Restores TTL immediately. 200.

### POST `/sessions/{id}/claim`
- Anonymous session token holder authenticates → re-parents to user. Request: none. 200 re-parented session. Errors: `AUTH_UNAUTHORIZED` if already owned by another user.

## 5. Upload — `api/routes/upload.py`

### POST `/upload`
- **Auth:** access or session token. **Request:** multipart `file`; form field `session_id` (create if absent via header `X-Create-Session: true`).
- **Response 202:** `{document_id, session_id, status:"uploading"}`.
- **Validation/Errors:** `DOCUMENT_TOO_LARGE` (413), `DOCUMENT_UNSUPPORTED` (415), `DOCUMENT_INVALID` (422), `DOCUMENT_MALICIOUS` (422), `SESSION_NOT_FOUND`/`SESSION_NOT_ACTIVE`, `RATE_LIMITED`, `VALIDATION_ERROR` (missing file).
- **Side effects:** document row, encrypted storage, `document_ingestion` job enqueued, progress channel opened.
- **Events:** `ingestion.progress` stream (`realtime.md`).

## 6. Documents — `api/routes/documents.py`

### GET `/sessions/{session_id}/documents`
- Auth: access. **Response:** list (small, no pagination needed — ≤3 per session). Each: id, name, mime_type, size_bytes, page_count, status, source, processing_error_code.

### GET `/sessions/{session_id}/documents/{document_id}/status`
- Polling fallback for progress. 200 `{status, progress:{stage, percent}, error_code?}`.

### GET `/sessions/{session_id}/documents/{document_id}/ast`
- Auth: access. **Response 200:** full AST JSON (`structural-ast.md` schema). **Errors:** `DOCUMENT_NOT_FOUND`, analysis-not-ready → 409 `{error:{code:"DOCUMENT_PROCESSING"}}` (added code; frontend shows progress).

### GET `/sessions/{session_id}/documents/{document_id}/pages/{n}`
- Returns signed URL for the temporary page render (5 min). 200 `{url, expires_at}`. Auth: access.

## 7. Diff — `api/routes/diff.py`

### POST `/diff`
- **Auth:** access. **Request:** `{session_id, document_a_id, document_b_id}` (both session-owned). **Response 202:** `{diff_id, status:"queued"}`. **Errors:** `DOCUMENT_NOT_FOUND`, `VALIDATION_ERROR` (same-document pair rejected), `SESSION_NOT_ACTIVE`.
- **Side effects:** `diff_generation` job. **Events:** `diff.progress` + completion via polling `GET /diff/{diff_id}` → 200 diff payload (`redline-diff.md` schema).

## 8. Compliance — `api/routes/compliance.py`

### POST `/compliance-check`
- **Auth:** access. **Request:** `{session_id}`. **Response 202:** `{job_id}` — runs the compliance stage for the session (idempotent; returns existing results if current). **Errors:** `SESSION_NOT_FOUND`, analysis-not-ready → 409.
- **Events:** `compliance.progress`.

### GET `/sessions/{session_id}/compliance`
- **Response 200:** `{results:[{rule_id,name,clause_id?,outcome,details}], findings:[compliance findings], evaluated_at, rule_version}`.

## 9. Graph — `api/routes/graph.py`

### GET `/sessions/{session_id}/graph`
- **Response 200:** vis-network payload (`knowledge-graph.md` §5). Auth: access. Errors: `SESSION_NOT_FOUND`, not-ready 409.

## 10. Risk — `api/routes/risk.py`

### GET `/sessions/{session_id}/risk-model`
- **Response 200:** `{variables:[{name,category,value,weight,evidence_refs}], overall_risk, formula_doc}`. Auth: access.

## 11. Simulations — `api/routes/simulation.py`

### POST `/sessions/{session_id}/simulations`
- **Request:** optional `{title, variables?, formulas?}`; empty body → default model from AST. **Response 201** model. **Errors:** `SIMULATION_INVALID` (details), `SESSION_NOT_FOUND`.

### GET / PATCH / DELETE `/simulations/{id}` — owner-only; PATCH validates per `simulation.md` §3; DELETE soft (runs pruned at 30 days).

### POST `/simulations/{id}/verify`
- **Request:** `{scenario:{var: value}}`. **Response 200:** `{formula_results:{name:{value, unit, matches_reference}}, evaluated_at}`. **Errors:** `SIMULATION_INVALID`.

## 12. Negotiation — `api/routes/negotiate.py`

### POST `/negotiate`
- **Auth:** access. **Request:** `{session_id, clause_id, context:{goals:[string]}}`. **Response 202:** `{negotiation_id, status:"queued"}`. **Errors:** `NEGOTIATION_IN_PROGRESS` (409), `SESSION_NOT_ACTIVE`, `VALIDATION_ERROR` (unknown clause). **Events:** full SSE event sequence (`realtime.md`).

### GET `/negotiate/{id}` — state + steps. **GET `/negotiate/{id}/stream`** — SSE. **GET `/negotiate/{id}/counter`** — approved counter-clause (completed only; else 404-ish `NEGOTIATION_NOT_STARTED`/`NOT_FOUND`).

## 13. Audio — `api/routes/audio.py`

### POST `/narrate`
- **Auth:** access. **Request:** `{session_id, language_code, voice?}`. **Response 202:** `{audio_request_id, status:"queued"}`. **Errors:** `AUDIO_LANGUAGE_UNSUPPORTED`, `SESSION_EXPIRED`, `RATE_LIMITED`.
- **GET `/narrate/{audio_request_id}`** → ready: `{url, expires_at, duration_seconds}`.

## 14. Export — `api/routes/export.py`

### POST `/export`
- **Auth:** access. **Request:** `{session_id, format, contents}` (`export.md` §2). **Response 202:** `{export_id, status:"queued"}`. **Errors:** `EXPORT_TYPE_UNSUPPORTED`, `VALIDATION_ERROR`, `SESSION_NOT_ACTIVE`.
- **GET `/export/{export_id}`** → ready: `{url, expires_at, filename}`. Download transit via signed URL (`export.md`); tampered path → `EXPORT_URL_INVALID`.

---

## Pagination (all list endpoints)

- Cursor: opaque string = base64(JSON(`{sort_key, id}`)); `limit` default 20, max 50.
- Ordering: sessions newest-first (`created_at DESC, id DESC`); findings by severity ordinal then created_at.
- Empty result: `{items:[], next_cursor: null}`. Cursor for end: null.

## Cross-Cutting API Rules

1. Every response includes `X-Request-Id`; errors echo it in the envelope.
2. 404 vs 403 indistinguishability per `authorization.md`.
3. No endpoints outside this file (debug endpoints only in dev with `/debug/` prefix).
4. Content negotiation: JSON only (exports are binary via signed URL).
5. Idempotency keys: `POST /upload` (content hash), `POST /negotiate` (clause+context hash), `POST /export` (contents hash), `POST /compliance-check` (session).
