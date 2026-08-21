from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    ENV: str = "dev"
    ENVIRONMENT: str = "development"
    DATABASE_URL: str = "sqlite+aiosqlite:///./lexiclear.db"
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    # Security secrets
    SECRET_KEY: str = Field(default="dev_secret_key_at_least_32_characters_long_12345")
    JWT_SECRET: str = Field(default="dev_jwt_secret_key_at_least_32_characters_long_12345")
    JWT_ACCESS_TTL_SECONDS: int = 900  # 15 min
    JWT_REFRESH_TTL_DAYS: int = 7

    # Object storage
    OBJECT_STORAGE_ENDPOINT: str = "http://localhost:9000"
    OBJECT_STORAGE_BUCKET: str = "lexiclear-dev"
    OBJECT_STORAGE_REGION: str = "us-east-1"
    OBJECT_STORAGE_ACCESS_KEY: str = "minioadmin"
    OBJECT_STORAGE_SECRET_KEY: str = "minioadmin"
    OBJECT_STORAGE_USE_SSL: bool = False

    # AI / LLM
    CLAUDE_API_KEY: str | None = None
    CLAUDE_MODEL: str = "claude-sonnet-4-20250514"
    CLAUDE_BASE_URL: str | None = None
    AI_MAX_RETRIES: int = 2

    # Audio / TTS
    TTS_API_KEY: str | None = None
    TTS_PROVIDER: str = "openai"
    AUDIO_ARTIFACT_TTL_SECONDS: int = 86400
    AUDIO_ENABLED_IN_STRICT_MODE: bool = False

    # Encryption: 32 bytes hex string (64 hex characters)
    ENCRYPTION_KEY: str = Field(
        default="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
    )

    # Session & Lifecycle
    SESSION_TTL_SECONDS: int = 86400  # 24 h
    SESSION_INACTIVITY_TTL_SECONDS: int = 3600  # 60 min
    UPLOAD_MAX_SIZE_BYTES: int = 26214400  # 25 MB

    # Rate Limiting
    RATE_LIMIT_LOGIN_PER_MIN: int = 10
    RATE_LIMIT_UPLOAD_PER_HOUR: int = 30
    RATE_LIMIT_API_PER_MIN: int = 120

    # Signed URLs & Artifacts
    SIGNED_URL_TTL_SECONDS: int = 300  # 5 min
    EXPORT_ARTIFACT_TTL_SECONDS: int = 86400

    # CORS & Observability
    ALLOWED_ORIGINS: str = "http://localhost:3000"
    CORS_ORIGINS: str = "http://localhost:3000"
    LOG_LEVEL: str = "INFO"
    SENTRY_DSN: str | None = None

    # Risk Engine Weights
    RISK_WEIGHT_SEVERITY: float = 0.30
    RISK_WEIGHT_CONFIDENCE: float = 0.25
    RISK_WEIGHT_FINANCIAL: float = 0.20
    RISK_WEIGHT_CONTRADICTION: float = 0.15
    RISK_WEIGHT_PRIORITY: float = 0.10

    # Negotiation
    NEGOTIATION_MAX_REGENERATIONS: int = 2

    @property
    def sync_database_url(self) -> str:
        """Derive synchronous database URL for Alembic migrations."""
        if self.DATABASE_URL.startswith("postgresql+asyncpg://"):
            return self.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://", 1)
        return self.DATABASE_URL

    @property
    def allowed_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in (self.CORS_ORIGINS or self.ALLOWED_ORIGINS).split(",") if origin.strip()]

    @field_validator("SECRET_KEY", "JWT_SECRET")
    @classmethod
    def validate_min_length(cls, v: str) -> str:
        if len(v) < 32:
            raise ValueError("Secret keys must be at least 32 characters long")
        return v

    @field_validator("ENCRYPTION_KEY")
    @classmethod
    def validate_encryption_key(cls, v: str) -> str:
        if len(v) < 64:
            raise ValueError("ENCRYPTION_KEY must be a 32-byte hex string (64 characters)")
        return v


settings = Settings()
