from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import SessionNotFoundError
from app.domain.findings import FindingDomain, FindingType, Severity
from app.processing.rule_engine import RuleEngineContext, rule_engine
from app.repositories.clause_repo import ClauseRepository
from app.repositories.compliance_repo import ComplianceRepository
from app.repositories.finding_repo import FindingRepository
from app.repositories.session_repo import SessionRepository
from app.services.progress_service import progress_service


class ComplianceService:
    def __init__(self, db: AsyncSession, current_user_id: str | None = None) -> None:
        self.db = db
        self.current_user_id = current_user_id
        self.session_repo = SessionRepository(db)
        self.clause_repo = ClauseRepository(db)
        self.compliance_repo = ComplianceRepository(db)
        self.finding_repo = FindingRepository(db)

    async def run_compliance_check(
        self,
        session_id: str,
        jurisdiction: str = "US-CA",
        agreement_type: str = "residential_lease",
    ) -> list[FindingDomain]:
        session = await self.session_repo.get_by_id(session_id, user_id=self.current_user_id)
        if not session:
            raise SessionNotFoundError("Session not found.")

        if not session.document_id:
            return []

        clauses = await self.clause_repo.list_for_document(session.document_id)
        rules = await self.compliance_repo.get_enabled_rules(jurisdiction, agreement_type)

        findings_created: list[FindingDomain] = []

        for r in rules:
            for c in clauses:
                ctx = RuleEngineContext(
                    jurisdiction=jurisdiction,
                    agreement_type=agreement_type,
                    clause_type=c.clause_type,
                    clause_text=c.text,
                    variables={"monthly_rent": 1800.0},
                )
                outcome, details = rule_engine.evaluate_condition(r.condition_expr, ctx)
                await self.compliance_repo.record_result(
                    session_id=session.id,
                    rule_id=r.id,
                    clause_id=c.id,
                    outcome=outcome,
                    details=details,
                )

                if outcome == "violation":
                    # Generate compliance finding
                    finding_row = await self.finding_repo.create(
                        session_id=session.id,
                        finding_type=FindingType.COMPLIANCE.value,
                        severity=r.severity,
                        confidence=1.0,
                        title=f"Compliance: {r.name}",
                        summary=r.message_template,
                        statute_reference=r.statute_reference,
                        rule_id=r.id,
                        clause_ids=[c.id],
                        evidence={
                            "clause_text": c.text[:200],
                            "page": c.page_number,
                            "bbox": c.bbox,
                        },
                    )
                    findings_created.append(
                        FindingDomain(
                            id=finding_row.id,
                            session_id=session.id,
                            finding_type=FindingType.COMPLIANCE,
                            severity=Severity(r.severity) if r.severity in Severity._value2member_map_ else Severity.HIGH,
                            confidence=1.0,
                            title=finding_row.title,
                            summary=finding_row.summary,
                            statute_reference=finding_row.statute_reference,
                            rule_id=finding_row.rule_id,
                            clause_ids=finding_row.clause_ids,
                            evidence=finding_row.evidence,
                            financial_exposure=finding_row.financial_exposure,
                        )
                    )

        await self.db.commit()

        await progress_service.emit_event(
            "sessions",
            session.id,
            "compliance.progress",
            {"stage": "compliance", "violations_found": len(findings_created)},
        )

        return findings_created

    async def get_compliance_summary(self, session_id: str) -> dict:
        results = await self.compliance_repo.list_results_for_session(session_id)
        findings = await self.finding_repo.list_for_session(session_id, finding_type=FindingType.COMPLIANCE.value)

        return {
            "results": [
                {
                    "rule_id": r.rule_id,
                    "clause_id": r.clause_id,
                    "outcome": r.outcome,
                    "details": r.details,
                    "evaluated_at": r.evaluated_at.isoformat() if r.evaluated_at else None,
                }
                for r in results
            ],
            "findings": [
                {
                    "id": f.id,
                    "title": f.title,
                    "summary": f.summary,
                    "severity": f.severity,
                    "statute_reference": f.statute_reference,
                    "clause_ids": f.clause_ids,
                    "evidence": f.evidence,
                }
                for f in findings
            ],
            "rule_version": 1,
        }
