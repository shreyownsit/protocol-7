import pytest

from app.domain.findings import FindingDomain, FindingType, Severity
from app.processing.risk_model import risk_calculator


def test_financial_exposure_extraction():
    text = "Tenant shall pay a late charge of $50 per day for each day payment is delayed."
    exposure = risk_calculator.extract_financial_exposure_from_clause(text)
    assert exposure is not None
    assert exposure["amount"] == 50.0
    assert exposure["basis"] == "per day"


def test_risk_model_computation_clean_contract():
    model = risk_calculator.compute_risk_model([])
    assert model["overall_risk"] == 0.0
    assert "overall_risk =" in model["formula_doc"]


def test_risk_model_computation_with_findings():
    findings = [
        FindingDomain(
            id="f1",
            session_id="s1",
            finding_type=FindingType.COMPLIANCE,
            severity=Severity.CRITICAL,
            confidence=0.95,
            title="Statutory Violation",
            summary="Deposit exceeds statutory cap.",
            financial_exposure={"amount": 4000.0, "currency": "USD", "basis": "one-time"},
        ),
        FindingDomain(
            id="f2",
            session_id="s1",
            finding_type=FindingType.CONTRADICTION,
            severity=Severity.HIGH,
            confidence=0.9,
            title="Notice Conflict",
            summary="Contradictory notice periods.",
        ),
    ]

    model = risk_calculator.compute_risk_model(findings, total_enabled_rules=4, reference_monthly_rent=2000.0)
    assert 0.0 < model["overall_risk"] <= 1.0
    assert len(model["variables"]) == 6
    assert "S (Severity Normalized" in model["formula_doc"]
