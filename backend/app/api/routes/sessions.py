from fastapi import APIRouter, Query, status

from app.api.dependencies import CurrentUserId, DbSession, RequiredUserId
from app.schemas.sessions import (
    ClaimSessionRequest,
    CreateSessionRequest,
    SessionListResponse,
    SessionResponse,
)
from app.services.session_service import SessionService

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.post("", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
async def create_session(
    req: CreateSessionRequest,
    user_id: CurrentUserId,
    db: DbSession,
):
    service = SessionService(db, current_user_id=user_id)
    session = await service.create_session(title=req.title, privacy_mode=req.privacy_mode)
    return session


@router.get("", response_model=SessionListResponse)
async def list_sessions(
    user_id: RequiredUserId,
    db: DbSession,
    limit: int = Query(default=20, ge=1, le=100),
    cursor: str | None = Query(default=None),
):
    service = SessionService(db, current_user_id=user_id)
    sessions, next_cursor = await service.list_sessions(limit=limit, cursor=cursor)
    return {
        "sessions": sessions,
        "next_cursor": next_cursor,
    }


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(
    session_id: str,
    user_id: CurrentUserId,
    db: DbSession,
):
    service = SessionService(db, current_user_id=user_id)
    session = await service.get_session(session_id)
    return session


@router.post("/{session_id}/save", response_model=SessionResponse)
async def save_session(
    session_id: str,
    user_id: RequiredUserId,
    db: DbSession,
):
    service = SessionService(db, current_user_id=user_id)
    session = await service.save_session(session_id)
    return session


@router.post("/{session_id}/unsave", response_model=SessionResponse)
async def unsave_session(
    session_id: str,
    user_id: RequiredUserId,
    db: DbSession,
):
    service = SessionService(db, current_user_id=user_id)
    session = await service.unsave_session(session_id)
    return session


@router.post("/claim", response_model=SessionResponse)
async def claim_session(
    req: ClaimSessionRequest,
    user_id: RequiredUserId,
    db: DbSession,
):
    service = SessionService(db, current_user_id=user_id)
    session = await service.claim_session(req.session_id)
    return session
