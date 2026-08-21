from fastapi import APIRouter
from pydantic import BaseModel, EmailStr

from app.api.dependencies import DbSession, RequiredUserId
from app.core.exceptions import AuthUnauthorizedError
from app.repositories.user_repo import UserRepository

router = APIRouter(prefix="/users", tags=["users"])


class UserProfileResponse(BaseModel):
    id: str
    email: EmailStr
    display_name: str
    email_verified: bool


class UpdateProfileRequest(BaseModel):
    display_name: str | None = None


class UserPreferencesResponse(BaseModel):
    theme: str
    default_privacy_mode: str
    preferred_language: str
    auto_tts: bool


class UpdatePreferencesRequest(BaseModel):
    theme: str | None = None
    default_privacy_mode: str | None = None
    preferred_language: str | None = None
    auto_tts: bool | None = None


@router.get("/me", response_model=UserProfileResponse)
async def get_me(user_id: RequiredUserId, db: DbSession):
    repo = UserRepository(db)
    user = await repo.get_by_id(user_id)
    if not user:
        raise AuthUnauthorizedError("User not found.")
    return {
        "id": user.id,
        "email": user.email,
        "display_name": user.display_name,
        "email_verified": user.email_verified,
    }


@router.patch("/me", response_model=UserProfileResponse)
async def update_me(req: UpdateProfileRequest, user_id: RequiredUserId, db: DbSession):
    repo = UserRepository(db)
    user = await repo.update_user(user_id, display_name=req.display_name)
    await db.commit()
    return {
        "id": user.id,
        "email": user.email,
        "display_name": user.display_name,
        "email_verified": user.email_verified,
    }


@router.get("/me/preferences", response_model=UserPreferencesResponse)
async def get_preferences(user_id: RequiredUserId, db: DbSession):
    repo = UserRepository(db)
    pref = await repo.get_preferences(user_id)
    if not pref:
        return {
            "theme": "system",
            "default_privacy_mode": "standard",
            "preferred_language": "en",
            "auto_tts": False,
        }
    return {
        "theme": pref.theme,
        "default_privacy_mode": pref.default_privacy_mode,
        "preferred_language": pref.preferred_language,
        "auto_tts": pref.auto_tts,
    }


@router.put("/me/preferences", response_model=UserPreferencesResponse)
async def update_preferences(req: UpdatePreferencesRequest, user_id: RequiredUserId, db: DbSession):
    repo = UserRepository(db)
    pref = await repo.set_preferences(
        user_id=user_id,
        theme=req.theme,
        default_privacy_mode=req.default_privacy_mode,
        preferred_language=req.preferred_language,
        auto_tts=req.auto_tts,
    )
    await db.commit()
    return {
        "theme": pref.theme,
        "default_privacy_mode": pref.default_privacy_mode,
        "preferred_language": pref.preferred_language,
        "auto_tts": pref.auto_tts,
    }
