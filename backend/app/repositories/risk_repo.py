from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.models import RiskModel, RiskVariable


class RiskRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create_model(
        self,
        session_id: str,
        formula_doc: str,
        overall_risk: float,
        variables_data: list[dict[str, Any]],
        version: int = 1,
    ) -> RiskModel:
        model = RiskModel(
            session_id=session_id,
            version=version,
            formula_doc=formula_doc,
            overall_risk=overall_risk,
            created_at=datetime.now(UTC),
        )
        self.session.add(model)
        await self.session.flush()

        for v in variables_data:
            var = RiskVariable(
                model_id=model.id,
                name=v["name"],
                category=v["category"],
                value=v["value"],
                weight=v["weight"],
                evidence_refs=v.get("evidence_refs"),
            )
            self.session.add(var)
        await self.session.flush()
        return model

    async def get_latest_for_session(self, session_id: str) -> RiskModel | None:
        stmt = (
            select(RiskModel)
            .where(RiskModel.session_id == session_id)
            .order_by(RiskModel.version.desc())
            .limit(1)
        )
        res = await self.session.execute(stmt)
        return res.scalar_one_or_none()

    async def get_variables_for_model(self, model_id: str) -> list[RiskVariable]:
        stmt = select(RiskVariable).where(RiskVariable.model_id == model_id)
        res = await self.session.execute(stmt)
        return list(res.scalars().all())
