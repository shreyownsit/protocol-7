from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.models import Clause, ClauseRelationship


class ClauseRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create_clause(
        self,
        document_id: str,
        path: str,
        text: str,
        clause_type: str = "other",
        node_type: str = "clause",
        heading: str | None = None,
        source_text_raw: str | None = None,
        page_number: int = 1,
        bbox: dict[str, Any] | None = None,
        confidence: float = 1.0,
        parent_clause_id: str | None = None,
    ) -> Clause:
        clause = Clause(
            document_id=document_id,
            parent_clause_id=parent_clause_id,
            path=path,
            node_type=node_type,
            clause_type=clause_type,
            heading=heading,
            text=text,
            page_number=page_number,
            bbox=bbox,
            source_text_raw=source_text_raw or text,
            confidence=confidence,
            created_at=datetime.now(UTC),
        )
        self.session.add(clause)
        await self.session.flush()
        return clause

    async def bulk_create(self, clauses_data: list[dict[str, Any]]) -> list[Clause]:
        created: list[Clause] = []
        for c in clauses_data:
            clause = Clause(
                id=c.get("id"),
                document_id=c["document_id"],
                parent_clause_id=c.get("parent_clause_id"),
                path=c["path"],
                node_type=c.get("node_type", "clause"),
                clause_type=c.get("clause_type", "other"),
                heading=c.get("heading"),
                text=c["text"],
                page_number=c.get("page_number", 1),
                bbox=c.get("bbox"),
                source_text_raw=c.get("source_text_raw", c["text"]),
                confidence=c.get("confidence", 1.0),
                created_at=datetime.now(UTC),
            )
            self.session.add(clause)
            created.append(clause)
        await self.session.flush()
        return created

    async def get_by_id(self, clause_id: str) -> Clause | None:
        stmt = select(Clause).where(Clause.id == clause_id)
        res = await self.session.execute(stmt)
        return res.scalar_one_or_none()

    async def list_for_document(self, document_id: str) -> list[Clause]:
        stmt = select(Clause).where(Clause.document_id == document_id).order_by(Clause.path)
        res = await self.session.execute(stmt)
        return list(res.scalars().all())

    async def add_relationships(self, rels_data: list[dict[str, Any]]) -> list[ClauseRelationship]:
        created: list[ClauseRelationship] = []
        for r in rels_data:
            rel = ClauseRelationship(
                id=r.get("id"),
                document_id=r["document_id"],
                source_clause_id=r["source_clause_id"],
                target_clause_id=r["target_clause_id"],
                relationship_type=r.get("relationship_type", "references"),
                evidence_text=r.get("evidence_text"),
                created_at=datetime.now(UTC),
            )
            self.session.add(rel)
            created.append(rel)
        await self.session.flush()
        return created

    async def list_relationships(self, document_id: str) -> list[ClauseRelationship]:
        stmt = select(ClauseRelationship).where(ClauseRelationship.document_id == document_id)
        res = await self.session.execute(stmt)
        return list(res.scalars().all())
