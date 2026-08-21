
from pydantic import BaseModel


class ClauseResponse(BaseModel):
    id: str
    document_id: str
    node_type: str
    path: str
    parent_id: str | None = None
    heading: str | None = None
    text: str
    clause_type: str = "other"
    page_number: int = 1
    bbox: dict | None = None
    confidence: float = 1.0


class ClauseListResponse(BaseModel):
    clauses: list[ClauseResponse]
