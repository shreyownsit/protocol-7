# Redline Diff Engine

**Requirement:** Structural comparison of two contract versions via clause-aligned AST diffing: Document A + Document B → AST A + AST B → clause alignment → diff → added/removed/modified. Reordered clauses must be handled. The frontend must be able to highlight changes directly on rendered PDF pages, so every diff hunk carries page references and bounding boxes.

**Why:** Line-level text diffing fails on legal documents (renumbered sections, reformatted paragraphs). Clause-level alignment preserves legal meaning.

## 1. Algorithm

```
AST A, AST B (leaf clauses normalized)
   │
   ├── 1. Fingerprint each leaf clause:
   │      fp = sha256(normalize(text)) ; also id-based fp if clause ids were
   │      carried over from a prior diff (counter-clause round-trips)
   │
   ├── 2. Alignment pass (three strategies, in order):
   │      a. Exact fingerprint match  → aligned pair
   │      b. Heading + path similarity → aligned pair
   │         (heading normalized: strip numbers, lowercase; similarity ≥ 0.85
   │          on trigram Jaccard; path structure similarity as tiebreaker)
   │      c. Sequence alignment fallback (LCS over heading-normalized streams)
   │
   └── 3. Classification:
           aligned + same fp        → unchanged
           aligned + different fp   → MODIFIED  (word-level diff within pair)
           in B only                → ADDED
           in A only                → REMOVED
           reordered                → MOVED (aligned, fp same, path changed)
```

**Reorder handling:** an aligned pair whose `path` differs but fingerprint matches is `MOVED`, not modified; the change set records both old and new coordinates. The frontend renders moved clauses as relocated highlights (two bboxes).

## 2. Change Hunk Schema (API payload)

```json
{
  "diff_id": "<uuid7>",
  "document_a_id": "...", "document_b_id": "...",
  "status": "ready",
  "summary": {"added": 3, "removed": 1, "modified": 7, "moved": 2, "unchanged": 48},
  "changes": [
    {
      "change_type": "added|removed|modified|moved",
      "clause_id": "<clause in B, or A>",
      "counterpart_clause_id": "<other side, nullable>",
      "heading": "Late Payment",
      "page_number": 4,
      "bbox": {"x": 0.12, "y": 0.31, "w": 0.81, "h": 0.06},
      "counterpart_coords": {"page_number": 5, "bbox": {...}},
      "old_text": "..." , "new_text": "...",
      "word_diff": [{"op": "equal|insert|delete", "text": "..."}]
    }
  ]
}
```

Every change carries the **B-side** `clause_id`/`page_number`/`bbox` (the version being reviewed) plus counterpart coordinates when available — this is exactly what the frontend's PDF highlight renderer needs. `word_diff` uses the same op format the frontend's inline renderer consumes.

## 3. Diff Celery Job (`workers/tasks/diff.py`)

Triggered by `POST /api/v1/diff` with `document_a_id`, `document_b_id` (both must belong to the same session; second document upload binding in `document-ingestion.md`). Job: load both ASTs (cached JSON if available), align, classify, persist `diff_results` (new table: `id, session_id, document_a_id, document_b_id, status, summary jsonb, created_at`; changes kept as JSONB array — diff results are small and read as a unit). Timeout 5 min / 20 pages. Retries 2. Idempotent on `(document_a_id, document_b_id)`.

## 4. Alignment Edge Cases

- **Numbering shifts** (clause 7 becomes 8): heading-similarity pass absorbs them; fingerprint stability means content-identical clauses match regardless of number.
- **Clause splits/merges**: if one A clause aligns to two B clauses (B-side text union similarity ≥ 0.9 with A), classify as two MODIFIED with `split_from`/`merged_from` annotations; otherwise fall back to REMOVED + ADDED (conservative — never silently merge meaning).
- **No alignment candidate**: standalone ADDED/REMOVED.
- **Different page counts**: alignment is content-based; page/bbox come from each side's own AST — always valid.

## 5. Failure Modes

`DIFF_FAILED` — AST missing on either side, alignment non-termination guard (>30 s abort → fail), storage unavailable. `DOCUMENT_NOT_FOUND`/ownership as usual.

## Implementation Notes

- Similarity metrics are pure-Python (trigram sets) — no external deps.
- LCS fallback is bounded: inputs are leaf-clause streams (typically <200 items); O(n·m) is trivially fast.
- The diff engine is deterministic: same inputs → same hunks (fingerprint + sorted alignment) — required for idempotency and testing.

## Security

Diff operates on AST text (untrusted data) purely as data — no instruction interpretation. Change payloads include `old_text`/`new_text`; these flow to the frontend and are never logged.

## Testing

Unit: fingerprint + heading-normalization cases; trigram similarity thresholds (true matches ≥0.85, false matches rejected); split/merge classification. Integration: synthetic contract pair fixture (v1→v2 with 1 added, 1 removed, 7 modified, 2 moved) → assert classification counts and that each MODIFIED change's `bbox` points to the v2 page; renumbering-only fixture → zero MODIFIED count; determinism test (rerun = identical payload).
