from collections.abc import AsyncGenerator
from datetime import UTC, datetime

from sqlalchemy import DateTime
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from app.core.config import settings
from app.utils.ids import generate_uuid7


class Base(DeclarativeBase):
    """SQLAlchemy DeclarativeBase with UUIDv7 ID and timestamps."""
    pass


class AuditMixin:
    """Base mixin providing UUIDv7 primary key and timestamp tracking."""

    id: Mapped[str] = mapped_column(
        primary_key=True,
        default=generate_uuid7,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )


# Async Engine & Sessionmaker
async_engine: AsyncEngine = create_async_engine(
    settings.DATABASE_URL,
    echo=(settings.ENV == "dev" and settings.LOG_LEVEL == "DEBUG"),
    future=True,
    pool_pre_ping=True,
)

async_session_factory = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """Dependency that yields an async database session."""
    async with async_session_factory() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
