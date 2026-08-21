from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import Any


class SimulationStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    ARCHIVED = "archived"


@dataclass
class VariableCap:
    value: float
    basis: str = "per occurrence"


@dataclass
class VariableDefinition:
    label: str
    value: float
    unit: str
    min: float
    max: float
    step: float
    cap: dict[str, Any] | None = None
    source_clause_id: str | None = None


@dataclass
class FormulaDefinition:
    expr: str
    label: str
    unit: str
    depends: list[str]


@dataclass
class SimulationDomain:
    id: str
    session_id: str
    title: str
    variables: dict[str, dict[str, Any]]
    formulas: dict[str, dict[str, Any]]
    status: SimulationStatus = SimulationStatus.ACTIVE
    created_at: datetime | None = None


@dataclass
class SimulationRunDomain:
    id: str
    simulation_id: str
    scenario: dict[str, float]
    results: dict[str, Any] | None = None
    client_evaluated: bool = False
    computed_at: datetime | None = None
