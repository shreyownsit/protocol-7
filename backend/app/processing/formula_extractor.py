import re
from typing import Any


class FormulaExtractor:
    """Extracts numeric anchors and default simulation formulas from document AST clauses."""

    def extract_simulation_model(self, clauses: list[dict[str, Any]]) -> tuple[dict[str, Any], dict[str, Any]]:
        """Extracts standard contract variables and default formulas from clauses."""
        variables: dict[str, Any] = {}
        formulas: dict[str, Any] = {}

        # Default fallback variables if none detected
        monthly_rent = 1800.0
        late_fee_per_day = 50.0
        lease_months = 12.0
        late_fee_cap = 200.0

        rent_clause_id = None
        late_clause_id = None

        for c in clauses:
            text = c.get("text", "")
            cid = c["id"]
            text_lower = text.lower()

            # Rent detection
            if "monthly rent" in text_lower or "rent shall be" in text_lower:
                match = re.search(r"\$\s*([0-9]+(?:,[0-9]{3})*)", text)
                if match:
                    monthly_rent = float(match.group(1).replace(",", ""))
                    rent_clause_id = cid

            # Late fee detection
            if "late" in text_lower and ("fee" in text_lower or "charge" in text_lower or "penalty" in text_lower):
                match = re.search(r"\$\s*([0-9]+(?:\.[0-9]{2})?)", text)
                if match:
                    late_fee_per_day = float(match.group(1))
                    late_clause_id = cid

            # Term length
            match_term = re.search(r"(\d+)\s*(?:months|month)\b", text_lower)
            if match_term:
                lease_months = float(match_term.group(1))

        variables["monthly_rent"] = {
            "label": "Monthly Rent",
            "value": monthly_rent,
            "unit": "USD",
            "min": 0.0,
            "max": 50000.0,
            "step": 50.0,
            "cap": None,
            "source_clause_id": rent_clause_id,
        }

        variables["lease_months"] = {
            "label": "Lease Term",
            "value": lease_months,
            "unit": "months",
            "min": 1.0,
            "max": 120.0,
            "step": 1.0,
            "cap": None,
            "source_clause_id": None,
        }

        variables["late_fee_per_day"] = {
            "label": "Late Fee (Daily)",
            "value": late_fee_per_day,
            "unit": "USD",
            "min": 0.0,
            "max": 500.0,
            "step": 5.0,
            "cap": {"value": late_fee_cap, "basis": "per occurrence"},
            "source_clause_id": late_clause_id,
        }

        variables["late_days_simulated"] = {
            "label": "Simulated Days Late",
            "value": 5.0,
            "unit": "days",
            "min": 0.0,
            "max": 30.0,
            "step": 1.0,
            "cap": None,
            "source_clause_id": None,
        }

        formulas["annual_rent"] = {
            "expr": "monthly_rent * lease_months",
            "label": "Total Term Rent",
            "unit": "USD",
            "depends": ["monthly_rent", "lease_months"],
        }

        formulas["late_fee_total"] = {
            "expr": "late_fee_per_day * late_days_simulated",
            "label": "Simulated Late Charges",
            "unit": "USD",
            "depends": ["late_fee_per_day", "late_days_simulated"],
        }

        return variables, formulas


formula_extractor = FormulaExtractor()
