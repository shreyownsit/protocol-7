from pydantic import BaseModel


class AudioNarrationRequest(BaseModel):
    language_code: str = "en"
    voice: str | None = None


class AudioResponse(BaseModel):
    id: str
    status: str
    url: str = ""
    duration_seconds: int = 0
    expires_at: int = 0
