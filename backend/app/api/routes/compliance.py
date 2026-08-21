from fastapi import APIRouter

from app.api.dependencies import CurrentUserId, DbSession
from app.repositories.finding_repo import FindingRepository
from app.schemas.compliance import ComplianceSummaryResponse
from app.schemas.findings import FindingListResponse
from app.services.compliance_service import ComplianceService

router = APIRouter(tags=["compliance"])


@router.get("/sessions/{session_id}/compliance", response_model=ComplianceSummaryResponse)
async def get_compliance_summary(
    session_id: str,
    db: DbSession,
    user_id: CurrentUserId,
):
    service = ComplianceService(db, current_user_id=user_id)
    return await service.get_compliance_summary(session_id)


@router.post("/sessions/{session_id}/compliance/check")
async def run_compliance_check(
    session_id: str,
    db: DbSession,
    user_id: CurrentUserId,
):
    service = ComplianceService(db, current_user_id=user_id)
    findings = await service.run_compliance_check(session_id)
    return {"status": "completed", "violations_found": len(findings)}


@router.get("/sessions/{session_id}/findings", response_model=FindingListResponse)
async def list_findings(
    session_id: str,
    db: DbSession,
    user_id: CurrentUserId,
):
    repo = FindingRepository(db)
    rows = await repo.list_for_session(session_id)
    return {
        "findings": [
            {
                "id": f.id,
                "session_id": f.session_id,
                "finding_type": f.finding_type,
                "severity": f.severity,
                "confidence": f.confidence,
                "title": f.title,
                "summary": f.summary,
                "statute_reference": f.statute_reference,
                "rule_id": f.rule_id,
                "clause_ids": f.clause_ids,
                "evidence": f.evidence,
                "financial_exposure": f.financial_exposure,
            }
            for f in rows
        ]
    }
