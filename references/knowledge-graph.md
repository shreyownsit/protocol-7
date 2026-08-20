# Knowledge Graph

**Requirement:** A graph subsystem modeling `Entity → Obligation → Entity under Condition`, built with NetworkX in memory, with contradiction detection, generation, serialization, and a frontend graph response. Every graph element points back to source clauses.

**Why:** Clauses do not exist in isolation; obligations reference parties, conditions gate duties, and contradictions live between clauses. The graph makes these relationships queryable and visualizable.

## 1. Node Schema

```json
{
  "id": "node:<uuid7>",
  "node_type": "entity|obligation|condition|event",
  "label": "Tenant",
  "clause_refs": [{"clause_id": "...", "page": 4, "bbox": {...}}],
  "text_evidence": "short quote (≤200 chars)",
  "metadata": {"entity_type": "party|person|property|money|date"}
}
```

| Node Type | Source |
|---|---|
| `entity` | AST `entities` + party extraction from definitions/title |
| `obligation` | Clauses typed `obligation|covenant|penalty` — one node per clause |
| `condition` | Conditional clauses / if-then structures (`if Tenant fails to pay...`) |
| `event` | Temporal anchors (effective date, termination date, renewal date) |

## 2. Edge Schema

```json
{
  "id": "edge:<uuid7>",
  "edge_type": "owes|must_do|triggered_by|contradicts|references|modifies",
  "source": "node:... (entity)",
  "target": "node:... (obligation|entity)",
  "clause_refs": [{"clause_id": "...", "page": 3, "bbox": {...}}],
  "text_evidence": "short quote",
  "condition_ref": "node:... (condition)"
}
```

Canonical pattern: `Entity -(owes)-> Obligation -(triggered_by)-> Condition`. Cross-clause references from `clause_relationships` (`references`, `modifies`, `contradicts`) become the corresponding edge types.

## 3. Graph Generation (`processing/graph_builder.py`)

1. Load the document's clauses + `clause_relationships`.
2. Emit obligation nodes for every obligation-typed clause; entity nodes for parties; condition nodes where clause text matches condition patterns (deterministic: `if/when/provided that` lead-ins, plus LLM-proposed condition candidates validated by pattern match — the LLM proposes, patterns confirm).
3. Attach edges: `owes` (entity → obligation via party-role heuristics: "Tenant shall..." → Tenant owes), `triggered_by` (obligation → condition), `references`/`modifies`/`contradicts` from `clause_relationships`.
4. **Contradiction detection:** over `contradicts` edges + rule-based cross-checks: (a) mutually exclusive obligations (same entity, same subject, opposite verbs — "may terminate on 30 days" vs "no termination before 12 months"); (b) numeric conflicts (deposit > cap AND cap rule exists — reuses compliance evidence); (c) condition contradictions (obligation conditioned on X AND obligation conditioned on ¬X). Each detection emits a `contradiction`-type `Finding` with evidence refs to both clauses.
5. Complexity guard: graphs are per-document (nodes ≈ clauses ≈ hundreds max); NetworkX in memory is appropriate and cheap.

## 4. Graph Celery Job (`workers/tasks/graph.py`)

Input: `document_id` (or `session_id` single-doc). Output: `graph_payload` persisted as JSONB on the session (`sessions.graph_payload` column) + contradiction findings. Timeout 5 min. Retries 2. Idempotent per (session, AST version).

## 5. Serialization and Frontend Response

`GET /api/v1/graph/{session_id}` returns vis-network-compatible payload:

```json
{
  "nodes": [{"id": "...", "label": "...", "group": "entity|obligation|condition|event",
             "clause_refs": [...]}],
  "edges": [{"id": "...", "from": "...", "to": "...", "label": "owes",
             "style": "solid|dashed (condition)", "clause_refs": [...]}],
  "contradictions": [{"finding_id": "...", "node_pair": ["...", "..."],
                      "clause_refs": [...]}],
  "layout_hint": "hierarchical"
}
```

Every node/edge carries `clause_refs` — the frontend's "jump to clause" action reads them directly. Node ids are stable across re-generation for the same AST (deterministic generation).

## 6. Failure Modes

`GRAPH_FAILED` — generation crash (retries). Empty graph (no obligations found) is valid but emits an `info` finding; frontend shows a neutral state, not an error.

## Implementation Notes

- Use `networkx.DiGraph`. Layout hint `hierarchical` for vis-network `layout: {hierarchical: {enabled:true}}`; viewport state is client-side (`frontend/state-management.md`).
- Keep graph generation pure over domain types — NetworkX never imports SQLAlchemy rows directly.
- Contradiction rules are deterministic pattern rules (like compliance) — not LLM judgment.

## Security

Graph payloads contain short evidence quotes (≤200 chars) — the same sensitivity class as findings; repository-scoped access only. No raw contract text beyond quotes.

## Testing

Unit: builder edge-attachment rules (party-role heuristics matrix); contradiction detectors (mutual exclusion, numeric conflict, condition negation). Integration: employment fixture → non-compete obligation node references the non-compete clause AND a `contradicts` edge to the termination clause AND a contradiction finding with both clause refs. Frontend payload schema test (vis-network shape + clause_refs present on every node/edge). Determinism test: identical AST → identical graph.
