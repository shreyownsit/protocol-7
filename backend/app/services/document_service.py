from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import (
    DocumentNotFoundError,
    SessionNotFoundError,
    TypedAppError,
)
from app.domain.documents import DocumentStatus
from app.repositories.clause_repo import ClauseRepository
from app.repositories.document_repo import DocumentRepository
from app.repositories.models import Document
from app.repositories.session_repo import SessionRepository
from app.storage.client import storage_client


class DocumentProcessingError(TypedAppError):
    code = "DOCUMENT_PROCESSING"
    status_code = 409
    message = "Document analysis is still in progress."


class DocumentService:
    def __init__(self, db: AsyncSession, current_user_id: str | None = None) -> None:
        self.db = db
        self.current_user_id = current_user_id
        self.session_repo = SessionRepository(db)
        self.document_repo = DocumentRepository(db)
        self.clause_repo = ClauseRepository(db)

    async def list_documents(self, session_id: str) -> list[Document]:
        session = await self.session_repo.get_by_id(session_id, user_id=self.current_user_id)
        if not session:
            raise SessionNotFoundError("Session not found.")
        return await self.document_repo.list_for_session(session_id)

    async def get_document(self, session_id: str, document_id: str) -> Document:
        session = await self.session_repo.get_by_id(session_id, user_id=self.current_user_id)
        if not session:
            raise SessionNotFoundError("Session not found.")

        doc = await self.document_repo.get_by_id(document_id, session_id=session_id)
        if not doc:
            raise DocumentNotFoundError("Document not found.")
        return doc

    async def get_ast(self, session_id: str, document_id: str) -> dict:
        doc = await self.get_document(session_id, document_id)
        if doc.status in (DocumentStatus.UPLOADING.value, DocumentStatus.PROCESSING.value):
            raise DocumentProcessingError("Document analysis is still in progress.")

        clauses = await self.clause_repo.list_for_document(document_id)
        nodes = []
        for c in clauses:
            nodes.append({
                "id": c.id,
                "node_type": c.node_type,
                "path": c.path,
                "parent_id": c.parent_clause_id,
                "heading": c.heading,
                "text": c.text,
                "source_text_raw": c.source_text_raw,
                "page_number": c.page_number,
                "bbox": c.bbox,
                "clause_type": c.clause_type,
                "confidence": c.confidence,
            })

        return {
            "document": {
                "id": doc.id,
                "title": doc.name,
                "page_count": doc.page_count,
            },
            "nodes": nodes,
            "definitions": [],
            "entities": [],
        }

    async def get_page_signed_url(self, session_id: str, document_id: str, page_number: int) -> dict:
        await self.get_document(session_id, document_id)
        key = f"sessions/{session_id}/documents/{document_id}/pages/{page_number}.png"
        url = storage_client.generate_signed_url(key, expires_in=300)
        return {"url": url, "expires_at": 300}
