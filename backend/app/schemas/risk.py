
from pydantic import BaseModel, Field


class RiskVariableResponse(BaseModel):
    name: str
    category: str
    value: float
    weight: float
    evidence_refs: list[str] = Field(default_factory=list)


class RiskModelResponse(BaseModel):
    overall_risk: float
    formula_doc: str
    variables: list[RiskVariableResponse] = Field(default_factory=list)
