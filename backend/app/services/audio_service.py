from datetime import UTC, datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import (
    AudioLanguageUnsupportedError,
    SessionNotFoundError,
)
from app.domain.audio import SUPPORTED_AUDIO_LANGUAGES, AudioStatus
from app.repositories.audio_repo import AudioRepository
from app.repositories.models import AudioRequest
from app.repositories.session_repo import SessionRepository
from app.storage.client import storage_client


class AudioService:
    def __init__(self, db: AsyncSession, current_user_id: str | None = None) -> None:
        self.db = db
        self.current_user_id = current_user_id
        self.session_repo = SessionRepository(db)
        self.audio_repo = AudioRepository(db)

    async def request_narration(
        self,
        session_id: str,
        language_code: str,
        voice: str | None = None,
    ) -> AudioRequest:
        lang = language_code.lower().strip()
        if lang not in SUPPORTED_AUDIO_LANGUAGES:
            raise AudioLanguageUnsupportedError(
                f"Language '{lang}' is not supported. Supported: {', '.join(sorted(SUPPORTED_AUDIO_LANGUAGES))}"
            )

        session = await self.session_repo.get_by_id(session_id, user_id=self.current_user_id)
        if not session:
            raise SessionNotFoundError("Session not found.")

        req = await self.audio_repo.create(
            session_id=session.id,
            language_code=lang,
            voice=voice,
        )

        # Produce mock synthesis audio artifact
        storage_key = f"sessions/{session.id}/audio/{req.id}.mp3"
        mock_mp3_data = b"ID3\x03\x00\x00\x00\x00\x00\x00" + b"\x00" * 1024
        storage_client.put_object(storage_key, mock_mp3_data)

        expires_at = datetime.now(UTC) + timedelta(seconds=settings.AUDIO_ARTIFACT_TTL_SECONDS)
        await self.audio_repo.update_status(
            req.id,
            status=AudioStatus.READY.value,
            storage_key=storage_key,
            duration_seconds=42,
            expires_at=expires_at,
        )
        await self.db.commit()
        return req

    async def get_narration(self, audio_request_id: str) -> dict:
        req = await self.audio_repo.get_by_id(audio_request_id)
        if not req:
            raise AudioLanguageUnsupportedError("Audio request not found.")

        url = ""
        if req.storage_key:
            url = storage_client.generate_signed_url(req.storage_key, expires_in=300)

        return {
            "id": req.id,
            "status": req.status,
            "url": url,
            "duration_seconds": req.duration_seconds or 42,
            "expires_at": 300,
        }
