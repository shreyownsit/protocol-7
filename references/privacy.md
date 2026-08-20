# Privacy and Data Retention

**Requirement:** A privacy-first ephemeral lifecycle: Session created → Document uploaded (encrypted) → Processing & analysis → Session ends → Everything purged (documents, pages, OCR, AST, results, graph, audio, exports). Saved sessions persist only **allowed metadata**: user's own summaries, findings, and saved documents with metadata — never full unencrypted binaries beyond the user's explicit save, and never in a form retrievable by anyone but the owner.

**Why:** The PRD's core promise is "your contracts are yours, temporarily." Privacy must be the default behavior of the system's mechanics, not a policy document.

## 1. Ephemeral Lifecycle (Default)

```
Session created (active)
  Document uploaded        → encrypted binary: sessions/{sid}/documents/{did}/original
  OCR pages/OCR text       → TTL artifacts (7 d floor) under sessions/{sid}/documents/{did}/
  AST / analysis results   → encrypted JSONB on rows + ast.json artifact (TTL)
  Audio / exports          → TTL artifacts (24 h)
Session expires            → cleanup job purges:
                             • all object keys under sessions/{sid}/
                             • encryption keys (Redis TTL + metadata copy)
                             • OCR/AST/analysis DB rows (evidence goes with binaries)
                             • session row → tombstone (purged), hard-deleted at 90 d
```

Enforcement is mechanical: nothing outside the session prefix is written; the purge job enumerates keys from DB rows (no listing) and verifies deletion; `encryption_keys` carry the session's remaining TTL — key destruction makes any stray encrypted bytes cryptographically unrecoverable; the bucket lifecycle rule is the third belt.

## 2. Saved Sessions (Opt-In)

`POST /sessions/{id}/save` (owner-only; authorization.md):

- **Saved session retains:** metadata (session info, titles), findings/compliance results, plain-language summaries, risk model, simulation models, approved counter-clauses (metadata), export history (metadata). These are the "allowed metadata" — user-authored or user-requested analytical artifacts.
- **Original binaries:** `privacy_mode=standard` → binaries re-encrypted under a **long-lived key derivation** (session key wrapped by a saved-session wrapping key derived from `ENCRYPTION_KEY` + session id; stored encrypted, never plaintext anywhere) and retained indefinitely until unsave/delete. `privacy_mode=strict` → binaries are purged immediately after save confirmation; only analysis artifacts (metadata) persist. The user picks the mode at save time; the choice is recorded in `save_mode` on the row and in the audit event.
- **Retained content is never shared:** saved-session content remains under the same ownership rules; no collaborative feature exists in v1 that could widen access.
- **Delete (user-initiated):** `DELETE /sessions/{id}` on a saved session → same purge path as expiry, immediate. Audit-logged (`session.deleted`).

## 3. What Is Never Stored, Period

| Category | Rule |
|---|---|
| Full unencrypted binaries (unsaved sessions) | Never on disk unencrypted — AES-256-GCM at rest, in transit TLS |
| Encryption keys in plaintext beyond Redis TTL | Never; metadata-encrypted copy only |
| LLM raw responses / prompts | Never logged or persisted (`ai-orchestration.md`) |
| OCR raw text beyond the session | Purged with the session |
| Analysis evidence beyond session/tombstone | Findings' long quotes only persist in saved sessions |
| Passwords | argon2id hash only |
| Document text in logs/audit rows | Never (forbidden-field lint, `database.md` audit schema) |
| Usage fingerprinting / tracking IDs | None — no analytics SDKs with PII in v1 |

## 4. Legal Basis and Notices (Scope Note)

The v1 UI carries a single privacy notice page (static content, `frontend/home.md`) stating: ephemeral default, what saving retains, provider processing (LLM/TTS), no third-party sharing, retention periods, deletion affordance. GDPR/CCPA rights (export-of-my-data, erasure) are supported mechanically: all owner data is enumerable via the API itself; erasure = `DELETE /sessions/{id}` + `DELETE /users/me` (account deletion endpoint: purge all sessions, revoke tokens, tombstone user 30 d, hard delete). A `POST /users/me/export` provides a JSON dump of the user's saved metadata on request (account-deletion flow includes it automatically).

## 5. Retention Table

| Data | Default TTL | Saved Session | Max |
|---|---|---|---|
| Session metadata (active) | 24 h + 60 min inactivity | indefinite until unsave/delete | — |
| Original binaries | session lifetime | standard: indefinite; strict: none | — |
| OCR pages/text, AST | session lifetime (+7 d floor) | re-analysis re-derives from binary; OCR purged | 7 d floor via lifecycle |
| Findings, compliance results | session lifetime | indefinite (saved metadata) | — |
| Risk model, simulations | session lifetime | indefinite | — |
| Counter-clauses, negotiation steps | session lifetime | indefinite (approved ones) | — |
| Audio artifacts | 24 h | regenerated on demand | 24 h |
| Export artifacts | 24 h | regenerated on demand | 24 h |
| Simulation runs | 30 d | 30 d | 30 d |
| Audit events | 365 d | 365 d | 365 d |
| Deleted-session tombstones | 90 d hard delete | — | 90 d |
| Deleted-user tombstones | 30 d hard delete | — | 30 d |

## 6. Verification

`scripts/purge_check.py` (weekly + on-demand): enumerates object keys by session-prefix patterns from DB rows, flags keys existing beyond retention and keys referenced by active sessions but missing (both directions), verifies `encryption_keys` exist for all unpurged documents, and reports. CI runs it against the test bucket in the cleanup integration suite.

## Security

Privacy failures fail closed: purge jobs never delete metadata before binary deletion is confirmed; `encryption_keys` TTLs are absolute at write time; strict mode purges even on save failure paths (best-effort then flagged). No admin or internal tool may read another user's saved documents in v1 (offline support path only, root `SECURITY.md`).

## Testing

Integration: full ephemeral lifecycle — create session, upload, analyze, expire via clock override, run cleanup → storage 404s, Redis keys gone, rows purged, tombstone present. Saved-standard vs saved-strict fixtures → retention matches §2. Delete-user flow purges all sessions. `purge_check` direction tests (orphan key flagged, missing key flagged). Account export dump schema test.
