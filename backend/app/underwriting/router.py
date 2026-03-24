"""Underwriting Router for risk assessment endpoints."""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, status

from app.underwriting.schemas import RiskAssessmentRequest, RiskAssessmentResponse
from app.underwriting.service import assess_risk

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/underwriting", tags=["Underwriting"])


@router.post(
    "/risk-assessment",
    response_model=RiskAssessmentResponse,
    status_code=status.HTTP_200_OK,
    summary="Assess policy risk",
)
async def risk_assessment(request: RiskAssessmentRequest) -> RiskAssessmentResponse:
    """
    Assess the risk level of an insurance policy.
    
    Evaluates:
    - Coverage adequacy
    - Deductible appropriateness
    - Location-based risks
    - Claim history patterns
    
    Returns risk score (0-100), classification, risk factors, and mitigation strategies.
    
    Args:
        request: Policy details including coverage, deductible, location, claim history
    
    Returns:
        RiskAssessmentResponse with risk score, classification, and recommendations
    """
    logger.info(
        "Risk assessment request: policy_id=%s type=%s amount=$%.2f",
        request.policy_id,
        request.policy_type.value,
        request.coverage_amount,
    )
    
    try:
        result = await assess_risk(request)
    except RuntimeError as exc:
        logger.error("Risk assessment failed for policy_id=%s: %s", request.policy_id, exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Risk assessment service unavailable: {exc}",
        ) from exc
    
    logger.info(
        "Risk assessment complete: policy_id=%s risk_score=%.1f risk_level=%s",
        request.policy_id,
        result.risk_score,
        result.risk_level.value,
    )
    
    return result
