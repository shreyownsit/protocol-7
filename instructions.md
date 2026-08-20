# Project Setup Instructions

Welcome to the LexiClear team! This repository contains both the frontend and backend codebases.

## Prerequisites
Before you start, ensure you have the following installed on your machine:
- **Git**: For version control
- **Docker & Docker Compose**: For running the database and backend services locally
- **Node.js** (v18+) & **npm**: For frontend development
- **Python** (v3.11+) & **uv**: For backend development (`uv` is used for python dependency management)

## 1. Clone the Repository

First, clone the repository and switch to the development branch for your respective team:

```bash
git clone <repository-url>
cd protocol-7

# If you are on the backend team:
git checkout backend/main

# If you are on the frontend team:
git checkout frontend/main # (Or whichever branch the frontend team designates)
```

## 2. Frontend Setup

The frontend is a Next.js application located in the `frontend/` directory.

```bash
cd frontend
npm install
npm run dev
```
The frontend will be available at `http://localhost:3000`.

## 3. Backend Setup

The backend is built with FastAPI and runs inside Docker for local development (alongside Postgres, Redis, and MinIO). The source code will be in the `backend/` directory.

*(Note: The backend scaffolding is currently underway. Once Phase 1 is complete, you will be able to run the following)*

```bash
# Start all backend services via Docker Compose
docker compose up -d
```
The backend API will be available at `http://localhost:8000`.

## Reference Materials
Please refer to the `references/` and `backend-reference/` directories for detailed architecture, models, and implementation phases. Every phase has strict acceptance criteria that must be met.
