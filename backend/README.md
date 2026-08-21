# LexiClear Backend

AI-powered Contract Analysis, Compliance, Risk, and Negotiation Platform.

## Tech Stack

- **Framework**: FastAPI
- **Database**: PostgreSQL (async via SQLAlchemy + asyncpg)
- **Task Queue**: Celery + Redis
- **AI**: Anthropic Claude API
- **Storage**: S3-compatible (MinIO for dev)

## Quick Start

```bash
# Create virtual environment
python -m venv .venv
.venv\Scripts\activate  # Windows
source .venv/bin/activate  # Linux/Mac

# Install dependencies
pip install -e ".[dev]"

# Run development server
uvicorn app.main:app --reload --port 8000

# Run tests
pytest
```

## API Documentation

When running in development mode, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
