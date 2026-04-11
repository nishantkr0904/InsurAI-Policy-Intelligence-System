"""LiteLLM provider helpers.

Normalizes provider model identifiers and returns provider-specific kwargs
for LiteLLM calls. This keeps all model routing logic in one place.
"""

from __future__ import annotations

from app.core.config import settings


def normalize_model_name(model: str | None, default: str) -> str:
    """Normalize model names to LiteLLM expected format."""
    resolved = (model or default or "").strip()
    if resolved.startswith("ollama:"):
        return f"ollama/{resolved.split(':', 1)[1]}"
    return resolved


def get_litellm_provider_kwargs(model: str) -> dict:
    """Return provider-specific kwargs for LiteLLM APIs."""
    if model.startswith("ollama/"):
        return {
            "api_base": settings.OLLAMA_API_BASE,
            "api_key": None,
        }

    api_key = settings.LITELLM_API_KEY or settings.OPENAI_API_KEY or None
    return {"api_key": api_key} if api_key else {}
