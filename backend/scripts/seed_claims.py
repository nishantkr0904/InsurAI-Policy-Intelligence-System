"""Seed realistic claims linked to policies for one or more workspaces.

Usage:
  cd backend
  .venv/bin/python scripts/seed_claims.py
  .venv/bin/python scripts/seed_claims.py --workspaces default drdl

This script is idempotent: existing records are updated, missing records are created.
"""

from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path
from datetime import datetime, timedelta

from sqlalchemy import select

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.database import AsyncSessionLocal
from app.models import Claim, Policy


def build_seed_payloads(workspace_id: str) -> list[dict]:
    now = datetime.utcnow()
    ws_token = workspace_id.upper().replace("-", "_")

    auto_policy_id = f"POL-AUTO-{ws_token}-1001"
    home_policy_id = f"POL-HOME-{ws_token}-2002"
    liability_policy_id = f"POL-LIAB-{ws_token}-3003"

    return [
        {
            "policy_id": auto_policy_id,
            "policy_name": "Auto Shield Plus",
            "policy_type": "auto",
            "claim": {
                "claim_id": f"CLM-{workspace_id.upper()}-AUTO-001",
                "policy_number": auto_policy_id,
                "claimant_name": "Alex Carter",
                "claim_type": "auto",
                "amount": 14250.00,
                "submission_date": now - timedelta(days=1),
                "priority": "high",
                "status": "pending",
                "description": "Rear-end collision damage with towing and rental car request.",
            },
        },
        {
            "policy_id": home_policy_id,
            "policy_name": "Home Secure Comprehensive",
            "policy_type": "property",
            "claim": {
                "claim_id": f"CLM-{workspace_id.upper()}-HOME-002",
                "policy_number": home_policy_id,
                "claimant_name": "Priya Sharma",
                "claim_type": "home",
                "amount": 28500.00,
                "submission_date": now - timedelta(days=2),
                "priority": "urgent",
                "status": "in_review",
                "description": "Roof and interior water damage after severe storm.",
            },
        },
        {
            "policy_id": liability_policy_id,
            "policy_name": "Business Liability Standard",
            "policy_type": "liability",
            "claim": {
                "claim_id": f"CLM-{workspace_id.upper()}-LIAB-003",
                "policy_number": liability_policy_id,
                "claimant_name": "Northwind Logistics LLC",
                "claim_type": "liability",
                "amount": 76000.00,
                "submission_date": now - timedelta(days=3),
                "priority": "urgent",
                "status": "pending",
                "description": "Third-party bodily injury and legal expense claim.",
            },
        },
    ]


async def upsert_claims_for_workspace(workspace_id: str) -> tuple[int, int]:
    created = 0
    updated = 0

    async with AsyncSessionLocal() as session:
        for entry in build_seed_payloads(workspace_id):
            policy = await session.scalar(
                select(Policy).where(
                    Policy.workspace_id == workspace_id,
                    Policy.policy_id == entry["policy_id"],
                )
            )
            if policy is None:
                policy = Policy(
                    workspace_id=workspace_id,
                    policy_id=entry["policy_id"],
                    policy_name=entry["policy_name"],
                    policy_type=entry["policy_type"],
                )
                session.add(policy)

            claim_payload = entry["claim"]
            existing_claim = await session.scalar(
                select(Claim).where(
                    Claim.workspace_id == workspace_id,
                    Claim.claim_id == claim_payload["claim_id"],
                )
            )
            if existing_claim is None:
                session.add(
                    Claim(
                        workspace_id=workspace_id,
                        claim_id=claim_payload["claim_id"],
                        policy_id=entry["policy_id"],
                        policy_number=claim_payload["policy_number"],
                        claimant_name=claim_payload["claimant_name"],
                        claim_type=claim_payload["claim_type"],
                        amount=claim_payload["amount"],
                        submission_date=claim_payload["submission_date"],
                        priority=claim_payload["priority"],
                        status=claim_payload["status"],
                        description=claim_payload["description"],
                    )
                )
                created += 1
            else:
                existing_claim.policy_id = entry["policy_id"]
                existing_claim.policy_number = claim_payload["policy_number"]
                existing_claim.claimant_name = claim_payload["claimant_name"]
                existing_claim.claim_type = claim_payload["claim_type"]
                existing_claim.amount = claim_payload["amount"]
                existing_claim.submission_date = claim_payload["submission_date"]
                existing_claim.priority = claim_payload["priority"]
                existing_claim.status = claim_payload["status"]
                existing_claim.description = claim_payload["description"]
                updated += 1

        await session.commit()

    return created, updated


async def main() -> None:
    parser = argparse.ArgumentParser(description="Seed policy-linked claims for the claims queue")
    parser.add_argument(
        "--workspaces",
        nargs="+",
        default=["default", "drdl"],
        help="Workspace IDs to seed (default: default drdl)",
    )
    args = parser.parse_args()

    for workspace in args.workspaces:
        created, updated = await upsert_claims_for_workspace(workspace)
        print(
            f"workspace={workspace} created={created} updated={updated}"
        )


if __name__ == "__main__":
    asyncio.run(main())
