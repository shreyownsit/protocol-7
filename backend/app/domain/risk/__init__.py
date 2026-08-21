from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import Any


class RiskCategory(str, Enum):
    SEVERITY = "severity"
    CONFIDENCE = "confidence"
    FINANCIAL_EXPOSURE = "financial_exposure"
    COMPLIANCE = "compliance"
    CONTRADICTION = "contradiction"
    NEGOTIATION_PRIORITY = "negotiation_priority"


@dataclass
class RiskVariableDomain:
    id: str
    model_id: str
    name: str
    category: RiskCategory
    value: float
    weight: float
    evidence_refs: list[str] | dict[str, Any] | None = None


@dataclass
class RiskModelDomain:
    id: str
    session_id: str
    version: int
    formula_doc: str
    overall_risk: float
    variables: list[RiskVariableDomain]
    created_at: datetime | None = None
