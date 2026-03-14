"""
InsurAI FastAPI application entry point.

Mounts all registered routers. Currently includes:
  - /api/v1/documents  (ingestion)   [Phase P3 – T4]

Future routers (added as phases complete):
  - /api/v1/chat       (RAG + LLM)   [Phase P6 – T8/T9]
  - /api/v1/compliance               [Phase P8 – T12]

Architecture ref: docs/system-architecture.md §3 – Backend Architecture
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.ingestion.router import router as ingestion_router
from app.rag.router import router as rag_router
from app.storage.minio_client import ensure_bucket_exists
from app.processing.vector_store import ensure_collection_exists

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    FastAPI lifespan handler.

    Startup:
      - Ensures the MinIO document bucket exists.
        Logs a warning if MinIO is unreachable rather than crashing,
        so the server can still start in degraded mode during development.

    Shutdown:
      - (Future) graceful teardown hooks go here.
    """
    # --- Startup ---
    try:
        ensure_bucket_exists(settings.MINIO_BUCKET_DOCUMENTS)
        logger.info("MinIO bucket '%s' is ready.", settings.MINIO_BUCKET_DOCUMENTS)
    except Exception as exc:  # noqa: BLE001
        logger.warning(
            "MinIO bucket initialization failed (is MinIO running?): %s", exc
        )

    try:
        ensure_collection_exists()
        logger.info(
            "Milvus collection '%s' is ready.", settings.MILVUS_COLLECTION
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning(
            "Milvus collection initialization failed (is Milvus running?): %s", exc
        )

    yield  # Application runs here

    # --- Shutdown ---
    logger.info("InsurAI backend shutting down.")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
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
app.include_router(rag_router)


@app.get("/health", tags=["Health"])
async def health_check() -> dict:
    """Liveness probe endpoint."""
    return {"status": "ok", "version": settings.APP_VERSION}
