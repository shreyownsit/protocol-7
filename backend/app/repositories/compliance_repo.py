from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.models import ComplianceResult, ComplianceRule


class ComplianceRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_enabled_rules(
        self, jurisdiction: str, agreement_type: str
    ) -> list[ComplianceRule]:
        stmt = (
            select(ComplianceRule)
            .where(
                ComplianceRule.enabled == True,  # noqa: E712
                (ComplianceRule.jurisdiction == jurisdiction) | (ComplianceRule.jurisdiction == "*"),
                (ComplianceRule.agreement_type == agreement_type) | (ComplianceRule.agreement_type == "*"),
            )
            .order_by(ComplianceRule.id)
        )
        res = await self.session.execute(stmt)
        return list(res.scalars().all())

    async def get_rule_by_id(self, rule_id: str) -> ComplianceRule | None:
        stmt = select(ComplianceRule).where(ComplianceRule.id == rule_id)
        res = await self.session.execute(stmt)
        return res.scalar_one_or_none()

    async def save_rule(
        self,
        rule_id: str,
        name: str,
        jurisdiction: str,
        agreement_type: str,
        condition_expr: str,
        severity: str,
        message_template: str,
        statute_reference: str | None = None,
        rule_version: int = 1,
        enabled: bool = True,
    ) -> ComplianceRule:
        rule = ComplianceRule(
            id=rule_id,
            name=name,
            jurisdiction=jurisdiction,
            agreement_type=agreement_type,
            condition_expr=condition_expr,
            severity=severity,
            message_template=message_template,
            statute_reference=statute_reference,
            rule_version=rule_version,
            enabled=enabled,
            created_at=datetime.now(UTC),
        )
        self.session.add(rule)
        await self.session.flush()
        return rule

    async def record_result(
        self,
        session_id: str,
        rule_id: str,
        outcome: str,
        clause_id: str | None = None,
        details: dict[str, Any] | None = None,
    ) -> ComplianceResult:
        result = ComplianceResult(
            session_id=session_id,
            rule_id=rule_id,
            clause_id=clause_id,
            outcome=outcome,
            details=details,
            evaluated_at=datetime.now(UTC),
        )
        self.session.add(result)
        await self.session.flush()
        return result

    async def list_results_for_session(self, session_id: str) -> list[ComplianceResult]:
        stmt = select(ComplianceResult).where(ComplianceResult.session_id == session_id)
        res = await self.session.execute(stmt)
        return list(res.scalars().all())
