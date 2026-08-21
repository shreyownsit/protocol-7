import re
from typing import Any

from app.domain.clauses import ClauseType, NodeType
from app.utils.ids import generate_uuid7


class ASTBuilder:
    """Deterministic document block to hierarchical AST builder."""

    def build_ast(
        self,
        document_id: str,
        pages_blocks: list[dict[str, Any]],
        document_title: str = "Contract Agreement",
    ) -> dict[str, Any]:
        """Builds hierarchical AST from raw page OCR blocks."""
        nodes: list[dict[str, Any]] = []
        definitions: list[dict[str, Any]] = []
        entities: list[dict[str, Any]] = []

        # Flatten and sort blocks by page number and block order
        all_blocks = []
        for p in pages_blocks:
            page_num = p.get("page_number", 1)
            for b in p.get("blocks", []):
                b["page_number"] = page_num
                all_blocks.append(b)

        all_blocks.sort(key=lambda b: (b.get("page_number", 1), b.get("order", 0)))

        # Filter out headers and footers
        content_blocks = [b for b in all_blocks if b.get("type") != "header_footer"]

        current_section_id: str | None = None
        section_idx = 0
        clause_idx = 0

        for b in content_blocks:
            text = b.get("text", "").strip()
            if not text:
                continue

            b_type = b.get("type", "text")
            page_num = b.get("page_number", 1)
            raw_bbox = b.get("bbox", {"x": 0, "y": 0, "w": 1, "h": 1})

            # Check if block represents a heading / section header
            is_heading = (
                b_type == "heading"
                or bool(re.match(r"^\s*(?:SECTION|ARTICLE|\d+)\b", text, re.IGNORECASE))
                or (len(text) < 60 and text.isupper())
            )

            # Classify semantic clause type
            clause_type = self._classify_clause_type(text)

            if is_heading:
                section_idx += 1
                clause_idx = 0
                sec_id = generate_uuid7()
                current_section_id = sec_id
                nodes.append({
                    "id": sec_id,
                    "document_id": document_id,
                    "parent_clause_id": None,
                    "path": str(section_idx),
                    "node_type": NodeType.SECTION.value,
                    "clause_type": ClauseType.OTHER.value,
                    "heading": text,
                    "text": text,
                    "source_text_raw": text,
                    "page_number": page_num,
                    "bbox": raw_bbox,
                    "confidence": b.get("confidence", 1.0),
                })
            else:
                clause_idx += 1
                path_str = f"{section_idx}.{clause_idx}" if section_idx > 0 else str(clause_idx)
                cid = generate_uuid7()

                # Extract definition if matching definition pattern
                def_match = re.search(r'["\u201c\u201d]([^"\u201c\u201d]+)["\u201c\u201d]\s+(?:means|shall mean)\s+(.+)', text, re.IGNORECASE)
                if def_match:
                    term = def_match.group(1).strip()
                    dtext = def_match.group(2).strip()
                    definitions.append({
                        "term": term,
                        "defined_at_node_id": cid,
                        "definition_text": dtext,
                    })

                nodes.append({
                    "id": cid,
                    "document_id": document_id,
                    "parent_clause_id": current_section_id,
                    "path": path_str,
                    "node_type": NodeType.CLAUSE.value,
                    "clause_type": clause_type,
                    "heading": self._extract_short_heading(text),
                    "text": text,
                    "source_text_raw": text,
                    "page_number": page_num,
                    "bbox": raw_bbox,
                    "confidence": b.get("confidence", 1.0),
                })

        # Extract party entities
        parties = ["Landlord", "Tenant", "Client", "Contractor", "Employer", "Employee", "Company"]
        for p in parties:
            matching_ids = [n["id"] for n in nodes if re.search(rf"\b{p}\b", n["text"], re.IGNORECASE)]
            if matching_ids:
                entities.append({
                    "name": p,
                    "node_refs": matching_ids,
                    "entity_type": "party",
                })

        return {
            "document": {
                "id": document_id,
                "title": document_title,
                "page_count": len(pages_blocks),
            },
            "nodes": nodes,
            "definitions": definitions,
            "entities": entities,
        }

    def _classify_clause_type(self, text: str) -> str:
        text_lower = text.lower()
        if "penalty" in text_lower or "late fee" in text_lower or "charge of" in text_lower:
            return ClauseType.PENALTY.value
        if "terminat" in text_lower or "cancel" in text_lower or "surrender" in text_lower:
            return ClauseType.TERMINATION.value
        if "shall" in text_lower or "must" in text_lower or "agrees to" in text_lower or "required to" in text_lower:
            return ClauseType.OBLIGATION.value
        if "grant" in text_lower or "hereby conveys" in text_lower or "license" in text_lower:
            return ClauseType.GRANT.value
        if "covenant" in text_lower or "warrants" in text_lower:
            return ClauseType.COVENANT.value
        if "means" in text_lower and ('"' in text or "“" in text):
            return ClauseType.DEFINITION.value
        if "if " in text_lower or "in the event" in text_lower:
            return ClauseType.CONDITION.value
        return ClauseType.OTHER.value

    def _extract_short_heading(self, text: str) -> str | None:
        # e.g., "7.2 Late Payment. If Tenant fails..." -> "Late Payment"
        m = re.match(r"^\s*(?:\d+(?:\.\d+)*\s*)?([A-Z][A-Za-z0-9\s]{2,40})[.:\n]", text)
        if m:
            return m.group(1).strip()
        return None


ast_builder = ASTBuilder()
