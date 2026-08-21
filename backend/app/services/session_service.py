from datetime import UTC, datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import (
    AuthUnauthorizedError,
    SessionExpiredError,
    SessionNotFoundError,
    SessionSaveFailedError,
)
from app.domain.sessions import PrivacyMode, SaveState, SessionStatus
from app.repositories.audit_repo import AuditRepository
from app.repositories.document_repo import DocumentRepository
from app.repositories.models import Session
from app.repositories.session_repo import SessionRepository
from app.storage.client import storage_client


class SessionService:
    def __init__(self, db: AsyncSession, current_user_id: str | None = None) -> None:
        self.db = db
        self.current_user_id = current_user_id
        self.session_repo = SessionRepository(db)
        self.document_repo = DocumentRepository(db)
        self.audit_repo = AuditRepository(db)

    async def create_session(
        self,
        title: str | None = None,
        privacy_mode: str = "standard",
    ) -> Session:
        session = await self.session_repo.create(
            user_id=self.current_user_id,
            title=title,
            privacy_mode=privacy_mode,
            lifetime_seconds=settings.SESSION_TTL_SECONDS,
        )
        await self.audit_repo.log_event(
            event_type="session.created",
            actor_user_id=self.current_user_id,
            resource_type="session",
            resource_id=session.id,
        )
        await self.db.commit()
        return session

    async def get_session(self, session_id: str) -> Session:
        session = await self.session_repo.get_by_id(session_id, user_id=self.current_user_id)
        if not session:
            raise SessionNotFoundError("Session not found.")

        now = datetime.now(UTC)
        if session.status == SessionStatus.PURGED.value:
            raise SessionExpiredError("Session has been purged.")
        session_exp = session.expires_at.replace(tzinfo=UTC) if session.expires_at.tzinfo is None else session.expires_at
        if session.status == SessionStatus.EXPIRED.value or (
            session.status == SessionStatus.ACTIVE.value and session_exp < now
        ):
            raise SessionExpiredError(f"Session '{session.title or session.id}' has expired.")

        # Touch session activity
        await self.session_repo.touch(
            session.id,
            lifetime_seconds=settings.SESSION_TTL_SECONDS,
            inactivity_seconds=settings.SESSION_INACTIVITY_TTL_SECONDS,
        )
        await self.db.commit()
        return session

    async def list_sessions(self, limit: int = 20, cursor: str | None = None) -> tuple[list[Session], str | None]:
        if not self.current_user_id:
            return [], None
        return await self.session_repo.list_for_user(self.current_user_id, limit=limit, cursor=cursor)

    async def save_session(self, session_id: str) -> Session:
        if not self.current_user_id:
            raise AuthUnauthorizedError("Anonymous sessions cannot be permanently saved. Please log in.")

        session = await self.get_session(session_id)
        if session.status == SessionStatus.PURGED.value:
            raise SessionSaveFailedError("Cannot save an already purged session.")

        extended_expiry = datetime.now(UTC) + timedelta(days=90)
        if not session.user_id:
            session.user_id = self.current_user_id
        session.save_state = SaveState.SAVED.value
        session.status = SessionStatus.SAVED.value
        session.expires_at = extended_expiry

        # If strict privacy mode, purge binaries immediately after saving metadata
        if session.privacy_mode == PrivacyMode.STRICT.value:
            docs = await self.document_repo.list_for_session(session.id)
            keys = [f"sessions/{session.id}/documents/{d.id}/original" for d in docs]
            storage_client.delete_session_objects(session.id, keys)

        await self.audit_repo.log_event(
            event_type="session.saved",
            actor_user_id=self.current_user_id,
            resource_type="session",
            resource_id=session.id,
        )
        await self.db.commit()
        return session

    async def unsave_session(self, session_id: str) -> Session:
        session = await self.get_session(session_id)
        session.save_state = SaveState.UNSAVED.value
        session.status = SessionStatus.ACTIVE.value

        # Restore normal inactivity TTL
        now = datetime.now(UTC)
        session.last_activity_at = now
        session.expires_at = now + timedelta(seconds=settings.SESSION_INACTIVITY_TTL_SECONDS)

        await self.audit_repo.log_event(
            event_type="session.unsaved",
            actor_user_id=self.current_user_id,
            resource_type="session",
            resource_id=session.id,
        )
        await self.db.commit()
        return session

    async def claim_session(self, session_id: str) -> Session:
        if not self.current_user_id:
            raise AuthUnauthorizedError("Must be logged in to claim an anonymous session.")

        stmt_session = await self.session_repo.get_by_id(session_id)
        if not stmt_session:
            raise SessionNotFoundError("Session not found.")

        if stmt_session.user_id and stmt_session.user_id != self.current_user_id:
            raise AuthUnauthorizedError("Session is already owned by another user.")

        stmt_session.user_id = self.current_user_id
        await self.audit_repo.log_event(
            event_type="session.claimed",
            actor_user_id=self.current_user_id,
            resource_type="session",
            resource_id=stmt_session.id,
        )
        await self.db.commit()
        return stmt_session

    async def purge_session_data(self, session_id: str) -> None:
        """Purge all object storage binaries and mark session purged."""
        docs = await self.document_repo.list_for_session(session_id)
        keys = []
        for d in docs:
            keys.append(f"sessions/{session_id}/documents/{d.id}/original")
            keys.append(f"sessions/{session_id}/documents/{d.id}/ast.json")
            for page_num in range(1, d.page_count + 1):
                keys.append(f"sessions/{session_id}/documents/{d.id}/pages/{page_num}.png")
                keys.append(f"sessions/{session_id}/documents/{d.id}/ocr/{page_num}.json")

        storage_client.delete_session_objects(session_id, keys)
        await self.session_repo.update_status(session_id, SessionStatus.PURGED.value)
        await self.db.commit()
