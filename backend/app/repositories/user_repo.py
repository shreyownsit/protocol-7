from datetime import UTC, datetime

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.repositories.models import RefreshToken, User, UserPreference


class UserRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_id(self, user_id: str) -> User | None:
        stmt = select(User).where(User.id == user_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> User | None:
        stmt = select(User).where(User.email == email.lower())
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def create(self, email: str, password_hash: str, display_name: str, email_verified: bool = False) -> User:
        user = User(
            email=email.lower(),
            password_hash=password_hash,
            display_name=display_name,
            email_verified=email_verified,
        )
        self.session.add(user)
        await self.session.flush()

        # Create default preferences
        pref = UserPreference(user_id=user.id)
        self.session.add(pref)
        await self.session.flush()
        return user

    async def update_user(self, user_id: str, **kwargs) -> User:
        stmt = update(User).where(User.id == user_id).values(**kwargs).returning(User)
        result = await self.session.execute(stmt)
        user = result.scalar_one_or_none()
        if not user:
            raise NotFoundError("User not found.")
        return user

    async def get_preferences(self, user_id: str) -> UserPreference | None:
        stmt = select(UserPreference).where(UserPreference.user_id == user_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def update_preferences(self, user_id: str, **kwargs) -> UserPreference:
        stmt = (
            update(UserPreference)
            .where(UserPreference.user_id == user_id)
            .values(**kwargs, updated_at=datetime.now(UTC))
            .returning(UserPreference)
        )
        result = await self.session.execute(stmt)
        pref = result.scalar_one_or_none()
        if not pref:
            pref = UserPreference(user_id=user_id, **kwargs)
            self.session.add(pref)
            await self.session.flush()
        return pref

    async def store_refresh_token(self, user_id: str, token_hash: str, jti: str, expires_at: datetime) -> RefreshToken:
        rt = RefreshToken(
            user_id=user_id,
            token_hash=token_hash,
            jti=jti,
            expires_at=expires_at,
        )
        self.session.add(rt)
        await self.session.flush()
        return rt

    async def get_refresh_token(self, jti: str) -> RefreshToken | None:
        stmt = select(RefreshToken).where(RefreshToken.jti == jti)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def revoke_refresh_token(self, jti: str) -> None:
        stmt = update(RefreshToken).where(RefreshToken.jti == jti).values(revoked_at=datetime.now(UTC))
        await self.session.execute(stmt)

    async def revoke_all_user_tokens(self, user_id: str) -> None:
        stmt = update(RefreshToken).where(RefreshToken.user_id == user_id).values(revoked_at=datetime.now(UTC))
        await self.session.execute(stmt)
