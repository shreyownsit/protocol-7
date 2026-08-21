from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import Any


class DiffChangeType(str, Enum):
    ADDED = "added"
    REMOVED = "removed"
    MODIFIED = "modified"
    MOVED = "moved"
    UNCHANGED = "unchanged"


@dataclass
class DiffChange:
    change_type: DiffChangeType
    clause_id: str
    counterpart_clause_id: str | None
    heading: str | None
    page_number: int
    bbox: dict[str, Any]
    counterpart_coords: dict[str, Any] | None
    old_text: str | None
    new_text: str | None
    word_diff: list[dict[str, str]]


@dataclass
class DiffResultDomain:
    id: str
    session_id: str
    document_a_id: str
    document_b_id: str
    status: str
    summary: dict[str, int]
    changes: list[dict[str, Any]]
    created_at: datetime | None = None
