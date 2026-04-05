"""
Session token helpers for cookie-based authentication.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time

from app.core.config import settings


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("utf-8")


def _b64url_decode(data: str) -> bytes:
    padded = data + "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(padded.encode("utf-8"))


def create_session_token(email: str) -> str:
    """
    Create a signed, expiring session token bound to a user email.
    """
    payload = {
        "email": email,
        "exp": int(time.time()) + settings.SESSION_COOKIE_MAX_AGE_SECONDS,
    }
    payload_bytes = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    payload_part = _b64url_encode(payload_bytes)

    signature = hmac.new(
        settings.SESSION_SECRET.encode("utf-8"),
        payload_part.encode("utf-8"),
        hashlib.sha256,
    ).digest()
    signature_part = _b64url_encode(signature)
    return f"{payload_part}.{signature_part}"


def get_email_from_session_token(token: str | None) -> str | None:
    """
    Validate session token and return user email when valid.
    """
    if not token or "." not in token:
        return None

    payload_part, signature_part = token.split(".", 1)
    expected_signature = hmac.new(
        settings.SESSION_SECRET.encode("utf-8"),
        payload_part.encode("utf-8"),
        hashlib.sha256,
    ).digest()
    expected_signature_part = _b64url_encode(expected_signature)

    if not hmac.compare_digest(signature_part, expected_signature_part):
        return None

    try:
        payload = json.loads(_b64url_decode(payload_part).decode("utf-8"))
    except Exception:
        return None

    if int(payload.get("exp", 0)) < int(time.time()):
        return None

    email = payload.get("email")
    if not isinstance(email, str) or not email:
        return None

    return email
