# OCR / Parsing

**Requirement:** Layout-aware OCR producing pages, text blocks, bounding boxes, confidence scores, block hierarchy, page numbers, heading detection, clause detection, and table handling. Output feeds the structural AST (`structural-ast.md`). Engine: PaddleOCR primary, Tesseract fallback.

**Why:** Contract PDFs are visually structured documents. Word-order OCR destroys the section/clause hierarchy that compliance, diff, and graph engines depend on.

## 1. Engine

- **Primary:** PaddleOCR with the PP-Structure layout model (layout analysis → text recognition per region). Pages rasterized with `pypdfium2` at 200 DPI (configurable).
- **Fallback:** Tesseract with `--psm 4` (assume single column) + hOCR output when PaddleOCR fails to initialize or errors on a page; fallback is per-page, not per-document (partial degradation, not total failure).
- Engine selection and DPI are config (`configuration.md`), engine failures raise `OCR_FAILED` after 2 retries per page group.

## 2. Output Schema (per page)

```json
{
  "page_number": 3,
  "width_px": 1700, "height_px": 2200,
  "blocks": [
    {
      "block_id": "b3-12",
      "type": "text|heading|table|list|signature|header_footer",
      "bbox": {"x": 120, "y": 400, "w": 1460, "h": 80},
      "confidence": 0.96,
      "text": "7.2 Late Payment. If Tenant fails to pay ...",
      "lines": [{"text": "...", "bbox": {...}, "confidence": 0.97}],
      "order": 14,
      "table_cells": null
    }
  ]
}
```

- **Bounding boxes** are in page-pixel coordinates (origin top-left). Normalization to 0–1 floats is done at API response time (frontend works in relative coords for responsive rendering).
- **Confidence:** per-block mean of line confidences; pages with mean confidence < 0.5 emit a warning finding (type `info`) — human review hint, not a hard failure.
- **Header/footer blocks:** detected via repeated blocks across ≥3 pages → classified `header_footer` and **excluded** from AST text (page numbers and letterheads otherwise corrupt clause text).
- **Tables:** PP-Structure cell grid → rows/columns JSON; table text is linearized for clause text with cell-boundary markers preserved in `source_text_raw`.

## 3. Heading and Clause Detection (deterministic, pre-LLM)

1. Heading candidates: blocks typed `heading` by layout model **or** text lines matching heading heuristics (all-caps / title-case short lines, numbered patterns `^\s*\d+(\.\d+)*\s+[A-Z]`, indentation depth).
2. Hierarchy: indentation + number pattern nesting (`7.2` under `7`) builds the parent tree deterministically.
3. Clause text = consecutive non-heading blocks until the next heading at the same or higher level.
4. This deterministic pass builds the **initial AST**; the LLM stage later refines clause types (`ai-orchestration.md`) but never invents structure absent from the layout output — structure is data, refinement is labeling.

## 4. Text Normalization

- Whitespace collapse, ligature normalization, straight-quote normalization; original preserved in `source_text_raw` (evidence integrity).
- Hyphenated line breaks rejoined with heuristic (next line starts lowercase → join).
- No lowercasing at parse time (case matters for headings/definitions).

## 5. The OCR Celery Job (`workers/tasks/ocr.py`)

Input: `document_id`. Output: `document_pages` rows + OCR JSON artifacts stored encrypted under `sessions/{sid}/documents/{did}/ocr/`. Progress events per page group (`ocr.progress`). On completion dispatches `ast_generation` job.

Timeout: 10 min per 50 pages (configurable). Retries: 2, exponential backoff; per-page fallback means partial-page failure ≠ document failure.

## 6. Failure Modes

`OCR_FAILED` (engine init failure on all pages), `DOCUMENT_PARSE_EMPTY` (zero text blocks after header/footer removal), `SERVICE_UNAVAILABLE` (storage down for artifacts).

## Security

Rasterization only — no PDF JavaScript/Form execution (`pypdfium2` renders pages as bitmaps). Extracted text is **untrusted data** stored as data fields; no parsing step interprets it as instructions (`security.md` prompt-injection layers).

## Testing

Unit: heading heuristic matrix (numbered, all-caps, indented); header/footer repetition detector; normalization cases (ligatures, hyphenation). Integration: synthetic lease PDF fixture → assert per-clause block coverage + bbox presence + heading hierarchy matches fixture's known section numbers. Fallback path test: PaddleOCR mocked to fail → Tesseract path produces valid blocks. Confidence warning finding test.
