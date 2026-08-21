from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=12, max_length=128)
    display_name: str = Field(min_length=1, max_length=100)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class RefreshRequest(BaseModel):
    refresh_token: str


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetRedeem(BaseModel):
    token: str
    new_password: str = Field(min_length=12, max_length=128)


class AuthTokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    expires_in: int
    user: dict | None = None


class MessageResponse(BaseModel):
    message: str
