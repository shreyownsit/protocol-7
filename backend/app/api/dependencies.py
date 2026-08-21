from typing import Annotated

from fastapi import Depends, Header, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AuthTokenExpiredError, AuthTokenInvalidError
from app.core.security import decode_jwt_token
from app.repositories.base import get_db_session


async def get_db(request: Request) -> AsyncSession:
    """Yields a database session per request via the FastAPI dependency."""
    async for session in get_db_session():
        yield session


DbSession = Annotated[AsyncSession, Depends(get_db)]


def _extract_bearer_token(authorization: str | None) -> str | None:
    if not authorization:
        return None
    parts = authorization.split(" ", 1)
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1]
    return None


async def get_current_user_id(
    authorization: Annotated[str | None, Header()] = None,
) -> str | None:
    """Extracts and validates the JWT access token. Returns user_id or None for anonymous."""
    token = _extract_bearer_token(authorization)
    if not token:
        return None

    try:
        payload = decode_jwt_token(token, expected_type="access")
        user_id = payload.get("sub")
        if not user_id:
            raise AuthTokenInvalidError("Token missing subject claim.")
        return user_id
    except AuthTokenExpiredError:
        raise HTTPException(status_code=401, detail="Access token expired.")
    except AuthTokenInvalidError:
        raise HTTPException(status_code=401, detail="Invalid access token.")


async def require_authenticated_user(
    authorization: Annotated[str | None, Header()] = None,
) -> str:
    """Like get_current_user_id but raises 401 if no valid token is present."""
    user_id = await get_current_user_id(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required.")
    return user_id


CurrentUserId = Annotated[str | None, Depends(get_current_user_id)]
RequiredUserId = Annotated[str, Depends(require_authenticated_user)]
