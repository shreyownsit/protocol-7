from fastapi import APIRouter, status

from app.api.dependencies import CurrentUserId, DbSession
from app.schemas.negotiation import (
    CounterClauseResponse,
    NegotiationResponse,
    StartNegotiationRequest,
)
from app.services.negotiation_service import NegotiationService

router = APIRouter(tags=["negotiate"])


@router.post("/sessions/{session_id}/negotiate", response_model=NegotiationResponse, status_code=status.HTTP_201_CREATED)
async def start_negotiation(
    session_id: str,
    req: StartNegotiationRequest,
    db: DbSession,
    user_id: CurrentUserId,
):
    service = NegotiationService(db, current_user_id=user_id)
    neg = await service.start_negotiation(
        session_id=session_id,
        clause_id=req.clause_id,
        context=req.context,
    )
    return await service.get_negotiation(neg.id)


@router.get("/negotiate/{negotiation_id}", response_model=NegotiationResponse)
async def get_negotiation(
    negotiation_id: str,
    db: DbSession,
    user_id: CurrentUserId,
):
    service = NegotiationService(db, current_user_id=user_id)
    return await service.get_negotiation(negotiation_id)


@router.get("/negotiate/{negotiation_id}/counter", response_model=CounterClauseResponse)
async def get_counter_clause(
    negotiation_id: str,
    db: DbSession,
    user_id: CurrentUserId,
):
    service = NegotiationService(db, current_user_id=user_id)
    return await service.get_counter_clause(negotiation_id)
