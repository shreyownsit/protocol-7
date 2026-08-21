from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.audio import AudioStatus
from app.repositories.models import AudioRequest


class AudioRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(
        self,
        session_id: str,
        language_code: str,
        voice: str | None = None,
        summary_id: str | None = None,
    ) -> AudioRequest:
        req = AudioRequest(
            session_id=session_id,
            language_code=language_code,
            voice=voice,
            summary_id=summary_id,
            status=AudioStatus.QUEUED.value,
            created_at=datetime.now(UTC),
        )
        self.session.add(req)
        await self.session.flush()
        return req

    async def get_by_id(self, audio_request_id: str) -> AudioRequest | None:
        stmt = select(AudioRequest).where(AudioRequest.id == audio_request_id)
        res = await self.session.execute(stmt)
        return res.scalar_one_or_none()

    async def update_status(
        self,
        audio_request_id: str,
        status: str,
        storage_key: str | None = None,
        duration_seconds: int | None = None,
        expires_at: datetime | None = None,
    ) -> AudioRequest | None:
        values: dict[str, Any] = {"status": status}
        if storage_key is not None:
            values["storage_key"] = storage_key
        if duration_seconds is not None:
            values["duration_seconds"] = duration_seconds
        if expires_at is not None:
            values["expires_at"] = expires_at

        stmt = (
            update(AudioRequest)
            .where(AudioRequest.id == audio_request_id)
            .values(**values)
            .returning(AudioRequest)
        )
        res = await self.session.execute(stmt)
        return res.scalar_one_or_none()
