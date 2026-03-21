"""
Error Monitoring Middleware (FR029).

Captures unhandled exceptions from API endpoints and logs them to PostgreSQL.

Features:
  - Catches all unhandled exceptions in FastAPI routes
  - Logs error details: type, message, stack trace, request context
  - Non-blocking: logging happens in background to avoid latency impact
  - Excludes expected errors (validation, not found) from monitoring
  - Preserves original exception for proper HTTP error responses

Architecture ref:
  docs/requirements.md #FR029 - Error Monitoring
"""

from __future__ import annotations

import asyncio
import logging
import traceback
import uuid
from typing import Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response, JSONResponse

from app.database import AsyncSessionLocal
from app.models import ErrorLog

logger = logging.getLogger(__name__)


def _extract_workspace_id(request: Request) -> str | None:
    """Extract workspace_id from request headers or query params."""
    workspace_id = request.headers.get("X-Workspace-ID")
    if workspace_id:
        return workspace_id
    return request.query_params.get("workspace_id")


def _extract_user_id(request: Request) -> str | None:
    """Extract user_id from request headers or query params."""
    user_id = request.headers.get("X-User-ID")
    if user_id:
        return user_id
    return request.query_params.get("user_id")


def _determine_severity(exc: Exception) -> str:
    """
    Determine error severity based on exception type.

    Returns:
      - "critical" for system-level failures
      - "error" for application errors
      - "warning" for recoverable issues
    """
    critical_types = (
        ConnectionError,
        TimeoutError,
        MemoryError,
        SystemError,
    )
    if isinstance(exc, critical_types):
        return "critical"

    warning_types = (
        ValueError,
        KeyError,
        AttributeError,
    )
    if isinstance(exc, warning_types):
        return "warning"

    return "error"


async def _log_error(
    request: Request,
    exc: Exception,
    status_code: int,
) -> None:
    """
    Log API error to PostgreSQL database.

    Creates an ErrorLog record with request context and exception details.
    Runs asynchronously to avoid blocking the response.
    """
    try:
        workspace_id = _extract_workspace_id(request)
        user_id = _extract_user_id(request)
        severity = _determine_severity(exc)

        # Build request data context
        request_data = {
            "method": request.method,
            "path": str(request.url.path),
            "query_params": dict(request.query_params),
            "headers": {
                k: v for k, v in request.headers.items()
                if k.lower() not in ("authorization", "cookie", "x-api-key")
            },
            "client_ip": request.client.host if request.client else "unknown",
            "status_code": status_code,
        }

        # Create error log record
        async with AsyncSessionLocal() as session:
            error_log = ErrorLog(
                id=str(uuid.uuid4()),
                error_code=f"API_{status_code}",
                error_type=type(exc).__name__,
                source="api",
                operation=f"{request.method} {request.url.path}",
                workspace_id=workspace_id,
                user_id=user_id,
                message=str(exc),
                stack_trace=traceback.format_exc(),
                request_data=request_data,
                severity=severity,
                status="new",
            )
            session.add(error_log)
            await session.commit()

            logger.info(
                "API error logged: %s %s -> %s (%s)",
                request.method,
                request.url.path,
                type(exc).__name__,
                severity,
            )

    except Exception as log_exc:
        # Log error but don't fail the request
        logger.warning(
            "Failed to log API error: %s %s - %s",
            request.method,
            request.url.path,
            log_exc,
        )


class ErrorMonitoringMiddleware(BaseHTTPMiddleware):
    """
    Middleware that captures unhandled exceptions and logs them.

    Captures:
      - Exception type and message
      - Full stack trace
      - Request context (method, path, headers, client IP)
      - User and workspace context

    Stores in PostgreSQL ErrorLog table.

    Usage:
        from app.middleware import ErrorMonitoringMiddleware
        app.add_middleware(ErrorMonitoringMiddleware)
    """

    async def dispatch(
        self, request: Request, call_next: Callable
    ) -> Response:
        """
        Process request and catch unhandled exceptions.

        1. Call next middleware/handler
        2. If exception occurs, log it asynchronously
        3. Re-raise or return appropriate error response
        """
        try:
            response = await call_next(request)

            # Log 5xx errors even if no exception was raised
            if response.status_code >= 500:
                # Create a synthetic exception for logging
                exc = Exception(f"HTTP {response.status_code} response")
                asyncio.create_task(_log_error(request, exc, response.status_code))

            return response

        except Exception as exc:
            # Log the exception
            asyncio.create_task(_log_error(request, exc, 500))

            # Return a generic error response
            # (FastAPI's exception handlers will handle specific cases)
            logger.error(
                "Unhandled exception in %s %s: %s",
                request.method,
                request.url.path,
                exc,
            )

            # Re-raise to let FastAPI handle the response
            raise
