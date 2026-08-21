
from pydantic import BaseModel, Field


class GraphResponse(BaseModel):
    nodes: list[dict] = Field(default_factory=list)
    edges: list[dict] = Field(default_factory=list)
    contradictions: list[dict] = Field(default_factory=list)
    layout_hint: str = "hierarchical"
