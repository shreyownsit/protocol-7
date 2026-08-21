from fastapi import APIRouter

from app.api.dependencies import CurrentUserId, DbSession
from app.schemas.graph import GraphResponse
from app.services.graph_service import GraphService

router = APIRouter(tags=["graph"])


@router.get("/sessions/{session_id}/graph", response_model=GraphResponse)
async def get_session_graph(
    session_id: str,
    db: DbSession,
    user_id: CurrentUserId,
):
    service = GraphService(db, current_user_id=user_id)
    return await service.get_graph(session_id)
