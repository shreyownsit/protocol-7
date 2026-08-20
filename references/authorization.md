# Authorization

**Requirement:** Define ownership rules for every resource. A user may only access their own sessions, documents, findings, simulations, negotiations, and exports. Authorization is enforced at the repository/service boundary — never solely by frontend route protection.

**Why:** The frontend is untrusted; any ownership bug must be impossible to exploit through the API alone.

## 1. Ownership Model

Every resource descends from either a `user_id` (top-level) or a `session` that carries a `user_id`. Authorization is a single recursive rule:

> A request is authorized if the actor owns the target resource **or** owns an ancestor of the target resource (session owns its documents; documents own their clauses).

Anonymous sessions (assumption A3): an anonymous actor owns a session via a **session access token** — a separate 256-bit random token (`session_token`) stored hashed, issued at anonymous session creation, passed as `Authorization: Session <token>`. Anonymous owners get full session rights but **cannot** save sessions persistently beyond the TTL and have no user account. Converting an anonymous session to authenticated (`POST /sessions/{id}/claim`) re-parents it to the logged-in user (re-authentication required).

## 2. Enforcement Points (Hard Rule)

1. **Repositories** expose only ownership-checked accessors: `get_by_id(id, owner_id)` raises `SESSION_NOT_FOUND` / `DOCUMENT_NOT_FOUND` (404 semantics — do not distinguish "not found" from "not owned"; prevents enumeration, `AUTH_UNAUTHORIZED` only used for cross-user explicit attempts that are logged).
2. **Services** receive the current actor (user id or session token hash) explicitly and pass it to repositories. No service method has an unscoped `get(id)`.
3. **Bulk endpoints** (lists) filter by owner at the query level — never fetch-then-filter.
4. The API layer never performs authorization; it only extracts the actor.

## 3. Resource Access Matrix

| Resource | Who Can Read | Who Can Write |
|---|---|---|
| sessions | owner only | owner only (claim for anonymous→auth) |
| documents | owner only | owner only |
| clauses / pages | session owner | pipeline (system), owner |
| findings | session owner | pipeline (system) |
| compliance_results | session owner | pipeline (system) |
| risk_models / variables | session owner | pipeline (system) |
| simulations / runs | session owner | owner (runs append-only) |
| negotiations / steps | session owner | pipeline (system); owner starts |
| counter_clauses | session owner | pipeline (system) |
| audio_requests | session owner | pipeline (system); owner requests |
| exports | session owner | pipeline (system); owner requests |
| users / preferences | self only | self only |
| audit_events | system (support export) | system |

## 4. Scoped Binary Access

Signed URLs (`file-storage.md`) are scoped to `sessions/{session_id}/...` prefixes and are generated only after an ownership-checked API call. Object storage itself never authenticates the client — all access transits signed URLs.

## 5. Failure Modes

- Resource not found **or** not owned → `*_NOT_FOUND` (404), identical response (anti-enumeration).
- Authenticated user attempting another user's resource with a guessed id → `AUTH_UNAUTHORIZED` (403) **and** an `audit_events` `authz.violation` record with resource id (no document text).
- Anonymous token invalid → `AUTH_TOKEN_INVALID`.

## Security

- 404-vs-403 indistinguishability is mandatory for guessed-id enumeration resistance.
- Violation audit events enable detection of enumeration attacks (observability.md).
- Admin/support access to other users' data exists only via an offline support tooling path (out of scope for v1 API) — no backdoor endpoint in the API.

## Testing

Unit: ownership predicate over the resource tree (ancestor rule) with synthetic trees. Integration: for every resource table, create user A + user B resources and assert cross-access returns 404-equivalent and same-user access succeeds; assert lists never leak cross-user rows (query inspection test). Anonymous session claim flow E2E.
