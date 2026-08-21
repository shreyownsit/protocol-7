from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any


class FindingType(str, Enum):
    COMPLIANCE = "compliance"
    AI_FLAG = "ai_flag"
    CONTRADICTION = "contradiction"
    FINANCIAL = "financial"


class Severity(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


SEVERITY_ORDINALS: dict[Severity, int] = {
    Severity.INFO: 0,
    Severity.LOW: 1,
    Severity.MEDIUM: 2,
    Severity.HIGH: 3,
    Severity.CRITICAL: 4,
}


def get_severity_ordinal(severity: Severity | str) -> int:
    if isinstance(severity, str):
        try:
            severity = Severity(severity)
        except ValueError:
            return 0
    return SEVERITY_ORDINALS.get(severity, 0)


@dataclass
class FinancialExposure:
    amount: float
    currency: str = "USD"
    basis: str = "one-time"  # "per occurrence", "per day", "per month", "annual"
    unbounded: bool = False


@dataclass
class FindingDomain:
    id: str
    session_id: str
    finding_type: FindingType
    severity: Severity
    confidence: float
    title: str
    summary: str
    statute_reference: str | None = None
    rule_id: str | None = None
    clause_ids: list[str] = field(default_factory=list)
    evidence: dict[str, Any] | list[dict[str, Any]] | None = None
    financial_exposure: dict[str, Any] | None = None
    created_at: datetime | None = None
