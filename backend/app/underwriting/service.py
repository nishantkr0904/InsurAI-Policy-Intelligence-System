"""Risk assessment service using policy document analysis and LLM evaluation."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta
from typing import List

import litellm

from app.underwriting.schemas import (
    RiskAssessmentRequest,
    RiskAssessmentResponse,
    RiskLevel,
)
from app.rag.retriever import retrieve
from app.core.config import settings

logger = logging.getLogger(__name__)

_RISK_ASSESSMENT_PROMPT = """You are an expert insurance underwriter for InsurAI.

Your role is to:
1. Analyze the provided policy documents
2. Evaluate risk factors based on the policy details provided
3. Calculate a risk score (0-100) where higher = riskier
4. Classify risk as low (0-30), medium (31-50), high (51-75), or critical (76-100)
5. Provide clear underwriting recommendation
6. Suggest premium adjustment percentage
7. Identify key risk factors
8. Recommend mitigation strategies

You MUST output ONLY valid JSON with this exact structure:
{
  "risk_score": <0-100>,
  "risk_level": "low|medium|high|critical",
  "underwriting_recommendation": "<clear recommendation text>",
  "key_risk_factors": ["<factor1>", "<factor2>", ...],
  "mitigation_strategies": ["<strategy1>", "<strategy2>", ...],
  "premium_adjustment": <percentage>,
  "next_review_date": "<ISO 8601 date 1 year from now>"
}

Rules:
- Risk score reflects overall underwriting risk
- Consider claim history, location, coverage ratios
- Higher claim frequency = higher risk
- Recommend premium adjustments based on risk score:
  * Low: 0-5% increase
  * Medium: 5-15% increase
  * High: 15-30% increase
  * Critical: 30-50% increase
"""


def _calculate_risk_score(request: RiskAssessmentRequest) -> tuple[float, RiskLevel]:
    """
    Calculate baseline risk score from policy parameters.
    
    Factors considered:
    - Coverage-to-value ratio
    - Deductible level
    - Location risk
    - Claims history
    
    Returns:
        Tuple of (risk_score: 0-100, risk_level: RiskLevel)
    """
    base_risk = 30.0  # Start at medium-low
    
    # Coverage ratio risk (overcovered = risky)
    ratio = request.coverage_amount / request.insured_value
    if ratio > 1.0:
        base_risk += 15  # Overcovered = risky
    elif ratio < 0.5:
        base_risk += 5   # Undercovered = less risky but still an issue
    
    # Deductible risk (low deductible = more claims)
    if request.deductible < 500:
        base_risk += 10
    elif request.deductible > 5000:
        base_risk -= 5   # High deductible = less risky
    
    # Location risk
    location_risk = {
        "low": 0,
        "medium": 10,
        "high": 20,
    }
    base_risk += location_risk.get(request.location_risk_tier, 0)
    
    # Claim history (each claim increases risk)
    claim_multiplier = min(request.claim_history * 8, 25)  # Max 25 points
    base_risk += claim_multiplier
    
    # Clamp to 0-100
    risk_score = max(0.0, min(100.0, base_risk))
    
    # Classify
    if risk_score < 30:
        risk_level = RiskLevel.LOW
    elif risk_score < 50:
        risk_level = RiskLevel.MEDIUM
    elif risk_score < 75:
        risk_level = RiskLevel.HIGH
    else:
        risk_level = RiskLevel.CRITICAL
    
    return risk_score, risk_level


def _extract_json_response(text: str) -> dict:
    """Extract JSON from LLM response."""
    if "```json" in text:
        try:
            start = text.index("```json") + 7
            end = text.index("```", start)
            text = text[start:end].strip()
        except (ValueError, IndexError):
            pass
    elif "```" in text:
        try:
            start = text.index("```") + 3
            end = text.index("```", start)
            text = text[start:end].strip()
        except (ValueError, IndexError):
            pass
    
    try:
        return json.loads(text)
    except json.JSONDecodeError as exc:
        logger.error("Failed to parse LLM risk assessment response: %s", exc)
        raise RuntimeError(f"LLM response was not valid JSON: {text}") from exc


async def assess_risk(
    request: RiskAssessmentRequest,
    model: str | None = None,
) -> RiskAssessmentResponse:
    """
    Assess policy risk using document analysis and LLM evaluation.
    
    Pipeline:
      1. Retrieve relevant policy clauses via RAG
      2. Calculate baseline risk score from parameters
      3. Call LLM for expert evaluation
      4. Combine results into final assessment
      5. Return structured response
    
    Args:
        request: Policy details for assessment
        model: Optional LLM model override
    
    Returns:
        RiskAssessmentResponse with risk score and recommendations
    
    Raises:
        RuntimeError: if retrieval or LLM call fails
    """
    logger.info(
        "Assessing risk for policy: id=%s type=%s amount=$%.2f",
        request.policy_id,
        request.policy_type.value,
        request.coverage_amount,
    )
    
    model = model or settings.LLM_MODEL
    
    # Step 1: Retrieve relevant policy clauses
    retrieval_query = (
        f"coverage limits deductibles exclusions for {request.policy_type.value} policy "
        f"with ${request.coverage_amount} coverage"
    )
    
    try:
        chunks = retrieve(
            query=retrieval_query,
            workspace_id=request.workspace_id,
            top_k=8,
        )
    except Exception as exc:
        logger.error("Policy retrieval failed for policy_id=%s: %s", request.policy_id, exc)
        raise RuntimeError(f"Policy retrieval failed: {exc}") from exc
    
    # Step 2: Build policy context
    context_lines = []
    for i, chunk in enumerate(chunks, start=1):
        context_lines.append(
            f"[Policy Section {i}]\n{chunk.text[:300]}...\n"
        )
    context = "\n".join(context_lines) or "[No policy details found in workspace]"
    
    # Step 3: Build LLM evaluation request
    user_message = f"""Evaluate the risk for this insurance policy:

POLICY DETAILS:
- Policy ID: {request.policy_id}
- Type: {request.policy_type.value}
- Coverage Amount: ${request.coverage_amount:,.0f}
- Insured Value: ${request.insured_value:,.0f}
- Deductible: ${request.deductible:,.0f}
- Location Risk: {request.location_risk_tier}
- Claims in Past 5 Years: {request.claim_history}

RELEVANT POLICY SECTIONS:
{context}

Provide a comprehensive risk assessment."""
    
    # Step 4: Call LLM
    try:
        response = litellm.completion(
            model=model,
            messages=[
                {"role": "system", "content": _RISK_ASSESSMENT_PROMPT},
                {"role": "user", "content": user_message},
            ],
            temperature=0.3,  # Low for consistent risk assessment
            timeout=30,
        )
        llm_response = response.choices[0].message.content
    except Exception as exc:
        logger.error("LLM risk assessment failed for policy_id=%s: %s", request.policy_id, exc)
        raise RuntimeError(f"LLM risk assessment failed: {exc}") from exc
    
    # Step 5: Parse LLM response
    try:
        result = _extract_json_response(llm_response)
    except RuntimeError as exc:
        logger.error("Failed to parse risk assessment for policy_id=%s", request.policy_id)
        raise
    
    # Step 6: Build response
    risk_level = RiskLevel(result.get("risk_level", "medium"))
    next_review = datetime.utcnow() + timedelta(days=365)
    
    return RiskAssessmentResponse(
        risk_score=float(result.get("risk_score", 50)),
        risk_level=risk_level,
        underwriting_recommendation=result.get(
            "underwriting_recommendation",
            "Review policy and apply standard underwriting rules"
        ),
        key_risk_factors=result.get("key_risk_factors", []),
        mitigation_strategies=result.get("mitigation_strategies", []),
        premium_adjustment=float(result.get("premium_adjustment", 0)),
        next_review_date=next_review.isoformat(),
    )
