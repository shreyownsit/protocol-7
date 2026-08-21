from fastapi import APIRouter

from app.api.routes import (
    audio,
    auth,
    compliance,
    diff,
    documents,
    events,
    export,
    graph,
    negotiate,
    risk,
    sessions,
    simulation,
    upload,
    users,
)

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(sessions.router)
api_router.include_router(upload.router)
api_router.include_router(documents.router)
api_router.include_router(diff.router)
api_router.include_router(compliance.router)
api_router.include_router(graph.router)
api_router.include_router(risk.router)
api_router.include_router(simulation.router)
api_router.include_router(negotiate.router)
api_router.include_router(audio.router)
api_router.include_router(export.router)
api_router.include_router(events.router)
