import hashlib
from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import (
    AuthAccountLockedError,
    AuthInvalidCredentialsError,
    AuthTokenExpiredError,
    AuthTokenInvalidError,
    ValidationError,
)
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_jwt_token,
    generate_random_token,
    hash_password,
    validate_password_strength,
    verify_password,
)
from app.repositories.audit_repo import AuditRepository
from app.repositories.user_repo import UserRepository

# In-memory rate limiting & lockout fallback (for when Redis is absent during local/unit tests)
_FAILED_LOGINS: dict[str, list[datetime]] = {}
_RESET_TOKENS: dict[str, tuple[str, datetime]] = {}  # token_hash -> (user_id, expires_at)


class AuthService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.user_repo = UserRepository(db)
        self.audit_repo = AuditRepository(db)

    async def register(
        self,
        email: str,
        password: str,
        display_name: str,
        ip_address: str | None = None,
    ) -> dict:
        # Validate password policy
        validate_password_strength(password)

        existing = await self.user_repo.get_by_email(email)
        if existing:
            raise ValidationError(
                message="An account with this email address already exists.",
                details=[{"field": "email", "message": "Email is already registered."}],
            )

        hashed = hash_password(password)
        user = await self.user_repo.create(
            email=email,
            password_hash=hashed,
            display_name=display_name,
            email_verified=False,
        )

        access_token = create_access_token(user.id, user.email)
        refresh_token_str, jti, expire_time = create_refresh_token(user.id)

        token_hash = hashlib.sha256(refresh_token_str.encode()).hexdigest()
        await self.user_repo.store_refresh_token(user.id, token_hash, jti, expire_time)

        await self.audit_repo.log_event(
            event_type="user.registered",
            actor_user_id=user.id,
            resource_type="user",
            resource_id=user.id,
            ip_address=ip_address,
        )
        await self.db.commit()

        return {
            "user": {
                "id": user.id,
                "email": user.email,
                "display_name": user.display_name,
            },
            "access_token": access_token,
            "refresh_token": refresh_token_str,
            "expires_in": settings.JWT_ACCESS_TTL_SECONDS,
        }

    async def login(
        self,
        email: str,
        password: str,
        ip_address: str | None = None,
    ) -> dict:
        email_clean = email.strip().lower()
        now = datetime.now(UTC)

        # Check account lockout (5 failures in 30 min)
        history = _FAILED_LOGINS.get(email_clean, [])
        valid_recent = [t for t in history if (now - t).total_seconds() < 1800]
        _FAILED_LOGINS[email_clean] = valid_recent

        if len(valid_recent) >= 5:
            raise AuthAccountLockedError("Account is locked due to 5 consecutive failed attempts. Try again in 30 minutes.")

        user = await self.user_repo.get_by_email(email_clean)
        if not user or not verify_password(password, user.password_hash):
            _FAILED_LOGINS[email_clean].append(now)
            await self.audit_repo.log_event(
                event_type="user.login_failed",
                metadata_json={"email": email_clean},
                ip_address=ip_address,
            )
            await self.db.commit()
            raise AuthInvalidCredentialsError("Invalid email or password.")

        # Clear failed logins on successful login
        _FAILED_LOGINS.pop(email_clean, None)

        access_token = create_access_token(user.id, user.email)
        refresh_token_str, jti, expire_time = create_refresh_token(user.id)

        token_hash = hashlib.sha256(refresh_token_str.encode()).hexdigest()
        await self.user_repo.store_refresh_token(user.id, token_hash, jti, expire_time)

        await self.audit_repo.log_event(
            event_type="user.logged_in",
            actor_user_id=user.id,
            resource_type="user",
            resource_id=user.id,
            ip_address=ip_address,
        )
        await self.db.commit()

        return {
            "user": {
                "id": user.id,
                "email": user.email,
                "display_name": user.display_name,
            },
            "access_token": access_token,
            "refresh_token": refresh_token_str,
            "expires_in": settings.JWT_ACCESS_TTL_SECONDS,
        }

    async def refresh(self, refresh_token_str: str) -> dict:
        payload = decode_jwt_token(refresh_token_str, expected_type="refresh")
        user_id = payload.get("sub")
        jti = payload.get("jti")

        if not user_id or not jti:
            raise AuthTokenInvalidError("Invalid refresh token claims.")

        stored = await self.user_repo.get_refresh_token(jti)
        if not stored:
            raise AuthTokenInvalidError("Refresh token not recognized.")

        if stored.revoked_at is not None:
            # Replay attack detected: revoke entire token family for this user
            await self.user_repo.revoke_all_user_tokens(user_id)
            await self.audit_repo.log_event(
                event_type="authz.violation",
                actor_user_id=user_id,
                metadata_json={"reason": "replayed_refresh_token", "jti": jti},
            )
            await self.db.commit()
            raise AuthTokenInvalidError("Refresh token was previously revoked. All sessions invalidated.")

        now = datetime.now(UTC)
        stored_exp = stored.expires_at.replace(tzinfo=UTC) if stored.expires_at.tzinfo is None else stored.expires_at
        if stored_exp < now:
            raise AuthTokenExpiredError("Refresh token expired.")

        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise AuthTokenInvalidError("User not found.")

        # Invalidate old token
        await self.user_repo.revoke_refresh_token(jti)

        # Issue new token pair
        new_access = create_access_token(user.id, user.email)
        new_refresh, new_jti, new_expire = create_refresh_token(user.id)
        new_hash = hashlib.sha256(new_refresh.encode()).hexdigest()
        await self.user_repo.store_refresh_token(user.id, new_hash, new_jti, new_expire)
        await self.db.commit()

        return {
            "access_token": new_access,
            "refresh_token": new_refresh,
            "expires_in": settings.JWT_ACCESS_TTL_SECONDS,
        }

    async def logout(self, user_id: str, jti: str | None = None) -> None:
        if jti:
            await self.user_repo.revoke_refresh_token(jti)
        else:
            await self.user_repo.revoke_all_user_tokens(user_id)
        await self.audit_repo.log_event(
            event_type="user.logged_out",
            actor_user_id=user_id,
        )
        await self.db.commit()

    async def request_password_reset(self, email: str, ip_address: str | None = None) -> dict:
        email_clean = email.strip().lower()
        user = await self.user_repo.get_by_email(email_clean)
        if user:
            raw_token = generate_random_token(32)
            token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
            from datetime import timedelta
            expires_at = datetime.now(UTC) + timedelta(hours=1)
            _RESET_TOKENS[token_hash] = (user.id, expires_at)

        await self.audit_repo.log_event(
            event_type="user.password_reset_requested",
            metadata_json={"email": email_clean},
            ip_address=ip_address,
        )
        await self.db.commit()
        # Always return anti-enumeration 202 message
        return {"message": "If the account exists, a reset link was sent."}

    async def redeem_password_reset(self, token: str, new_password: str) -> dict:
        validate_password_strength(new_password)
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        record = _RESET_TOKENS.pop(token_hash, None)

        if not record:
            raise AuthInvalidCredentialsError("Invalid or expired password reset token.")

        user_id, expires_at = record
        if expires_at < datetime.now(UTC):
            raise AuthInvalidCredentialsError("Password reset token has expired.")

        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise AuthInvalidCredentialsError("User account not found.")

        new_hash = hash_password(new_password)
        await self.user_repo.update_user(user.id, password_hash=new_hash)
        await self.user_repo.revoke_all_user_tokens(user.id)

        access_token = create_access_token(user.id, user.email)
        refresh_token_str, jti, expire_time = create_refresh_token(user.id)
        token_hash_stored = hashlib.sha256(refresh_token_str.encode()).hexdigest()
        await self.user_repo.store_refresh_token(user.id, token_hash_stored, jti, expire_time)

        await self.audit_repo.log_event(
            event_type="user.password_reset_redeemed",
            actor_user_id=user.id,
            resource_type="user",
            resource_id=user.id,
        )
        await self.db.commit()

        return {
            "access_token": access_token,
            "refresh_token": refresh_token_str,
            "expires_in": settings.JWT_ACCESS_TTL_SECONDS,
        }
