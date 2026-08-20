# Caching (Redis)

**Requirement:** Explicit Redis usage with every key namespace documented. Redis is a cache, broker, coordination, and rate-limit store — never an accidental second database. All durable state lives in PostgreSQL.

**Why:** Redis powers session hot state, encryption key TTL (the privacy mechanism), SSE coordination, and rate limits. Unmanaged keys silently leaking memory or, worse, outliving their privacy TTL, would break the system's core guarantees.

## 1. Key Namespace Registry

| Namespace | Shape | TTL | Contents | Privacy Class |
|---|---|---|---|---|
| `sessions:{session_id}:meta` | hash | = remaining session life | status, save_state, expires_at, analysis_status | low (metadata) |
| `encryption_keys:{document_id}` | string | = session expiry | AES-256 data key (base64) | **critical** — key destruction = data destruction |
| `ratelimit:login:ip:{ip}` | string counter | 60 s | attempt count | low |
| `ratelimit:login:email:{email}` | string counter | 30 min | failure count (lockout) | low |
| `ratelimit:upload:user:{user_id}` | string counter | 3600 s | count | low |
| `ratelimit:api:user:{user_id}` | string counter | 60 s | count | low |
| `ratelimit:reset:email:{email}` | string counter | 3600 s | count | low |
| `ratelimit:narrate:session:{id}` | string counter | 3600 s | count | low |
| `ratelimit:export:session:{id}` | string counter | 3600 s | count | low |
| `progress:buffer:{type}:{id}` | list (ring, max 100) | 3600 s | last SSE events (JSON) | medium (evidence quotes) |
| `audio_cache:{session}:{lang}:{voice}:{summary_ver}` | string | = artifact TTL | storage key of synthesized audio | medium |
| `ast_cache:{document_id}:{ast_version}` | string | 7 d | serialized AST JSON | **sensitive** (contract text) |
| `lock:cleanup:{session_id}` | string | 5 min | distributed lock value | low |
| `deny:access_jti:{jti}` | string | 15 min | revoked access jti marker | low |
| `deny:refresh_jti:{jti}` | string | 7 d | revoked refresh jti | low |
| `cleanup_failures:{session_id}` | string counter | 7 d | purge failure count | low |
| `broker/worker internals` | celery:* | — | Celery-managed | — |

## 2. Usage Rules

1. **Write-through with DB authority:** `sessions:{id}:meta` is updated on every DB mutation that changes the cached fields; reads check Redis first, DB on miss, populate on miss. Invalidation on save/expire/purge is mandatory and synchronous with the DB write (same transaction scope in the service, Redis op after commit; a missed Redis invalidation degrades to a stale 24h-max view — acceptable, but purge must invalidate or the privacy TTL would lie).
2. **Privacy-critical TTLs** (`encryption_keys`, session meta) are set with explicit absolute expiry at write time; **never rely on app-layer deletion alone** — if the app crashes, the Redis TTL still kills the key.
3. **No Redis transactions as business logic:** rate-limit increments use `INCR`+`EXPIRE` (atomic); anything needing true consistency lives in Postgres.
4. **Eviction policy:** `noeviction` — keys are sized and TTL'd explicitly; an OOM here is an alert, not silent data loss. (Broker memory is separate from cache keys in practice; monitor both.)
5. **Serialization:** JSON for buffers/cache; raw bytes only for `encryption_keys`.

## 3. Per-Subsystem Notes

- **Session meta:** bump on `SessionService.touch` (authorization-safe: touch requires ownership-checked session first).
- **Rate limits:** sliding-window approximation via expiring counters (documented approximation: a burst at window edge may exceed the limit by ≤1x — acceptable; exact windows unnecessary at this scale).
- **SSE buffers:** producer appends via LPUSH + LTRIM(100); TTL 1 h keeps memory bounded even for abandoned resources.
- **AST cache:** populated by `ast_generation` job; invalidated on re-OCR (ast_version increments). Contains contract text — Redis dataset encryption-at-rest is recommended in production (Redis `--requirepass` + TLS in transit mandatory; disk encryption via infra).
- **Audio cache:** busted when summary version changes (summary regeneration increments version).

## 4. Failure Modes

- Redis unreachable → API degrades to DB-only session reads (slower, correct); jobs fail fast with `SERVICE_UNAVAILABLE` (broker down is fatal — alert).
- Key loss (flush/eviction misconfig) → `encryption_keys` loss means document binaries become unrecoverable (by design for expired sessions; for active sessions the metadata-encrypted fallback copy in object storage allows re-derivation — documented recovery: `storage/crypto.py` re-encrypt path).
- Redis full (`noeviction`) → write errors → alert; capacity sized 2× expected working set.

## Security

`requirepass` always; TLS in transit in staging/prod; `ast_cache` namespace documented as sensitive (infra disk encryption). No secret storage in Redis beyond short-lived tokens (deny lists, data keys with bounded TTL).

## Testing

Unit: rate-limit counter semantics (boundary at expiry). Integration: touch→meta cache coherency; purge invalidates `encryption_keys` + meta; SSE buffer replay from Redis list; rate limit actually throttles via TestClient at the boundary.
