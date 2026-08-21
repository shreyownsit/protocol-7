from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from enum import Enum


class SessionStatus(str, Enum):
    ACTIVE = "active"
    EXPIRED = "expired"
    SAVED = "saved"
    PURGED = "purged"


class SaveState(str, Enum):
    UNSAVED = "unsaved"
    SAVED = "saved"


class PrivacyMode(str, Enum):
    STANDARD = "standard"
    STRICT = "strict"


class AnalysisStatus(str, Enum):
    NONE = "none"
    PROCESSING = "processing"
    READY = "ready"
    FAILED = "failed"


@dataclass
class SessionDomain:
    id: str
    user_id: str | None
    document_id: str | None
    status: SessionStatus
    save_state: SaveState
    privacy_mode: PrivacyMode
    title: str | None
    analysis_status: AnalysisStatus
    summary_text: str | None
    graph_payload: dict | None
    created_at: datetime
    last_activity_at: datetime
    expires_at: datetime

    def is_expired(self, now: datetime | None = None) -> bool:
        if self.status == SessionStatus.SAVED:
            return False
        current_time = now or datetime.now(UTC)
        exp = self.expires_at.replace(tzinfo=UTC) if self.expires_at.tzinfo is None else self.expires_at
        return exp < current_time or self.status in (SessionStatus.EXPIRED, SessionStatus.PURGED)

    @classmethod
    def calculate_expiry(
        cls,
        created_at: datetime,
        last_activity_at: datetime,
        lifetime_seconds: int = 86400,
        inactivity_seconds: int = 3600,
        absolute_lifetime_seconds: int | None = None,
    ) -> datetime:
        """Calculates expires_at = min(created_at + lifetime, last_activity_at + inactivity)."""
        effective_lifetime = absolute_lifetime_seconds if absolute_lifetime_seconds is not None else lifetime_seconds
        c_at = created_at.replace(tzinfo=UTC) if created_at.tzinfo is None else created_at
        l_at = last_activity_at.replace(tzinfo=UTC) if last_activity_at.tzinfo is None else last_activity_at
        lifetime_expiry = c_at + timedelta(seconds=effective_lifetime)
        inactivity_expiry = l_at + timedelta(seconds=inactivity_seconds)
        return min(lifetime_expiry, inactivity_expiry)
