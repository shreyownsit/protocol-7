from datetime import UTC, datetime
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import SessionNotFoundError, SimulationInvalidError
from app.processing.formula_extractor import formula_extractor
from app.processing.safe_eval import safe_evaluator
from app.repositories.clause_repo import ClauseRepository
from app.repositories.models import Simulation
from app.repositories.session_repo import SessionRepository
from app.repositories.simulation_repo import SimulationRepository


class SimulationService:
    def __init__(self, db: AsyncSession, current_user_id: str | None = None) -> None:
        self.db = db
        self.current_user_id = current_user_id
        self.session_repo = SessionRepository(db)
        self.clause_repo = ClauseRepository(db)
        self.sim_repo = SimulationRepository(db)

    async def create_simulation_from_session(
        self,
        session_id: str,
        title: str | None = None,
        variables: dict[str, Any] | None = None,
        formulas: dict[str, Any] | None = None,
    ) -> Simulation:
        session = await self.session_repo.get_by_id(session_id, user_id=self.current_user_id)
        if not session:
            raise SessionNotFoundError("Session not found.")

        if variables is None or formulas is None:
            # Auto-extract from AST clauses
            clauses = await self.clause_repo.list_for_document(session.document_id) if session.document_id else []
            c_dicts = [{"id": c.id, "heading": c.heading, "text": c.text} for c in clauses]
            extracted_vars, extracted_forms = formula_extractor.extract_simulation_model(c_dicts)
            variables = variables or extracted_vars
            formulas = formulas or extracted_forms

        sim = await self.sim_repo.create(
            session_id=session.id,
            title=title or "Lease Cost Model",
            variables=variables,
            formulas=formulas,
        )
        await self.db.commit()
        return sim

    async def get_simulation(self, simulation_id: str) -> dict:
        sim = await self.sim_repo.get_by_id(simulation_id)
        if not sim:
            raise SimulationInvalidError("Simulation not found.")
        last_run = await self.sim_repo.get_latest_run(simulation_id)
        return {
            "id": sim.id,
            "session_id": sim.session_id,
            "title": sim.title,
            "variables": sim.variables,
            "formulas": sim.formulas,
            "status": sim.status,
            "last_run": last_run.scenario if last_run else None,
        }

    async def verify_scenario(self, simulation_id: str, scenario: dict[str, float]) -> dict:
        sim = await self.sim_repo.get_by_id(simulation_id)
        if not sim:
            raise SimulationInvalidError("Simulation not found.")

        formula_results = safe_evaluator.evaluate_model(
            variables_def=sim.variables,
            formulas_def=sim.formulas,
            scenario_overrides=scenario,
        )

        await self.sim_repo.record_run(
            simulation_id=simulation_id,
            scenario=scenario,
            results=formula_results,
            client_evaluated=False,
        )
        await self.db.commit()

        return {
            "formula_results": formula_results,
            "evaluated_at": datetime.now(UTC).isoformat(),
        }
