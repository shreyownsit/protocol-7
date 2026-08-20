# Database Design

**Requirement:** A comprehensive PostgreSQL 16 schema supporting the session-centered data model, the privacy model (ephemeral binaries, saved-session persistence), and all API workflows in `api.md`. Full ORM mapping lives in `models.md`; this file is the design rationale and DDL-level contract.

**Why:** The schema is the longest-lived artifact in the system. Every table below is justified against a workflow; no table exists for its own sake (master prompt §09: "Do NOT blindly create every table").

## 1. Design Principles

1. **Public ids are `uuid7`** (time-sortable) for cursor pagination performance; internal sequences are hidden.
2. **Two storage classes:** persistent metadata (this DB) vs ephemeral encrypted binaries (object storage, `file-storage.md`). The DB never stores document bytes.
3. **Ownership is a first-class column** (`user_id`) on every resource table; repositories join on it (authorization.md).
4. **Soft lifecycle where purge matters:** `sessions` and `documents` use status columns driving the purge job; analysis results are soft-deletable with the session.
5. **No long transactions:** analysis results are written in small transactions by workers (`background-jobs.md`).

## 2. Entity Catalog

### 2.1 `users`

**Why:** account identity and credential root.

| Column | Type | Nullable | Notes |
|---|---|---|---|
| id | uuid7 PK | no | |
| email | citext UNIQUE | no | verified uniqueness |
| password_hash | text | no | argon2id |
| email_verified | bool | no | default false (verification optional per env) |
| display_name | text | no | |
| created_at / updated_at | timestamptz | no | |

Indexes: `users_email_idx` (unique, implicit). Deletion: hard delete only via data-subject request; cascade-mark sessions `expired`.

### 2.2 `user_preferences`

**Why:** vernacular language default, UI preferences — small, user-scoped.

`user_id` FK→users (ON DELETE CASCADE) PK, `language_code` (default `en`), `notifications_enabled`, `updated_at`. One row per user (upsert semantics).

### 2.3 `sessions`

**Why:** the root of the session-centered architecture. Lifecycle drives the privacy model.

| Column | Type | Notes |
|---|---|---|
| id | uuid7 PK | |
| user_id | FK→users, nullable | nullable = anonymous session scoped by token (authorization.md §anonymous) |
| document_id | FK→documents, nullable | set on first upload; sessions can hold a second document for diff |
| created_at / last_activity_at / expires_at | timestamptz | expires_at computed = max(lifetime, inactivity) |
| status | enum `active\|expired\|saved\|purged` | |
| save_state | enum `unsaved\|saved` | |
| privacy_mode | enum `standard\|strict` | strict = no saved-session retention |
| title | text | auto from document name |
| analysis_status | enum `none\|processing\|ready\|failed` | frontend polling/SSE target |

Indexes: `sessions_user_status_idx` (user_id, status), `sessions_expiry_idx` (expires_at) for cleanup job, `sessions_document_idx`. Cascade: sessions expire → documents marked expired → binaries purged. Saved sessions: status `saved`, binaries retained per retention (`privacy.md`).

### 2.4 `documents`

**Why:** metadata about an uploaded contract; binary lives in object storage.

`id` uuid7 PK, `session_id` FK, `user_id` FK (denormalized for ownership queries), `name`, `mime_type`, `size_bytes`, `content_hash` (SHA-256, unique per session for idempotency), `page_count`, `status` enum `uploading\|processing\|ready\|failed\|expired`, `source` enum `file\|camera`, `processing_error_code`, `created_at`. Unique: `(session_id, content_hash)` partial for `status <> failed`.

### 2.5 `document_pages`

**Why:** page-level metadata; OCR results reference pages; the frontend renders PDF pages and needs per-page geometry metadata.

`id`, `document_id` FK, `page_number` (1-based), `width_px`, `height_px`, `ocr_status` enum. Unique: `(document_id, page_number)`. Lifecycle follows document.

### 2.6 `clauses`

**Why:** the structural AST persisted for deep linking, findings, graph, and diff. This is the heart of downstream analysis.

| Column | Type | Notes |
|---|---|---|
| id | uuid7 PK | |
| document_id | FK→documents | |
| parent_clause_id | self-FK nullable | tree |
| path | ltree-like text path `1.3.2` | query subtree fast |
| clause_type | enum `section\|clause\|subclause\|definition\|signature_block` | |
| heading | text nullable | |
| text | text | normalized (whitespace-collapsed); **never logged** |
| page_number | int | |
| bbox | jsonb `{x,y,w,h}` | source coordinates on the page |
| source_text_raw | text | original OCR text with line breaks; evidence |
| created_at | timestamptz | |

Indexes: `clauses_document_path_idx` (document_id, path), `clauses_parent_idx`. Text columns are stored but never emitted to logs (observability rule).

### 2.7 `clause_relationships`

**Why:** explicit cross-references detected by the graph builder ("Tenant must pay by the 5th" references "Late fee applies after the 5th"). Powers contradiction detection.

`id`, `document_id`, `source_clause_id` FK, `target_clause_id` FK, `relationship_type` enum `references\|conditions\|contradicts\|modifies`, `evidence_text`, `created_at`. Unique: `(source_clause_id, target_clause_id, relationship_type)`.

### 2.8 `findings`

**Why:** user-visible analysis results — compliance violations, AI-flagged risks, contradictions. Every finding deep-links to clauses.

`id`, `session_id` FK, `finding_type` enum `compliance\|ai_flag\|contradiction\|financial`, `severity` enum `critical\|high\|medium\|low\|info`, `confidence` numeric(3,2) 0–1, `title`, `summary`, `statute_reference` nullable (compliance only), `rule_id` nullable FK→compliance_rules (evidence), `clause_ids` jsonb array (deep links), `evidence` jsonb (per-clause quotes + bbox), `financial_exposure` jsonb nullable `{amount, currency, basis}`, `created_at`. Index: `findings_session_type_idx`.

### 2.9 `compliance_rules`

**Why:** deterministic rule engine content. Versioned, jurisdiction-scoped, never LLM-authored at runtime.

`id`, `name`, `jurisdiction` text, `agreement_type` text (or `*`), `rule_version` int, `condition_expr` text (constrained expression DSL — see `compliance-engine.md`), `severity`, `message_template`, `statute_reference`, `enabled` bool, `created_at`. Unique: `(name, jurisdiction, rule_version)`. Shipped rule packs are seeded; content updates are migrations, not runtime edits (auditability).

### 2.10 `compliance_results`

**Why:** per-rule per-clause evaluation records — the audit trail of the deterministic engine.

`id`, `session_id`, `rule_id` FK, `clause_id` nullable FK, `outcome` enum `violation\|satisfied\|not_applicable\|insufficient_data`, `details` jsonb, `evaluated_at`. Unique: `(session_id, rule_id, clause_id)`. Idempotent writes (job idempotency).

### 2.11 `risk_models` and `risk_variables`

**Why:** the PRD demands a normalized risk model, not an arbitrary single number.

`risk_models`: `id`, `session_id`, `version` int (rebuilt per analysis), `formula_doc` text (composite formula documentation — mandatory, see `risk-engine.md`), `created_at`.
`risk_variables`: `id`, `model_id` FK, `name`, `category` enum `severity\|confidence\|financial_exposure\|compliance\|contradiction\|negotiation_priority`, `value` numeric, `weight` numeric, `evidence_refs` jsonb. Unique: `(model_id, name)`. Composite score derived at read time (deterministic); never stored as a magic number.

### 2.12 `simulations` and `simulation_runs`

**Why:** base contract model vs user scenarios, per `simulation.md`.

`simulations`: `id`, `session_id`, `title`, `variables` jsonb (base variable defs with bounds/units/caps), `formulas` jsonb (formula defs returned to browser for client eval), `status` enum `draft\|active\|archived`, `created_at`.
`simulation_runs`: `id`, `simulation_id` FK, `scenario` jsonb (user slider values), `computed_at`, `client_evaluated` bool (server re-evaluates for verification only). Runs are append-only; cleanup job prunes runs older than 30 days.

### 2.13 `negotiations` and `negotiation_steps`

**Why:** streaming negotiation state + immutable step log.

`negotiations`: `id`, `session_id`, `clause_id` FK (target clause), `status` enum `queued\|running\|completed\|failed`, `current_stage` enum `prosecutor\|defense\|auditor`, `retry_count` int, `counter_clause_id` nullable FK→counter_clauses, `created_at / updated_at`. Unique partial index `(session_id, clause_id)` WHERE `status = 'running'` (one active negotiation per clause).
`negotiation_steps`: `id`, `negotiation_id` FK, `agent` enum `prosecutor\|defense\|auditor`, `step_type` enum `started\|completed\|retry\|failed`, `payload` jsonb, `event_id` (SSE id, monotonic), `created_at`. Append-only; powers SSE replay on reconnect (`Last-Event-Id`).

### 2.14 `counter_clauses`

**Why:** negotiation output artifact, exportable.

`id`, `negotiation_id` FK, `session_id`, `original_clause_id` FK→clauses, `counter_text`, `rationale`, `compliance_check_result` jsonb (deterministic auditor evidence), `status` enum `draft\|approved\|rejected`, `created_at`.

### 2.15 `audio_requests`

**Why:** narration jobs and their ephemeral artifact metadata.

`id`, `session_id`, `summary_id` (references the persisted plain-language summary), `language_code`, `status` enum `queued\|processing\|ready\|failed`, `storage_key` nullable (ephemeral artifact), `expires_at`, `created_at`. Artifact TTL enforced by storage lifecycle, not this row alone.

### 2.16 `exports`

**Why:** export job state + signed-URL metadata; never stores the file bytes.

`id`, `session_id`, `format` enum `pdf\|docx`, `contents` jsonb (findings + counter-clauses selection), `status` enum `queued\|generating\|ready\|failed\|expired`, `storage_key` nullable, `url_expires_at`, `created_at`. Idempotent on `(session_id, contents hash)`.

### 2.17 `audit_events`

**Why:** tamper-evident record of security-relevant actions (logins, uploads, exports, purges, saves).

`id` bigserial PK, `actor_user_id` nullable, `event_type` text, `resource_type` text nullable, `resource_id` uuid7 nullable, `metadata` jsonb (no document text, no secrets), `ip_address` inet, `created_at`. Append-only, retention 365 days.

## 3. Cross-Cutting Rules

- **Ownership:** every resource table except `compliance_rules`, `audit_events`, and `user_preferences` carries `user_id` (denormalized where the resource is session-descended) so ownership checks are one predicate.
- **Nullable policy:** only fields that genuinely may be absent at insert time are nullable (documented per table). `null` never means "unknown severity"; unknown severity is a distinct enum value.
- **Deletion behavior:** hard deletes only for `audit_events` (retention), `simulation_runs` (pruning), and purge cascades. Application-managed soft lifecycle via status enums elsewhere.
- **Retention:** purged sessions/documents → rows remain as `status=purged` tombstones with null FKs for 90 days (support reference), then hard-deleted. Saved sessions exempt (`privacy.md`).

## 4. Index Summary

| Table | Indexes |
|---|---|
| sessions | (user_id, status), (expires_at), (document_id) |
| documents | (session_id, content_hash) partial, (user_id), (status) |
| clauses | (document_id, path), (parent_clause_id) |
| findings | (session_id, type), GIN (evidence) optional v2 |
| negotiations | partial (session_id, clause_id) WHERE running |
| negotiation_steps | (negotiation_id, event_id) for replay |
| exports | (session_id, contents_hash) partial unique |

## Implementation Notes

Enum types are created as PG enums via Alembic with a migration policy of "add values allowed, rename forbidden." The `path` column uses PostgreSQL `ltree` (extension) for subtree queries; fallback plain text paths are acceptable if `ltree` adds deployment friction — decide in Phase 2 with a comment in the migration.

## Security

No PII beyond email/display name. `clauses.text` and `source_text_raw` are sensitive: column-level access only via repositories with ownership checks; never projected into logs or metrics.

## Testing

Schema tests: every FK has an index on the referencing side; every unique constraint has a test inserting a duplicate expecting 23505; purged-session cascade test (Phase 4 acceptance).
