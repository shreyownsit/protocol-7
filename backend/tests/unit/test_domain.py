from datetime import UTC, datetime, timedelta, timezone

import pytest

from app.domain.clauses import ClauseDomain, ClauseType, NodeType
from app.domain.findings import FindingDomain, FindingType, Severity, get_severity_ordinal
from app.domain.sessions import PrivacyMode, SaveState, SessionDomain, SessionStatus


def test_session_domain_expiry_calculation():
    now = datetime.now(UTC)
    # Default 30 min inactivity vs 24h absolute cap
    expires_at = SessionDomain.calculate_expiry(
        created_at=now,
        last_activity_at=now,
        inactivity_seconds=1800,
        absolute_lifetime_seconds=86400,
    )
    assert (expires_at - now).total_seconds() == pytest.approx(1800, abs=2)


def test_severity_ordinals():
    assert get_severity_ordinal(Severity.INFO) == 0
    assert get_severity_ordinal(Severity.LOW) == 1
    assert get_severity_ordinal(Severity.MEDIUM) == 2
    assert get_severity_ordinal(Severity.HIGH) == 3
    assert get_severity_ordinal(Severity.CRITICAL) == 4


def test_clause_domain_instantiation():
    clause = ClauseDomain(
        id="c1",
        document_id="d1",
        node_type=NodeType.CLAUSE,
        clause_type=ClauseType.PENALTY,
        path="1.1",
        text="Tenant shall pay a late fee of $50.",
        page_number=1,
    )
    assert clause.id == "c1"
    assert clause.clause_type == ClauseType.PENALTY
    assert clause.node_type == NodeType.CLAUSE
