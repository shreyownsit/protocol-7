from fastapi import APIRouter

from app.api.dependencies import CurrentUserId, DbSession
from app.repositories.clause_repo import ClauseRepository
from app.schemas.clauses import ClauseListResponse
from app.schemas.documents import (
    ASTResponse,
    DocumentListResponse,
    DocumentResponse,
    PageSignedUrlResponse,
)
from app.services.document_service import DocumentService

router = APIRouter(tags=["documents"])


@router.get("/sessions/{session_id}/documents", response_model=DocumentListResponse)
async def list_documents(
    session_id: str,
    db: DbSession,
    user_id: CurrentUserId,
):
    service = DocumentService(db, current_user_id=user_id)
    docs = await service.list_documents(session_id)
    return {
        "documents": [
            {
                "id": d.id,
                "session_id": d.session_id,
                "name": d.name,
                "mime_type": d.mime_type,
                "size_bytes": d.size_bytes,
                "status": d.status,
                "page_count": d.page_count,
                "source": d.source,
                "created_at": d.created_at,
            }
            for d in docs
        ]
    }


@router.get("/sessions/{session_id}/documents/{document_id}", response_model=DocumentResponse)
async def get_document(
    session_id: str,
    document_id: str,
    db: DbSession,
    user_id: CurrentUserId,
):
    service = DocumentService(db, current_user_id=user_id)
    d = await service.get_document(session_id, document_id)
    return {
        "id": d.id,
        "session_id": d.session_id,
        "name": d.name,
        "mime_type": d.mime_type,
        "size_bytes": d.size_bytes,
        "status": d.status,
        "page_count": d.page_count,
        "source": d.source,
        "created_at": d.created_at,
    }


@router.get("/sessions/{session_id}/documents/{document_id}/ast", response_model=ASTResponse)
async def get_document_ast(
    session_id: str,
    document_id: str,
    db: DbSession,
    user_id: CurrentUserId,
):
    service = DocumentService(db, current_user_id=user_id)
    return await service.get_ast(session_id, document_id)


@router.get(
    "/sessions/{session_id}/documents/{document_id}/pages/{page_number}/url",
    response_model=PageSignedUrlResponse,
)
async def get_page_signed_url(
    session_id: str,
    document_id: str,
    page_number: int,
    db: DbSession,
    user_id: CurrentUserId,
):
    service = DocumentService(db, current_user_id=user_id)
    return await service.get_page_signed_url(session_id, document_id, page_number)


@router.get("/sessions/{session_id}/clauses", response_model=ClauseListResponse)
async def list_session_clauses(
    session_id: str,
    db: DbSession,
    user_id: CurrentUserId,
):
    service = DocumentService(db, current_user_id=user_id)
    docs = await service.list_documents(session_id)
    clause_repo = ClauseRepository(db)

    all_clauses = []
    for d in docs:
        clauses = await clause_repo.list_for_document(d.id)
        for c in clauses:
            all_clauses.append({
                "id": c.id,
                "document_id": c.document_id,
                "node_type": c.node_type,
                "path": c.path,
                "parent_id": c.parent_clause_id,
                "heading": c.heading,
                "text": c.text,
                "clause_type": c.clause_type,
                "page_number": c.page_number,
                "bbox": c.bbox,
                "confidence": c.confidence,
            })

    return {"clauses": all_clauses}
