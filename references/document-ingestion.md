# Document Ingestion

**Requirement:** The upload pipeline: Upload → Validate → Encrypt → Store (temporarily) → Create processing job → OCR/parsing → AST → analysis. Supported inputs: PDF, DOCX, JPG, PNG, and browser camera images (MediaDevices API on the frontend produces a JPEG/PNG blob — same pipeline).

**Why:** Ingestion is the system's largest attack surface (arbitrary files from untrusted users) and the entry point of the privacy model (encrypted ephemeral storage).

## 1. Pipeline Stages

```
Client POST /upload (multipart)
  → [1] API layer: size + header validation
  → [2] IngestionService: magic-byte MIME sniff + extension allowlist + malware heuristic
  → [3] Create document row (status=uploading) + session binding
  → [4] Encrypt (per-document AES-256-GCM key, `storage/crypto.md`)
  → [5] Store: sessions/{session_id}/documents/{document_id}/original
  → [6] Enqueue document_ingestion job (OCR→AST→analysis pipeline)
  → [7] 202 Accepted {document_id, job tracking}
```

The client receives `202` with a `document_id` and immediately begins progress subscription (SSE progress channel or polling `/documents/{id}/status`, per `realtime.md`).

## 2. Validation Rules

| Check | Rule | Failure Code |
|---|---|---|
| Size | ≤ `UPLOAD_MAX_SIZE_BYTES` (25 MB default), checked on stream, before full read | `DOCUMENT_TOO_LARGE` (413) |
| MIME (header) | `application/pdf`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `image/jpeg`, `image/png` only | `DOCUMENT_UNSUPPORTED` (415) |
| Magic bytes | Sniff first 8–12 KB (`utils/file_magic.py`): PDF `%PDF`, DOCX PK zip + `[Content_Types].xml`, JPEG `FF D8 FF`, PNG `89 50 4E 47`. Header MIME must match sniffed type. | `DOCUMENT_INVALID` (422) |
| Extension | Consistent with sniffed type (defense in depth) | `DOCUMENT_INVALID` (422) |
| Malware heuristic | Signature scan (ClamAV optional integration; minimum: embedded-executable-in-PDF heuristic — `/JS`, `/JavaScript, /OpenAction object density threshold configurable) | `DOCUMENT_MALICIOUS` (422) |
| Content sanity | Post-OCR: non-empty text yield (`DOCUMENT_PARSE_EMPTY`) | handled post-OCR |

## 3. Encryption and Storage

- Per-document random 256-bit key; plaintext encrypted client-side-to-storage via `storage/crypto.py` (AES-256-GCM; AAD includes `session_id + document_id` so keys are non-portable across sessions).
- Document key is stored in Redis under `encryption_keys:{document_id}` with TTL = session expiry, and also persisted encrypted under a master-key derivation (`ENCRYPTION_KEY` via HKDF) as fallback for worker restarts — the Redis TTL is the *privacy* guarantee; the persisted copy exists only so processing survives restarts and is destroyed by the purge job.
- Object key structure: `sessions/{session_id}/documents/{document_id}/original` plus later stages (`.../pages/`, `.../ast.json`, `.../ocr/`) written by workers (`file-storage.md`).
- Session binding: the document row's `session_id` is immutable after creation; the storage key embeds it; authorization is checked before upload (session must be `active` and owned).

## 4. Idempotency

Duplicate upload of a file with identical content hash to the same session returns the existing document row with `200` (not re-processed) — `DOCUMENT_ALREADY_PROCESSED` is used only when the existing document is in a terminal failed state and the client forces reprocessing via `?force=true` (re-authenticated, audit-logged).

## 5. Progress Feedback

`document_ingestion` job emits progress events (`ingestion.progress`) with stage tokens: `validating → uploading → storing → ocr → ast → analysis`. Frontend state machine in `frontend/upload-overlay.md`.

## 6. Cleanup

- On any failure after storage: the stored binary is deleted by the job's failure handler (storage must not accumulate orphans — `scripts/purge_check.py` verifies nightly).
- Session expiry purge deletes all document binaries under the session prefix (`sessions.md` cleanup).

## 7. Failure Modes

`DOCUMENT_INVALID`, `DOCUMENT_TOO_LARGE`, `DOCUMENT_UNSUPPORTED`, `DOCUMENT_MALICIOUS` (all pre-storage, nothing persists); `OCR_FAILED`/`PARSER_FAILED`/`DOCUMENT_PARSE_EMPTY` post-storage with binary retained until session purge (user can retry analysis, file still exists encrypted); rate limit `RATE_LIMITED` (30/hour/user).

## Security

- Files are never executed, rendered server-side, or opened by libraries with known parse-CVE exposure without sandboxed parsing (PDFium via `pypdfium2` for page rasterization; DOCX parsed by `python-docx` text extraction only — no macro execution path, ever).
- Malicious-heuristic detections are logged (filename hash, not content) and audit-evented.
- Upload endpoint is rate-limited and requires an active owned session.

## Testing

Unit: magic-byte sniffing matrix (valid files per type + 10 fuzzed.invalid files); size limit boundary. Integration: full upload→encrypt→store→job-queued flow with MinIO test bucket; idempotency (same hash twice); malicious-PDF heuristic rejection; progress event sequence; purge leaves zero orphans. Fixtures: synthetic contracts in `tests/fixtures/contracts/` (PDF generated from HTML fixtures, DOCX from fixtures, JPG/PNG renders of lease fixture pages).
