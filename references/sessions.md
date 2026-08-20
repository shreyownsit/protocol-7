# Sessions

**Requirement:** A session-centered architecture: one session = one active contract-analysis context. This file defines session creation, renewal, expiration, inactivity TTL, cleanup, resume, anonymous vs authenticated behavior, and explicit save behavior.

**Why:** Sessions are the unit of privacy (ephemeral binaries), the unit of workflow state (analysis pipelines), and the unit of ownership (authorization.md).

## 1. Session Lifecycle State Machine

```
CREATED → ACTIVE → (inactivity or TTL) → EXPIRING → EXPIRED → PURGED
                        ↑                    |
                        |      user saves ──┤→ SAVED (metadata persists,
                        |                       binaries per retention)
                        └── resume (activity)┘
```

| State | Meaning |
|---|---|
| `active` | Accepts uploads, analysis, negotiation. |
| `saved` | User explicitly saved; metadata persists indefinitely; binaries follow saved retention (`privacy.md`). |
| `expired` | Past TTL/inactivity; binaries queued for purge; metadata queryable (tombstone). |
| `purged` | Binaries deleted; row retained 90 days as tombstone, then hard-deleted. |

## 2. Lifetime Rules

- **Lifetime TTL:** `SESSION_TTL_SECONDS` (default 24 h) from `created_at`, unless saved.
- **Inactivity TTL:** `SESSION_INACTIVITY_TTL_SECONDS` (default 60 min). `last_activity_at` is bumped on **any authenticated API request that reads or writes session-scoped data** (workspace load, upload, findings fetch, negotiation). Pure metadata ops (session list) do not bump.
- **Effective expiry:** `expires_at = max(created_at + lifetime, last_activity_at + inactivity)`, recomputed on every bump and stored.
- **Renewal:** the bump + recompute is implemented once in `SessionService.touch(session_id)` called by a service-layer decorator/mixin, not scattered in handlers.
- **Hot state:** active-session expiry metadata is cached in Redis (`sessions:{id}:meta`, TTL = remaining life) to avoid DB hits on every request; DB is the source of truth, Redis is a write-through cache invalidated on save/expire.

## 3. Creation

- **Authenticated:** `POST /api/v1/sessions` → insert with `user_id`, status `active`, return session (201).
- **Anonymous:** created implicitly on first upload when no session exists; `user_id` null, `session_token` issued (authorization.md). Anonymous sessions behave identically except: no persistent save beyond TTL, no cross-device access.
- One document per session primary; a second document may be attached for redline diff (documents table allows N documents per session; `session.document_id` points at the primary).

## 4. Expiration and Cleanup

`cleanup_expired_sessions` Celery Beat task (every 15 min):

1. Query `sessions WHERE status='active' AND expires_at < now()`.
2. Mark `expired`; enqueue per-session purge job `purge_session(session_id)` (or batch inline if small).
3. Purge job: delete object storage keys under `sessions/{id}/`, revoke Redis keys (`encryption_keys:{id}`, `sessions:{id}:meta`, pub/sub channel), mark documents `expired`, delete clauses/findings/results rows (evidence purged with binaries — privacy), set session `purged` after binary deletion confirmed.
4. Idempotent: re-run on the same session is a no-op (status guard).
5. **Cleanup failure recovery:** a `cleanup_failures` counter per session in Redis; after 3 failures the session is flagged for manual review in `audit_events` and observability alert; the job never deletes metadata before binary deletion succeeds.

## 5. Resume Behavior

Opening `/workspace/{session_id}` after inactivity-but-not-expiry: DB/Redis state rehydrates documents, findings, compliance, graph, risk from persisted metadata — **no re-processing**. If expired: API returns `SESSION_EXPIRED` (410) with the session title so the UI can offer recovery guidance (re-upload).

## 6. Explicit Save Behavior

`POST /api/v1/sessions/{id}/save` (auth required; anonymous sessions cannot save):

1. Sets `save_state=saved`, `status=saved`, recomputes `expires_at` to `+90 days` (configurable) or indefinite per `privacy_mode`.
2. Binaries: `privacy_mode=standard` → retained (re-encrypted with a long-lived key derivation); `privacy_mode=strict` → retained only as analysis metadata, binaries purged immediately after save (user opts into analysis-without-storage).
3. Save is a user action and is audit-logged (`session.saved`).
4. Unsave (`POST .../unsave`) restores normal TTL immediately.

## 7. Failure Modes

- Save on already-purged session → `SESSION_SAVE_FAILED` (422).
- Activity bump on expired session → `SESSION_EXPIRED` (410).
- Cleanup job crash → retry with backoff; recovery path per §4.

## Implementation Notes

- Session scoping helper: `scoped_to(session_id)` returns the ownership-checked session object; all session-scoped services start with it.
- Session titles auto-derive from the primary document name.
- The workspace frontend polls/streams `analysis_status`; sessions carry it (`database.md`).

## Security

Session token (anonymous) uses the same constant-time comparison discipline as refresh tokens. Save/unsave require authentication; anonymous→authenticated claim re-parents ownership (authorization.md).

## Testing

Unit: expiry arithmetic (created_at + lifetime vs inactivity bump interactions). Integration: touch-bump recompute; cleanup job purges binaries + Redis + rows for an expired session; cleanup idempotency (run twice, second run no-op); save/unsave transitions + strict-mode binary purge verification; anonymous claim flow.
