from datetime import datetime

from pydantic import BaseModel


class CreateSessionRequest(BaseModel):
    title: str | None = None
    privacy_mode: str = "standard"


class SessionResponse(BaseModel):
    id: str
    title: str | None = None
    status: str
    privacy_mode: str = "standard"
    save_state: str = "unsaved"
    document_id: str | None = None
    analysis_status: str | None = None
    expires_at: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class SessionListResponse(BaseModel):
    sessions: list[SessionResponse]
    next_cursor: str | None = None


class ClaimSessionRequest(BaseModel):
    session_id: str
