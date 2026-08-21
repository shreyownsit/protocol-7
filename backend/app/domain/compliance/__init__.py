from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import Any

from app.domain.findings import Severity


class ComplianceOutcome(str, Enum):
    VIOLATION = "violation"
    SATISFIED = "satisfied"
    NOT_APPLICABLE = "not_applicable"
    INSUFFICIENT_DATA = "insufficient_data"


@dataclass
class ComplianceRuleDomain:
    id: str
    name: str
    jurisdiction: str
    agreement_type: str
    rule_version: int
    condition_expr: str
    severity: Severity
    message_template: str
    statute_reference: str | None
    enabled: bool = True
    created_at: datetime | None = None


@dataclass
class ComplianceResultDomain:
    id: str
    session_id: str
    rule_id: str
    clause_id: str | None
    outcome: ComplianceOutcome
    details: dict[str, Any] | None
    evaluated_at: datetime | None = None
