import re
import secrets
from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerificationError, VerifyMismatchError

from app.core.config import settings
from app.core.exceptions import (
    AuthPasswordTooWeakError,
    AuthTokenExpiredError,
    AuthTokenInvalidError,
)
from app.utils.ids import generate_uuid7

# Argon2id password hasher with specified parameters
ph = PasswordHasher(
    time_cost=3,
    memory_cost=65536,  # 64 MB
    parallelism=4,
    hash_len=32,
)


def validate_password_strength(password: str) -> None:
    """Validates password policy: >= 12 characters, at least 1 letter and 1 digit."""
    if len(password) < 12:
        raise AuthPasswordTooWeakError("Password must be at least 12 characters long.")
    if not re.search(r"[a-zA-Z]", password):
        raise AuthPasswordTooWeakError("Password must contain at least one letter.")
    if not re.search(r"\d", password):
        raise AuthPasswordTooWeakError("Password must contain at least one digit.")


def hash_password(password: str) -> str:
    """Hash a plaintext password with Argon2id."""
    return ph.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    """Verify a password against an Argon2id hash."""
    try:
        return ph.verify(password_hash, password)
    except (VerifyMismatchError, VerificationError):
        return False


def password_needs_rehash(password_hash: str) -> bool:
    """Check if hash parameters require a rehash."""
    return ph.check_needs_rehash(password_hash)


def create_access_token(user_id: str, email: str, expires_delta: timedelta | None = None) -> str:
    """Create a 15-minute JWT access token."""
    now = datetime.now(UTC)
    expires_in = expires_delta or timedelta(seconds=settings.JWT_ACCESS_TTL_SECONDS)
    expire_time = now + expires_in
    jti = generate_uuid7()

    claims: dict[str, Any] = {
        "sub": user_id,
        "email": email,
        "iat": int(now.timestamp()),
        "exp": int(expire_time.timestamp()),
        "jti": jti,
        "type": "access",
    }
    return jwt.encode(claims, settings.JWT_SECRET, algorithm="HS256")


def create_refresh_token(user_id: str, expires_delta: timedelta | None = None) -> tuple[str, str, datetime]:
    """Create a rotating refresh token. Returns (token_str, jti, expire_datetime)."""
    now = datetime.now(UTC)
    expires_in = expires_delta or timedelta(days=settings.JWT_REFRESH_TTL_DAYS)
    expire_time = now + expires_in
    jti = generate_uuid7()

    claims: dict[str, Any] = {
        "sub": user_id,
        "iat": int(now.timestamp()),
        "exp": int(expire_time.timestamp()),
        "jti": jti,
        "type": "refresh",
    }
    token_str = jwt.encode(claims, settings.JWT_SECRET, algorithm="HS256")
    return token_str, jti, expire_time


def decode_jwt_token(token: str, expected_type: str = "access") -> dict[str, Any]:
    """Decode and validate a JWT token."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
        token_type = payload.get("type")
        if token_type != expected_type:
            raise AuthTokenInvalidError(f"Invalid token type: expected {expected_type}, got {token_type}")
        return payload
    except jwt.ExpiredSignatureError:
        raise AuthTokenExpiredError("Token has expired.")
    except jwt.PyJWTError:
        raise AuthTokenInvalidError("Token signature or payload is invalid.")


def generate_random_token(length_bytes: int = 32) -> str:
    """Generate a cryptographically secure hex token for password reset or anonymous sessions."""
    return secrets.token_hex(length_bytes)
