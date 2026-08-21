from fastapi import APIRouter

from app.api.dependencies import CurrentUserId, DbSession
from app.schemas.risk import RiskModelResponse
from app.services.risk_service import RiskService

router = APIRouter(tags=["risk"])


@router.get("/sessions/{session_id}/risk", response_model=RiskModelResponse)
async def get_session_risk_model(
    session_id: str,
    db: DbSession,
    user_id: CurrentUserId,
):
    service = RiskService(db, current_user_id=user_id)
    return await service.get_risk_model(session_id)
