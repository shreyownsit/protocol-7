# File Storage (Encrypted Ephemeral Object Storage)

**Requirement:** Secure temporary storage for uploaded documents and generated artifacts, with AES-256 encryption, enforced TTL, scoped access policy, deterministic lifecycle, deletion semantics, and cleanup-failure recovery. The architecture must **enforce** privacy, not merely document it.

**Why:** The PRD privacy principle — documents are not permanently stored by default — is only as strong as the storage layer that backs it.

## 1. Storage Substrate

S3-compatible object storage (MinIO locally, S3/R2/B2 in production; one bucket per environment, `OBJECT_STORAGE_BUCKET`). Direct client access is **never** granted: all access transits signed URLs generated server-side after ownership checks.

## 2. Key Structure

```
sessions/{session_id}/documents/{document_id}/original        # encrypted binary
sessions/{session_id}/documents/{document_id}/pages/{n}.png   # temporary renders (TTL)
sessions/{session_id}/documents/{document_id}/ocr/{n}.json    # OCR blocks (TTL)
sessions/{session_id}/documents/{document_id}/ast.json        # AST JSON
sessions/{session_id}/audio/{audio_request_id}.mp3            # artifact (TTL)
sessions/{session_id}/exports/{export_id}.pdf|docx            # artifact (TTL)
```

Prefix listing is disabled at the bucket policy level (no `s3:ListBucket` for any key); the application tracks all keys it creates in DB rows (`storage_key` columns), so a listing API is unnecessary and forbidden.

## 3. Encryption (`storage/crypto.py`)

- **Data key:** random 256-bit per document/artifact class.
- **Cipher:** AES-256-GCM; AAD = `session_id || artifact_type || artifact_id` (keys are useless outside their session context).
- **Key management:** data key stored in Redis `encryption_keys:{id}` TTL=session expiry (`caching.md`); a **redundant encrypted copy** stored as object metadata header (`X-Amz-Meta-Encrypted-Key`: base64(Encrypt(data_key, master_derived_key))) so workers survive Redis loss. The redundant copy is the *availability* mechanism; the Redis TTL is the *privacy* mechanism — the purge job deletes both.
- Master derivation: HKDF-SHA256(`ENCRYPTION_KEY`, salt=`session_id`) → per-session wrapping key. Rotating `ENCRYPTION_KEY` re-derives lazily on next access (key-version tagged in metadata; stale versions return `INTERNAL_ERROR` and alert).

## 4. Access Policy

| Accessor | Mechanism | TTL Cap |
|---|---|---|
| Frontend (renders, downloads) | Signed GET URL, scoped to exact key | 5 min (`SIGNED_URL_TTL_SECONDS`) |
| Workers (read/write stages) | Server-side credentials, key-prefix scoped by session | session lifetime |
| Export/audio consumers | Signed GET URL | 5 min (audio), per `EXPORT_ARTIFACT_TTL_SECONDS` config, max 24 h |

Signed URLs: `client.generate_signed_url(key, method="GET", expires_in)` — method hardcoded GET; expiry capped by config; paths validated against key-structure regex before signing (anti-traversal: any key not matching `^sessions/[0-9a-f-]+/` is rejected with `EXPORT_URL_INVALID`/`AUTH_UNAUTHORIZED`).

## 5. Lifecycle and Deletion

- **Ephemeral artifacts** (pages, ocr, audio, exports): TTL metadata on the object + application-side expiry check at read time + storage lifecycle rule (configure bucket lifecycle to delete objects older than 7 days as a belt-and-suspenders floor; app logic is authoritative).
- **Original binaries:** survive only as long as the session is active/saved per `privacy.md`; deleted by `purge_session` (sessions.md) which: deletes every key under the session prefix (keys enumerated from DB rows, not listing), destroys the Redis data key, deletes the metadata-encrypted copy, and verifies deletion (head-object 404 check) before marking rows purged.
- **Deletion semantics:** delete is best-effort with verification; unverified deletes are retried 3× then flagged to `audit_events` + observability alert; manual review path documented.

## 6. Cleanup Failure Recovery

If `purge_session` cannot delete an object (provider outage): the session row is NOT marked purged (privacy-conservative), the failure is recorded, and the bucket lifecycle rule eventually removes the object; a weekly `scripts/purge_check.py` reconciles orphaned keys against DB rows and alerts. Orphaned keys older than retention are safe to delete (they are encrypted with destroyed keys — cryptographically unrecoverable).

## 7. Failure Modes

- `SERVICE_UNAVAILABLE` if storage is unreachable at upload time.
- `EXPORT_URL_EXPIRED` / `EXPORT_URL_INVALID` for bad or expired signed URLs.
- Encryption failure at upload → `INTERNAL_ERROR`, nothing stored, audit alert.

## Security

GCM tag verification on every decrypt (reject truncated objects). AAD mismatch = reject. No key material in logs (log key ids only). Bucket public access: disabled at policy level (CI check on bucket policy).

## Testing

Unit: encrypt/decrypt round-trip + AAD mismatch rejection + tag-tamper rejection; key-structure regex validation cases. Integration: upload→store→signed-URL→download→purge verifies 404 on the key; lifecycle TTL respected; bucket policy denies listing (policy inspection test). Fixture: small synthetic PDF through the full round trip.
