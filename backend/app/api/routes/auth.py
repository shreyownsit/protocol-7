from fastapi import APIRouter, Header, Request, status

from app.api.dependencies import DbSession
from app.schemas.auth import (
    AuthTokenResponse,
    LoginRequest,
    MessageResponse,
    PasswordResetRedeem,
    PasswordResetRequest,
    RefreshRequest,
    RegisterRequest,
)
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=AuthTokenResponse, status_code=status.HTTP_201_CREATED)
async def register(req: RegisterRequest, db: DbSession, request: Request):
    service = AuthService(db)
    client_ip = request.client.host if request.client else None
    res = await service.register(
        email=req.email,
        password=req.password,
        display_name=req.display_name,
        ip_address=client_ip,
    )
    return res


@router.post("/login", response_model=AuthTokenResponse)
async def login(req: LoginRequest, db: DbSession, request: Request):
    service = AuthService(db)
    client_ip = request.client.host if request.client else None
    res = await service.login(
        email=req.email,
        password=req.password,
        ip_address=client_ip,
    )
    return res


@router.post("/refresh", response_model=AuthTokenResponse)
async def refresh(req: RefreshRequest, db: DbSession):
    service = AuthService(db)
    res = await service.refresh(req.refresh_token)
    return res


@router.post("/logout", response_model=MessageResponse)
async def logout(
    db: DbSession,
    authorization: str | None = Header(default=None),
):
    from app.core.security import decode_jwt_token

    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        try:
            payload = decode_jwt_token(token, expected_type="access")
            user_id = payload.get("sub")
            jti = payload.get("jti")
            if user_id:
                service = AuthService(db)
                await service.logout(user_id, jti)
        except Exception:
            pass
    return {"message": "Successfully logged out."}


@router.post("/password/reset-request", response_model=MessageResponse, status_code=status.HTTP_202_ACCEPTED)
async def request_password_reset(req: PasswordResetRequest, db: DbSession, request: Request):
    service = AuthService(db)
    client_ip = request.client.host if request.client else None
    res = await service.request_password_reset(req.email, ip_address=client_ip)
    return res


@router.post("/password/reset", response_model=AuthTokenResponse)
async def redeem_password_reset(req: PasswordResetRedeem, db: DbSession):
    service = AuthService(db)
    res = await service.redeem_password_reset(req.token, req.new_password)
    return res
