import re
from typing import Any

import networkx as nx

from app.utils.ids import generate_uuid7


class GraphBuilder:
    """Constructs NetworkX Knowledge Graph and runs deterministic contradiction detection."""

    def build_graph(
        self,
        clauses: list[dict[str, Any]],
        relationships: list[dict[str, Any]] | None = None,
        parties: list[str] | None = None,
    ) -> tuple[dict[str, Any], list[dict[str, Any]]]:
        """Builds vis-network compatible graph payload and detects contradictions.

        Returns: (vis_network_payload, contradiction_findings).
        """
        g = nx.DiGraph()
        detected_parties = set(parties or ["Landlord", "Tenant", "Client", "Contractor", "Employer", "Employee", "Company"])
        contradictions: list[dict[str, Any]] = []

        # 1. Create entity nodes
        entity_node_map: dict[str, str] = {}
        for p in detected_parties:
            nid = f"entity:{p.lower()}"
            entity_node_map[p.lower()] = nid
            g.add_node(
                nid,
                label=p,
                group="entity",
                clause_refs=[],
                metadata={"entity_type": "party"},
            )

        # 2. Process clauses -> obligation / condition nodes
        clause_node_map: dict[str, str] = {}
        for c in clauses:
            cid = c["id"]
            clause_type = c.get("clause_type", "other")
            text = c.get("text", "")
            heading = c.get("heading") or f"Clause {c.get('path', '')}"

            ref = {
                "clause_id": cid,
                "page": c.get("page_number", 1),
                "bbox": c.get("bbox", {}),
            }

            node_id = f"clause:{cid}"
            clause_node_map[cid] = node_id

            if clause_type in ("obligation", "penalty", "covenant"):
                g.add_node(
                    node_id,
                    label=heading,
                    group="obligation",
                    clause_refs=[ref],
                    text_evidence=text[:200],
                    metadata={"clause_type": clause_type},
                )

                # Link owning entity based on keyword
                for p in detected_parties:
                    if re.search(rf"\b{p}\b\s+(?:shall|must|will|agrees to|is required to)", text, re.IGNORECASE):
                        ent_id = entity_node_map.get(p.lower())
                        if ent_id:
                            g.add_edge(ent_id, node_id, label="owes", style="solid", clause_refs=[ref])

            elif "if " in text.lower() or "provided that" in text.lower() or "in the event" in text.lower():
                g.add_node(
                    node_id,
                    label=f"Condition: {heading}",
                    group="condition",
                    clause_refs=[ref],
                    text_evidence=text[:200],
                    metadata={"clause_type": "condition"},
                )

        # 3. Add explicit relationships
        if relationships:
            for rel in relationships:
                src_id = clause_node_map.get(rel["source_clause_id"])
                tgt_id = clause_node_map.get(rel["target_clause_id"])
                rel_type = rel.get("relationship_type", "references")
                if src_id and tgt_id:
                    g.add_edge(src_id, tgt_id, label=rel_type, style="dashed" if rel_type == "conditions" else "solid", clause_refs=[])

        # 4. Contradiction Detection:
        # Check pairs of clauses for mutual exclusion / contradictory obligations
        for i, c1 in enumerate(clauses):
            t1 = c1.get("text", "").lower()
            for j in range(i + 1, len(clauses)):
                c2 = clauses[j]
                t2 = c2.get("text", "").lower()

                # Rule A: Notice period contradictions (e.g. 30 days notice vs 60 days notice)
                m1 = re.search(r"(\d+)\s*(?:calendar\s*)?days(?:\s*written)?\s*notice", t1)
                m2 = re.search(r"(\d+)\s*(?:calendar\s*)?days(?:\s*written)?\s*notice", t2)
                if m1 and m2 and m1.group(1) != m2.group(1):
                    # If both talk about termination or cancellation
                    if ("terminat" in t1 or "cancel" in t1) and ("terminat" in t2 or "cancel" in t2):
                        finding_id = generate_uuid7()
                        contradictions.append({
                            "finding_id": finding_id,
                            "node_pair": [f"clause:{c1['id']}", f"clause:{c2['id']}"],
                            "clause_refs": [
                                {"clause_id": c1["id"], "page": c1.get("page_number", 1), "bbox": c1.get("bbox", {})},
                                {"clause_id": c2["id"], "page": c2.get("page_number", 1), "bbox": c2.get("bbox", {})},
                            ],
                            "title": "Contradictory Notice Periods",
                            "summary": f"Clause '{c1.get('heading') or c1.get('path')}' requires {m1.group(1)} days notice, while Clause '{c2.get('heading') or c2.get('path')}' requires {m2.group(1)} days notice.",
                        })

                # Rule B: Delivery / payment schedule contradictions
                if "may terminate immediately" in t1 and "no termination before" in t2:
                    finding_id = generate_uuid7()
                    contradictions.append({
                        "finding_id": finding_id,
                        "node_pair": [f"clause:{c1['id']}", f"clause:{c2['id']}"],
                        "clause_refs": [
                            {"clause_id": c1["id"], "page": c1.get("page_number", 1), "bbox": c1.get("bbox", {})},
                            {"clause_id": c2["id"], "page": c2.get("page_number", 1), "bbox": c2.get("bbox", {})},
                        ],
                        "title": "Contradictory Termination Rights",
                        "summary": "Clauses contain mutually exclusive termination conditions.",
                    })

        # 5. Format vis-network payload
        nodes_payload = []
        for n, d in g.nodes(data=True):
            nodes_payload.append({
                "id": n,
                "label": d.get("label", n),
                "group": d.get("group", "default"),
                "clause_refs": d.get("clause_refs", []),
            })

        edges_payload = []
        for u, v, d in g.edges(data=True):
            edges_payload.append({
                "id": f"edge:{u}-{v}",
                "from": u,
                "to": v,
                "label": d.get("label", ""),
                "style": d.get("style", "solid"),
                "clause_refs": d.get("clause_refs", []),
            })

        vis_payload = {
            "nodes": nodes_payload,
            "edges": edges_payload,
            "contradictions": contradictions,
            "layout_hint": "hierarchical",
        }

        return vis_payload, contradictions


graph_builder = GraphBuilder()
