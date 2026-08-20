# Backend Deployment

**Requirement:** Multi-stage Dockerfile, docker-compose.yml with Postgres/Redis/MinIO/backend/worker, migrations run, worker startup, test environment startup, bootstrap (init bucket + seed rules), health endpoints, and local dev workflow.

**Why:** The ops story must be reproducible from the repo with no external setup — one `docker compose up` brings up the whole platform stack for dev and staging.

## 1. Dockerfile (multi-stage)

```dockerfile
# Stage 1: deps
FROM python:3.12-slim AS deps
WORKDIR /app
COPY requirements.txt uv.lock ./
RUN pip install uv && uv pip install --system -r requirements.txt

# Stage 2: production image
FROM python:3.12-slim AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
RUN adduser --system --no-create-home appuser
WORKDIR /app
COPY --from=deps /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=deps /usr/local/bin /usr/local/bin
COPY app/ ./app
COPY alembic/ ./alembic
COPY alembic.ini scripts/ ./
# OCR engines
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr libgl1 libglib2.0-0 && rm -rf /var/lib/apt/lists/* \
    && pip install paddlepaddle paddleocr pypdfium2 python-docx edge-tts 2>/dev/null \
    || echo "PaddleOCR unavailable; Tesseract fallback only" >&2
USER appuser
CMD ["gunicorn", "app.main:app", "-b", "0.0.0.0:8000", "-w", "4", "-k", "uvicorn.workers.UvicornWorker",
     "--timeout", "300", "--keep-alive", "5"]
```

- Slim base, non-root user, pinned via lockfile. PaddleOCR optional layer (documented fallback to Tesseract-only if install fails in CI — acceptable degradation, flagged at build).
- Variant targets: `runtime`, `worker` (same image, CMD celery worker), `migration` (CMD alembic upgrade head).

## 2. docker-compose.yml

```yaml
services:
  postgres:
    image: postgres:16
    environment: {POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD}
    volumes: [pgdata:/var/lib/postgresql/data]
    healthcheck: pg_isready
  redis:
    image: redis:8-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    healthcheck: redis-cli ping
  minio:
    image: minio/minio:RELEASE.2026-01-01T00-00-00Z
    command: server /data --console-address ":9001"
    environment: {MINIO_ROOT_USER, MINIO_ROOT_PASSWORD}
    healthcheck: curl http://localhost:9000/minio/health/live
  backend:
    build: {target: runtime}
    depends_on: {postgres, redis, minio: {condition: service_healthy}}
    env_file: .env
    ports: ["8000:8000"]
    healthcheck: curl -f http://localhost:8000/api/v1/health
  worker:
    build: {target: runtime}
    command: celery -A app.workers.celery_app worker --concurrency=${CELERY_CONCURRENCY:-4} --loglevel=INFO
    depends_on: [postgres, redis, minio]
  beat:
    build: {target: runtime}
    command: celery -A app.workers.celery_app beat --loglevel=INFO --schedule /tmp/celerybeat-schedule
    depends_on: [redis]
    deploy: {replicas: 1}   # single beat; enforced at deploy time in prod
  migrate:
    build: {target: runtime}
    command: alembic upgrade head
    depends_on: [postgres]
    profiles: [bootstrap]
  bootstrap:
    build: {target: runtime}
    command: python scripts/bootstrap.py
    depends_on: [postgres, minio]
    profiles: [bootstrap]

volumes: {pgdata:}
```

Bootstrap (`scripts/bootstrap.py`): creates the object-storage bucket with listing denied + lifecycle rules; runs rule-pack seed migration; prints readiness summary. Idempotent.

## 3. Migrations

`docker compose run migrate` → `alembic upgrade head`. CI runs `alembic check` on every PR. Destructive migrations require the two-release window (`models.md` §3).

## 4. Test Environment

`docker compose -f docker-compose.test.yml up -d postgres redis minio` → pytest against the test stack (testcontainers also available for local unit integration). `docker compose -f docker-compose.test.yml run --rm backend pytest`. The test compose mirrors the main one minus gunicorn: single process, test env overrides (`TESTING=true`, in-memory-friendly timeouts).

## 5. Local Development

- `docker compose up` → platform services only (devs run `uvicorn app.main:app --reload` and `celery -A ... worker` locally for hot reload).
- Env: `.env.example` committed; `.env` gitignored; `docker compose --env-file` support.
- Pre-commit: ruff (lint+format), typecheck (mypy on `app/`), forbidden-field lint, `alembic check`.

## 6. Health Endpoints

`/api/v1/health` (process up), `/api/v1/ready` (deps: db/redis/storage/llm). Platform healthchecks use `/health`; readiness probes (k8s-style) use `/ready`. **Never** expose `/ready` failure details (internal check names only — `api.md` §1).

## 7. Environment and Secrets

All config from env (`configuration.md`). Secrets in platform secret manager (Render/Vercel env vars); `.env` never committed. `docker compose` dev secrets via `.env`; prod via platform.

## 8. Production Shape (v1)

- Render: Postgres (managed), Redis (managed), S3/R2 (managed); backend + worker as Docker services; MinIO only in compose/dev. Bucket policy + lifecycle configured once via `scripts/bootstrap.py` (works against any S3-compatible endpoint).
- One backend instance + one worker (scale worker horizontally on queue depth; beat singleton via profile).
- Logs/metrics: platform sinks; Prometheus metrics endpoint scraped where supported.

## Security

Non-root image; slim base minimizes CVE surface; Trivy image scan in CI (`security.md` §8). Worker and beat run the same image (single artifact). MinIO root credentials dev-only; managed storage in prod.

## Testing

Smoke test in CI: `docker compose build` + `docker compose run migrate` + `pytest` against the test compose. Bootstrap idempotency (run twice → second run no-op). Health endpoint assertion inside compose healthchecks.
