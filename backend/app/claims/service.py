"""
Claims Validation Service.

Implements claim validation logic using RAG retrieval + LLM synthesis.

Pipeline:
  1. User submits claim with details
  2. Retrieve relevant policy clauses using RAG
  3. LLM evaluates claim against policy and determines approval
  4. Return validation result with risk score and reasoning

Architecture ref:
  docs/requirements.md #FR013 – Claim Policy Validation
  Integrates with Phase 5-6 RAG pipeline
"""

from __future__ import annotations

import json
import logging
from typing import List

import litellm

from app.claims.schemas import (
    ApprovalStatus,
    ClaimValidationRequest,
    ClaimValidationResponse,
    ReferencedClause,
    SeverityLevel,
)
from app.rag.retriever import retrieve, RetrievedChunk
from app.core.config import settings

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Error Classification and User-Friendly Messages
# ---------------------------------------------------------------------------

def _classify_ai_error(exc: Exception) -> tuple[str, str]:
    """
    Classify AI/embedding errors and return user-friendly message.

    Returns:
        tuple of (error_type, user_friendly_message)
    """
    error_str = str(exc).lower()
    error_type = type(exc).__name__

    # Rate limit / quota errors
    if "rate" in error_str and "limit" in error_str:
        return "rate_limit", "AI service rate limited. Please try again in a few minutes."
    if "quota" in error_str or "insufficient_quota" in error_str:
        return "quota_exceeded", "AI service quota exceeded. Please try again later."
    if "429" in error_str:
        return "rate_limit", "AI service temporarily busy. Please try again shortly."

    # Authentication errors
    if "401" in error_str or "authentication" in error_str or "api_key" in error_str:
        return "auth_error", "AI service configuration error. Please contact support."

    # Timeout errors
    if "timeout" in error_str or "timed out" in error_str:
        return "timeout", "AI service timed out. Please try again."

    # Connection errors
    if "connection" in error_str or "network" in error_str:
        return "connection_error", "Unable to reach AI service. Please check your connection."

    # Model errors
    if "model" in error_str and ("not found" in error_str or "invalid" in error_str):
        return "model_error", "AI model configuration error. Please contact support."

    # Default unknown error
    return "unknown", "AI service temporarily unavailable. Basic validation will be performed."


def _create_fallback_response(
    request: ClaimValidationRequest,
    error_type: str,
    user_message: str,
) -> ClaimValidationResponse:
    """
    Create a graceful fallback response when AI services fail.

    This allows the workflow to continue with manual review.
    """
    logger.info(
        "Creating fallback response for claim_id=%s (error_type=%s)",
        request.claim_id,
        error_type,
    )

    return ClaimValidationResponse(
        claim_id=request.claim_id,
        policy_number=request.policy_number,
        approval_status=ApprovalStatus.NEEDS_REVIEW,
        risk_score=50.0,  # Neutral risk score
        severity=SeverityLevel.MEDIUM,
        reasoning=(
            f"⚠️ AI Service Unavailable: {user_message}\n\n"
            f"Basic validation completed. Manual review is required to process this claim.\n\n"
            f"Claim Details:\n"
            f"- Type: {request.claim_type.value}\n"
            f"- Amount: ${request.claim_amount:,.2f}\n"
            f"- Description: {request.description[:200]}..."
        ),
        referenced_clauses=[],  # No clauses retrieved due to AI failure
        confidence_score=0.0,  # No AI confidence
        next_steps=[
            "Manual policy review required",
            "Verify claim details against policy documents",
            "Escalate to senior adjuster if needed",
            "Retry AI validation when service is available",
        ],
    )


# System prompt for claim validation
_CLAIMS_SYSTEM_PROMPT = """You are an expert insurance claim adjudicator for InsurAI.

Your role is to:
1. Review submitted claims against policy documents
2. Determine if the claim is covered based on policy terms
3. Identify any exclusions, limitations, or conditions
4. Assess risk level
5. Provide a clear, justified decision

You MUST output ONLY valid JSON with this exact structure:
{
  "approval_status": "approved|denied|pending|needs_review",
  "risk_score": <0-100>,
  "severity": "low|medium|high|critical",
  "reasoning": "<clear explanation of decision>",
  "confidence_score": <0-100>,
  "clause_violations": ["<clause text that excludes claim>", ...],
  "next_steps": ["<action>", ...]
}

Rules:
- Base decision ONLY on provided policy clauses
- If no coverage clauses found, status="pending" (incomplete policy info)
- If exclusions/limitations found, status="denied" or "needs_review"
- Risk score reflects likelihood of fraud/complications (higher=riskier)
- Confidence reflects how certain you are in the decision"""


def _build_claim_query(request: ClaimValidationRequest) -> str:
    """Build a search query for finding relevant policy clauses."""
    return (
        f"Is {request.claim_type.value} claim for ${request.claim_amount} covered? "
        f"Claim: {request.description[:500]}"
    )


def _extract_json_response(text: str) -> dict:
    """Extract JSON from LLM response, handling markdown code blocks."""
    # Try to extract JSON if wrapped in markdown
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
        logger.error("Failed to parse LLM JSON response: %s", exc)
        raise RuntimeError(f"LLM response was not valid JSON: {text}") from exc


def _calculate_risk_score(
    approval_status: ApprovalStatus,
    clause_count: int,
    confidence: float,
) -> tuple[float, SeverityLevel]:
    """Calculate risk score and severity based on validation result."""
    # Base risk calculation
    if approval_status == ApprovalStatus.APPROVED:
        base_risk = 20.0  # Low risk for approved claims
    elif approval_status == ApprovalStatus.DENIED:
        base_risk = 75.0  # High risk for denied claims
    elif approval_status == ApprovalStatus.NEEDS_REVIEW:
        base_risk = 60.0  # Medium-high risk
    else:  # PENDING
        base_risk = 45.0  # Medium risk

    # Adjust by confidence (lower confidence = higher risk)
    risk_score = base_risk + (100 - confidence) * 0.1
    risk_score = min(100.0, max(0.0, risk_score))  # Clamp to 0-100

    # Map to severity
    if risk_score < 25:
        severity = SeverityLevel.LOW
    elif risk_score < 50:
        severity = SeverityLevel.MEDIUM
    elif risk_score < 75:
        severity = SeverityLevel.HIGH
    else:
        severity = SeverityLevel.CRITICAL

    return risk_score, severity


async def validate_claim(
    request: ClaimValidationRequest,
    model: str | None = None,
) -> ClaimValidationResponse:
    """
    Validate a claim against policy documents.

    Pipeline:
      1. Retrieve relevant policy clauses via RAG
      2. Build claim context from retrieved chunks
      3. Call LLM to evaluate coverage and risk
      4. Parse structured response
      5. Return validation result

    Args:
        request: ClaimValidationRequest with claim details
        model: Optional LLM model override

    Returns:
        ClaimValidationResponse with approval status, risk score, reasoning
        Falls back gracefully if AI services are unavailable.
    """
    logger.info(
        "Validating claim: claim_id=%s policy=%s type=%s amount=$%.2f",
        request.claim_id,
        request.policy_number,
        request.claim_type.value,
        request.claim_amount,
    )

    model = model or settings.LLM_MODEL

    # Step 1: Retrieve relevant policy clauses (with fallback)
    query = _build_claim_query(request)
    chunks = []

    try:
        chunks = retrieve(
            query=query,
            workspace_id=request.workspace_id,
            top_k=10,  # Get more context for claim validation
        )
    except Exception as exc:
        # Log the full error internally
        logger.error(
            "Retrieval failed for claim_id=%s: %s (type=%s)",
            request.claim_id,
            exc,
            type(exc).__name__,
            exc_info=True,  # Full stack trace in logs
        )
        # Return graceful fallback instead of raising
        error_type, user_message = _classify_ai_error(exc)
        return _create_fallback_response(request, error_type, user_message)

    # Step 2: Build context from chunks
    context_lines = []
    referenced_clauses = []

    for i, chunk in enumerate(chunks, start=1):
        context_lines.append(
            f"[Clause {i}] (Document: {chunk.document_id}, Section: {chunk.chunk_index}):\n"
            f"{chunk.text}\n"
        )
        referenced_clauses.append(
            ReferencedClause(
                document_id=chunk.document_id,
                chunk_index=chunk.chunk_index,
                clause_text=chunk.text[:500],  # Preview only
                relevance_score=chunk.final_score * 100,
                violation_detected=False,  # Will be updated by LLM
            )
        )

    context = "\n".join(context_lines)

    # Step 3: Format the claim validation request for LLM
    user_message = f"""Evaluate this insurance claim against the provided policy clauses:

CLAIM DETAILS:
- Claim ID: {request.claim_id}
- Policy Number: {request.policy_number}
- Claim Type: {request.claim_type.value}
- Claim Amount: ${request.claim_amount:,.2f}
- Claim Date: {request.claim_date or 'Not provided'}
- Description: {request.description}

RELEVANT POLICY CLAUSES:
{context if context else '[No policy clauses found in workspace]'}

Determine:
1. Is this claim covered? (approved/denied/pending/needs_review)
2. Risk score (0-100, where 100=highest risk)
3. Clear explanation of decision
4. Any clause violations or exclusions found
5. Recommended next steps"""

    # Step 4: Call LLM for evaluation (with fallback)
    try:
        response = litellm.completion(
            model=model,
            messages=[
                {"role": "system", "content": _CLAIMS_SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            temperature=0.2,  # Low temperature for consistent decisions
            timeout=30,
        )
        llm_response = response.choices[0].message.content
    except Exception as exc:
        # Log the full error internally
        logger.error(
            "LLM evaluation failed for claim_id=%s: %s (type=%s)",
            request.claim_id,
            exc,
            type(exc).__name__,
            exc_info=True,  # Full stack trace in logs
        )
        # Return graceful fallback
        error_type, user_message_err = _classify_ai_error(exc)
        return _create_fallback_response(request, error_type, user_message_err)

    # Step 5: Parse structured response (with fallback)
    try:
        result = _extract_json_response(llm_response)
    except RuntimeError as exc:
        logger.error(
            "Failed to parse LLM response for claim_id=%s: %s",
            request.claim_id,
            exc,
        )
        return _create_fallback_response(
            request,
            "parse_error",
            "AI response could not be processed. Manual review required."
        )

    # Step 6: Map LLM result to response schema
    approval_status = ApprovalStatus(result.get("approval_status", "pending"))
    confidence_score = float(result.get("confidence_score", 50.0))
    risk_score, severity = _calculate_risk_score(
        approval_status,
        len(chunks),
        confidence_score,
    )

    # Update violation detection based on LLM feedback
    violations = result.get("clause_violations", [])
    for clause in referenced_clauses:
        if any(violation.lower() in clause.clause_text.lower() for violation in violations):
            clause.violation_detected = True

    return ClaimValidationResponse(
        claim_id=request.claim_id,
        policy_number=request.policy_number,
        approval_status=approval_status,
        risk_score=risk_score,
        severity=severity,
        reasoning=result.get("reasoning", "Unable to determine from policy documents"),
        referenced_clauses=referenced_clauses,
        confidence_score=confidence_score,
        next_steps=result.get("next_steps", ["Manual review recommended"]),
    )
