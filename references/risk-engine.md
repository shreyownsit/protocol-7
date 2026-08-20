# Risk Engine

**Requirement:** A normalized risk model that does **not** reduce everything to a single arbitrary number. Six modeled dimensions: severity, confidence, financial exposure, compliance risk, contradiction risk, negotiation priority. A composite score is allowed only with a documented formula and justification. Every risk finding retains evidence.

**Why:** The PRD demands multi-dimensional risk. Users must understand *why* something is risky, in what way, and how much money is at stake — not see an opaque 73/100.

## 1. Model Schema

`risk_models` (per session, versioned per analysis run) + `risk_variables` (one row per dimension):

| Variable | Category | Value Domain | Derivation |
|---|---|---|---|
| `max_severity` | severity | enum ordinal `info=0 < low=1 < medium=2 < high=3 < critical=4` | max severity across session findings |
| `mean_confidence` | confidence | 0.0–1.0 | mean of finding confidences (weighted by severity ordinal) |
| `financial_exposure_total` | financial_exposure | numeric ≥ 0 (session currency) | sum of `findings.financial_exposure.amount` where basis is per-session or period-annualized; units/basis recorded in `evidence` |
| `compliance_risk` | compliance | 0.0–1.0 | fraction of enabled rules violated × severity weight: `Σ(w_sev × violated) / Σ(w_sev × enabled)` |
| `contradiction_risk` | contradiction | 0.0–1.0 | min(1, contradiction_findings × 0.25) — each contradiction adds 0.25, capped |
| `negotiation_priority` | negotiation_priority | 0.0–1.0 | weighted mean over negotiable flagged clauses: `Σ(severity_weight × exposure_weight × negotiability) / Σ(weights)` |

Each variable row stores `weight` (engine-configured, visible in `formula_doc`), `value`, and `evidence_refs` (finding ids + clause refs).

## 2. Composite Score — Formula and Justification

A single `overall_risk` **is** computed, because the frontend needs one sortable priority signal for the workspace dashboard — but it is derived, documented, and never stored as magic:

```
overall_risk = 0.30·S  + 0.25·C  + 0.20·F_norm + 0.15·X  + 0.10·P
  S        = max_severity ordinal / 4
  C        = 1 − mean_confidence        (low confidence = higher risk)
  F_norm   = min(1, financial_exposure_total / exposure_cap)
             exposure_cap = 10 × extract_variable("monthly_rent|contract_value")
             or a fixed cap (10,000 USD default, config) when no reference value exists
  X        = contradiction_risk
  P        = negotiation_priority
```

**Justification:** weights prioritize severity (user harm first), then uncertainty, then money, then structural defects, then actionability. The formula and every weight live in `risk_models.formula_doc` so any score is auditable. Weights are config, not code constants (`configuration.md` — add `RISK_WEIGHT_*` vars).

## 3. Per-Finding Risk Enrichment

The risk engine also annotates findings: each `Finding` (already produced by compliance/graph/AI stages) gains `financial_exposure` (amount, currency, basis — e.g., `"$50/late day, uncapped"`) computed deterministically from clause text patterns (numeric extraction) — **never from LLM guesses**. Findings without computable exposure keep `financial_exposure: null`, never 0.

## 4. Risk Celery Stage

Risk is the final stage of `analysis_pipeline` (`background-jobs.md`): runs after compliance + graph (it consumes their findings), writes `risk_models` + `risk_variables`, and updates `session.analysis_status=ready`. Timeout 2 min. Deterministic: identical inputs → bit-identical values (acceptance criterion in `IMPLEMENTATION_ORDER.md` Phase 9).

## 5. Failure Modes

No new failure class: if risk computation crashes, the pipeline stage fails and the session keeps `analysis_status=failed` at the risk stage; earlier stages' results remain visible. Missing reference values degrade gracefully to fixed caps with an `info` finding noting the assumption.

## Implementation Notes

- Money extraction: deterministic pattern (`\$\d[\d,]*(\.\d{2})?` + currency normalization), units preserved (`per day`, `per month`, `one-time`). Annualization rules: `per day × 365`, `per month × 12`; uncapped recurring penalties are flagged `exposure: unbounded` (shown as such in UI).
- The engine is pure Python over domain types (`processing/risk_model.py`) — trivially unit-testable.

## Security

Risk inputs are findings and extracted values — never raw document text flows to logs. Exposure caps are config, preventing absurd values from surfacing in UI or exports.

## Testing

Unit: each variable's derivation function with golden fixtures (compliance fractions, contradiction counts, exposure sums with units). Property tests: monotonicity (adding a critical finding never lowers `overall_risk`); determinism (rerun = identical). Integration: vendor fixture with contradictory delivery clauses + numeric late penalties → `contradiction_risk ≥ 0.25`, `financial_exposure_total` matches fixture arithmetic exactly, and the composite formula recomputes identically from `formula_doc`.
