
from pydantic import BaseModel


class ComplianceResultResponse(BaseModel):
    rule_id: str
    clause_id: str
    outcome: str
    details: dict | None = None
    evaluated_at: str | None = None


class ComplianceSummaryResponse(BaseModel):
    results: list[ComplianceResultResponse]
    findings: list[dict]
    rule_version: int = 1
