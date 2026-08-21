import pytest

from app.processing.graph_builder import graph_builder


def test_graph_builder_and_contradiction_detection():
    clauses = [
        {
            "id": "c1",
            "heading": "Early Termination Notice",
            "text": "Tenant may terminate this agreement by providing 30 days written notice to Landlord.",
            "clause_type": "termination",
            "page_number": 1,
            "bbox": {"x": 0.1, "y": 0.1, "w": 0.8, "h": 0.1},
        },
        {
            "id": "c2",
            "heading": "Cancellation Clause",
            "text": "Tenant cancellation requires 60 days notice prior to effective date.",
            "clause_type": "termination",
            "page_number": 2,
            "bbox": {"x": 0.1, "y": 0.5, "w": 0.8, "h": 0.1},
        },
    ]

    vis_payload, contradictions = graph_builder.build_graph(clauses)
    assert len(vis_payload["nodes"]) >= 2
    assert len(contradictions) == 1
    assert "Contradictory Notice Periods" in contradictions[0]["title"]
