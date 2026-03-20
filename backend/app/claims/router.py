"""
Claims Validation Router.

Exposes POST /api/v1/claims/validate endpoint for claim submission and validation.

Architecture ref:
  docs/requirements.md #FR013 – Claim Policy Validation
  docs/roadmap.md Phase 7.5 – Domain-Specific APIs
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, status

from app.claims.schemas import ClaimValidationRequest, ClaimValidationResponse
from app.claims.service import validate_claim

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/claims", tags=["Claims"])


@router.post(
    "/validate",
    response_model=ClaimValidationResponse,
    status_code=status.HTTP_200_OK,
    summary="Validate an insurance claim against policy documents",
    description=(
        "Submit a claim for validation against policy documents. "
        "Uses RAG to retrieve relevant clauses and LLM to evaluate coverage."
    ),
)
async def validate_claim_endpoint(request: ClaimValidationRequest) -> ClaimValidationResponse:
    """
    Validate a claim against policy documents.

    Request body:
      - claim_id: unique claim identifier
      - policy_number: associated policy number
      - claim_type: type of claim (health, auto, home, life, etc.)
      - claim_amount: amount requested
      - description: detailed claim description
      - claim_date: optional ISO 8601 claim date
      - workspace_id: workspace namespace (default: "default")
      - user_id: optional user who submitted the claim

    Response:
      - approval_status: APPROVED | DENIED | PENDING | NEEDS_REVIEW
      - risk_score: 0-100 risk assessment
      - severity: low | medium | high | critical
      - reasoning: AI-generated explanation
      - referenced_clauses: list of relevant policy clauses used in decision
      - confidence_score: 0-100 confidence in decision
      - next_steps: recommended actions

    Errors:
      - 400: Invalid request (validation error)
      - 503: Retrieval or LLM service unavailable
    """
    logger.info(
        "Claim validation request: claim_id=%s policy=%s type=%s",
        request.claim_id,
        request.policy_number,
        request.claim_type.value,
    )

    try:
        result = await validate_claim(request)
    except RuntimeError as exc:
        logger.error("Claim validation failed for claim_id=%s: %s", request.claim_id, exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Claim validation service unavailable: {exc}",
        ) from exc

    logger.info(
        "Claim validation completed: claim_id=%s status=%s risk_score=%.1f",
        result.claim_id,
        result.approval_status.value,
        result.risk_score,
    )

    return result
