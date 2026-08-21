from fastapi import APIRouter, status

from app.api.dependencies import CurrentUserId, DbSession
from app.schemas.simulation import (
    CreateSimulationRequest,
    ScenarioResultResponse,
    SimulationResponse,
    VerifyScenarioRequest,
)
from app.services.simulation_service import SimulationService

router = APIRouter(tags=["simulation"])


@router.post("/sessions/{session_id}/simulation", response_model=SimulationResponse, status_code=status.HTTP_201_CREATED)
async def create_simulation(
    session_id: str,
    req: CreateSimulationRequest,
    db: DbSession,
    user_id: CurrentUserId,
):
    service = SimulationService(db, current_user_id=user_id)
    sim = await service.create_simulation_from_session(
        session_id=session_id,
        title=req.title,
        variables=req.variables,
        formulas=req.formulas,
    )
    return {
        "id": sim.id,
        "session_id": sim.session_id,
        "title": sim.title,
        "variables": sim.variables,
        "formulas": sim.formulas,
        "status": sim.status,
    }


@router.get("/simulation/{simulation_id}", response_model=SimulationResponse)
async def get_simulation(
    simulation_id: str,
    db: DbSession,
    user_id: CurrentUserId,
):
    service = SimulationService(db, current_user_id=user_id)
    return await service.get_simulation(simulation_id)


@router.post("/simulation/{simulation_id}/verify", response_model=ScenarioResultResponse)
async def verify_scenario(
    simulation_id: str,
    req: VerifyScenarioRequest,
    db: DbSession,
    user_id: CurrentUserId,
):
    service = SimulationService(db, current_user_id=user_id)
    return await service.verify_scenario(simulation_id, req.scenario)
