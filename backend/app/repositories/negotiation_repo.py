from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.negotiation import CounterClauseStatus, NegotiationStatus
from app.repositories.models import CounterClause, Negotiation, NegotiationStep


class NegotiationRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(
        self,
        session_id: str,
        clause_id: str,
    ) -> Negotiation:
        neg = Negotiation(
            session_id=session_id,
            clause_id=clause_id,
            status=NegotiationStatus.QUEUED.value,
            current_stage="prosecutor",
            retry_count=0,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        self.session.add(neg)
        await self.session.flush()
        return neg

    async def get_by_id(self, negotiation_id: str) -> Negotiation | None:
        stmt = select(Negotiation).where(Negotiation.id == negotiation_id)
        res = await self.session.execute(stmt)
        return res.scalar_one_or_none()

    async def get_active_for_clause(self, session_id: str, clause_id: str) -> Negotiation | None:
        stmt = select(Negotiation).where(
            Negotiation.session_id == session_id,
            Negotiation.clause_id == clause_id,
            Negotiation.status == NegotiationStatus.RUNNING.value,
        )
        res = await self.session.execute(stmt)
        return res.scalar_one_or_none()

    async def update_status(
        self,
        negotiation_id: str,
        status: str,
        current_stage: str | None = None,
        retry_count: int | None = None,
        counter_clause_id: str | None = None,
    ) -> Negotiation | None:
        values: dict[str, Any] = {
            "status": status,
            "updated_at": datetime.now(UTC),
        }
        if current_stage is not None:
            values["current_stage"] = current_stage
        if retry_count is not None:
            values["retry_count"] = retry_count
        if counter_clause_id is not None:
            values["counter_clause_id"] = counter_clause_id

        stmt = (
            update(Negotiation)
            .where(Negotiation.id == negotiation_id)
            .values(**values)
            .returning(Negotiation)
        )
        res = await self.session.execute(stmt)
        return res.scalar_one_or_none()

    async def add_step(
        self,
        negotiation_id: str,
        agent: str,
        step_type: str,
        payload: dict[str, Any],
        event_id: str,
    ) -> NegotiationStep:
        step = NegotiationStep(
            negotiation_id=negotiation_id,
            agent=agent,
            step_type=step_type,
            payload=payload,
            event_id=event_id,
            created_at=datetime.now(UTC),
        )
        self.session.add(step)
        await self.session.flush()
        return step

    async def list_steps(self, negotiation_id: str) -> list[NegotiationStep]:
        stmt = (
            select(NegotiationStep)
            .where(NegotiationStep.negotiation_id == negotiation_id)
            .order_by(NegotiationStep.created_at)
        )
        res = await self.session.execute(stmt)
        return list(res.scalars().all())

    async def create_counter_clause(
        self,
        negotiation_id: str,
        session_id: str,
        original_clause_id: str,
        counter_text: str,
        rationale: str,
        compliance_check_result: dict[str, Any] | None = None,
        status: str = CounterClauseStatus.APPROVED.value,
    ) -> CounterClause:
        counter = CounterClause(
            negotiation_id=negotiation_id,
            session_id=session_id,
            original_clause_id=original_clause_id,
            counter_text=counter_text,
            rationale=rationale,
            compliance_check_result=compliance_check_result,
            status=status,
            created_at=datetime.now(UTC),
        )
        self.session.add(counter)
        await self.session.flush()
        return counter

    async def get_counter_clause(self, counter_clause_id: str) -> CounterClause | None:
        stmt = select(CounterClause).where(CounterClause.id == counter_clause_id)
        res = await self.session.execute(stmt)
        return res.scalar_one_or_none()

    async def get_counter_clause_by_negotiation(self, negotiation_id: str) -> CounterClause | None:
        stmt = select(CounterClause).where(CounterClause.negotiation_id == negotiation_id)
        res = await self.session.execute(stmt)
        return res.scalar_one_or_none()
