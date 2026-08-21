from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class ErrorDetail(BaseModel):
    field: str | None = None
    message: str


class ErrorResponse(BaseModel):
    code: str
    message: str
    details: list[ErrorDetail] = Field(default_factory=list)
    request_id: str | None = None


class PaginationMeta(BaseModel):
    total: int | None = None
    next_cursor: str | None = None
    has_more: bool = False


class PaginatedResponse(BaseModel):
    data: list[Any]
    pagination: PaginationMeta


class TimestampMixin(BaseModel):
    created_at: datetime | None = None
    updated_at: datetime | None = None
