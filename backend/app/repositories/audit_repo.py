from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.models import AuditEvent


class AuditRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def log_event(
        self,
        event_type: str,
        actor_user_id: str | None = None,
        resource_type: str | None = None,
        resource_id: str | None = None,
        metadata_json: dict[str, Any] | None = None,
        ip_address: str | None = None,
    ) -> AuditEvent:
        event = AuditEvent(
            event_type=event_type,
            actor_user_id=actor_user_id,
            resource_type=resource_type,
            resource_id=resource_id,
            metadata_json=metadata_json,
            ip_address=ip_address,
            created_at=datetime.now(UTC),
        )
        self.session.add(event)
        await self.session.flush()
        return event

    async def list_events_for_actor(self, actor_user_id: str, limit: int = 50) -> list[AuditEvent]:
        stmt = (
            select(AuditEvent)
            .where(AuditEvent.actor_user_id == actor_user_id)
            .order_by(AuditEvent.created_at.desc())
            .limit(limit)
        )
        res = await self.session.execute(stmt)
        return list(res.scalars().all())
