from datetime import datetime

from pydantic import BaseModel, Field


class DocumentResponse(BaseModel):
    id: str
    session_id: str
    name: str
    mime_type: str
    size_bytes: int
    status: str
    page_count: int = 0
    source: str = "file"
    created_at: datetime | None = None


class DocumentListResponse(BaseModel):
    documents: list[DocumentResponse]


class ASTResponse(BaseModel):
    document: dict
    nodes: list[dict]
    definitions: list[dict] = Field(default_factory=list)
    entities: list[dict] = Field(default_factory=list)


class PageSignedUrlResponse(BaseModel):
    url: str
    expires_at: int
