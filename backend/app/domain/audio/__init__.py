from dataclasses import dataclass
from datetime import datetime
from enum import Enum


class AudioStatus(str, Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    READY = "ready"
    FAILED = "failed"


SUPPORTED_AUDIO_LANGUAGES: set[str] = {
    "en", "es", "fr", "de", "it", "pt", "hi", "ar", "zh", "ja"
}


@dataclass
class AudioRequestDomain:
    id: str
    session_id: str
    summary_id: str | None
    language_code: str
    voice: str | None
    status: AudioStatus
    storage_key: str | None
    duration_seconds: int | None = None
    expires_at: datetime | None = None
    created_at: datetime | None = None
