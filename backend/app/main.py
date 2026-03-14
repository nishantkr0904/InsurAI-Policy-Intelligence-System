"""
InsurAI FastAPI application entry point.

Mounts all registered routers. Currently includes:
  - /api/v1/documents  (ingestion)   [Phase P3 – T4]

Future routers (added as phases complete):
  - /api/v1/chat       (RAG + LLM)   [Phase P6 – T8/T9]
  - /api/v1/compliance               [Phase P8 – T12]

Architecture ref: docs/system-architecture.md §3 – Backend Architecture
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.ingestion.router import router as ingestion_router

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ---------------------------------------------------------------------------
# CORS – allow Next.js dev server during development
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(ingestion_router)


@app.get("/health", tags=["Health"])
async def health_check() -> dict:
    """Liveness probe endpoint."""
    return {"status": "ok", "version": settings.APP_VERSION}
