# What-If Simulation

**Requirement:** A simulation engine receiving contract-derived formulas; formula definitions can be returned to the browser and evaluated client-side with safe math evaluation. Base contract model is strictly separated from user scenarios. Models carry variables with caps, bounds, and units; scenarios are stored; calculation endpoints exist for verification.

**Why:** Users must play with their contract's numbers (what if rent rises 8%? what if the late fee caps at $200?) and see results instantly. Client evaluation gives instant feedback; server verification keeps trust.

## 1. Model Schema (`simulations` table)

```json
{
  "id": "<uuid7>", "session_id": "...", "title": "Lease cost model",
  "variables": {
    "monthly_rent": {
      "label": "Monthly rent", "value": 1800, "unit": "USD",
      "min": 0, "max": 50000, "step": 25, "cap": null,
      "source_clause_id": "..."          // contract-derived anchor
    },
    "late_fee_per_day": { "label": "...", "value": 50, "unit": "USD",
      "min": 0, "max": 500, "step": 1, "cap": {"value": 200, "basis": "per occurrence"} },
    "lease_months": { "label": "Lease term (months)", "value": 12, "unit": "months",
      "min": 1, "max": 120, "step": 1 }
  },
  "formulas": {
    "annual_rent": {
      "expr": "monthly_rent * lease_months",
      "label": "Annual rent", "unit": "USD",
      "depends": ["monthly_rent", "lease_months"]
    },
    "worst_case_late_fees": {
      "expr": "min(late_fee_per_day * 30, late_fee_per_day_cap)",
      "label": "Worst-case monthly late fees", "unit": "USD",
      "depends": ["late_fee_per_day", "late_fee_per_day_cap"]
    }
  },
  "status": "active"
}
```

## 2. Formula Language (Client-Safe)

A deliberately tiny arithmetic language — **not** arbitrary expressions:

```
expr  := term (("+" | "-") term)*
term  := factor (("*" | "/") factor)*
factor := number | var_ref | func_call | "(" expr ")"
func_call := "min" "(" expr "," expr ")" | "max" "(" expr "," expr ")"
var_ref   := [a-z_][a-z0-9_]*            // must exist in variables or formula outputs
number    := [-]?[0-9]+(\.[0-9]+)?
```

Parser: recursive descent → AST → evaluator (`processing/safe_eval.py`). Server reference evaluator and the frontend's TS evaluator must be byte-compatible (same spec, joint tests in `frontend/frontend-backend-contract.md`). No functions beyond `min`/`max`; no power, no modulo, no conditionals (keep client eval trivially safe; complexity lives in the model, not the language). Division by zero → formula value `null` + UI warning.

## 3. Variable and Formula Validation (`SIMULATION_INVALID` cases)

- Every `var_ref` must resolve to a declared variable or another formula (dependency graph must be a DAG — cycle detection required).
- `min ≤ value ≤ max`; `cap` values must exceed variable min where applicable; units consistent within each formula's operands (unit matching is name-based; model authoring must keep units honest — validated by test fixtures).
- Max 20 variables, max 20 formulas, max expression depth 15 (DoS/complexity guard).
- Formula expressions are validated at create-time and re-validated on every user scenario evaluation (never trust the stored AST alone).

## 4. Model Derivation (How Formulas Get Created)

`POST /api/v1/simulations` with no body creates a default model from the session's AST: `formula_extractor.py` deterministically extracts numeric anchors (rent amounts, fees, caps, term lengths) into variables sourced to clauses, and emits standard formula shapes (annual totals, capped penalties, cumulative exposure). The LLM may *annotate* variable labels (readable names) but never invent formula semantics — the same deterministic-boundary rule as compliance. Users can edit variables (within validation) and add formulas conforming to the language.

## 5. Base Model vs User Scenario Separation

- `simulations.variables[*].value` = **base contract model** (contract-derived, editable but tagged `source=contract`).
- `simulation_runs.scenario` = **user scenario**: a delta object `{"monthly_rent": 2000, ...}`. The server never mutates base values; runs are append-only.
- Client evaluates the scenario; server keeps `POST /api/v1/simulations/{id}/verify` for spot-checks (evaluates scenario server-side, returns matching/non-matching per formula — tolerance 1e-9).

## 6. Endpoints and Calculation

| Method | Path | Behavior |
|---|---|---|
| POST | `/simulations` | Create default model from session AST (sync, <2 s). |
| GET | `/simulations/{id}` | Model + base values + last run. |
| PATCH | `/simulations/{id}` | Edit variables/formulas (validation as §3). |
| POST | `/simulations/{id}/verify` | Server-evaluate a scenario; auth required. |
| DELETE | `/simulations/{id}` | Owner only; runs retained 30 days then pruned. |

Runs older than 30 days are pruned by the cleanup job (storage discipline; scenarios are cheap but unbounded).

## 7. Failure Modes

`SIMULATION_INVALID` (422) for every validation breach with `details` listing offending fields. Dependency cycles, unresolvable refs, and unit inconsistencies all surface here with precise field paths.

## Implementation Notes

- Client formula evaluator lives in `frontend/lib/safeEval.ts` and must mirror `safe_eval.py` exactly — the contract file holds the shared grammar and the compatibility test matrix.
- Simulation state is client-heavy (slider values) — per `frontend/state-management.md` sliders are client state; only scenario *submissions* (runs) persist.

## Security

Formula text is user-authored but evaluated only by the constrained evaluator (no Python eval path). User formulas cannot reference anything outside the model's declared variable set.

## Testing

Unit: parser/evaluator full operator matrix + `min`/`max` + division-by-zero; cycle detection; validator boundary cases. Compatibility test: 50 scenario payloads evaluated by both evaluators must agree within tolerance (shared fixture file). Integration: lease fixture → default model has `monthly_rent` anchored to the rent clause, units USD; slider scenario → run stored → verify endpoint matches. Determinism: base model regeneration yields identical variables.
