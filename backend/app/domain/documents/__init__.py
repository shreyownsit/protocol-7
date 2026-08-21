from dataclasses import dataclass
from datetime import datetime
from enum import Enum


class DocumentStatus(str, Enum):
    UPLOADING = "uploading"
    PROCESSING = "processing"
    READY = "ready"
    FAILED = "failed"
    EXPIRED = "expired"


class DocumentSource(str, Enum):
    FILE = "file"
    CAMERA = "camera"


class PageOCRStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    READY = "ready"
    FAILED = "failed"


@dataclass
class DocumentDomain:
    id: str
    session_id: str
    user_id: str | None
    name: str
    mime_type: str
    size_bytes: int
    content_hash: str
    page_count: int
    status: DocumentStatus
    source: DocumentSource
    processing_error_code: str | None
    created_at: datetime


@dataclass
class DocumentPageDomain:
    id: str
    document_id: str
    page_number: int
    width_px: int
    height_px: int
    ocr_status: PageOCRStatus
