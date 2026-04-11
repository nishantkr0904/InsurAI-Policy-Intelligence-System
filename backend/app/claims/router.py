"""
Claims Validation Router.

Exposes POST /api/v1/claims/validate endpoint for claim submission and validation.

Architecture ref:
  docs/requirements.md #FR013 – Claim Policy Validation
  docs/roadmap.md Phase 7.5 – Domain-Specific APIs
"""

from __future__ import annotations

import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.claims.schemas import (
  ClaimDecisionRequest,
  ClaimCreateRequest,
  ClaimQueueItem,
  ClaimValidationRequest,
  ClaimValidationResponse,
)
from app.claims.service import validate_claim
from app.database import get_db
from app.models import Claim, ClaimValidation, Policy
from app.notifications.schemas import NotificationPriority, NotificationType
from app.notifications.service import dispatch_notification_for_actor

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/claims", tags=["Claims"])


def _claim_to_queue_item(claim: Claim) -> ClaimQueueItem:
  return ClaimQueueItem(
    claim_id=claim.claim_id,
    policy_id=claim.policy_id,
    policy_number=claim.policy_number,
    claimant_name=claim.claimant_name or "Unknown claimant",
    claim_type=claim.claim_type,
    amount=claim.amount,
    submission_date=claim.submission_date.isoformat() if claim.submission_date else datetime.utcnow().isoformat(),
    priority=claim.priority,
    status=claim.status,
    description=claim.description,
  )


@router.get(
  "",
  response_model=list[ClaimQueueItem],
  status_code=status.HTTP_200_OK,
  summary="List claims queue",
)
async def list_claims(
  workspace_id: str = Query(default="default", description="Workspace to list claims for."),
  session: AsyncSession = Depends(get_db),
) -> list[ClaimQueueItem]:
  result = await session.execute(
    select(Claim)
    .where(Claim.workspace_id == workspace_id)
    .order_by(Claim.submission_date.desc(), Claim.created_at.desc())
  )
  claims = list(result.scalars().all())
  return [_claim_to_queue_item(claim) for claim in claims]


@router.post(
  "",
  response_model=ClaimQueueItem,
  status_code=status.HTTP_201_CREATED,
  summary="Create claim queue record",
)
async def create_claim(
  payload: ClaimCreateRequest,
  session: AsyncSession = Depends(get_db),
) -> ClaimQueueItem:
  policy = await session.scalar(
    select(Policy).where(
      Policy.workspace_id == payload.workspace_id,
      Policy.policy_id == payload.policy_id,
    )
  )
  if policy is None:
    raise HTTPException(
      status_code=status.HTTP_400_BAD_REQUEST,
      detail=f"Unknown policy_id '{payload.policy_id}' for workspace '{payload.workspace_id}'.",
    )

  existing = await session.scalar(
    select(Claim).where(
      Claim.workspace_id == payload.workspace_id,
      Claim.claim_id == payload.claim_id,
    )
  )

  parsed_date = datetime.fromisoformat(payload.submission_date) if payload.submission_date else datetime.utcnow()

  if existing:
    existing.policy_id = payload.policy_id
    existing.policy_number = payload.policy_number
    existing.claimant_name = payload.claimant_name
    existing.claim_type = payload.claim_type.value
    existing.amount = payload.amount
    existing.submission_date = parsed_date
    existing.priority = payload.priority
    existing.status = payload.status
    existing.description = payload.description
    claim = existing
  else:
    claim = Claim(
      workspace_id=payload.workspace_id,
      claim_id=payload.claim_id,
      policy_id=payload.policy_id,
      policy_number=payload.policy_number,
      claimant_name=payload.claimant_name,
      claim_type=payload.claim_type.value,
      amount=payload.amount,
      submission_date=parsed_date,
      priority=payload.priority,
      status=payload.status,
      description=payload.description,
    )
    session.add(claim)

  await session.flush()
  return _claim_to_queue_item(claim)


@router.patch(
  "/{claim_id}/decision",
  response_model=ClaimQueueItem,
  status_code=status.HTTP_200_OK,
  summary="Submit final claim decision",
)
async def submit_claim_decision(
  claim_id: str,
  payload: ClaimDecisionRequest,
  session: AsyncSession = Depends(get_db),
) -> ClaimQueueItem:
  claim = await session.scalar(
    select(Claim).where(
      Claim.workspace_id == payload.workspace_id,
      Claim.claim_id == claim_id,
    )
  )
  if claim is None:
    raise HTTPException(
      status_code=status.HTTP_404_NOT_FOUND,
      detail=f"Claim '{claim_id}' not found in workspace '{payload.workspace_id}'.",
    )

  claim.status = "validated" if payload.decision in {"approved", "approved_with_conditions", "rejected"} else "in_review"

  validation = await session.scalar(
    select(ClaimValidation).where(
      ClaimValidation.workspace_id == payload.workspace_id,
      ClaimValidation.claim_id == claim_id,
    )
  )
  if validation is not None:
    validation.approved_by = payload.user_id
    validation.approved_at = datetime.utcnow()
    notes = payload.adjuster_notes or ""
    if payload.override_reason:
      notes = f"{notes}\nOverride: {payload.override_reason}".strip()
    validation.approval_notes = notes or validation.approval_notes

  await session.flush()
  return _claim_to_queue_item(claim)


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
async def validate_claim_endpoint(
  request: ClaimValidationRequest,
  http_request: Request,
  session: AsyncSession = Depends(get_db),
) -> ClaimValidationResponse:
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

    claim_record = await session.scalar(
      select(Claim).where(
        Claim.workspace_id == request.workspace_id,
        Claim.claim_id == request.claim_id,
      )
    )

    # Keep backward compatibility while prioritizing structured policy linkage.
    if claim_record is not None and request.policy_id is None:
      request.policy_id = claim_record.policy_id

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

    # Persist/update claims queue record to keep frontend queue backend-driven.
    if claim_record is None:
      claim_record = Claim(
        workspace_id=request.workspace_id,
        claim_id=request.claim_id,
        policy_id=request.policy_id or request.policy_number,
        policy_number=request.policy_number,
        claimant_name="Unknown claimant",
        claim_type=request.claim_type.value,
        amount=request.claim_amount,
        submission_date=datetime.fromisoformat(request.claim_date) if request.claim_date else datetime.utcnow(),
        priority="high" if request.claim_amount >= 50000 else "medium",
        status="pending",
        description=request.description,
      )
      session.add(claim_record)

    claim_record.policy_id = request.policy_id or claim_record.policy_id
    claim_record.policy_number = request.policy_number
    claim_record.claim_type = request.claim_type.value
    claim_record.amount = request.claim_amount
    claim_record.description = request.description
    claim_record.status = "validated" if result.approval_status.value in {"approved", "denied"} else "in_review"

    # Surface resolved policy_id in response payload for frontend context.
    result.policy_id = claim_record.policy_id

    try:
      await dispatch_notification_for_actor(
        request=http_request,
        session=session,
        workspace_id=request.workspace_id,
        notification_type=NotificationType.CLAIM,
        priority=(
          NotificationPriority.HIGH
          if result.severity.value in {"high", "critical"}
          else NotificationPriority.MEDIUM
        ),
        title=f"Claim {result.claim_id} validated ({result.approval_status.value})",
        message=f"Risk score {result.risk_score:.1f}. Review validation details and next steps.",
        metadata={
          "claim_id": result.claim_id,
          "policy_number": result.policy_number,
          "approval_status": result.approval_status.value,
          "severity": result.severity.value,
          "risk_score": result.risk_score,
        },
        dedupe_key=f"claim-validation:{request.workspace_id}:{result.claim_id}:{result.approval_status.value}",
        x_user_id=request.user_id,
      )
    except Exception as exc:
      logger.warning("Failed to dispatch claim notification: %s", exc)

    return result
