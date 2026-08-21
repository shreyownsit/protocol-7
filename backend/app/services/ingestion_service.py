import hashlib

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import (
    DocumentMaliciousError,
    DocumentTooLargeError,
    DocumentUnsupportedError,
    SessionNotActiveError,
    SessionNotFoundError,
)
from app.domain.documents import DocumentStatus
from app.domain.sessions import SessionStatus
from app.repositories.audit_repo import AuditRepository
from app.repositories.document_repo import DocumentRepository
from app.repositories.models import Document
from app.repositories.session_repo import SessionRepository
from app.services.progress_service import progress_service
from app.storage.client import storage_client
from app.storage.crypto import (
    encrypt_data,
    generate_document_key,
    wrap_document_key,
)
from app.utils.file_magic import ALLOWED_MIME_TYPES, scan_malware_heuristic, sniff_mime_type


class IngestionService:
    def __init__(self, db: AsyncSession, current_user_id: str | None = None) -> None:
        self.db = db
        self.current_user_id = current_user_id
        self.session_repo = SessionRepository(db)
        self.document_repo = DocumentRepository(db)
        self.audit_repo = AuditRepository(db)

    async def ingest_file(
        self,
        session_id: str,
        filename: str,
        content: bytes,
        source: str = "file",
        create_session_if_missing: bool = False,
    ) -> tuple[Document, bool]:
        """Ingests, validates, encrypts, and stores a contract document.

        Returns: (Document, is_existing_idempotent).
        """
        # Check size cap
        if len(content) > settings.UPLOAD_MAX_SIZE_BYTES:
            raise DocumentTooLargeError(
                f"Document size ({len(content)} bytes) exceeds maximum limit of {settings.UPLOAD_MAX_SIZE_BYTES} bytes."
            )

        # Validate MIME and magic bytes
        sniffed_mime = sniff_mime_type(content)
        if not sniffed_mime or sniffed_mime not in ALLOWED_MIME_TYPES:
            raise DocumentUnsupportedError(
                f"File type '{sniffed_mime or 'unknown'}' is unsupported. Supported formats: PDF, DOCX, JPEG, PNG."
            )

        # Malware / suspicious heuristic check
        if scan_malware_heuristic(content, sniffed_mime):
            await self.audit_repo.log_event(
                event_type="document.malicious_detected",
                actor_user_id=self.current_user_id,
                metadata_json={"filename_hash": hashlib.sha256(filename.encode()).hexdigest()},
            )
            await self.db.commit()
            raise DocumentMaliciousError("Document failed security heuristics analysis.")

        # Resolve or validate session
        session = await self.session_repo.get_by_id(session_id, user_id=self.current_user_id)
        if not session:
            if create_session_if_missing:
                session = await self.session_repo.create(
                    user_id=self.current_user_id,
                    title=filename,
                    lifetime_seconds=settings.SESSION_TTL_SECONDS,
                )
            else:
                raise SessionNotFoundError("Session not found.")

        if session.status != SessionStatus.ACTIVE.value:
            raise SessionNotActiveError(f"Cannot upload to session in '{session.status}' status.")

        # Compute content hash for idempotency
        content_hash = hashlib.sha256(content).hexdigest()
        existing = await self.document_repo.get_by_content_hash(session.id, content_hash)
        if existing and existing.status in (DocumentStatus.READY.value, DocumentStatus.PROCESSING.value):
            return existing, True

        # Generate per-document 256-bit key and wrap with session wrapping key
        data_key = generate_document_key()
        wrapped_key_b64 = wrap_document_key(data_key, session.id)

        # Create document row
        doc = await self.document_repo.create(
            session_id=session.id,
            user_id=self.current_user_id,
            name=filename,
            mime_type=sniffed_mime,
            size_bytes=len(content),
            content_hash=content_hash,
            source=source,
        )

        # Encrypt with AES-256-GCM
        encrypted_blob = encrypt_data(
            data=content,
            data_key=data_key,
            session_id=session.id,
            artifact_type="document",
            artifact_id=doc.id,
        )

        # Store in object storage
        storage_key = f"sessions/{session.id}/documents/{doc.id}/original"
        metadata = {
            "x-amz-meta-encrypted-key": wrapped_key_b64,
            "x-amz-meta-mime-type": sniffed_mime,
        }
        storage_client.put_object(storage_key, encrypted_blob, metadata=metadata)

        # Update session title if first document
        if not session.title or session.title == "Untitled Session":
            session.title = filename
        if not session.document_id:
            session.document_id = doc.id

        await self.audit_repo.log_event(
            event_type="document.uploaded",
            actor_user_id=self.current_user_id,
            resource_type="document",
            resource_id=doc.id,
            metadata_json={"size_bytes": len(content), "mime_type": sniffed_mime},
        )
        await self.db.commit()

        # Emit initial progress event
        await progress_service.emit_event(
            resource_type="sessions",
            resource_id=session.id,
            event_name="ingestion.progress",
            payload={"stage": "uploading", "percent": 20, "document_id": doc.id},
        )

        return doc, False
