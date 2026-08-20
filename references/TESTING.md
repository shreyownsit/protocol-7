# LexiClear — Testing Strategy

**Reading order:** Read after `ERROR_HANDLING.md`. Detailed backend test layers and fixtures live in `backend/testing.md`. This root file defines the strategy, quality gates, and fixture policy that apply to the whole system.

---

## 1. Testing Philosophy

LexiClear's riskiest components are deterministic (compliance, parsing, risk math, graph contradiction detection) and its least deterministic components are AI-driven (summaries, flags, negotiation). The strategy therefore pairs **exhaustive deterministic coverage** (property tests, golden fixtures) with **bounded AI tests** (schema validation regression, retry behavior) — never "does the LLM sound good" as a gate.

## 2. Test Layers

| Layer | Scope | Tooling | Minimum Coverage Expectation |
|---|---|---|---|
| Unit | Domain layer only: rules, parsers, AST builder, risk formulas, graph algorithms, validators | pytest, hypothesis (property tests) | 90% line coverage on `app/domain/` and `app/processing/` |
| Integration | DB (PostgreSQL via testcontainers or local), Redis, storage (MinIO), upload flow, job execution, API flows | pytest + FastAPI TestClient, docker compose test stack | All API endpoints + job happy paths |
| AI | Structured output validation, retry/fallback behavior, prompt regression fixtures | pytest with recorded Claude responses; mocked provider | Every prompt version has ≥1 regression fixture per agent |
| End-to-end | Full user journey in a real browser against the running stack | Playwright | 1 full journey per release (see 4) |

## 3. Fixture Policy

- **Never use real private legal documents.** All fixtures are synthetic.
- Synthetic sample contracts are defined in `backend/testing.md` and shipped in `tests/fixtures/contracts/`:
  1. **Residential lease** — security deposit violations, late-fee numerics, auto-renewal contradictions.
  2. **Freelancer agreement** — IP assignment, payment terms, liability caps, negotiable scope clauses.
  3. **Employment agreement** — non-compete scope, termination notice, statutory notice violations.
  4. **Vendor agreement** — SLA penalties, indemnity, force majeure, contradictory delivery clauses.
- Fixtures exercise: compliance violations, contradictory clauses, numerical penalties, negotiable clauses (explicit requirement from the master prompt).
- AI fixtures: recorded/stubbed Claude responses per prompt version, stored in `tests/fixtures/ai/{prompt_version}/`. Curation workflow is in `backend/testing.md`.

## 4. Canonical E2E Journey

```
login → upload contract → processing completes → open workspace →
inspect finding (deep-link to clause) → simulate (change variable, observe) →
negotiate (observe SSE events) → export counter-offer → download file
```

Plus two negative journeys: expired-session recovery, and prompt-injection document rejection/containment.

## 5. Quality Gates (CI)

1. `pytest` unit + integration must pass (coverage gate on domain code).
2. `ruff` lint + `mypy` strict must pass.
3. Dependency scan (Trivy) clean of high/critical CVEs.
4. Frontend: `tsc --noEmit`, `biome`/`eslint`, Playwright smoke on PR (full journey on release branch).
5. No merge without green gates. Phase 20 of `IMPLEMENTATION_ORDER.md` wires this up.

## 6. What Is Not Tested Automatically

- Vendor SLA behavior (Claude API, TTS, object storage providers): covered by contract tests against mocks and manual verification in Phase 20.
- Prompt *quality* evolution: regression fixtures detect regressions; improvements are evaluated manually per prompt version change.
