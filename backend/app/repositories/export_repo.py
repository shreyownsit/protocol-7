from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.exports import ExportStatus
from app.repositories.models import Export


class ExportRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(
        self,
        session_id: str,
        format: str,
        contents: dict[str, Any],
    ) -> Export:
        exp = Export(
            session_id=session_id,
            format=format,
            contents=contents,
            status=ExportStatus.QUEUED.value,
            created_at=datetime.now(UTC),
        )
        self.session.add(exp)
        await self.session.flush()
        return exp

    async def get_by_id(self, export_id: str) -> Export | None:
        stmt = select(Export).where(Export.id == export_id)
        res = await self.session.execute(stmt)
        return res.scalar_one_or_none()

    async def update_status(
        self,
        export_id: str,
        status: str,
        storage_key: str | None = None,
        url_expires_at: datetime | None = None,
    ) -> Export | None:
        values: dict[str, Any] = {"status": status}
        if storage_key is not None:
            values["storage_key"] = storage_key
        if url_expires_at is not None:
            values["url_expires_at"] = url_expires_at

        stmt = update(Export).where(Export.id == export_id).values(**values).returning(Export)
        res = await self.session.execute(stmt)
        return res.scalar_one_or_none()
