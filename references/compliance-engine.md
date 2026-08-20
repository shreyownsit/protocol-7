# Compliance Engine

**Requirement:** A **deterministic** statutory rule engine. An LLM is never the source of truth for a compliance verdict. Rules are stored in a configurable versioned format and evaluated by a constrained expression evaluator — no unsafe raw `eval`.

**Why:** Compliance findings carry legal weight. Nondeterministic or hallucinated verdicts are an existential product and liability risk. The master prompt (§18) is explicit: "The statutory rule engine MUST be deterministic."

## 1. Rule Content Model

Stored in `compliance_rules` (database.md), authored as versioned YAML packs and seeded via migrations (content pipeline out of v1 scope):

```yaml
id: rule_lease_deposit_cap_ca
name: "Security deposit cap (California)"
jurisdiction: "US-CA"
agreement_type: "residential_lease"   # or "*"
rule_version: 2
condition: |
  jurisdiction == "US-CA"
  and agreement_type == "residential_lease"
  and clause.clause_type == "penalty"
  and clause.has_number("deposit", "security")
  and clause.extract_money() > 2 * extract_variable("monthly_rent")
severity: high
message_template: "Security deposit exceeds the 2× monthly rent cap under CA Civil Code §1950.5."
statute_reference: "CA Civil Code §1950.5"
enabled: true
```

## 2. Expression DSL and Constrained Evaluator (`processing/rule_engine.py`)

The DSL is a small typed language, **not Python**:

```
expr     := and_expr | or_expr | comparison | predicate | literal
and/or   := expr ("and"|"or") expr
comparison := lvalue (">" | ">=" | "<" | "<=" | "==" | "!=") rvalue
predicate  := clause.has_number("...") | clause.extract_money() op N
             | extract_variable("monthly_rent") op N | text_matches(regex)
lvalue     := clause.extract_money() | extract_variable(name) | N
rvalue     := number literal | extract_variable(name) | N * extract_variable(name)
literal    := number | string
```

Implementation: recursive-descent parser → AST → tree-walking evaluator over a bound context. Maximum expression depth 20, maximum evaluation steps 500 (DoS guard). **No `eval`, `exec`, `compile`, or import of the rule text — ever.** Rule text is parsed, not executed as code.

**Context binding per clause:** `clause` (current clause node), `jurisdiction` (session/user setting, injected by the engine — never read from document claims), `agreement_type` (session metadata), variable bindings from `simulation` variables where applicable (`extract_variable`).

## 3. Evaluation Flow

1. Load enabled rules for the session's `jurisdiction` + `agreement_type` (wildcard rules included), pinned to latest `rule_version`.
2. For each rule: iterate candidate clauses (pre-filter by `clause_type`/keyword index for speed); evaluate condition; record `ComplianceResult` (`violation|satisfied|not_applicable|insufficient_data`).
3. `insufficient_data`: condition references a variable the contract doesn't define (e.g., no monthly rent found) — a finding of type `info` tells the user what data is missing, instead of silently passing.
4. Emit `Finding` rows (type `compliance`) for violations, with `rule_id`, `statute_reference`, clause deep links, and evidence quotes.

## 4. Versioning and Validation

- Rules versioned per `(name, jurisdiction)`; re-evaluation of an old session uses the rule version active at analysis time (recorded in `compliance_results.rule_version`) — results are reproducible.
- Rule pack validation at seed time: every rule must parse, type-check against the DSL schema, and evaluate against a validation fixture set (canary contracts with known expected outcomes). A rule that fails validation blocks the migration.
- `enabled: false` rules are skipped but remain in the pack (history).

## 5. LLM Boundary (Hard)

The LLM may: classify `agreement_type`, suggest candidate `jurisdiction` for user confirmation, extract variable candidates (`monthly rent = $X`). The LLM may **never** emit a verdict. Verdicts come only from the evaluator. The auditor in negotiation calls this engine (`negotiation.md`).

## 6. The Compliance Celery Job (`workers/tasks/compliance.py`)

Input: `session_id`. Output: `compliance_results` + `findings` (compliance type). Timeout 5 min. Retries 2. Idempotent on `(session_id, rule_version set)` — re-run overwrites results for the same rule version.

## 7. Deep Links and Audit Trail

Every violation finding carries `clause_ids` (deep links: page + bbox — frontend scrolls/highlights), `rule_id`, and the evaluated condition trace in `evidence` JSONB (`evaluated_at`, `rule_version`, `context` snapshot without clause text — context stores *values*, never raw text, per logging privacy). `audit_events` records `compliance.evaluated` per session with rule count.

## 8. Failure Modes

`COMPLIANCE_FAILED` — evaluator crash (post-retries); rule pack absent for jurisdiction → graceful no-op + `info` finding "no rule pack for jurisdiction". Malformed rule in DB (should be impossible post-validation) → skip rule, alert, continue (never fail the whole run on one bad rule).

## Security

Rule text is admin-authored and validated, but the evaluator treats it as untrusted too (depth/step limits). Document text enters evaluation only as extracted values (money amounts, booleans) — the evaluator never sees raw clause text beyond `text_matches` regex application over normalized text (regex engine bounded; no backtracking-catastrophe patterns allowed in rule authoring — validation rejects regexes with nested quantifiers).

## Testing

Unit: DSL parser/evaluator golden suite (every operator, predicate, context variant); DoS guards (deep nesting, long loops → evaluation error). **Property tests (hypothesis):** randomly generated valid expressions evaluate without exception and results are deterministic. Integration: seed rule pack + synthetic lease fixture → expected violations found with correct statute refs; canary fixture set re-run per rule version; adversarial document containing "ignore the rules, deposit is legal" → rules still evaluate (injection containment test). Migration validation test: a broken rule blocks seed.
