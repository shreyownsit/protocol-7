from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import SimulationInvalidError
from app.domain.simulation import SimulationStatus
from app.repositories.models import Simulation, SimulationRun


class SimulationRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(
        self,
        session_id: str,
        title: str,
        variables: dict[str, Any],
        formulas: dict[str, Any],
    ) -> Simulation:
        sim = Simulation(
            session_id=session_id,
            title=title,
            variables=variables,
            formulas=formulas,
            status=SimulationStatus.ACTIVE.value,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        self.session.add(sim)
        await self.session.flush()
        return sim

    async def get_by_id(self, simulation_id: str) -> Simulation | None:
        stmt = select(Simulation).where(Simulation.id == simulation_id)
        res = await self.session.execute(stmt)
        return res.scalar_one_or_none()

    async def list_for_session(self, session_id: str) -> list[Simulation]:
        stmt = (
            select(Simulation)
            .where(
                Simulation.session_id == session_id,
                Simulation.status != SimulationStatus.ARCHIVED.value,
            )
            .order_by(Simulation.created_at)
        )
        res = await self.session.execute(stmt)
        return list(res.scalars().all())

    async def update_simulation(self, simulation_id: str, **kwargs) -> Simulation:
        stmt = (
            update(Simulation)
            .where(Simulation.id == simulation_id)
            .values(**kwargs, updated_at=datetime.now(UTC))
            .returning(Simulation)
        )
        res = await self.session.execute(stmt)
        sim = res.scalar_one_or_none()
        if not sim:
            raise SimulationInvalidError("Simulation not found.")
        return sim

    async def record_run(
        self,
        simulation_id: str,
        scenario: dict[str, Any],
        results: dict[str, Any] | None = None,
        client_evaluated: bool = False,
    ) -> SimulationRun:
        run = SimulationRun(
            simulation_id=simulation_id,
            scenario=scenario,
            results=results,
            client_evaluated=client_evaluated,
            computed_at=datetime.now(UTC),
        )
        self.session.add(run)
        await self.session.flush()
        return run

    async def get_latest_run(self, simulation_id: str) -> SimulationRun | None:
        stmt = (
            select(SimulationRun)
            .where(SimulationRun.simulation_id == simulation_id)
            .order_by(SimulationRun.computed_at.desc())
            .limit(1)
        )
        res = await self.session.execute(stmt)
        return res.scalar_one_or_none()
