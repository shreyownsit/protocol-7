from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import SessionNotFoundError
from app.domain.findings import FindingType, Severity
from app.processing.graph_builder import graph_builder
from app.repositories.clause_repo import ClauseRepository
from app.repositories.finding_repo import FindingRepository
from app.repositories.session_repo import SessionRepository


class GraphService:
    def __init__(self, db: AsyncSession, current_user_id: str | None = None) -> None:
        self.db = db
        self.current_user_id = current_user_id
        self.session_repo = SessionRepository(db)
        self.clause_repo = ClauseRepository(db)
        self.finding_repo = FindingRepository(db)

    async def generate_graph_for_session(self, session_id: str) -> dict:
        session = await self.session_repo.get_by_id(session_id, user_id=self.current_user_id)
        if not session:
            raise SessionNotFoundError("Session not found.")

        if not session.document_id:
            return {"nodes": [], "edges": [], "contradictions": [], "layout_hint": "hierarchical"}

        clauses = await self.clause_repo.list_for_document(session.document_id)
        relationships = await self.clause_repo.list_relationships(session.document_id)

        c_dicts = [
            {"id": c.id, "heading": c.heading, "text": c.text, "path": c.path, "clause_type": c.clause_type, "page_number": c.page_number, "bbox": c.bbox}
            for c in clauses
        ]
        r_dicts = [
            {"id": r.id, "source_clause_id": r.source_clause_id, "target_clause_id": r.target_clause_id, "relationship_type": r.relationship_type, "evidence_text": r.evidence_text}
            for r in relationships
        ]

        vis_payload, contradictions = graph_builder.build_graph(c_dicts, r_dicts)

        # Record contradiction findings in DB
        for cont in contradictions:
            await self.finding_repo.create(
                session_id=session.id,
                finding_type=FindingType.CONTRADICTION.value,
                severity=Severity.HIGH.value,
                confidence=0.95,
                title=cont["title"],
                summary=cont["summary"],
                clause_ids=[ref["clause_id"] for ref in cont["clause_refs"]],
                evidence={"contradicting_clauses": cont["clause_refs"]},
            )

        session.graph_payload = vis_payload
        await self.db.commit()
        return vis_payload

    async def get_graph(self, session_id: str) -> dict:
        session = await self.session_repo.get_by_id(session_id, user_id=self.current_user_id)
        if not session:
            raise SessionNotFoundError("Session not found.")

        if session.graph_payload:
            return session.graph_payload

        return await self.generate_graph_for_session(session_id)
