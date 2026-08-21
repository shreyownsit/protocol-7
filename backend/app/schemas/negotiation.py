from typing import Any

from pydantic import BaseModel, Field


class StartNegotiationRequest(BaseModel):
    clause_id: str
    context: dict[str, Any] | None = None


class NegotiationStepResponse(BaseModel):
    agent: str
    step_type: str
    payload: dict | None = None
    event_id: str | None = None
    created_at: str | None = None


class NegotiationResponse(BaseModel):
    id: str
    session_id: str
    clause_id: str
    status: str
    current_stage: str | None = None
    retry_count: int = 0
    counter_clause_id: str | None = None
    steps: list[NegotiationStepResponse] = Field(default_factory=list)


class CounterClauseResponse(BaseModel):
    id: str
    negotiation_id: str
    original_clause_id: str
    counter_text: str
    rationale: str
    compliance_check_result: dict | None = None
    status: str
