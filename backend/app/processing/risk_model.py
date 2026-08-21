import re
from typing import Any

from app.core.config import settings
from app.domain.findings import FindingDomain, Severity, get_severity_ordinal
from app.domain.risk import RiskCategory


class RiskCalculator:
    """Calculates multi-dimensional risk scores and derived composite overall risk."""

    def __init__(
        self,
        weight_severity: float | None = None,
        weight_confidence: float | None = None,
        weight_financial: float | None = None,
        weight_contradiction: float | None = None,
        weight_priority: float | None = None,
    ) -> None:
        self.w_s = weight_severity or settings.RISK_WEIGHT_SEVERITY
        self.w_c = weight_confidence or settings.RISK_WEIGHT_CONFIDENCE
        self.w_f = weight_financial or settings.RISK_WEIGHT_FINANCIAL
        self.w_x = weight_contradiction or settings.RISK_WEIGHT_CONTRADICTION
        self.w_p = weight_priority or settings.RISK_WEIGHT_PRIORITY

    def extract_financial_exposure_from_clause(self, text: str) -> dict[str, Any] | None:
        """Deterministically extracts financial exposure amounts and units from clause text."""
        # e.g., $50 per day, $100 late fee, $1,500 security deposit
        match = re.search(r"\$\s*([0-9]+(?:,[0-9]{3})*(?:\.[0-9]{2})?)", text)
        if not match:
            return None

        amount = float(match.group(1).replace(",", ""))

        # Basis detection
        text_lower = text.lower()
        basis = "one-time"
        if "per day" in text_lower or "each day" in text_lower or "daily" in text_lower:
            basis = "per day"
        elif "per month" in text_lower or "monthly" in text_lower:
            basis = "per month"
        elif "per occurrence" in text_lower or "each occurrence" in text_lower:
            basis = "per occurrence"

        # Check if unbounded
        unbounded = "uncapped" in text_lower or "no maximum" in text_lower or "without limit" in text_lower

        return {
            "amount": amount,
            "currency": "USD",
            "basis": basis,
            "unbounded": unbounded,
        }

    def compute_risk_model(
        self,
        findings: list[FindingDomain],
        total_enabled_rules: int = 1,
        reference_monthly_rent: float | None = None,
    ) -> dict[str, Any]:
        """Computes all 6 dimensions and composite score with formula doc."""
        if not findings:
            variables = [
                {"name": "max_severity", "category": RiskCategory.SEVERITY.value, "value": 0.0, "weight": self.w_s, "evidence_refs": []},
                {"name": "mean_confidence", "category": RiskCategory.CONFIDENCE.value, "value": 1.0, "weight": self.w_c, "evidence_refs": []},
                {"name": "financial_exposure_total", "category": RiskCategory.FINANCIAL_EXPOSURE.value, "value": 0.0, "weight": self.w_f, "evidence_refs": []},
                {"name": "compliance_risk", "category": RiskCategory.COMPLIANCE.value, "value": 0.0, "weight": self.w_x, "evidence_refs": []},
                {"name": "contradiction_risk", "category": RiskCategory.CONTRADICTION.value, "value": 0.0, "weight": self.w_x, "evidence_refs": []},
                {"name": "negotiation_priority", "category": RiskCategory.NEGOTIATION_PRIORITY.value, "value": 0.0, "weight": self.w_p, "evidence_refs": []},
            ]
            return {
                "overall_risk": 0.0,
                "variables": variables,
                "formula_doc": self.generate_formula_doc(0.0, 1.0, 0.0, 0.0, 0.0, 0.0),
            }

        # 1. Max severity
        severities = [get_severity_ordinal(f.severity) for f in findings]
        max_sev_ordinal = max(severities) if severities else 0
        s_norm = max_sev_ordinal / 4.0

        # 2. Mean confidence (weighted by severity ordinal)
        weights = [max(1, get_severity_ordinal(f.severity)) for f in findings]
        weighted_conf_sum = sum(f.confidence * w for f, w in zip(findings, weights, strict=False))
        mean_conf = weighted_conf_sum / sum(weights) if weights else 1.0
        c_norm = 1.0 - mean_conf

        # 3. Financial exposure
        exposure_sum = 0.0
        for f in findings:
            if f.financial_exposure and "amount" in f.financial_exposure:
                amt = float(f.financial_exposure["amount"])
                basis = f.financial_exposure.get("basis", "one-time")
                if basis == "per day":
                    amt *= 30  # 30-day baseline estimate
                elif basis == "per month":
                    amt *= 12  # annualize
                exposure_sum += amt

        exposure_cap = 10 * (reference_monthly_rent or 1000.0)
        f_norm = min(1.0, exposure_sum / exposure_cap)

        # 4. Compliance risk
        compliance_violations = [f for f in findings if f.finding_type.value == "compliance"]
        comp_risk = min(1.0, len(compliance_violations) / max(1, total_enabled_rules))

        # 5. Contradiction risk
        contradictions = [f for f in findings if f.finding_type.value == "contradiction"]
        contradiction_risk = min(1.0, len(contradictions) * 0.25)

        # 6. Negotiation priority
        negotiable = [f for f in findings if f.severity in (Severity.CRITICAL, Severity.HIGH, Severity.MEDIUM)]
        neg_priority = min(1.0, len(negotiable) * 0.2)

        # Composite overall risk
        overall_risk = (
            self.w_s * s_norm
            + self.w_c * c_norm
            + self.w_f * f_norm
            + self.w_x * contradiction_risk
            + self.w_p * neg_priority
        )
        overall_risk = round(min(1.0, max(0.0, overall_risk)), 4)

        finding_ids = [f.id for f in findings]
        variables = [
            {"name": "max_severity", "category": RiskCategory.SEVERITY.value, "value": float(max_sev_ordinal), "weight": self.w_s, "evidence_refs": finding_ids},
            {"name": "mean_confidence", "category": RiskCategory.CONFIDENCE.value, "value": round(mean_conf, 4), "weight": self.w_c, "evidence_refs": finding_ids},
            {"name": "financial_exposure_total", "category": RiskCategory.FINANCIAL_EXPOSURE.value, "value": float(exposure_sum), "weight": self.w_f, "evidence_refs": finding_ids},
            {"name": "compliance_risk", "category": RiskCategory.COMPLIANCE.value, "value": round(comp_risk, 4), "weight": self.w_x, "evidence_refs": finding_ids},
            {"name": "contradiction_risk", "category": RiskCategory.CONTRADICTION.value, "value": round(contradiction_risk, 4), "weight": self.w_x, "evidence_refs": finding_ids},
            {"name": "negotiation_priority", "category": RiskCategory.NEGOTIATION_PRIORITY.value, "value": round(neg_priority, 4), "weight": self.w_p, "evidence_refs": finding_ids},
        ]

        formula_doc = self.generate_formula_doc(
            s_norm, c_norm, f_norm, comp_risk, contradiction_risk, neg_priority
        )

        return {
            "overall_risk": overall_risk,
            "variables": variables,
            "formula_doc": formula_doc,
        }

    def generate_formula_doc(
        self, s: float, c: float, f: float, comp: float, x: float, p: float
    ) -> str:
        return (
            f"overall_risk = {self.w_s:.2f}*S + {self.w_c:.2f}*C + {self.w_f:.2f}*F + {self.w_x:.2f}*X + {self.w_p:.2f}*P\n"
            f"  S (Severity Normalized, max/4) = {s:.3f}\n"
            f"  C (Uncertainty, 1 - mean_confidence) = {c:.3f}\n"
            f"  F (Financial Exposure Normalized) = {f:.3f}\n"
            f"  X (Contradiction Risk) = {x:.3f}\n"
            f"  P (Negotiation Priority) = {p:.3f}"
        )


risk_calculator = RiskCalculator()
