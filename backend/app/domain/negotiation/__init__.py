from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import Any


class NegotiationStatus(str, Enum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class NegotiationStage(str, Enum):
    PROSECUTOR = "prosecutor"
    DEFENSE = "defense"
    AUDITOR = "auditor"


class NegotiationStepType(str, Enum):
    STARTED = "started"
    COMPLETED = "completed"
    RETRY = "retry"
    FAILED = "failed"


class CounterClauseStatus(str, Enum):
    DRAFT = "draft"
    APPROVED = "approved"
    REJECTED = "rejected"


@dataclass
class NegotiationStepDomain:
    id: str
    negotiation_id: str
    agent: NegotiationStage
    step_type: NegotiationStepType
    payload: dict[str, Any]
    event_id: str
    created_at: datetime | None = None


@dataclass
class CounterClauseDomain:
    id: str
    negotiation_id: str
    session_id: str
    original_clause_id: str
    counter_text: str
    rationale: str
    compliance_check_result: dict[str, Any] | None
    status: CounterClauseStatus = CounterClauseStatus.DRAFT
    created_at: datetime | None = None


@dataclass
class NegotiationDomain:
    id: str
    session_id: str
    clause_id: str
    status: NegotiationStatus
    current_stage: NegotiationStage
    retry_count: int
    counter_clause_id: str | None
    created_at: datetime | None = None
    updated_at: datetime | None = None
