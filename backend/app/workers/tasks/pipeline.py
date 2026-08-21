import asyncio

from app.repositories.base import async_session_factory
from app.repositories.document_repo import DocumentRepository
from app.workers.celery_app import celery_app


@celery_app.task(name="app.workers.tasks.pipeline.process_document_pipeline_task", bind=True)
def process_document_pipeline_task(self, session_id: str, document_id: str):
    """Orchestrates end-to-end background analysis pipeline."""
    return asyncio.run(_run_pipeline(session_id, document_id))


async def _run_pipeline(session_id: str, document_id: str):
    async with async_session_factory() as db:
        doc_repo = DocumentRepository(db)
        doc = await doc_repo.get_by_id(document_id, session_id=session_id)
        if not doc:
            return {"status": "error", "message": "Document not found"}

        from app.api.routes.upload import _run_synchronous_processing
        await _run_synchronous_processing(db, session_id, doc, user_id=doc.user_id)
        return {"status": "success", "session_id": session_id, "document_id": document_id}
