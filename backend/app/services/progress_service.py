import asyncio
import json
from datetime import UTC, datetime
from typing import Any

import redis.asyncio as aioredis

from app.core.config import settings
from app.utils.ids import generate_uuid7

# In-memory buffer fallback when Redis is absent
_LOCAL_EVENT_BUFFERS: dict[str, list[dict[str, Any]]] = {}


class ProgressService:
    def __init__(self, redis_url: str | None = None) -> None:
        self.redis_url = redis_url or settings.REDIS_URL
        self._redis: aioredis.Redis | None = None
        self._redis_checked = False

    async def get_redis(self) -> aioredis.Redis | None:
        if settings.ENVIRONMENT == "test" or not self.redis_url:
            return None

        if not self._redis_checked:
            self._redis_checked = True
            try:
                r = aioredis.from_url(
                    self.redis_url,
                    decode_responses=True,
                    socket_connect_timeout=0.2,
                    socket_timeout=0.2,
                )
                await asyncio.wait_for(r.ping(), timeout=0.2)
                self._redis = r
            except Exception:
                self._redis = None
        return self._redis

    async def emit_event(
        self,
        resource_type: str,
        resource_id: str,
        event_name: str,
        payload: dict[str, Any],
        event_id: str | None = None,
    ) -> str:
        eid = event_id or generate_uuid7()
        event_data = {
            "id": eid,
            "event": event_name,
            "data": {
                **payload,
                "ts": datetime.now(UTC).isoformat(),
            },
        }

        channel = f"progress:{resource_type}:{resource_id}"
        buffer_key = f"progress:buffer:{resource_type}:{resource_id}"

        # Local buffer record
        buf = _LOCAL_EVENT_BUFFERS.setdefault(buffer_key, [])
        buf.append(event_data)
        if len(buf) > 100:
            buf.pop(0)

        # Attempt Redis publish if available
        try:
            r = await self.get_redis()
            if r:
                msg_json = json.dumps(event_data)
                await r.publish(channel, msg_json)
                await r.rpush(buffer_key, msg_json)
                await r.ltrim(buffer_key, -100, -1)
                await r.expire(buffer_key, 3600)
        except Exception:
            pass

        return eid

    async def get_buffered_events(
        self,
        resource_type: str,
        resource_id: str,
        last_event_id: str | None = None,
    ) -> list[dict[str, Any]]:
        buffer_key = f"progress:buffer:{resource_type}:{resource_id}"

        events: list[dict[str, Any]] = []
        try:
            r = await self.get_redis()
            if r:
                raw_items = await r.lrange(buffer_key, 0, -1)
                for item in raw_items:
                    events.append(json.loads(item))
        except Exception:
            events = _LOCAL_EVENT_BUFFERS.get(buffer_key, [])

        if not events:
            events = _LOCAL_EVENT_BUFFERS.get(buffer_key, [])

        if not last_event_id:
            return events

        # Filter events strictly after last_event_id
        filtered = []
        seen = False
        for ev in events:
            if seen:
                filtered.append(ev)
            elif ev.get("id") == last_event_id:
                seen = True
        return filtered if seen else events


progress_service = ProgressService()
