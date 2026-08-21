import asyncio
import json
from collections.abc import AsyncGenerator

from fastapi import APIRouter, Header, Request
from sse_starlette.sse import EventSourceResponse

from app.services.progress_service import progress_service

router = APIRouter(tags=["events"])


async def sse_event_generator(
    request: Request,
    resource_type: str,
    resource_id: str,
    last_event_id: str | None = None,
) -> AsyncGenerator[dict, None]:
    # 1. Replay buffered events
    buffered = await progress_service.get_buffered_events(
        resource_type=resource_type,
        resource_id=resource_id,
        last_event_id=last_event_id,
    )
    for ev in buffered:
        yield {
            "id": ev["id"],
            "event": ev["event"],
            "data": json.dumps(ev["data"]),
        }

    # 2. Live stream from Redis pub/sub if available, else periodic poll
    r = await progress_service.get_redis()
    if r:
        pubsub = r.pubsub()
        channel = f"progress:{resource_type}:{resource_id}"
        await pubsub.subscribe(channel)
        try:
            while not await request.is_disconnected():
                msg = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
                if msg and msg["type"] == "message":
                    ev_data = json.loads(msg["data"])
                    yield {
                        "id": ev_data["id"],
                        "event": ev_data["event"],
                        "data": json.dumps(ev_data["data"]),
                    }
                await asyncio.sleep(0.1)
        finally:
            await pubsub.unsubscribe(channel)
    else:
        # Fallback heartbeat loop
        while not await request.is_disconnected():
            await asyncio.sleep(2.0)
            yield {
                "event": "heartbeat",
                "data": json.dumps({"status": "connected"}),
            }


@router.get("/sessions/{session_id}/events")
async def session_events(
    session_id: str,
    request: Request,
    last_event_id: str | None = Header(default=None, alias="Last-Event-Id"),
):
    return EventSourceResponse(
        sse_event_generator(
            request=request,
            resource_type="sessions",
            resource_id=session_id,
            last_event_id=last_event_id,
        )
    )


@router.get("/negotiate/{negotiation_id}/events")
async def negotiate_events(
    negotiation_id: str,
    request: Request,
    last_event_id: str | None = Header(default=None, alias="Last-Event-Id"),
):
    return EventSourceResponse(
        sse_event_generator(
            request=request,
            resource_type="negotiate",
            resource_id=negotiation_id,
            last_event_id=last_event_id,
        )
    )
