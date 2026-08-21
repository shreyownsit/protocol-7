from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.models import Finding


class FindingRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(
        self,
        session_id: str,
        finding_type: str,
        severity: str,
        confidence: float,
        title: str,
        summary: str,
        clause_ids: list[str],
        evidence: dict[str, Any] | list[Any],
        statute_reference: str | None = None,
        rule_id: str | None = None,
        financial_exposure: dict[str, Any] | None = None,
    ) -> Finding:
        finding = Finding(
            session_id=session_id,
            finding_type=finding_type,
            severity=severity,
            confidence=confidence,
            title=title,
            summary=summary,
            statute_reference=statute_reference,
            rule_id=rule_id,
            clause_ids=clause_ids,
            evidence=evidence,
            financial_exposure=financial_exposure,
            created_at=datetime.now(UTC),
        )
        self.session.add(finding)
        await self.session.flush()
        return finding

    async def list_for_session(
        self, session_id: str, finding_type: str | None = None
    ) -> list[Finding]:
        stmt = select(Finding).where(Finding.session_id == session_id)
        if finding_type:
            stmt = stmt.where(Finding.finding_type == finding_type)
        stmt = stmt.order_by(Finding.created_at)
        res = await self.session.execute(stmt)
        return list(res.scalars().all())

    async def get_by_id(self, finding_id: str, session_id: str | None = None) -> Finding | None:
        stmt = select(Finding).where(Finding.id == finding_id)
        if session_id:
            stmt = stmt.where(Finding.session_id == session_id)
        res = await self.session.execute(stmt)
        return res.scalar_one_or_none()
