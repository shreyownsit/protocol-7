# Structural AST

**Requirement:** A persisted contract AST: document → sections → clauses → subclauses, with definitions and entities. Every clause carries id, page, bounding box, heading, text, parent clause, clause type, and source coordinates. This structure is mandatory for downstream diffing, compliance, graph analysis, and deep-linking.

**Why:** The AST is the system's shared data contract. Every analysis subsystem reads it; the frontend deep-links into it. It must be complete, deterministic, and evidence-anchored.

## 1. AST Node Schema

```json
{
  "document": {
    "id": "<uuid7>", "title": "Residential Lease Agreement",
    "parties": [{"name": "...", "role": "landlord|tenant|party"}],
    "effective_date": "2026-01-01", "page_count": 12
  },
  "nodes": [
    {
      "id": "<uuid7>",
      "node_type": "section|clause|subclause|definition|signature_block",
      "path": "3.2.1",
      "parent_id": "<uuid7 | null>",
      "heading": "Late Payment",
      "text": "If Tenant fails to pay rent by the 5th ...",
      "source_text_raw": "...",
      "page_number": 4,
      "bbox": {"x": 0.12, "y": 0.31, "w": 0.81, "h": 0.06},
      "source_coords": {"page": 4, "pixel_bbox": {"x":120,"y":400,"w":1460,"h":80}},
      "clause_type": "obligation|definition|condition|penalty|termination|grant|covenant|other",
      "confidence": 0.94,
      "children": ["<child ids>"]
    }
  ],
  "definitions": [
    {"term": "Premises", "defined_at_node_id": "...", "definition_text": "..."}
  ],
  "entities": [
    {"name": "Tenant", "node_refs": ["..."], "entity_type": "party|person|property|money|date"}
  ]
}
```

Coordinate convention: `bbox` normalized 0–1 relative to page; `source_coords.pixel_bbox` original pixels. Both preserved — normalization is for rendering, pixels for evidence.

## 2. Node Types and Clause Type Taxonomy

- `node_type` distinguishes structure: `section` (grouping), `clause` (top-level provision), `subclause` (nested provision), `definition` (term definition block), `signature_block`.
- `clause_type` is a semantic label: `obligation`, `definition`, `condition`, `penalty`, `termination`, `grant`, `covenant`, `other`. Assigned by the deterministic heuristic pass first (`ocr-parser.md` §3: numbered obligations/penalties detectable by pattern), then **refined by the LLM analysis stage** — the LLM may re-label but never delete/restructure nodes.
- Leaf nodes always carry text; `section` nodes may have empty text (grouping only).

## 3. AST Builder (`processing/ast_builder.py`)

Input: ordered OCR blocks per document. Output: node list + definitions/entities extracted.

Algorithm (deterministic):
1. Order blocks by `order` within page, pages ascending.
2. Emit `section` nodes from heading blocks; maintain a level stack from number-pattern nesting and indentation.
3. Attach non-heading blocks to the current leaf; merge adjacent same-topic blocks into clause text.
4. Extract `definition` nodes: blocks matching `"\u201c<TERM>\u201d means ..."` or `Term: definition` patterns; record `defined_at_node_id`.
5. Extract `entities`: party names from title page heuristics + defined terms; `entity_type` classification via keyword rules (money patterns → `money`, dates → `date`, etc.).
6. Assign `uuid7` ids and `path` strings.

The AST JSON is stored encrypted at `sessions/{sid}/documents/{did}/ast.json` **and** persisted row-wise into `clauses` (database.md) so the frontend can query clauses without loading the whole AST.

## 4. Guarantees for Downstream Consumers

1. **Completeness:** every OCR text block is contained in exactly one node (no orphan text) — asserted by a builder invariant test.
2. **Acyclicity:** parent chains are a tree; `path` strings are unique per document.
3. **Evidence:** every node references `page_number` + `bbox` + `source_coords`; `source_text_raw` is the untouched OCR text.
4. **Stability:** the same OCR output always produces the same AST (deterministic ordering, no randomness) — required for diff idempotency.

## 5. AST Celery Job (`workers/tasks/ast.py`)

Input: `document_id`. Reads OCR artifacts, builds AST, writes `clauses` rows in a single transaction per document (small: one document), stores AST JSON, dispatches `analysis_pipeline` (which fans compliance + graph). Timeout 5 min. Retry 2.

## 6. Failure Modes

`PARSER_FAILED` — builder invariant violated (orphan blocks, cycle, empty AST) → job fails with diagnostic (invariant name, counts — never clause text) → frontend sees `analysis_status=failed` with retry. Empty AST after header/footer removal surfaces as `DOCUMENT_PARSE_EMPTY` back-propagated to the document status.

## Security

AST text fields are untrusted data (prompt injection §). The AST is persisted data, never interpreted as instructions. `source_text_raw` is sensitive: repository-only access (`authorization.md`).

## Testing

Unit: builder invariants (completeness, acyclicity, path uniqueness) over synthetic block streams incl. edge cases (unnumbered clauses, deep nesting 5 levels, definitions mid-clause, signature blocks). Integration: OCR fixture → AST → assert fixture clauses recoverable by known headings with correct pages/bboxes; determinism test (run twice, byte-identical node ids and paths). Storage test: AST JSON round-trips through encryption.
