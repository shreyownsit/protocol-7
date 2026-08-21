from dataclasses import dataclass
from datetime import datetime


@dataclass
class UserDomain:
    id: str
    email: str
    display_name: str
    email_verified: bool
    created_at: datetime
    updated_at: datetime


@dataclass
class UserPreferenceDomain:
    user_id: str
    language_code: str
    notifications_enabled: bool
    updated_at: datetime
