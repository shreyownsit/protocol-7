# LexiClear — Deployment

**Reading order:** Read after `TESTING.md`. Subsystem deployment details live in `backend/deployment.md`; the full local stack is specified there as well. This root file defines environments, infrastructure topology, and release operations.

---

## 1. Architecture Decision

The PRD suggests Vercel (frontend) and Render or AWS (backend/workers). This spec **adopts that recommendation with one justification-level refinement**: for production object storage, use an S3-compatible provider with signed URLs (AWS S3, Cloudflare R2, or Backblaze B2) rather than Render's ephemeral disk — ephemeral disks cannot guarantee the purge semantics that the privacy model requires (`backend/privacy.md`).

| Component | Hosting | Justification |
|---|---|---|
| Frontend | Vercel | Next.js App Router native support, edge caching, preview deployments |
| API (FastAPI) | Render Web Service or AWS (ECS Fargate / App Runner) | Container support, env secrets, autoscaling |
| Workers (Celery) | Render Worker Service or AWS ECS task | Shared code base with API, Redis broker |
| PostgreSQL | Render Postgres or AWS RDS | Managed backups, point-in-time restore |
| Redis | Render Redis or AWS ElastiCache | Broker + cache, managed |
| Object storage | S3 / R2 / B2 | Signed URLs, lifecycle rules for purge |
| CI/CD | GitHub Actions | Build, test, scan, deploy on merge |

## 2. Environments

| Env | Purpose | Key Differences |
|---|---|---|
| Local | Development | Full docker compose stack (6 services); hot reload; seed fixtures |
| Staging | Pre-release validation | Mirrors production config; seed data anonymized |
| Production | Live | Managed services, secrets via platform vault, no seed data |

Environment variable deltas are documented in `backend/configuration.md`. Never hardcode secrets; never commit `.env` files (gitignore `*.env*`).

## 3. Local Development Stack

```
docker compose up
```

Services (all defined in `backend/deployment.md` with the exact compose file): `postgres`, `redis`, `minio`, `backend` (FastAPI + migrations), `worker` (Celery + beat), `frontend` (Next.js dev). Migrations run automatically on backend startup in dev; in staging/production they run as a one-off release step before deploy.

## 4. Release Process

1. Merge to `main` → CI gates (see root `TESTING.md`).
2. API/worker: build Docker image from pinned tag → run `alembic upgrade head` as pre-deploy step (non-blocking for zero-downtime; new code must tolerate the old schema until migration completes — migrations must be backward-compatible).
3. Frontend: Vercel auto-deploy from `main`; preview deploy per PR.
4. Verify `/health` and `/ready` on new instances before traffic shift (Render/AWS health probes).
5. Rollback: API/worker roll back to previous container image tag; DB rollbacks are *forward-only by policy* — migrations must never be destructive within a release window.

## 5. Operational Requirements

- **Health checks:** `/health` (liveness: process alive) vs `/ready` (readiness: DB+Redis+storage reachable, LLM provider reachable). Full semantics in `backend/deployment.md`. Health responses must never reveal secrets or internal topology.
- **Scaling:** API autoscale on CPU/request-count; workers scale on Celery queue depth (Redis `LLEN`); Redis and Postgres scale vertically first.
- **Logs:** JSON structured logs to stdout/stderr → platform log sink; request/job/session IDs correlatable (`backend/observability.md`).
- **Secrets:** platform secret stores; rotation documented per secret class in `backend/security.md`.
- **Backups:** Postgres daily backups + 7-day PITR; object storage lifecycle rules enforce purge (never rely solely on app-layer deletes).
- **Cost discipline:** This is a small-team product. Start with the smallest managed tiers; scale only on measured need. No Kubernetes.
