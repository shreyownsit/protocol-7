from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import DocumentNotFoundError, SessionNotFoundError, ValidationError
from app.processing.diff_engine import diff_engine
from app.repositories.clause_repo import ClauseRepository
from app.repositories.diff_repo import DiffRepository
from app.repositories.document_repo import DocumentRepository
from app.repositories.session_repo import SessionRepository


class DiffService:
    def __init__(self, db: AsyncSession, current_user_id: str | None = None) -> None:
        self.db = db
        self.current_user_id = current_user_id
        self.session_repo = SessionRepository(db)
        self.document_repo = DocumentRepository(db)
        self.clause_repo = ClauseRepository(db)
        self.diff_repo = DiffRepository(db)

    async def compute_diff(self, session_id: str, document_a_id: str, document_b_id: str) -> dict:
        if document_a_id == document_b_id:
            raise ValidationError("Cannot compare a document against itself.")

        session = await self.session_repo.get_by_id(session_id, user_id=self.current_user_id)
        if not session:
            raise SessionNotFoundError("Session not found.")

        doc_a = await self.document_repo.get_by_id(document_a_id, session_id=session_id)
        doc_b = await self.document_repo.get_by_id(document_b_id, session_id=session_id)
        if not doc_a or not doc_b:
            raise DocumentNotFoundError("One or both comparison documents not found.")

        existing = await self.diff_repo.get_by_docs(document_a_id, document_b_id)
        if existing:
            return {
                "diff_id": existing.id,
                "document_a_id": existing.document_a_id,
                "document_b_id": existing.document_b_id,
                "status": existing.status,
                "summary": existing.summary,
                "changes": existing.changes,
            }

        clauses_a = await self.clause_repo.list_for_document(document_a_id)
        clauses_b = await self.clause_repo.list_for_document(document_b_id)

        ca_dicts = [
            {"id": c.id, "heading": c.heading, "text": c.text, "path": c.path, "page_number": c.page_number, "bbox": c.bbox}
            for c in clauses_a
        ]
        cb_dicts = [
            {"id": c.id, "heading": c.heading, "text": c.text, "path": c.path, "page_number": c.page_number, "bbox": c.bbox}
            for c in clauses_b
        ]

        result = diff_engine.compare_documents(
            doc_a_id=document_a_id,
            doc_b_id=document_b_id,
            clauses_a=ca_dicts,
            clauses_b=cb_dicts,
            session_id=session_id,
        )

        saved = await self.diff_repo.create_or_get(
            session_id=session_id,
            document_a_id=document_a_id,
            document_b_id=document_b_id,
            summary=result["summary"],
            changes=result["changes"],
            status="ready",
        )
        await self.db.commit()

        result["diff_id"] = saved.id
        return result

    async def get_diff(self, diff_id: str) -> dict:
        diff_record = await self.diff_repo.get_by_id(diff_id)
        if not diff_record:
            raise ValidationError("Diff record not found.")
        return {
            "diff_id": diff_record.id,
            "document_a_id": diff_record.document_a_id,
            "document_b_id": diff_record.document_b_id,
            "status": diff_record.status,
            "summary": diff_record.summary,
            "changes": diff_record.changes,
        }
