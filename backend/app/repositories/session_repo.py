from datetime import UTC, datetime

from sqlalchemy import desc, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import SessionNotFoundError
from app.domain.sessions import SaveState, SessionStatus
from app.repositories.models import Session
from app.utils.pagination import decode_cursor, encode_cursor


class SessionRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(
        self,
        user_id: str | None,
        title: str | None = None,
        privacy_mode: str = "standard",
        lifetime_seconds: int = 86400,
    ) -> Session:
        now = datetime.now(UTC)
        from app.domain.sessions import SessionDomain
        expires_at = SessionDomain.calculate_expiry(now, now, lifetime_seconds=lifetime_seconds)

        s = Session(
            user_id=user_id,
            title=title,
            privacy_mode=privacy_mode,
            status=SessionStatus.ACTIVE.value,
            save_state=SaveState.UNSAVED.value,
            created_at=now,
            last_activity_at=now,
            expires_at=expires_at,
        )
        self.session.add(s)
        await self.session.flush()
        return s

    async def get_by_id(self, session_id: str, user_id: str | None = None) -> Session | None:
        stmt = select(Session).where(Session.id == session_id)
        if user_id is not None:
            stmt = stmt.where((Session.user_id == user_id) | (Session.user_id.is_(None)))
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_id_strict_owner(self, session_id: str, user_id: str) -> Session:
        stmt = select(Session).where(Session.id == session_id, Session.user_id == user_id)
        result = await self.session.execute(stmt)
        s = result.scalar_one_or_none()
        if not s:
            raise SessionNotFoundError("Session not found or not accessible.")
        return s

    async def list_for_user(
        self,
        user_id: str,
        limit: int = 20,
        cursor: str | None = None,
    ) -> tuple[list[Session], str | None]:
        stmt = select(Session).where(
            Session.user_id == user_id,
            Session.status != SessionStatus.PURGED.value,
        )

        cursor_data = decode_cursor(cursor)
        if cursor_data:
            sort_dt = datetime.fromisoformat(cursor_data["sort_key"])
            stmt = stmt.where(
                (Session.created_at < sort_dt)
                | ((Session.created_at == sort_dt) & (Session.id < cursor_data["id"]))
            )

        stmt = stmt.order_by(desc(Session.created_at), desc(Session.id)).limit(limit + 1)
        result = await self.session.execute(stmt)
        items = list(result.scalars().all())

        next_cursor = None
        if len(items) > limit:
            tail = items[limit - 1]
            items = items[:limit]
            next_cursor = encode_cursor(tail.created_at.isoformat(), tail.id)

        return items, next_cursor

    async def touch(
        self,
        session_id: str,
        lifetime_seconds: int = 86400,
        inactivity_seconds: int = 3600,
    ) -> Session | None:
        now = datetime.now(UTC)
        stmt = select(Session).where(Session.id == session_id)
        res = await self.session.execute(stmt)
        s = res.scalar_one_or_none()
        if not s:
            return None

        if s.status == SessionStatus.ACTIVE.value:
            from app.domain.sessions import SessionDomain
            new_expiry = SessionDomain.calculate_expiry(
                s.created_at, now, lifetime_seconds, inactivity_seconds
            )
            s.last_activity_at = now
            s.expires_at = new_expiry
            await self.session.flush()
        return s

    async def update_status(self, session_id: str, status: str, **kwargs) -> Session:
        stmt = (
            update(Session)
            .where(Session.id == session_id)
            .values(status=status, **kwargs, updated_at=datetime.now(UTC))
            .returning(Session)
        )
        res = await self.session.execute(stmt)
        s = res.scalar_one_or_none()
        if not s:
            raise SessionNotFoundError("Session not found.")
        return s

    async def get_expired_active_sessions(self, now: datetime | None = None) -> list[Session]:
        curr = now or datetime.now(UTC)
        stmt = select(Session).where(
            Session.status == SessionStatus.ACTIVE.value,
            Session.expires_at < curr,
        )
        res = await self.session.execute(stmt)
        return list(res.scalars().all())
