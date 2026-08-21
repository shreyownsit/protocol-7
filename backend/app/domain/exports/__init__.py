from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import Any


class ExportFormat(str, Enum):
    PDF = "pdf"
    DOCX = "docx"


class ExportStatus(str, Enum):
    QUEUED = "queued"
    GENERATING = "generating"
    READY = "ready"
    FAILED = "failed"
    EXPIRED = "expired"


@dataclass
class ExportDomain:
    id: str
    session_id: str
    format: ExportFormat
    contents: dict[str, Any]
    status: ExportStatus
    storage_key: str | None
    url_expires_at: datetime | None
    created_at: datetime | None = None
