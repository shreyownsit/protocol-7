# Testing

**Requirement:** Unit, integration, E2E journey, and AI regression testing. Synthetic fixtures must never use real contract text. Test infrastructure: Docker Compose with real Postgres/Redis/MinIO (Testcontainers alternative for CI), recorded AI responses, deterministic-assertion discipline.

**Why:** The system mixes deterministic engines (which deserve exhaustive tests) with AI components (which deserve regression fixtures and schema-guarded tests). Blending them is the main testing risk.

## 1. Infrastructure

- **Stack:** pytest + pytest-asyncio; `httpx` TestClient against the real FastAPI app; test dependencies in `requirements-dev.txt`.
- **Service fixtures:** `tests/conftest.py` uses `testcontainers` (Postgres 16, Redis 8, MinIO) for integration scope — mirrors Compose exactly, no mocks of stores. Unit tests use in-memory fakes (repo fakes) only.
- **Database:** migrations applied to the test DB at session start (`alembic upgrade head`); tests run on the real schema, never a synthetic one.
- **Celery:** integration tests run a real worker in eager-transport mode disabled (`CELERY_TASK_ALWAYS_EAGER=false`) against the test broker; eager mode reserved for cheap unit scenarios.
- **AI:** `AI_RECORDINGS=1` records real responses to `tests/fixtures/ai/recordings/`; CI runs with recordings replayed via a thin recorder harness (`ai-orchestration.md` §Testing). Live calls never execute in CI.

## 2. Unit Tests (no services running)

| Module | Focus |
|---|---|
| `processing/rule_engine.py` | DSL parse/eval golden suite; DoS guards; **hypothesis** property tests (no-exception on valid random exprs; determinism) |
| `processing/ast_builder.py` | Builder invariants (completeness, acyclicity, path uniqueness) over synthetic block streams incl. 5-level nesting, mid-clause definitions, signature blocks |
| `processing/risk_model.py` | Per-variable derivation golden fixtures; monotonicity + determinism properties |
| `processing/safe_eval.py` | Formula language matrix; tolerance agreement with the frontend evaluator over the shared 50-scenario fixture |
| `processing/graph_builder.py` | Edge attachment heuristics; contradiction detectors |
| `processing/diff_engine.py` | Fingerprint/heading-similarity matrix; split-merge classification; renumbering fixture → zero MODIFIED |
| `utils/file_magic.py` | Sniffing matrix: valid files per type + ≥10 fuzzed invalids |
| `utils/normalization.py` | Whitespace, ligatures, hyphenation, quote normalization |
| `ai/validators.py` | Schema rejection suite (oversize, out-of-taxonomy, malformed) |
| `core/security.py` | argon2 round-trip + rehash detection; JWT encode/decode + expiry math; refresh rotation family revocation |
| `storage/crypto.py` | Encrypt/decrypt round-trip; AAD mismatch; GCM tag tamper |
| `schemas/` | Pydantic boundary suite per model |

Rule: every deterministic engine has unit tests; nothing deterministic is tested only via integration.

## 3. Integration Tests (full stack)

1. **Auth lifecycle:** register → login → refresh rotation → replay old refresh → family revocation → logout → replay access jti denied.
2. **Ownership matrix:** for every resource table — cross-user access returns not-found-equivalent, same-user succeeds, lists never leak (query-inspection test).
3. **Upload pipeline:** upload synthetic lease PDF → ingest → encrypt → store → job queued; idempotent duplicate; malicious-PDF rejection; progress event order.
4. **OCR→AST:** synthetic fixture → blocks → AST node recovery by known headings/pages/bboxes; determinism (byte-identical rerun).
5. **Diff:** synthetic v1→v2 pair → classification counts exact; renumber-only → zero MODIFIED.
6. **Compliance:** seed pack + synthetic lease → expected violations + statute refs; adversarial "ignore the rules" document → unchanged verdicts.
7. **Graph:** fixture → obligation/condition/contradiction nodes + edge types; vis-network payload schema.
8. **Risk:** fixture arithmetic exactness; composite formula reproducibility from `formula_doc`.
9. **Simulation:** model creation from AST; scenario verify endpoint matches client evaluator; invalid inputs → `SIMULATION_INVALID` with field paths.
10. **Negotiation:** recorded 3-agent run → event sequence/order; regeneration loop; rejection-exhausted failure; injection fixtures (§security test).
11. **Audio/Export:** mocked synthesis → artifact + signed URL + expiry; export composition test (no raw clause text, evidence ≤150 chars); path traversal → `EXPORT_URL_INVALID`.
12. **Realtime:** SSE subscribe → full event sequence; mid-run reconnect with `Last-Event-Id` → replay completeness; ownership-fail closes stream.
13. **Cleanup:** expire session → purge → storage 404, keys gone, tombstone; idempotent rerun; `purge_check` direction tests.
14. **Migration integrity:** `alembic check` gate; migrations run clean on empty DB; seed rule pack validates against canary fixtures.

## 4. E2E Journey Tests (API + worker, no browser)

API-level journeys, run nightly against a staging-shaped Compose:

| Journey | Assertions |
|---|---|
| Anonymous: upload → analyze → find compliance violation → narrate → export counter-offer | Full state machine transitions, evidence deep links in export |
| Authenticated: signup → login → session → redline diff → simulation scenario → negotiate → approved counter | Negotiation reaches completed; counter stored; simulation verify matches |
| Save lifecycle: analyze → save (strict mode) → verify binaries purged, metadata retained → unsave → expiry → purge | Privacy mode semantics per `privacy.md` §2 |
| Failure resilience: kill worker mid-OCR → restart → watchdog re-enqueues → completes idempotently | No duplicate rows; progress resumes |
| Rate limits: login hammer → lockout → wait → recovery | Counter semantics + lockout clearance |

Browser E2E (Playwright) is intentionally **not** required for v1 backend acceptance — the frontend contract tests cover the wire; the journeys above are the acceptance surface. (Frontend runs its own Playwright suite per `frontend/testing.md`.)

## 5. AI Regression Discipline

- Fixtures in `tests/fixtures/ai/` are **synthetic contract text** (generated lease/employment/vendor snippets, not real documents).
- Every prompt change requires fixture regeneration; a manifest (hashes of prompt+schema per version) fails CI on drift — AI behavior changes are always explicit PRs, never silent.
- Red-team suite: prompt-injection fixtures must pass analysis and negotiation (security.md §3 tests).
- Output validators are the gate: schema tests assert rejected outputs never reach persistence (insertion attempt after validation failure → row absent).

## 6. Coverage and Gates

- Gate: `pytest` green in CI; unit coverage ≥80% on `app/processing/` and `app/core/`; AI + Celery modules excluded from coverage targets (recorded harness + task guards tested instead).
- Every backend file's Testing section is a required checklist item (`IMPLEMENTATION_ORDER.md` acceptance criteria).
- Determinism clause: wherever a subsystem promises determinism (AST, diff, risk, graph, compliance, safe eval), there is an explicit rerun-identical test.

## Security

Fixtures are synthetic (no real contracts; `security.md` ingestion tests use fuzzed files). Recorded AI responses contain only model output for synthetic inputs — reviewed before commit. Test credentials/secrets are dev-only values with zero production privilege.
