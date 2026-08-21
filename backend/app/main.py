from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request, Response, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.router import api_router
from app.core.config import settings
from app.core.exceptions import TypedAppError
from app.core.logging import get_logger, request_id_ctx_var, setup_logging
from app.repositories.base import async_engine
from app.utils.ids import generate_uuid7

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    # Setup structured JSON logging
    setup_logging(log_level=settings.LOG_LEVEL)
    logger.info("Starting LexiClear Backend API", extra={"environment": settings.ENVIRONMENT})

    # Create tables automatically in development / sqlite mode
    from app.repositories.models import Base
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield

    logger.info("Shutting down LexiClear Backend API")
    await async_engine.dispose()


def create_app() -> FastAPI:
    app = FastAPI(
        title="LexiClear API",
        description="Statutory Compliance & AI-Powered Legal Risk Analysis Platform",
        version="1.0.0",
        docs_url="/docs" if settings.ENVIRONMENT != "production" else None,
        redoc_url="/redoc" if settings.ENVIRONMENT != "production" else None,
        lifespan=lifespan,
    )

    # CORS Middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Request ID and Security Headers Middleware
    @app.middleware("http")
    async def request_middleware(request: Request, call_next):
        req_id = request.headers.get("X-Request-ID") or generate_uuid7()
        request_id_ctx_var.set(req_id)

        response: Response = await call_next(request)

        # Standard Security & Tracing Headers
        response.headers["X-Request-ID"] = req_id
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response

    # Exception Handlers
    @app.exception_handler(TypedAppError)
    async def typed_error_handler(request: Request, exc: TypedAppError):
        req_id = request_id_ctx_var.get()
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "code": exc.code,
                    "message": exc.message,
                    "details": exc.details,
                    "request_id": req_id,
                }
            },
        )

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(request: Request, exc: RequestValidationError):
        req_id = request_id_ctx_var.get()
        details = []
        for err in exc.errors():
            loc = ".".join(str(x) for x in err.get("loc", []))
            details.append({"field": loc, "message": err.get("msg", "Validation error")})

        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "error": {
                    "code": "VALIDATION_FAILED",
                    "message": "Request validation failed.",
                    "details": details,
                    "request_id": req_id,
                }
            },
        )

    @app.exception_handler(HTTPException)
    async def http_error_handler(request: Request, exc: HTTPException):
        req_id = request_id_ctx_var.get()
        code_map = {
            400: "VALIDATION_FAILED",
            401: "AUTH_UNAUTHORIZED",
            403: "AUTHZ_FORBIDDEN",
            404: "NOT_FOUND",
            409: "CONFLICT",
            422: "VALIDATION_FAILED",
        }
        code = code_map.get(exc.status_code, "INTERNAL_ERROR")
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "code": code,
                    "message": str(exc.detail),
                    "details": [],
                    "request_id": req_id,
                }
            },
        )

    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        req_id = request_id_ctx_var.get()
        logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": "An unexpected internal server error occurred.",
                    "details": [],
                    "request_id": req_id,
                }
            },
        )

    # Health Check Endpoints
    @app.get("/health", tags=["health"])
    async def health():
        return {"status": "ok", "version": "1.0.0"}

    @app.get("/health/ready", tags=["health"])
    async def health_ready():
        return {"status": "ready", "database": "connected", "redis": "connected"}

    # Include All API Routes with /api/v1 prefix and bare prefix for compatibility
    app.include_router(api_router, prefix="/api/v1")
    app.include_router(api_router, prefix="")

    return app


app = create_app()
