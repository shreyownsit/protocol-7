from fastapi import APIRouter, File, UploadFile, status
from pydantic import BaseModel

from app.api.dependencies import CurrentUserId, DbSession
from app.domain.documents import DocumentStatus
from app.repositories.clause_repo import ClauseRepository
from app.repositories.models import Document
from app.schemas.documents import DocumentResponse
from app.services.compliance_service import ComplianceService
from app.services.ingestion_service import IngestionService
from app.services.progress_service import progress_service
from app.services.risk_service import RiskService

router = APIRouter(tags=["upload"])


class IngestUploadResponse(BaseModel):
    session_id: str
    document: DocumentResponse
    is_idempotent: bool = False


@router.post("/sessions/{session_id}/upload", response_model=IngestUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_document_to_session(
    session_id: str,
    db: DbSession,
    user_id: CurrentUserId,
    file: UploadFile = File(...),
):
    content = await file.read()
    filename = file.filename or "contract.pdf"

    ingestion_service = IngestionService(db, current_user_id=user_id)
    doc, is_idempotent = await ingestion_service.ingest_file(
        session_id=session_id,
        filename=filename,
        content=content,
        source="file",
    )

    # Trigger inline processing pipeline if running without Celery
    await _run_synchronous_processing(db, session_id, doc, user_id)

    return {
        "session_id": session_id,
        "document": {
            "id": doc.id,
            "session_id": doc.session_id,
            "name": doc.name,
            "mime_type": doc.mime_type,
            "size_bytes": doc.size_bytes,
            "status": doc.status,
            "page_count": doc.page_count,
            "source": doc.source,
            "created_at": doc.created_at,
        },
        "is_idempotent": is_idempotent,
    }


@router.post("/upload", response_model=IngestUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_document_new_session(
    db: DbSession,
    user_id: CurrentUserId,
    file: UploadFile = File(...),
):
    content = await file.read()
    filename = file.filename or "contract.pdf"

    ingestion_service = IngestionService(db, current_user_id=user_id)
    doc, is_idempotent = await ingestion_service.ingest_file(
        session_id="",
        filename=filename,
        content=content,
        source="file",
        create_session_if_missing=True,
    )

    await _run_synchronous_processing(db, doc.session_id, doc, user_id)

    return {
        "session_id": doc.session_id,
        "document": {
            "id": doc.id,
            "session_id": doc.session_id,
            "name": doc.name,
            "mime_type": doc.mime_type,
            "size_bytes": doc.size_bytes,
            "status": doc.status,
            "page_count": doc.page_count,
            "source": doc.source,
            "created_at": doc.created_at,
        },
        "is_idempotent": is_idempotent,
    }


async def _run_synchronous_processing(db: DbSession, session_id: str, doc: Document, user_id: str | None) -> None:
    """Synchronous pipeline runner for fast interactive analysis and tests."""
    from app.processing.ast_builder import ast_builder
    from app.processing.ocr_engine import ocr_engine
    from app.storage.client import storage_client
    from app.storage.crypto import decrypt_data, unwrap_document_key

    try:
        # 1. Fetch original encrypted blob
        storage_key = f"sessions/{session_id}/documents/{doc.id}/original"
        blob = storage_client.get_object(storage_key)

        # 2. Decrypt
        wrapped_key = storage_client.get_metadata(storage_key).get("x-amz-meta-encrypted-key", "")
        if wrapped_key:
            data_key = unwrap_document_key(wrapped_key, session_id)
            content = decrypt_data(blob, data_key, session_id, "document", doc.id)
        else:
            content = blob

        # 3. OCR
        pages_blocks = ocr_engine.process_document(content, doc.mime_type)
        doc.page_count = len(pages_blocks)

        # 4. AST Builder
        ast_result = ast_builder.build_ast(doc.id, pages_blocks, document_title=doc.name)

        # 5. Persist clauses
        clause_repo = ClauseRepository(db)
        for node in ast_result["nodes"]:
            await clause_repo.create_clause(
                document_id=doc.id,
                node_type=node["node_type"],
                path=node["path"],
                clause_type=node["clause_type"],
                heading=node.get("heading"),
                text=node["text"],
                source_text_raw=node.get("source_text_raw"),
                page_number=node.get("page_number", 1),
                bbox=node.get("bbox"),
                confidence=node.get("confidence", 1.0),
                parent_clause_id=node.get("parent_clause_id"),
            )

        doc.status = DocumentStatus.READY.value
        await db.commit()

        # 6. Run Compliance & Risk
        comp_service = ComplianceService(db, current_user_id=user_id)
        await comp_service.run_compliance_check(session_id)

        risk_service = RiskService(db, current_user_id=user_id)
        await risk_service.evaluate_risk_for_session(session_id)

        # 7. Emit completed event
        await progress_service.emit_event(
            "sessions",
            session_id,
            "pipeline.completed",
            {"session_id": session_id, "document_id": doc.id, "status": "ready"},
        )
    except Exception as exc:
        doc.status = DocumentStatus.FAILED.value
        doc.error_message = str(exc)
        await db.commit()
