from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import DocumentNotFoundError
from app.domain.documents import DocumentStatus, PageOCRStatus
from app.repositories.models import Document, DocumentPage


class DocumentRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(
        self,
        session_id: str,
        user_id: str | None,
        name: str,
        mime_type: str,
        size_bytes: int,
        content_hash: str,
        page_count: int = 0,
        source: str = "file",
    ) -> Document:
        doc = Document(
            session_id=session_id,
            user_id=user_id,
            name=name,
            mime_type=mime_type,
            size_bytes=size_bytes,
            content_hash=content_hash,
            page_count=page_count,
            status=DocumentStatus.UPLOADING.value,
            source=source,
            created_at=datetime.now(UTC),
        )
        self.session.add(doc)
        await self.session.flush()
        return doc

    async def get_by_id(self, document_id: str, session_id: str | None = None) -> Document | None:
        stmt = select(Document).where(Document.id == document_id)
        if session_id:
            stmt = stmt.where(Document.session_id == session_id)
        res = await self.session.execute(stmt)
        return res.scalar_one_or_none()

    async def get_by_content_hash(self, session_id: str, content_hash: str) -> Document | None:
        stmt = select(Document).where(
            Document.session_id == session_id,
            Document.content_hash == content_hash,
        )
        res = await self.session.execute(stmt)
        return res.scalar_one_or_none()

    async def list_for_session(self, session_id: str) -> list[Document]:
        stmt = select(Document).where(Document.session_id == session_id).order_by(Document.created_at)
        res = await self.session.execute(stmt)
        return list(res.scalars().all())

    async def update_status(
        self,
        document_id: str,
        status: str,
        page_count: int | None = None,
        error_code: str | None = None,
    ) -> Document:
        values: dict[str, Any] = {"status": status}
        if page_count is not None:
            values["page_count"] = page_count
        if error_code is not None:
            values["processing_error_code"] = error_code

        stmt = update(Document).where(Document.id == document_id).values(**values).returning(Document)
        res = await self.session.execute(stmt)
        doc = res.scalar_one_or_none()
        if not doc:
            raise DocumentNotFoundError("Document not found.")
        return doc

    async def add_pages(self, document_id: str, pages_data: list[dict[str, Any]]) -> list[DocumentPage]:
        pages = []
        for p in pages_data:
            page = DocumentPage(
                document_id=document_id,
                page_number=p["page_number"],
                width_px=p.get("width_px", 1700),
                height_px=p.get("height_px", 2200),
                ocr_status=p.get("ocr_status", PageOCRStatus.READY.value),
                created_at=datetime.now(UTC),
            )
            self.session.add(page)
            pages.append(page)
        await self.session.flush()
        return pages

    async def get_pages(self, document_id: str) -> list[DocumentPage]:
        stmt = select(DocumentPage).where(DocumentPage.document_id == document_id).order_by(DocumentPage.page_number)
        res = await self.session.execute(stmt)
        return list(res.scalars().all())
