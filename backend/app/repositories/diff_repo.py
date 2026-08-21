from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.models import DiffResult


class DiffRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create_or_get(
        self,
        session_id: str,
        document_a_id: str,
        document_b_id: str,
        summary: dict[str, Any],
        changes: list[dict[str, Any]],
        status: str = "ready",
    ) -> DiffResult:
        stmt = select(DiffResult).where(
            DiffResult.document_a_id == document_a_id,
            DiffResult.document_b_id == document_b_id,
        )
        res = await self.session.execute(stmt)
        existing = res.scalar_one_or_none()
        if existing:
            return existing

        diff_res = DiffResult(
            session_id=session_id,
            document_a_id=document_a_id,
            document_b_id=document_b_id,
            status=status,
            summary=summary,
            changes=changes,
            created_at=datetime.now(UTC),
        )
        self.session.add(diff_res)
        await self.session.flush()
        return diff_res

    async def get_by_id(self, diff_id: str) -> DiffResult | None:
        stmt = select(DiffResult).where(DiffResult.id == diff_id)
        res = await self.session.execute(stmt)
        return res.scalar_one_or_none()

    async def get_by_docs(self, doc_a: str, doc_b: str) -> DiffResult | None:
        stmt = select(DiffResult).where(
            DiffResult.document_a_id == doc_a,
            DiffResult.document_b_id == doc_b,
        )
        res = await self.session.execute(stmt)
        return res.scalar_one_or_none()
