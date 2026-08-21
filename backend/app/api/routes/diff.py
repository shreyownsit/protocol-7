from fastapi import APIRouter
from pydantic import BaseModel

from app.api.dependencies import CurrentUserId, DbSession
from app.services.diff_service import DiffService

router = APIRouter(tags=["diff"])


class DiffRequest(BaseModel):
    document_a_id: str
    document_b_id: str


class DiffResponse(BaseModel):
    diff_id: str
    document_a_id: str
    document_b_id: str
    status: str
    summary: dict
    changes: list[dict]


@router.post("/sessions/{session_id}/diff", response_model=DiffResponse)
async def compute_diff(
    session_id: str,
    req: DiffRequest,
    db: DbSession,
    user_id: CurrentUserId,
):
    service = DiffService(db, current_user_id=user_id)
    return await service.compute_diff(
        session_id=session_id,
        document_a_id=req.document_a_id,
        document_b_id=req.document_b_id,
    )


@router.get("/diff/{diff_id}", response_model=DiffResponse)
async def get_diff(
    diff_id: str,
    db: DbSession,
    user_id: CurrentUserId,
):
    service = DiffService(db, current_user_id=user_id)
    return await service.get_diff(diff_id)
