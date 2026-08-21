import base64
import json
from typing import Any


def encode_cursor(sort_key: Any, item_id: str) -> str:
    """Encode a sort key and ID into an opaque base64 cursor string."""
    payload = {"sort_key": str(sort_key), "id": item_id}
    raw_bytes = json.dumps(payload).encode("utf-8")
    return base64.urlsafe_b64encode(raw_bytes).decode("utf-8")


def decode_cursor(cursor: str | None) -> dict[str, str] | None:
    """Decode an opaque base64 cursor string into its constituent sort key and ID."""
    if not cursor:
        return None
    try:
        raw_bytes = base64.urlsafe_b64decode(cursor.encode("utf-8"))
        data = json.loads(raw_bytes.decode("utf-8"))
        if isinstance(data, dict) and "sort_key" in data and "id" in data:
            return {"sort_key": str(data["sort_key"]), "id": str(data["id"])}
        return None
    except Exception:
        return None
