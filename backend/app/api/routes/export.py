from fastapi import APIRouter, status

from app.api.dependencies import CurrentUserId, DbSession
from app.schemas.export import CreateExportRequest, ExportResponse
from app.services.export_service import ExportService

router = APIRouter(tags=["export"])


@router.post("/sessions/{session_id}/export", response_model=ExportResponse, status_code=status.HTTP_201_CREATED)
async def create_export(
    session_id: str,
    req: CreateExportRequest,
    db: DbSession,
    user_id: CurrentUserId,
):
    service = ExportService(db, current_user_id=user_id)
    exp = await service.create_export(
        session_id=session_id,
        export_format=req.format,
        contents=req.contents or {},
    )
    return await service.get_export(exp.id)


@router.get("/export/{export_id}", response_model=ExportResponse)
async def get_export(
    export_id: str,
    db: DbSession,
    user_id: CurrentUserId,
):
    service = ExportService(db, current_user_id=user_id)
    return await service.get_export(export_id)
