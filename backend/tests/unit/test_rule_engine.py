import pytest

from app.processing.rule_engine import RuleEngineContext, rule_engine


def test_rule_engine_security_deposit_violation():
    ctx = RuleEngineContext(
        jurisdiction="US-CA",
        agreement_type="residential_lease",
        clause_type="penalty",
        clause_text="Tenant shall provide a security deposit in the amount of $4,000.",
        variables={"monthly_rent": 1800.0},
    )

    # Deposit > 1 * monthly_rent ($4000 > $1800) -> Violation
    expr = "clause.clause_type == 'penalty' and clause.extract_money() > 1 * extract_variable('monthly_rent')"
    outcome, details = rule_engine.evaluate_condition(expr, ctx)
    assert outcome == "violation"


def test_rule_engine_security_deposit_satisfied():
    ctx = RuleEngineContext(
        jurisdiction="US-CA",
        agreement_type="residential_lease",
        clause_type="penalty",
        clause_text="Tenant shall provide a security deposit in the amount of $1,500.",
        variables={"monthly_rent": 1800.0},
    )

    # Deposit <= 1 * monthly_rent ($1500 <= $1800) -> Satisfied
    expr = "clause.clause_type == 'penalty' and clause.extract_money() > 1 * extract_variable('monthly_rent')"
    outcome, details = rule_engine.evaluate_condition(expr, ctx)
    assert outcome == "satisfied"


def test_rule_engine_notice_of_entry():
    ctx_bad = RuleEngineContext(
        jurisdiction="US-CA",
        agreement_type="residential_lease",
        clause_type="grant",
        clause_text="Landlord may enter the premises to inspect at any reasonable time.",
    )
    # Notice rule: has enter/inspect but missing '24 hours'
    expr = "clause.clause_type == 'grant' and text_matches('enter|inspect') and not text_matches('24 hours')"
    outcome_bad, _ = rule_engine.evaluate_condition(expr, ctx_bad)
    assert outcome_bad == "violation"

    ctx_good = RuleEngineContext(
        jurisdiction="US-CA",
        agreement_type="residential_lease",
        clause_type="grant",
        clause_text="Landlord may enter the premises upon providing at least 24 hours prior written notice.",
    )
    outcome_good, _ = rule_engine.evaluate_condition(expr, ctx_good)
    assert outcome_good == "satisfied"
