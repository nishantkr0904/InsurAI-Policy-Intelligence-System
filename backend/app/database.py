"""
Database connection management and session factory.

Provides:
  - AsyncEngine with connection pooling (SQLAlchemy 2.0+)
  - AsyncSessionLocal factory for dependency injection
  - get_db() dependency function for FastAPI routes
  - init_db() for schema creation on startup
  - close_db() for cleanup on shutdown
  - Proper async/await patterns throughout

Architecture ref:
  docs/system-architecture.md §3 – Backend Database Layer
"""

from __future__ import annotations

import logging
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from app.core.config import settings
from app.models import Base

logger = logging.getLogger(__name__)

# ============================================================================
# DATABASE ENGINE SETUP
# ============================================================================
#
# Configuration:
#   - AsyncEngine with QueuePool for concurrent request handling
#   - pool_size: 20 connections available at baseline
#   - max_overflow: additional 10 connections if pool exhausted
#   - pool_recycle: recycle connections after 3600s to avoid DB timeouts
#   - echo: log SQL statements if DEBUG enabled
#   - connect_args: timeouts and per-connection settings
#

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    future=True,
    pool_size=20,
    max_overflow=10,
    pool_recycle=3600,
    connect_args={
        "timeout": 30,  # Connection timeout (seconds)
        "command_timeout": 30,  # Query timeout (seconds)
        "server_settings": {
            "application_name": "InsurAI_Backend",
        },
    },
)

# ============================================================================
# SESSION FACTORY
# ============================================================================
#
# AsyncSessionLocal creates AsyncSession instances for use in routes.
#
# Configuration:
#   - expire_on_commit=False: Prevent lazy loading on already-retrieved objects
#   - future=True: Use SQLAlchemy 2.0+ API
#

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    future=True,
)


# ============================================================================
# DEPENDENCY INJECTION
# ============================================================================

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency function for database session injection.

    Provides an AsyncSession for use in route handlers.
    Automatically commits on success, rolls back on error.

    Usage in routes:
        from fastapi import Depends
        from app.database import get_db

        @router.get("/example")
        async def example(session: AsyncSession = Depends(get_db)):
            result = await session.execute(select(Model).where(...))
            return result.scalars().all()

    The session is automatically committed after the route handler returns.
    If an exception occurs, the session is rolled back before propagating.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


# ============================================================================
# LIFECYCLE HOOKS
# ============================================================================

async def init_db() -> None:
    """
    Initialize database schema.

    Called during application startup.
    Creates all tables from Base.metadata if they don't exist.

    Uses the create_all() pattern:
      - Idempotent (safe to call multiple times)
      - Creates tables only if they don't exist
      - Respects existing schema
    """
    try:
        async with engine.begin() as conn:
            # Create all tables defined in Base.metadata
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database schema initialized successfully.")
    except Exception as exc:
        logger.error("Failed to initialize database schema: %s", exc)
        raise


async def close_db() -> None:
    """
    Close database connections.

    Called during application shutdown.
    Properly disposes of the connection pool and closes all connections.
    """
    try:
        await engine.dispose()
        logger.info("Database connections closed.")
    except Exception as exc:
        logger.error("Error closing database connections: %s", exc)
