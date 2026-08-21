import difflib
import hashlib
import re
from typing import Any

from app.domain.diff import DiffChangeType
from app.utils.ids import generate_uuid7


def normalize_text(text: str) -> str:
    """Normalize whitespace and lowercase for comparison."""
    return re.sub(r"\s+", " ", text.strip().lower())


def trigram_jaccard_similarity(s1: str, s2: str) -> float:
    """Computes Jaccard similarity over character trigrams."""
    if not s1 and not s2:
        return 1.0
    if not s1 or not s2:
        return 0.0

    t1 = {s1[i : i + 3] for i in range(max(0, len(s1) - 2))}
    t2 = {s2[i : i + 3] for i in range(max(0, len(s2) - 2))}

    if not t1 and not t2:
        return 1.0 if s1 == s2 else 0.0
    intersection = len(t1 & t2)
    union = len(t1 | t2)
    return intersection / union if union > 0 else 0.0


def compute_word_diff(old_text: str, new_text: str) -> list[dict[str, str]]:
    """Computes word-level diff operations (equal, insert, delete)."""
    old_words = old_text.split()
    new_words = new_text.split()

    matcher = difflib.SequenceMatcher(None, old_words, new_words)
    diff_ops: list[dict[str, str]] = []

    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == "equal":
            diff_ops.append({"op": "equal", "text": " ".join(old_words[i1:i2])})
        elif tag == "replace":
            diff_ops.append({"op": "delete", "text": " ".join(old_words[i1:i2])})
            diff_ops.append({"op": "insert", "text": " ".join(new_words[j1:j2])})
        elif tag == "delete":
            diff_ops.append({"op": "delete", "text": " ".join(old_words[i1:i2])})
        elif tag == "insert":
            diff_ops.append({"op": "insert", "text": " ".join(new_words[j1:j2])})

    return diff_ops


class DiffEngine:
    """Clause-aligned structural AST diff engine."""

    def compare_documents(
        self,
        doc_a_id: str,
        doc_b_id: str,
        clauses_a: list[dict[str, Any]],
        clauses_b: list[dict[str, Any]],
        session_id: str = "",
    ) -> dict[str, Any]:
        """Aligns clauses between Document A and Document B and classifies changes."""
        changes: list[dict[str, Any]] = []
        summary = {"added": 0, "removed": 0, "modified": 0, "moved": 0, "unchanged": 0}

        # Step 1: Pre-compute fingerprints
        for c in clauses_a:
            c["_norm"] = normalize_text(c.get("text", ""))
            c["_fp"] = hashlib.sha256(c["_norm"].encode()).hexdigest()

        for c in clauses_b:
            c["_norm"] = normalize_text(c.get("text", ""))
            c["_fp"] = hashlib.sha256(c["_norm"].encode()).hexdigest()

        matched_a: set[str] = set()
        matched_b: set[str] = set()
        aligned_pairs: list[tuple[dict[str, Any], dict[str, Any]]] = []

        # Step 2a: Exact fingerprint match
        a_by_fp: dict[str, list[dict[str, Any]]] = {}
        for ca in clauses_a:
            a_by_fp.setdefault(ca["_fp"], []).append(ca)

        for cb in clauses_b:
            fps = a_by_fp.get(cb["_fp"], [])
            for ca in fps:
                if ca["id"] not in matched_a:
                    matched_a.add(ca["id"])
                    matched_b.add(cb["id"])
                    aligned_pairs.append((ca, cb))
                    break

        # Step 2b: Heading + content similarity matching for remaining
        unmatched_a = [ca for ca in clauses_a if ca["id"] not in matched_a]
        unmatched_b = [cb for cb in clauses_b if cb["id"] not in matched_b]

        for cb in unmatched_b:
            best_match: dict[str, Any] | None = None
            best_score = 0.0
            for ca in unmatched_a:
                if ca["id"] in matched_a:
                    continue

                # Heading similarity + content similarity
                h_a = normalize_text(ca.get("heading") or "")
                h_b = normalize_text(cb.get("heading") or "")
                h_sim = trigram_jaccard_similarity(h_a, h_b) if (h_a and h_b) else 0.5
                c_sim = trigram_jaccard_similarity(ca["_norm"], cb["_norm"])
                combined = 0.4 * h_sim + 0.6 * c_sim

                if combined >= 0.65 and combined > best_score:
                    best_score = combined
                    best_match = ca

            if best_match is not None:
                matched_a.add(best_match["id"])
                matched_b.add(cb["id"])
                aligned_pairs.append((best_match, cb))

        # Step 3: Classify aligned pairs
        for ca, cb in aligned_pairs:
            path_changed = ca.get("path") != cb.get("path")
            same_content = ca["_fp"] == cb["_fp"]

            counterpart_coords = {
                "page_number": ca.get("page_number", 1),
                "bbox": ca.get("bbox", {}),
            }

            if same_content and path_changed:
                summary["moved"] += 1
                changes.append({
                    "change_type": DiffChangeType.MOVED.value,
                    "clause_id": cb["id"],
                    "counterpart_clause_id": ca["id"],
                    "heading": cb.get("heading"),
                    "page_number": cb.get("page_number", 1),
                    "bbox": cb.get("bbox", {}),
                    "counterpart_coords": counterpart_coords,
                    "old_text": ca.get("text"),
                    "new_text": cb.get("text"),
                    "word_diff": [],
                })
            elif same_content and not path_changed:
                summary["unchanged"] += 1
            else:
                summary["modified"] += 1
                changes.append({
                    "change_type": DiffChangeType.MODIFIED.value,
                    "clause_id": cb["id"],
                    "counterpart_clause_id": ca["id"],
                    "heading": cb.get("heading"),
                    "page_number": cb.get("page_number", 1),
                    "bbox": cb.get("bbox", {}),
                    "counterpart_coords": counterpart_coords,
                    "old_text": ca.get("text"),
                    "new_text": cb.get("text"),
                    "word_diff": compute_word_diff(ca.get("text", ""), cb.get("text", "")),
                })

        # Step 4: Additions in B only
        for cb in clauses_b:
            if cb["id"] not in matched_b:
                summary["added"] += 1
                changes.append({
                    "change_type": DiffChangeType.ADDED.value,
                    "clause_id": cb["id"],
                    "counterpart_clause_id": None,
                    "heading": cb.get("heading"),
                    "page_number": cb.get("page_number", 1),
                    "bbox": cb.get("bbox", {}),
                    "counterpart_coords": None,
                    "old_text": None,
                    "new_text": cb.get("text"),
                    "word_diff": [{"op": "insert", "text": cb.get("text", "")}],
                })

        # Step 5: Removals in A only
        for ca in clauses_a:
            if ca["id"] not in matched_a:
                summary["removed"] += 1
                changes.append({
                    "change_type": DiffChangeType.REMOVED.value,
                    "clause_id": ca["id"],
                    "counterpart_clause_id": None,
                    "heading": ca.get("heading"),
                    "page_number": ca.get("page_number", 1),
                    "bbox": ca.get("bbox", {}),
                    "counterpart_coords": None,
                    "old_text": ca.get("text"),
                    "new_text": None,
                    "word_diff": [{"op": "delete", "text": ca.get("text", "")}],
                })

        return {
            "diff_id": generate_uuid7(),
            "document_a_id": doc_a_id,
            "document_b_id": doc_b_id,
            "status": "ready",
            "summary": summary,
            "changes": changes,
        }


diff_engine = DiffEngine()
