from fastapi import APIRouter, status

from app.api.dependencies import CurrentUserId, DbSession
from app.schemas.audio import AudioNarrationRequest, AudioResponse
from app.services.audio_service import AudioService

router = APIRouter(tags=["audio"])


@router.post("/sessions/{session_id}/audio", response_model=AudioResponse, status_code=status.HTTP_202_ACCEPTED)
async def request_audio_narration(
    session_id: str,
    req: AudioNarrationRequest,
    db: DbSession,
    user_id: CurrentUserId,
):
    service = AudioService(db, current_user_id=user_id)
    audio_req = await service.request_narration(
        session_id=session_id,
        language_code=req.language_code,
        voice=req.voice,
    )
    return await service.get_narration(audio_req.id)


@router.get("/audio/{audio_request_id}", response_model=AudioResponse)
async def get_audio_narration(
    audio_request_id: str,
    db: DbSession,
    user_id: CurrentUserId,
):
    service = AudioService(db, current_user_id=user_id)
    return await service.get_narration(audio_request_id)
