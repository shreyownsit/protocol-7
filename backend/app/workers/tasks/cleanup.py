import asyncio

from app.domain.sessions import SessionStatus
from app.repositories.base import async_session_factory
from app.repositories.session_repo import SessionRepository
from app.services.session_service import SessionService
from app.workers.celery_app import celery_app


@celery_app.task(name="app.workers.tasks.cleanup.cleanup_expired_sessions_task")
def cleanup_expired_sessions_task():
    """Periodic Celery Beat task to purge expired sessions."""
    return asyncio.run(_cleanup_sessions())


async def _cleanup_sessions():
    async with async_session_factory() as db:
        session_repo = SessionRepository(db)
        session_service = SessionService(db)

        expired_list = await session_repo.get_expired_sessions()
        count = 0
        for s in expired_list:
            if s.status != SessionStatus.PURGED.value:
                await session_service.purge_session_data(s.id)
                count += 1

        return {"status": "success", "purged_count": count}
