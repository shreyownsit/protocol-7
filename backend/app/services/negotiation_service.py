from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.client import llm_client
from app.ai.validators import (
    AuditResult,
    DefenseOutput,
    ProsecutorOutput,
)
from app.core.config import settings
from app.core.exceptions import (
    NegotiationInProgressError,
    NegotiationNotStartedError,
    SessionNotFoundError,
    ValidationError,
)
from app.domain.negotiation import CounterClauseStatus, NegotiationStatus
from app.processing.rule_engine import RuleEngineContext, rule_engine
from app.repositories.audit_repo import AuditRepository
from app.repositories.clause_repo import ClauseRepository
from app.repositories.compliance_repo import ComplianceRepository
from app.repositories.models import Negotiation
from app.repositories.negotiation_repo import NegotiationRepository
from app.repositories.session_repo import SessionRepository
from app.services.progress_service import progress_service
from app.utils.ids import generate_uuid7


class NegotiationService:
    def __init__(self, db: AsyncSession, current_user_id: str | None = None) -> None:
        self.db = db
        self.current_user_id = current_user_id
        self.session_repo = SessionRepository(db)
        self.clause_repo = ClauseRepository(db)
        self.negotiation_repo = NegotiationRepository(db)
        self.compliance_repo = ComplianceRepository(db)
        self.audit_repo = AuditRepository(db)

    async def start_negotiation(
        self,
        session_id: str,
        clause_id: str,
        context: dict[str, Any] | None = None,
    ) -> Negotiation:
        session = await self.session_repo.get_by_id(session_id, user_id=self.current_user_id)
        if not session:
            raise SessionNotFoundError("Session not found.")

        clause = await self.clause_repo.get_by_id(clause_id)
        if not clause:
            raise ValidationError("Target clause not found.")

        # Check unique active negotiation per clause
        active = await self.negotiation_repo.get_active_for_clause(session_id, clause_id)
        if active:
            raise NegotiationInProgressError("A negotiation is already active for this clause.")

        neg = await self.negotiation_repo.create(session_id, clause_id)
        await self.db.commit()

        # Emit initial SSE event
        event_id = generate_uuid7()
        user_goals = context.get("goals", []) if context else ["Make clause fair and compliant"]
        await self.negotiation_repo.add_step(
            neg.id,
            agent="prosecutor",
            step_type="started",
            payload={"goals": user_goals},
            event_id=event_id,
        )
        await progress_service.emit_event(
            resource_type="negotiate",
            resource_id=neg.id,
            event_name="negotiation.started",
            payload={
                "negotiation_id": neg.id,
                "clause_id": clause_id,
                "context_goals": user_goals,
            },
            event_id=event_id,
        )
        await self.db.commit()

        # Run asynchronous 3-agent orchestration
        await self._run_negotiation_loop(neg.id, session.id, clause.text, user_goals, jurisdiction="US-CA")
        return neg

    async def _run_negotiation_loop(
        self,
        negotiation_id: str,
        session_id: str,
        clause_text: str,
        user_goals: list[str],
        jurisdiction: str = "US-CA",
    ) -> None:
        await self.negotiation_repo.update_status(negotiation_id, status=NegotiationStatus.RUNNING.value)
        await self.db.commit()

        retry_count = 0
        rule_hits: list[str] = []

        try:
            # 1. Prosecutor Stage
            p_start_eid = generate_uuid7()
            await progress_service.emit_event(
                "negotiate", negotiation_id, "prosecutor.started", {"negotiation_id": negotiation_id}, event_id=p_start_eid
            )

            prosecutor_prompt = (
                f"Analyze this target clause for unfairness or risks.\nTarget Clause:\n{clause_text}\n"
                f"User Goals: {', '.join(user_goals)}\nJurisdiction: {jurisdiction}"
            )
            prosecutor_output = await llm_client.generate_structured(prosecutor_prompt, ProsecutorOutput)

            p_comp_eid = generate_uuid7()
            await self.negotiation_repo.add_step(
                negotiation_id, "prosecutor", "completed", prosecutor_output.model_dump(), event_id=p_comp_eid
            )
            await progress_service.emit_event(
                "negotiate",
                negotiation_id,
                "prosecutor.completed",
                {"negotiation_id": negotiation_id, "issues": [i.model_dump() for i in prosecutor_output.issues]},
                event_id=p_comp_eid,
            )
            await self.db.commit()

            # 2. Defense & Auditor Loop
            approved_counter = None
            for attempt in range(settings.NEGOTIATION_MAX_REGENERATIONS + 1):
                # Defense Step
                d_start_eid = generate_uuid7()
                await progress_service.emit_event(
                    "negotiate", negotiation_id, "defense.started", {"negotiation_id": negotiation_id}, event_id=d_start_eid
                )

                issues_summary = "\n".join(f"- {i.category}: {i.explanation}" for i in prosecutor_output.issues)
                rules_summary = f"Ensure strict compliance with: {', '.join(rule_hits)}" if rule_hits else "None"

                defense_prompt = (
                    f"Original Clause:\n{clause_text}\nIssues to address:\n{issues_summary}\n"
                    f"Constraints:\n{rules_summary}\nUser Goals: {', '.join(user_goals)}"
                )
                defense_output = await llm_client.generate_structured(defense_prompt, DefenseOutput)

                d_comp_eid = generate_uuid7()
                await self.negotiation_repo.add_step(
                    negotiation_id, "defense", "completed", defense_output.model_dump(), event_id=d_comp_eid
                )
                await progress_service.emit_event(
                    "negotiate",
                    negotiation_id,
                    "defense.completed",
                    {
                        "negotiation_id": negotiation_id,
                        "counter_text": defense_output.counter_text,
                        "rationale": defense_output.rationale,
                        "changes": [c.model_dump() for c in defense_output.changes],
                    },
                    event_id=d_comp_eid,
                )
                await self.db.commit()

                # Auditor Step (DETERMINISTIC COMPLIANCE CHECK - NO LLM)
                a_start_eid = generate_uuid7()
                await progress_service.emit_event(
                    "negotiate", negotiation_id, "auditor.started", {"negotiation_id": negotiation_id}, event_id=a_start_eid
                )

                audit_result = await self._run_deterministic_audit(defense_output.counter_text, jurisdiction)

                a_comp_eid = generate_uuid7()
                await self.negotiation_repo.add_step(
                    negotiation_id, "auditor", "completed", audit_result.model_dump(), event_id=a_comp_eid
                )
                await progress_service.emit_event(
                    "negotiate",
                    negotiation_id,
                    "auditor.completed",
                    {
                        "negotiation_id": negotiation_id,
                        "compliant": audit_result.compliant,
                        "rule_hits": audit_result.rule_hits,
                        "explanation": audit_result.explanation,
                    },
                    event_id=a_comp_eid,
                )
                await self.db.commit()

                if audit_result.compliant:
                    # Approved!
                    neg = await self.negotiation_repo.get_by_id(negotiation_id)
                    counter = await self.negotiation_repo.create_counter_clause(
                        negotiation_id=negotiation_id,
                        session_id=session_id,
                        original_clause_id=neg.clause_id if neg else "",
                        counter_text=defense_output.counter_text,
                        rationale=defense_output.rationale,
                        compliance_check_result=audit_result.model_dump(),
                        status=CounterClauseStatus.APPROVED.value,
                    )
                    await self.negotiation_repo.update_status(
                        negotiation_id,
                        status=NegotiationStatus.COMPLETED.value,
                        counter_clause_id=counter.id,
                    )

                    c_eid = generate_uuid7()
                    await progress_service.emit_event(
                        "negotiate",
                        negotiation_id,
                        "negotiation.completed",
                        {"negotiation_id": negotiation_id, "counter_clause_id": counter.id},
                        event_id=c_eid,
                    )
                    await self.db.commit()
                    approved_counter = counter
                    break
                else:
                    # Retry
                    retry_count += 1
                    rule_hits = audit_result.rule_hits
                    r_eid = generate_uuid7()
                    await progress_service.emit_event(
                        "negotiate",
                        negotiation_id,
                        "negotiation.retrying",
                        {
                            "negotiation_id": negotiation_id,
                            "retry_count": retry_count,
                            "reason": f"Auditor flagged statutory violations: {', '.join(rule_hits)}",
                        },
                        event_id=r_eid,
                    )
                    await self.db.commit()

            if not approved_counter:
                await self.negotiation_repo.update_status(
                    negotiation_id, status=NegotiationStatus.FAILED.value
                )
                f_eid = generate_uuid7()
                await progress_service.emit_event(
                    "negotiate",
                    negotiation_id,
                    "negotiation.failed",
                    {
                        "negotiation_id": negotiation_id,
                        "error": {
                            "code": "NEGOTIATION_FAILED",
                            "message": "Maximum negotiation regenerations exhausted without achieving statutory compliance.",
                        },
                    },
                    event_id=f_eid,
                )
                await self.db.commit()
        except Exception as exc:
            await self.negotiation_repo.update_status(
                negotiation_id, status=NegotiationStatus.FAILED.value
            )
            f_eid = generate_uuid7()
            await progress_service.emit_event(
                "negotiate",
                negotiation_id,
                "negotiation.failed",
                {
                    "negotiation_id": negotiation_id,
                    "error": {
                        "code": "NEGOTIATION_FAILED",
                        "message": str(exc),
                    },
                },
                event_id=f_eid,
            )
            await self.db.commit()

    async def _run_deterministic_audit(self, counter_text: str, jurisdiction: str) -> AuditResult:
        """Evaluates counter clause text using the deterministic compliance rule engine."""
        rules = await self.compliance_repo.get_enabled_rules(jurisdiction, "residential_lease")
        ctx = RuleEngineContext(
            jurisdiction=jurisdiction,
            agreement_type="residential_lease",
            clause_type="penalty",
            clause_text=counter_text,
            variables={"monthly_rent": 1800.0},
        )

        hits: list[str] = []
        for r in rules:
            outcome, _ = rule_engine.evaluate_condition(r.condition_expr, ctx)
            if outcome == "violation":
                hits.append(r.id)

        is_compliant = len(hits) == 0
        explanation = (
            "Clause passed all statutory rule checks."
            if is_compliant
            else f"Clause violates rules: {', '.join(hits)}"
        )
        return AuditResult(compliant=is_compliant, rule_hits=hits, explanation=explanation)

    async def get_negotiation(self, negotiation_id: str) -> dict:
        neg = await self.negotiation_repo.get_by_id(negotiation_id)
        if not neg:
            raise NegotiationNotStartedError("Negotiation not found.")
        steps = await self.negotiation_repo.list_steps(negotiation_id)
        return {
            "id": neg.id,
            "session_id": neg.session_id,
            "clause_id": neg.clause_id,
            "status": neg.status,
            "current_stage": neg.current_stage,
            "retry_count": neg.retry_count,
            "counter_clause_id": neg.counter_clause_id,
            "steps": [
                {
                    "agent": s.agent,
                    "step_type": s.step_type,
                    "payload": s.payload,
                    "event_id": s.event_id,
                    "created_at": s.created_at.isoformat(),
                }
                for s in steps
            ],
        }

    async def get_counter_clause(self, negotiation_id: str) -> dict:
        counter = await self.negotiation_repo.get_counter_clause_by_negotiation(negotiation_id)
        if not counter:
            raise NegotiationNotStartedError("Counter clause not found or negotiation is not complete.")
        return {
            "id": counter.id,
            "negotiation_id": counter.negotiation_id,
            "original_clause_id": counter.original_clause_id,
            "counter_text": counter.counter_text,
            "rationale": counter.rationale,
            "compliance_check_result": counter.compliance_check_result,
            "status": counter.status,
        }
