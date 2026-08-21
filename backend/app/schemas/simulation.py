from typing import Any

from pydantic import BaseModel


class CreateSimulationRequest(BaseModel):
    title: str | None = None
    variables: dict[str, Any] | None = None
    formulas: dict[str, Any] | None = None


class VerifyScenarioRequest(BaseModel):
    scenario: dict[str, float]


class SimulationResponse(BaseModel):
    id: str
    session_id: str
    title: str
    variables: dict[str, Any]
    formulas: dict[str, Any]
    status: str
    last_run: dict | None = None


class ScenarioResultResponse(BaseModel):
    formula_results: dict[str, Any]
    evaluated_at: str
