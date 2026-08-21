from datetime import UTC, datetime
from typing import Any

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from app.domain.audio import AudioStatus
from app.domain.clauses import ClauseType, NodeType, RelationshipType
from app.domain.compliance import ComplianceOutcome
from app.domain.documents import DocumentSource, DocumentStatus, PageOCRStatus
from app.domain.exports import ExportFormat, ExportStatus
from app.domain.findings import FindingType, Severity
from app.domain.negotiation import (
    CounterClauseStatus,
    NegotiationStage,
    NegotiationStatus,
    NegotiationStepType,
)
from app.domain.risk import RiskCategory
from app.domain.sessions import AnalysisStatus, PrivacyMode, SaveState, SessionStatus
from app.domain.simulation import SimulationStatus
from app.repositories.base import AuditMixin, Base
from app.utils.ids import generate_uuid7

# JSON type that works with SQLite (for in-memory fast tests) and PostgreSQL
JsonType = JSON().with_variant(JSONB, "postgresql")


class User(Base, AuditMixin):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    display_name: Mapped[str] = mapped_column(String(100), nullable=False)

    preferences: Mapped["UserPreference"] = relationship(
        "UserPreference", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    sessions: Mapped[list["Session"]] = relationship("Session", back_populates="user")
    refresh_tokens: Mapped[list["RefreshToken"]] = relationship(
        "RefreshToken", back_populates="user", cascade="all, delete-orphan"
    )


class UserPreference(Base):
    __tablename__ = "user_preferences"

    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    language_code: Mapped[str] = mapped_column(String(10), default="en", nullable=False)
    notifications_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )

    user: Mapped["User"] = relationship("User", back_populates="preferences")


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid7)
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    jti: Mapped[str] = mapped_column(String(36), unique=True, index=True, nullable=False)
    token_hash: Mapped[str] = mapped_column(String(128), index=True, nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )

    user: Mapped["User"] = relationship("User", back_populates="refresh_tokens")


class Session(Base, AuditMixin):
    __tablename__ = "sessions"

    user_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), index=True, nullable=True
    )
    document_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default=SessionStatus.ACTIVE.value, nullable=False)
    save_state: Mapped[str] = mapped_column(String(32), default=SaveState.UNSAVED.value, nullable=False)
    privacy_mode: Mapped[str] = mapped_column(
        String(32), default=PrivacyMode.STANDARD.value, nullable=False
    )
    title: Mapped[str | None] = mapped_column(String(200), nullable=True)
    analysis_status: Mapped[str] = mapped_column(
        String(32), default=AnalysisStatus.NONE.value, nullable=False
    )
    summary_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    graph_payload: Mapped[dict[str, Any] | None] = mapped_column(JsonType, nullable=True)
    last_activity_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True, nullable=False)

    user: Mapped["User | None"] = relationship("User", back_populates="sessions")
    documents: Mapped[list["Document"]] = relationship(
        "Document", back_populates="session", cascade="all, delete-orphan"
    )
    findings: Mapped[list["Finding"]] = relationship(
        "Finding", back_populates="session", cascade="all, delete-orphan"
    )
    simulations: Mapped[list["Simulation"]] = relationship(
        "Simulation", back_populates="session", cascade="all, delete-orphan"
    )
    negotiations: Mapped[list["Negotiation"]] = relationship(
        "Negotiation", back_populates="session", cascade="all, delete-orphan"
    )
    exports: Mapped[list["Export"]] = relationship(
        "Export", back_populates="session", cascade="all, delete-orphan"
    )
    audio_requests: Mapped[list["AudioRequest"]] = relationship(
        "AudioRequest", back_populates="session", cascade="all, delete-orphan"
    )
    risk_models: Mapped[list["RiskModel"]] = relationship(
        "RiskModel", back_populates="session", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_sessions_user_status", "user_id", "status"),
    )


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid7)
    session_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("sessions.id", ondelete="CASCADE"), index=True, nullable=False
    )
    user_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), index=True, nullable=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(128), nullable=False)
    size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    content_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    page_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[str] = mapped_column(
        String(32), default=DocumentStatus.UPLOADING.value, nullable=False
    )
    source: Mapped[str] = mapped_column(
        String(32), default=DocumentSource.FILE.value, nullable=False
    )
    processing_error_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )

    session: Mapped["Session"] = relationship("Session", back_populates="documents")
    pages: Mapped[list["DocumentPage"]] = relationship(
        "DocumentPage", back_populates="document", cascade="all, delete-orphan"
    )
    clauses: Mapped[list["Clause"]] = relationship(
        "Clause", back_populates="document", cascade="all, delete-orphan"
    )

    __table_args__ = (
        UniqueConstraint("session_id", "content_hash", name="uq_documents_session_hash"),
        Index("ix_documents_status", "status"),
    )


class DocumentPage(Base):
    __tablename__ = "document_pages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid7)
    document_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("documents.id", ondelete="CASCADE"), index=True, nullable=False
    )
    page_number: Mapped[int] = mapped_column(Integer, nullable=False)
    width_px: Mapped[int] = mapped_column(Integer, default=1700, nullable=False)
    height_px: Mapped[int] = mapped_column(Integer, default=2200, nullable=False)
    ocr_status: Mapped[str] = mapped_column(
        String(32), default=PageOCRStatus.PENDING.value, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )

    document: Mapped["Document"] = relationship("Document", back_populates="pages")

    __table_args__ = (
        UniqueConstraint("document_id", "page_number", name="uq_document_pages_number"),
    )


class Clause(Base):
    __tablename__ = "clauses"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid7)
    document_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("documents.id", ondelete="CASCADE"), index=True, nullable=False
    )
    parent_clause_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("clauses.id", ondelete="CASCADE"), nullable=True
    )
    path: Mapped[str] = mapped_column(String(255), nullable=False)
    node_type: Mapped[str] = mapped_column(
        String(32), default=NodeType.CLAUSE.value, nullable=False
    )
    clause_type: Mapped[str] = mapped_column(
        String(32), default=ClauseType.OTHER.value, nullable=False
    )
    heading: Mapped[str | None] = mapped_column(String(255), nullable=True)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    page_number: Mapped[int] = mapped_column(Integer, nullable=False)
    bbox: Mapped[dict[str, Any]] = mapped_column(JsonType, nullable=False)
    source_text_raw: Mapped[str] = mapped_column(Text, nullable=False)
    confidence: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )

    document: Mapped["Document"] = relationship("Document", back_populates="clauses")
    parent: Mapped["Clause | None"] = relationship(
        "Clause", remote_side=[id], back_populates="children"
    )
    children: Mapped[list["Clause"]] = relationship(
        "Clause", back_populates="parent", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_clauses_document_path", "document_id", "path"),
        Index("ix_clauses_parent", "parent_clause_id"),
    )


class ClauseRelationship(Base):
    __tablename__ = "clause_relationships"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid7)
    document_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("documents.id", ondelete="CASCADE"), index=True, nullable=False
    )
    source_clause_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("clauses.id", ondelete="CASCADE"), index=True, nullable=False
    )
    target_clause_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("clauses.id", ondelete="CASCADE"), index=True, nullable=False
    )
    relationship_type: Mapped[str] = mapped_column(
        String(32), default=RelationshipType.REFERENCES.value, nullable=False
    )
    evidence_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )

    __table_args__ = (
        UniqueConstraint(
            "source_clause_id", "target_clause_id", "relationship_type",
            name="uq_clause_relationships_src_tgt_type"
        ),
    )


class ComplianceRule(Base):
    __tablename__ = "compliance_rules"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    jurisdiction: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    agreement_type: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    rule_version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    condition_expr: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[str] = mapped_column(String(32), default=Severity.HIGH.value, nullable=False)
    message_template: Mapped[str] = mapped_column(Text, nullable=False)
    statute_reference: Mapped[str | None] = mapped_column(String(255), nullable=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )

    __table_args__ = (
        UniqueConstraint("name", "jurisdiction", "rule_version", name="uq_compliance_rules_name_jur_ver"),
    )


class Finding(Base):
    __tablename__ = "findings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid7)
    session_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("sessions.id", ondelete="CASCADE"), index=True, nullable=False
    )
    finding_type: Mapped[str] = mapped_column(
        String(32), default=FindingType.COMPLIANCE.value, nullable=False
    )
    severity: Mapped[str] = mapped_column(
        String(32), default=Severity.MEDIUM.value, nullable=False
    )
    confidence: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    statute_reference: Mapped[str | None] = mapped_column(String(255), nullable=True)
    rule_id: Mapped[str | None] = mapped_column(
        String(64), ForeignKey("compliance_rules.id", ondelete="SET NULL"), nullable=True
    )
    clause_ids: Mapped[list[str]] = mapped_column(JsonType, default=list, nullable=False)
    evidence: Mapped[dict[str, Any] | list[Any]] = mapped_column(JsonType, default=dict, nullable=False)
    financial_exposure: Mapped[dict[str, Any] | None] = mapped_column(JsonType, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )

    session: Mapped["Session"] = relationship("Session", back_populates="findings")

    __table_args__ = (
        Index("ix_findings_session_type", "session_id", "finding_type"),
    )


class ComplianceResult(Base):
    __tablename__ = "compliance_results"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid7)
    session_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("sessions.id", ondelete="CASCADE"), index=True, nullable=False
    )
    rule_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("compliance_rules.id", ondelete="CASCADE"), index=True, nullable=False
    )
    clause_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("clauses.id", ondelete="CASCADE"), nullable=True
    )
    outcome: Mapped[str] = mapped_column(
        String(32), default=ComplianceOutcome.NOT_APPLICABLE.value, nullable=False
    )
    details: Mapped[dict[str, Any] | None] = mapped_column(JsonType, nullable=True)
    evaluated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )

    __table_args__ = (
        UniqueConstraint("session_id", "rule_id", "clause_id", name="uq_compliance_results_sess_rule_clause"),
    )


class RiskModel(Base):
    __tablename__ = "risk_models"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid7)
    session_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("sessions.id", ondelete="CASCADE"), index=True, nullable=False
    )
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    formula_doc: Mapped[str] = mapped_column(Text, nullable=False)
    overall_risk: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )

    session: Mapped["Session"] = relationship("Session", back_populates="risk_models")
    variables: Mapped[list["RiskVariable"]] = relationship(
        "RiskVariable", back_populates="model", cascade="all, delete-orphan"
    )


class RiskVariable(Base):
    __tablename__ = "risk_variables"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid7)
    model_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("risk_models.id", ondelete="CASCADE"), index=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    category: Mapped[str] = mapped_column(
        String(32), default=RiskCategory.SEVERITY.value, nullable=False
    )
    value: Mapped[float] = mapped_column(Float, nullable=False)
    weight: Mapped[float] = mapped_column(Float, nullable=False)
    evidence_refs: Mapped[dict[str, Any] | list[Any] | None] = mapped_column(JsonType, nullable=True)

    model: Mapped["RiskModel"] = relationship("RiskModel", back_populates="variables")

    __table_args__ = (
        UniqueConstraint("model_id", "name", name="uq_risk_variables_model_name"),
    )


class Simulation(Base, AuditMixin):
    __tablename__ = "simulations"

    session_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("sessions.id", ondelete="CASCADE"), index=True, nullable=False
    )
    title: Mapped[str] = mapped_column(String(200), default="Contract Simulation", nullable=False)
    variables: Mapped[dict[str, Any]] = mapped_column(JsonType, default=dict, nullable=False)
    formulas: Mapped[dict[str, Any]] = mapped_column(JsonType, default=dict, nullable=False)
    status: Mapped[str] = mapped_column(
        String(32), default=SimulationStatus.ACTIVE.value, nullable=False
    )

    session: Mapped["Session"] = relationship("Session", back_populates="simulations")
    runs: Mapped[list["SimulationRun"]] = relationship(
        "SimulationRun", back_populates="simulation", cascade="all, delete-orphan"
    )


class SimulationRun(Base):
    __tablename__ = "simulation_runs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid7)
    simulation_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("simulations.id", ondelete="CASCADE"), index=True, nullable=False
    )
    scenario: Mapped[dict[str, Any]] = mapped_column(JsonType, nullable=False)
    results: Mapped[dict[str, Any] | None] = mapped_column(JsonType, nullable=True)
    client_evaluated: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    computed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )

    simulation: Mapped["Simulation"] = relationship("Simulation", back_populates="runs")


class Negotiation(Base, AuditMixin):
    __tablename__ = "negotiations"

    session_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("sessions.id", ondelete="CASCADE"), index=True, nullable=False
    )
    clause_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("clauses.id", ondelete="CASCADE"), index=True, nullable=False
    )
    status: Mapped[str] = mapped_column(
        String(32), default=NegotiationStatus.QUEUED.value, nullable=False
    )
    current_stage: Mapped[str] = mapped_column(
        String(32), default=NegotiationStage.PROSECUTOR.value, nullable=False
    )
    retry_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    counter_clause_id: Mapped[str | None] = mapped_column(String(36), nullable=True)

    session: Mapped["Session"] = relationship("Session", back_populates="negotiations")
    steps: Mapped[list["NegotiationStep"]] = relationship(
        "NegotiationStep", back_populates="negotiation", cascade="all, delete-orphan"
    )
    counter_clause: Mapped["CounterClause | None"] = relationship(
        "CounterClause", back_populates="negotiation", uselist=False
    )


class NegotiationStep(Base):
    __tablename__ = "negotiation_steps"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid7)
    negotiation_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("negotiations.id", ondelete="CASCADE"), index=True, nullable=False
    )
    agent: Mapped[str] = mapped_column(String(32), nullable=False)
    step_type: Mapped[str] = mapped_column(
        String(32), default=NegotiationStepType.STARTED.value, nullable=False
    )
    payload: Mapped[dict[str, Any]] = mapped_column(JsonType, default=dict, nullable=False)
    event_id: Mapped[str] = mapped_column(String(36), default=generate_uuid7, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )

    negotiation: Mapped["Negotiation"] = relationship("Negotiation", back_populates="steps")

    __table_args__ = (
        Index("ix_negotiation_steps_event", "negotiation_id", "event_id"),
    )


class CounterClause(Base):
    __tablename__ = "counter_clauses"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid7)
    negotiation_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("negotiations.id", ondelete="CASCADE"), index=True, nullable=False
    )
    session_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("sessions.id", ondelete="CASCADE"), index=True, nullable=False
    )
    original_clause_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("clauses.id", ondelete="CASCADE"), index=True, nullable=False
    )
    counter_text: Mapped[str] = mapped_column(Text, nullable=False)
    rationale: Mapped[str] = mapped_column(Text, nullable=False)
    compliance_check_result: Mapped[dict[str, Any] | None] = mapped_column(JsonType, nullable=True)
    status: Mapped[str] = mapped_column(
        String(32), default=CounterClauseStatus.DRAFT.value, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )

    negotiation: Mapped["Negotiation"] = relationship("Negotiation", back_populates="counter_clause")


class AudioRequest(Base):
    __tablename__ = "audio_requests"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid7)
    session_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("sessions.id", ondelete="CASCADE"), index=True, nullable=False
    )
    summary_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    language_code: Mapped[str] = mapped_column(String(10), default="en", nullable=False)
    voice: Mapped[str | None] = mapped_column(String(32), nullable=True)
    status: Mapped[str] = mapped_column(
        String(32), default=AudioStatus.QUEUED.value, nullable=False
    )
    storage_key: Mapped[str | None] = mapped_column(String(255), nullable=True)
    duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )

    session: Mapped["Session"] = relationship("Session", back_populates="audio_requests")


class Export(Base):
    __tablename__ = "exports"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid7)
    session_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("sessions.id", ondelete="CASCADE"), index=True, nullable=False
    )
    format: Mapped[str] = mapped_column(String(10), default=ExportFormat.PDF.value, nullable=False)
    contents: Mapped[dict[str, Any]] = mapped_column(JsonType, nullable=False)
    status: Mapped[str] = mapped_column(
        String(32), default=ExportStatus.QUEUED.value, nullable=False
    )
    storage_key: Mapped[str | None] = mapped_column(String(255), nullable=True)
    url_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )

    session: Mapped["Session"] = relationship("Session", back_populates="exports")


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    actor_user_id: Mapped[str | None] = mapped_column(String(36), index=True, nullable=True)
    event_type: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    resource_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    resource_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    metadata_json: Mapped[dict[str, Any] | None] = mapped_column(JsonType, nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), index=True, nullable=False
    )


class DiffResult(Base):
    __tablename__ = "diff_results"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid7)
    session_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("sessions.id", ondelete="CASCADE"), index=True, nullable=False
    )
    document_a_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False
    )
    document_b_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False
    )
    status: Mapped[str] = mapped_column(String(32), default="ready", nullable=False)
    summary: Mapped[dict[str, Any]] = mapped_column(JsonType, default=dict, nullable=False)
    changes: Mapped[list[Any]] = mapped_column(JsonType, default=list, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )

    __table_args__ = (
        UniqueConstraint("document_a_id", "document_b_id", name="uq_diff_results_doc_pair"),
    )
