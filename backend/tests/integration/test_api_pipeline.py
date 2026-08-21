import io

import pytest
from httpx import AsyncClient


def generate_sample_contract_pdf() -> bytes:
    """Generates a minimal valid PDF with contract clauses."""
    import pypdfium2 as pdfium

    pdf = pdfium.PdfDocument.new()
    page = pdf.new_page(595, 842)
    # Return empty / valid PDF container bytes
    bio = io.BytesIO()
    pdf.save(bio)
    return bio.getvalue()


@pytest.mark.asyncio
async def test_end_to_end_analysis_pipeline(client: AsyncClient):
    # 1. Create Session
    s_res = await client.post("/sessions", json={"title": "Residential Lease 2026", "privacy_mode": "standard"})
    session_id = s_res.json()["id"]

    # 2. Upload Document
    pdf_bytes = generate_sample_contract_pdf()
    files = {"file": ("lease_agreement.pdf", pdf_bytes, "application/pdf")}
    up_res = await client.post(f"/sessions/{session_id}/upload", files=files)
    assert up_res.status_code == 201, up_res.text
    doc_id = up_res.json()["document"]["id"]

    # 3. Query AST
    ast_res = await client.get(f"/sessions/{session_id}/documents/{doc_id}/ast")
    assert ast_res.status_code == 200
    assert "nodes" in ast_res.json()

    # 4. Query Clauses
    clauses_res = await client.get(f"/sessions/{session_id}/clauses")
    assert clauses_res.status_code == 200

    # 5. Query Risk Model
    risk_res = await client.get(f"/sessions/{session_id}/risk")
    assert risk_res.status_code == 200
    assert "overall_risk" in risk_res.json()

    # 6. Query Compliance Summary
    comp_res = await client.get(f"/sessions/{session_id}/compliance")
    assert comp_res.status_code == 200
    assert "results" in comp_res.json()

    # 7. Query Graph
    graph_res = await client.get(f"/sessions/{session_id}/graph")
    assert graph_res.status_code == 200
    assert "nodes" in graph_res.json()

    # 8. Create Simulation
    sim_res = await client.post(f"/sessions/{session_id}/simulation", json={"title": "Cost Model"})
    assert sim_res.status_code == 201
    sim_id = sim_res.json()["id"]

    # 9. Verify Scenario in Simulation
    ver_res = await client.post(
        f"/simulation/{sim_id}/verify",
        json={"scenario": {"monthly_rent": 2200.0, "late_days_simulated": 3.0}},
    )
    assert ver_res.status_code == 200
    assert "formula_results" in ver_res.json()

    # 10. Request Audio Narration
    audio_res = await client.post(f"/sessions/{session_id}/audio", json={"language_code": "en"})
    assert audio_res.status_code == 202
    assert audio_res.json()["status"] == "ready"

    # 11. Create Export
    exp_res = await client.post(
        f"/sessions/{session_id}/export",
        json={"format": "docx", "contents": {"findings": ["Daily late fee exceeds statutory standard"]}},
    )
    assert exp_res.status_code == 201
    assert exp_res.json()["status"] == "ready"
