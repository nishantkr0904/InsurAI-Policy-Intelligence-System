"""
Activity Logging Middleware (FR028).

Automatically logs all API requests and responses to PostgreSQL.

Features:
  - Captures request metadata: method, path, query params, headers
  - Captures response metadata: status code, duration
  - Extracts user_id from JWT token or headers (if authenticated)
  - Extracts workspace_id from headers or path
  - Logs to AuditLog table with action=API_ACCESS
  - Non-blocking: logging happens in background to avoid latency impact
  - Excludes health check and docs endpoints from logging

Architecture ref:
  docs/requirements.md #FR028 - Activity Logging
"""

from __future__ import annotations

import asyncio
import logging
import time
import uuid
from typing import Callable, Optional

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.database import AsyncSessionLocal
from app.models import AuditLog

logger = logging.getLogger(__name__)

# Endpoints to exclude from activity logging (noisy, not useful)
EXCLUDED_PATHS = {
    "/health",
    "/docs",
    "/redoc",
    "/openapi.json",
    "/favicon.ico",
}

# Prefixes to exclude
EXCLUDED_PREFIXES = [
    "/docs/",
    "/redoc/",
]


def _should_log(path: str) -> bool:
    """
    Check if request path should be logged.

    Excludes health checks and documentation endpoints.
    """
    if path in EXCLUDED_PATHS:
        return False

    for prefix in EXCLUDED_PREFIXES:
        if path.startswith(prefix):
            return False

    return True


def _extract_user_id(request: Request) -> Optional[str]:
    """
    Extract user_id from request.

    Checks (in order):
      1. X-User-ID header (for authenticated requests)
      2. Authorization header (JWT token - placeholder for parsing)
      3. Query parameter (for some API calls)

    Returns None if no user identifier found (anonymous request).
    """
    # Direct header (set by auth proxy or frontend)
    user_id = request.headers.get("X-User-ID")
    if user_id:
        return user_id

    # From query params (some APIs pass user context)
    user_id = request.query_params.get("user_id")
    if user_id:
        return user_id

    # Anonymous user
    return None


def _extract_workspace_id(request: Request) -> Optional[str]:
    """
    Extract workspace_id from request.

    Checks (in order):
      1. X-Workspace-ID header (standard for multi-tenant APIs)
      2. Path parameter (for workspace-scoped endpoints)
      3. Query parameter

    Returns None if no workspace identifier found.
    """
    # Direct header (standard approach)
    workspace_id = request.headers.get("X-Workspace-ID")
    if workspace_id:
        return workspace_id

    # From query params
    workspace_id = request.query_params.get("workspace_id")
    if workspace_id:
        return workspace_id

    # Default workspace for anonymous/unscoped requests
    return "system"


def _get_client_ip(request: Request) -> str:
    """
    Extract client IP address from request.

    Checks X-Forwarded-For header for proxied requests,
    falls back to direct client host.
    """
    # Check forwarded headers (reverse proxy)
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        # X-Forwarded-For may contain multiple IPs; first is original client
        return forwarded_for.split(",")[0].strip()

    # Check X-Real-IP header
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip

    # Direct connection
    if request.client:
        return request.client.host

    return "unknown"


def _determine_action(request: Request) -> str:
    """
    Determine action type based on request method and path.

    Maps HTTP method + path pattern to semantic action names.
    """
    method = request.method.upper()
    path = request.url.path

    # Document endpoints
    if "/documents" in path:
        if method == "POST":
            return "document_upload"
        elif method == "DELETE":
            return "document_delete"
        elif method == "GET":
            return "document_view"

    # Chat/RAG endpoints
    if "/chat" in path:
        return "chat_query"

    if "/retrieve" in path:
        return "retrieval_query"

    # Claims endpoints
    if "/claims" in path:
        if "validate" in path:
            return "claim_validate"
        return "claim_access"

    # Fraud endpoints
    if "/fraud" in path:
        if method in ["PUT", "PATCH"]:
            return "fraud_alert_update"
        return "fraud_alert_view"

    # Compliance endpoints
    if "/compliance" in path:
        if "report" in path:
            return "compliance_report"
        return "compliance_scan"

    # Audit endpoints
    if "/audit" in path:
        return "audit_view"

    # Workspace endpoints
    if "/workspaces" in path:
        if method == "POST":
            return "workspace_create"
        elif method in ["PUT", "PATCH"]:
            return "workspace_update"
        elif method == "DELETE":
            return "workspace_delete"
        return "workspace_access"

    # Generic API access
    return "api_access"


def _determine_status(status_code: int) -> str:
    """
    Map HTTP status code to audit status.

    Returns:
      - "success" for 2xx responses
      - "failure" for 4xx responses
      - "error" for 5xx responses
    """
    if 200 <= status_code < 300:
        return "success"
    elif 400 <= status_code < 500:
        return "failure"
    elif status_code >= 500:
        return "error"
    return "partial"


def _determine_severity(status_code: int) -> str:
    """
    Map HTTP status code to severity level.

    Returns:
      - "info" for 2xx responses
      - "warning" for 4xx responses
      - "error" for 5xx responses
    """
    if 200 <= status_code < 300:
        return "info"
    elif 400 <= status_code < 500:
        return "warning"
    elif status_code >= 500:
        return "error"
    return "info"


async def _log_activity(
    request: Request,
    response: Response,
    duration_ms: float,
) -> None:
    """
    Log API activity to PostgreSQL database.

    Creates an AuditLog record with request/response metadata.
    Runs asynchronously to avoid blocking the response.
    """
    try:
        user_id = _extract_user_id(request) or "anonymous"
        workspace_id = _extract_workspace_id(request)
        client_ip = _get_client_ip(request)
        action = _determine_action(request)
        status = _determine_status(response.status_code)
        severity = _determine_severity(response.status_code)

        # Build metadata
        meta_data = {
            "ip_address": client_ip,
            "user_agent": request.headers.get("User-Agent", "unknown"),
            "duration_ms": round(duration_ms, 2),
            "http_method": request.method,
            "path": str(request.url.path),
            "query_params": dict(request.query_params),
            "status_code": response.status_code,
        }

        # Build description
        description = f"{request.method} {request.url.path} -> {response.status_code}"

        # Create audit log record
        async with AsyncSessionLocal() as session:
            audit_log = AuditLog(
                id=str(uuid.uuid4()),
                workspace_id=workspace_id,
                user_id=user_id,
                user_email=request.headers.get("X-User-Email"),
                action=action,
                status=status,
                severity=severity,
                resource_type="api",
                resource_id=None,
                description=description,
                meta_data=meta_data,
            )
            session.add(audit_log)
            await session.commit()

            logger.debug(
                "Activity logged: %s %s %s %dms -> %s",
                user_id,
                request.method,
                request.url.path,
                duration_ms,
                response.status_code,
            )

    except Exception as exc:
        # Log error but don't fail the request
        logger.warning(
            "Failed to log activity: %s %s - %s",
            request.method,
            request.url.path,
            exc,
        )


class ActivityLoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware that logs all API requests and responses.

    Captures:
      - Request: method, path, headers, user_id, workspace_id, client IP
      - Response: status code, duration
      - Timing: precise duration in milliseconds

    Stores in PostgreSQL AuditLog table.

    Usage:
        from app.middleware import ActivityLoggingMiddleware
        app.add_middleware(ActivityLoggingMiddleware)
    """

    async def dispatch(
        self, request: Request, call_next: Callable
    ) -> Response:
        """
        Process request and log activity.

        1. Record start time
        2. Call next middleware/handler
        3. Record end time and calculate duration
        4. Log activity asynchronously (non-blocking)
        5. Return response
        """
        # Skip excluded paths
        if not _should_log(request.url.path):
            return await call_next(request)

        # Record start time
        start_time = time.perf_counter()

        # Process request
        response = await call_next(request)

        # Calculate duration
        duration_ms = (time.perf_counter() - start_time) * 1000

        # Log activity in background (non-blocking)
        # Using create_task to avoid blocking the response
        asyncio.create_task(_log_activity(request, response, duration_ms))

        return response
