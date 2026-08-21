from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import Any


class NodeType(str, Enum):
    SECTION = "section"
    CLAUSE = "clause"
    SUBCLAUSE = "subclause"
    DEFINITION = "definition"
    SIGNATURE_BLOCK = "signature_block"


class ClauseType(str, Enum):
    OBLIGATION = "obligation"
    DEFINITION = "definition"
    CONDITION = "condition"
    PENALTY = "penalty"
    TERMINATION = "termination"
    GRANT = "grant"
    COVENANT = "covenant"
    OTHER = "other"


class RelationshipType(str, Enum):
    REFERENCES = "references"
    CONDITIONS = "conditions"
    CONTRADICTS = "contradicts"
    MODIFIES = "modifies"


@dataclass
class BBox:
    x: float
    y: float
    w: float
    h: float

    def to_dict(self) -> dict[str, float]:
        return {"x": self.x, "y": self.y, "w": self.w, "h": self.h}

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> "BBox":
        return cls(x=float(d["x"]), y=float(d["y"]), w=float(d["w"]), h=float(d["h"]))


@dataclass
class ClauseDomain:
    id: str
    document_id: str
    path: str
    clause_type: ClauseType
    text: str
    page_number: int = 1
    node_type: NodeType = NodeType.CLAUSE
    parent_clause_id: str | None = None
    heading: str | None = None
    bbox: dict[str, Any] | None = None
    source_text_raw: str = ""
    confidence: float = 1.0
    created_at: datetime | None = None


@dataclass
class ClauseRelationshipDomain:
    id: str
    document_id: str
    source_clause_id: str
    target_clause_id: str
    relationship_type: RelationshipType
    evidence_text: str | None = None
    created_at: datetime | None = None
