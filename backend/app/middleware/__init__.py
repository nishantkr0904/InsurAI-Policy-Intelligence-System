"""
InsurAI Middleware Package.

Contains middleware for:
  - Activity Logging (FR028): Log all API requests/responses
  - Error Monitoring (FR029): Capture and track errors
  - Performance Monitoring (FR030): Track API latency and metrics
"""

from app.middleware.activity_logger import ActivityLoggingMiddleware
from app.middleware.error_monitor import ErrorMonitoringMiddleware

__all__ = ["ActivityLoggingMiddleware", "ErrorMonitoringMiddleware"]
