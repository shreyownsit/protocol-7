import asyncio
from app.domain.compliance import ComplianceOutcome
from app.domain.findings import Severity
from app.repositories.base import async_session_factory
from app.repositories.compliance_repo import ComplianceRepository


async def seed_compliance_rules():
    rules_data = [
        {
            "id": "CA_SECURITY_DEPOSIT_CAP",
            "jurisdiction": "US-CA",
            "agreement_type": "residential_lease",
            "name": "California Security Deposit Statutory Cap (AB 12 / Civ. Code § 1950.5)",
            "statute_reference": "Cal. Civ. Code § 1950.5",
            "severity": Severity.CRITICAL.value,
            "condition_expr": "clause.clause_type == 'penalty' and clause.extract_money() > 1 * extract_variable('monthly_rent')",
            "message_template": "Security deposit exceeds the California statutory limit of 1 month's rent for unfurnished residential leases.",
            "remediation_hint": "Cap the security deposit at an amount not exceeding one month's rent pursuant to California AB 12.",
        },
        {
            "id": "CA_LATE_FEE_REASONABLENESS",
            "jurisdiction": "US-CA",
            "agreement_type": "residential_lease",
            "name": "California Late Fee Liquidated Damages Standard (Civ. Code § 1671)",
            "statute_reference": "Cal. Civ. Code § 1671",
            "severity": Severity.HIGH.value,
            "condition_expr": "clause.clause_type == 'penalty' and clause.extract_money() > 0.05 * extract_variable('monthly_rent')",
            "message_template": "Daily late penalty exceeds standard statutory liquidated damages threshold (5% of monthly rent).",
            "remediation_hint": "Replace daily accumulating penalties with a reasonable fixed late fee not exceeding 5% after a 5-day grace period.",
        },
        {
            "id": "CA_NOTICE_OF_ENTRY",
            "jurisdiction": "US-CA",
            "agreement_type": "residential_lease",
            "name": "California 24-Hour Landlord Notice of Entry Requirement (Civ. Code § 1954)",
            "statute_reference": "Cal. Civ. Code § 1954",
            "severity": Severity.HIGH.value,
            "condition_expr": "clause.clause_type == 'grant' and clause.has_number('entry', 'inspect') and not text_matches('24 hours')",
            "message_template": "Non-emergency landlord entry clause fails to specify the required 24 hours written notice.",
            "remediation_hint": "Include explicit language requiring at least 24 hours prior written notice before non-emergency entry.",
        },
        {
            "id": "CA_AUTOMATIC_RENEWAL",
            "jurisdiction": "US-CA",
            "agreement_type": "residential_lease",
            "name": "California Automatic Renewal Prominence Requirement (Civ. Code § 1945.5)",
            "statute_reference": "Cal. Civ. Code § 1945.5",
            "severity": Severity.MEDIUM.value,
            "condition_expr": "clause.clause_type == 'covenant' and text_matches('automatically renew') and not text_matches('30 days')",
            "message_template": "Automatic lease renewal lacks statutory 30-day notice window or conspicuous typeface disclosure.",
            "remediation_hint": "Specify written notice requirements for automatic renewal with 30-60 days advance notice.",
        },
    ]

    async with async_session_factory() as db:
        repo = ComplianceRepository(db)
        for r in rules_data:
            await repo.create_rule(
                rule_id=r["id"],
                jurisdiction=r["jurisdiction"],
                agreement_type=r["agreement_type"],
                name=r["name"],
                statute_reference=r["statute_reference"],
                severity=r["severity"],
                condition_expr=r["condition_expr"],
                message_template=r["message_template"],
                remediation_hint=r["remediation_hint"],
            )
        await db.commit()
        print(f"Successfully seeded {len(rules_data)} statutory compliance rules.")


if __name__ == "__main__":
    asyncio.run(seed_compliance_rules())
