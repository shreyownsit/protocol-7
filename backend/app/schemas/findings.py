
from pydantic import BaseModel, Field


class FindingResponse(BaseModel):
    id: str
    session_id: str
    finding_type: str
    severity: str
    confidence: float
    title: str
    summary: str
    statute_reference: str | None = None
    rule_id: str | None = None
    clause_ids: list[str] = Field(default_factory=list)
    evidence: dict | None = None
    financial_exposure: dict | None = None


class FindingListResponse(BaseModel):
    findings: list[FindingResponse]
