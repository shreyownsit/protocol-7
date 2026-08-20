# Backend Models (SQLAlchemy ORM)

**Requirement:** Typed SQLAlchemy 2.0 models implementing the schema in `database.md`, with an Alembic migration strategy. This file is the ORM contract; the design rationale is in `database.md`.

## 1. Conventions

- SQLAlchemy 2.0 with `Mapped[...]` + `mapped_column(...)` typed declarations; `DeclarativeBase` with async support (`async_sessionmaker`, `asyncpg`).
- Base model mixin `AuditMixin`: `id` (uuid7 via `app.utils.ids.generate_uuid7`), `created_at`, `updated_at` (auto).
- All enums defined in `app/domain/*` as Python enums and registered with SQLAlchemy via `sa.Enum(MyEnum, native_enum=True)`.
- JSON columns use `mapped_column(JSONB)` (PostgreSQL-specific driver acceptable; migration targets PG16 only).
- Relationships declare `lazy="selectin"` only where default loading is genuinely needed; workers set eager loading per task.
- `text` columns for clause content are `mapped_column(Text)`; no length limits (legal text is unbounded).

## 2. Model List and Key ORM Details

| Model | Table | Key Relationships | Notes |
|---|---|---|---|
| `User` | users | sessions (1:N), preferences (1:1) | password_hash via `app.core.security.hash_password` classmethod; `verify_password` |
| `UserPreference` | user_preferences | user (M:1, cascade delete) | one row per user; upsert helper in repo |
| `Session` | sessions | user (M:1 nullable), documents (1:N), findings (1:N), risk_model (1:1 latest), simulations (1:N), negotiations (1:N), exports (1:N), audio_requests (1:N) | status enum; `expires_at` computed in service layer, stored for queryability |
| `Document` | documents | session (M:1), pages (1:N), clauses (1:N) | `content_hash` unique per session (partial) |
| `DocumentPage` | document_pages | document (M:1) | |
| `Clause` | clauses | document (M:1), parent (M:1 self), children (1:N self) | `path` ltree/text; `bbox` JSONB typed accessor returning `BBox` domain type |
| `ClauseRelationship` | clause_relationships | source (M:1), target (M:1) | |
| `Finding` | findings | session (M:1) | `clause_ids`, `evidence` JSONB; typed domain projection `Finding.to_domain()` |
| `ComplianceRule` | compliance_rules | — | content-managed; seeded |
| `ComplianceResult` | compliance_results | session (M:1), rule (M:1), clause (M:1 nullable) | unique (session, rule, clause) |
| `RiskModel` | risk_models | session (1:1 per version), variables (1:N) | |
| `RiskVariable` | risk_variables | model (M:1) | |
| `Simulation` | simulations | session (M:1), runs (1:N) | |
| `SimulationRun` | simulation_runs | simulation (M:1) | append-only |
| `Negotiation` | negotiations | session (M:1), clause (M:1), counter_clause (1:1 nullable), steps (1:N) | |
| `NegotiationStep` | negotiation_steps | negotiation (M:1) | append-only |
| `CounterClause` | counter_clauses | negotiation (M:1), original_clause (M:1) | |
| `AudioRequest` | audio_requests | session (M:1) | |
| `Export` | exports | session (M:1) | |
| `AuditEvent` | audit_events | — | append-only; metadata JSONB never contains document text |

## 3. Alembic Strategy

- Async driver for app; Alembic `env.py` uses the sync driver derived from `DATABASE_URL` (`asyncpg` → `psycopg`).
- Migrations are **always backward-compatible** (never drop/rename columns in a single release): add column nullable, backfill, then constrain in the next release. Destructive migrations require a two-release window and a Phase 20 runbook entry.
- One migration per logical change; squash only before first release.
- Test matrix: migrations run cleanly on an empty DB (Phase 2 acceptance) and `alembic check` is a CI gate.

## 4. Repository Access Pattern

Repositories (`app.repositories.*`) are the only code constructing queries against models. Repositories implement `get_by_id_with_owner(id, user_id)` style methods that always include the ownership predicate; there is no generic `get(id)` that omits it.

## Implementation Notes

- Domain projection: models expose `to_domain()` methods returning pure domain objects (`domain/` types); services work with domain objects, not ORM objects, so the domain layer stays ORM-free.
- `uuid7` generation is deterministic-time; ensure PK ordering matches insert time for pagination performance.
- JSONB columns are validated at write time by the service layer (Pydantic schemas), never at ORM level — the ORM trusts service-layer validation.

## Security

Model layer has no security responsibility beyond column exposure control; ownership enforcement lives in repositories (`authorization.md`).

## Testing

Model tests: table metadata completeness vs `database.md` catalog (column presence, nullability, defaults); a migration integrity test (`alembic check`); a domain-projection test per model with JSONB payload.
