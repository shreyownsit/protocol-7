from typing import Any

from pydantic import BaseModel


class CreateExportRequest(BaseModel):
    format: str = "pdf"
    contents: dict[str, Any] | None = None


class ExportResponse(BaseModel):
    id: str
    status: str
    url: str = ""
    filename: str = ""
    expires_at: int = 0
