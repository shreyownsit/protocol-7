from typing import Literal

from pydantic import BaseModel, Field


class SummaryOutput(BaseModel):
    summary: str = Field(max_length=4000)
    reading_level: Literal["simple", "moderate", "complex"] = "simple"
    key_parties: list[str] = Field(default_factory=list)


class FlagOut(BaseModel):
    clause_id: str
    page: int = 1
    category: str = "ambiguity"  # ambiguity, one-sided obligation, uncapped exposure, missing condition, statutory conflict
    severity: Literal["critical", "high", "medium", "low", "info"] = "medium"
    rationale: str = Field(max_length=300)


class FlagListOutput(BaseModel):
    flags: list[FlagOut] = Field(default_factory=list)


class ProsecutorIssue(BaseModel):
    category: str = "one_sided"
    fragment_quote: str = Field(max_length=150)
    severity: Literal["critical", "high", "medium", "low", "info"] = "high"
    explanation: str = Field(max_length=200)


class ProsecutorOutput(BaseModel):
    issues: list[ProsecutorIssue] = Field(default_factory=list)


class DefenseChange(BaseModel):
    kind: Literal["added", "removed", "modified"]
    fragment: str


class DefenseOutput(BaseModel):
    counter_text: str
    rationale: str
    changes: list[DefenseChange] = Field(default_factory=list)


class AuditResult(BaseModel):
    compliant: bool
    rule_hits: list[str] = Field(default_factory=list)
    explanation: str = "Compliance verification evaluated by deterministic statutory engine."
