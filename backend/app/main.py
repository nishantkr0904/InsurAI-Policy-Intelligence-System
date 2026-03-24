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
from app.database import init_db, close_db
from app.middleware import ActivityLoggingMiddleware, ErrorMonitoringMiddleware
from app.ingestion.router import router as ingestion_router
from app.rag.router import router as rag_router
from app.rag.retrieve_router import router as retrieve_router
from app.rag.stream_router import router as stream_router
from app.claims.router import router as claims_router
from app.underwriting.router import router as underwriting_router
from app.fraud.router import router as fraud_router
from app.compliance.router import router as compliance_router
from app.audit.router import router as audit_router
from app.workspaces.router import router as workspaces_router
from app.errors.router import router as errors_router
from app.metrics.router import router as metrics_router
from app.storage.minio_client import ensure_bucket_exists
from app.processing.vector_store import ensure_collection_exists
from app.reports.router import router as reports_router
from app.health.router import router as health_router

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    FastAPI lifespan handler.

    Startup:
      - Initializes PostgreSQL database and creates schema.
      - Ensures the MinIO document bucket exists.
        Logs a warning if MinIO is unreachable rather than crashing,
        so the server can still start in degraded mode during development.
      - Ensures Milvus vector collection exists for embeddings.

    Shutdown:
      - Closes database connections.
      - Graceful teardown of all services.
    """
    # --- Startup ---
    try:
        await init_db()
        logger.info("PostgreSQL database schema initialized.")
    except Exception as exc:  # noqa: BLE001
        logger.warning(
            "Database initialization failed (is PostgreSQL running?): %s", exc
        )

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
    await close_db()
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
# Activity Logging – log all API requests/responses (FR028)
# ---------------------------------------------------------------------------
app.add_middleware(ActivityLoggingMiddleware)

# ---------------------------------------------------------------------------
# Error Monitoring – capture and log unhandled exceptions (FR029)
# ---------------------------------------------------------------------------
app.add_middleware(ErrorMonitoringMiddleware)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(workspaces_router)
app.include_router(ingestion_router)
app.include_router(rag_router)
app.include_router(retrieve_router)
app.include_router(stream_router)
app.include_router(claims_router)
app.include_router(underwriting_router)
app.include_router(fraud_router)
app.include_router(compliance_router)
app.include_router(audit_router)
app.include_router(errors_router)
app.include_router(metrics_router)
app.include_router(reports_router)
app.include_router(health_router)


@app.get("/health", tags=["Health"])
async def health_check() -> dict:
    """Liveness probe endpoint."""
    return {"status": "ok", "version": settings.APP_VERSION}
