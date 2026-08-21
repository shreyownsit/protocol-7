from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import SessionNotFoundError
from app.domain.findings import FindingDomain, FindingType, Severity
from app.processing.risk_model import risk_calculator
from app.repositories.finding_repo import FindingRepository
from app.repositories.risk_repo import RiskRepository
from app.repositories.session_repo import SessionRepository


class RiskService:
    def __init__(self, db: AsyncSession, current_user_id: str | None = None) -> None:
        self.db = db
        self.current_user_id = current_user_id
        self.session_repo = SessionRepository(db)
        self.finding_repo = FindingRepository(db)
        self.risk_repo = RiskRepository(db)

    async def evaluate_risk_for_session(self, session_id: str) -> dict:
        session = await self.session_repo.get_by_id(session_id, user_id=self.current_user_id)
        if not session:
            raise SessionNotFoundError("Session not found.")

        findings_rows = await self.finding_repo.list_for_session(session_id)
        domain_findings = [
            FindingDomain(
                id=f.id,
                session_id=f.session_id,
                finding_type=FindingType(f.finding_type) if f.finding_type in FindingType._value2member_map_ else FindingType.AI_FLAG,
                severity=Severity(f.severity) if f.severity in Severity._value2member_map_ else Severity.MEDIUM,
                confidence=f.confidence,
                title=f.title,
                summary=f.summary,
                statute_reference=f.statute_reference,
                rule_id=f.rule_id,
                clause_ids=f.clause_ids,
                evidence=f.evidence,
                financial_exposure=f.financial_exposure,
            )
            for f in findings_rows
        ]

        model_data = risk_calculator.compute_risk_model(domain_findings)
        await self.risk_repo.create_model(
            session_id=session_id,
            formula_doc=model_data["formula_doc"],
            overall_risk=model_data["overall_risk"],
            variables_data=model_data["variables"],
        )
        await self.db.commit()
        return model_data

    async def get_risk_model(self, session_id: str) -> dict:
        session = await self.session_repo.get_by_id(session_id, user_id=self.current_user_id)
        if not session:
            raise SessionNotFoundError("Session not found.")

        model = await self.risk_repo.get_latest_for_session(session_id)
        if not model:
            # Generate default risk model on demand
            return await self.evaluate_risk_for_session(session_id)

        variables = await self.risk_repo.get_variables_for_model(model.id)
        return {
            "overall_risk": model.overall_risk,
            "formula_doc": model.formula_doc,
            "variables": [
                {
                    "name": v.name,
                    "category": v.category,
                    "value": v.value,
                    "weight": v.weight,
                    "evidence_refs": v.evidence_refs,
                }
                for v in variables
            ],
        }
