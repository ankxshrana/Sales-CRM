import csv
import io
from decimal import Decimal
from django.core.exceptions import PermissionDenied, ValidationError
from django.db import transaction
from django.utils import timezone

from apps.deals.models import (
    Deal,
    DealCollaborator,
    DealHistory,
    DealHistoryAction,
    DealStage,
)

# Linear progression order for stages
STAGE_ORDER = [
    DealStage.NEW,
    DealStage.QUALIFIED,
    DealStage.PROPOSAL,
    DealStage.NEGOTIATION,
]

# Valid forward transitions map: current -> list of allowed targets
ALLOWED_FORWARD_TRANSITIONS = {
    DealStage.NEW: [DealStage.QUALIFIED],
    DealStage.QUALIFIED: [DealStage.PROPOSAL],
    DealStage.PROPOSAL: [DealStage.NEGOTIATION],
    DealStage.NEGOTIATION: [DealStage.WON, DealStage.LOST],
}

# Valid backward transitions map: current -> allowed target (exactly 1 stage back)
ALLOWED_BACKWARD_TRANSITIONS = {
    DealStage.NEGOTIATION: DealStage.PROPOSAL,
    DealStage.PROPOSAL: DealStage.QUALIFIED,
    DealStage.QUALIFIED: DealStage.NEW,
}


def can_transition_stage(current_stage: str, target_stage: str) -> tuple[bool, bool, str]:
    """
    Evaluates stage transition validity.
    Returns: (is_allowed, is_backward, message)
    """
    if current_stage == target_stage:
        return False, False, "Deal is already at this stage."

    # Check forward transitions
    allowed_forward = ALLOWED_FORWARD_TRANSITIONS.get(current_stage, [])
    if target_stage in allowed_forward:
        return True, False, "Valid forward transition."

    # Check backward transitions
    allowed_backward = ALLOWED_BACKWARD_TRANSITIONS.get(current_stage)
    if allowed_backward and target_stage == allowed_backward:
        return True, True, "Valid backward transition (requires reason)."

    return (
        False,
        False,
        f"Invalid transition from {current_stage} to {target_stage}. "
        f"Allowed progression: NEW -> QUALIFIED -> PROPOSAL -> NEGOTIATION -> WON/LOST. "
        f"Backward transitions are only allowed exactly one stage at a time.",
    )


@transaction.atomic
def transition_deal_stage(deal: Deal, new_stage: str, user, reason: str = "") -> Deal:
    """
    Validates and executes a stage change for a deal, creating an immutable history entry.
    """
    if deal.is_closed:
        raise ValidationError(
            f"Deal is closed ({deal.stage}). Closed deals cannot change stage unless reopened by a sales manager."
        )

    is_valid, is_backward, message = can_transition_stage(deal.stage, new_stage)
    if not is_valid:
        raise ValidationError(message)

    if is_backward and not reason.strip():
        raise ValidationError("A reason is required to move a deal backward in stage.")

    old_stage = deal.stage
    deal.previous_stage = old_stage

    if new_stage in (DealStage.WON, DealStage.LOST):
        deal.closed_at = timezone.now()
    else:
        deal.closed_at = None

    deal.stage = new_stage
    deal.save(update_fields=["stage", "previous_stage", "closed_at", "updated_at"])

    # Create immutable audit record
    DealHistory.objects.create(
        deal=deal,
        user=user,
        action=DealHistoryAction.STAGE_CHANGE,
        from_stage=old_stage,
        to_stage=new_stage,
        notes=reason.strip(),
    )

    return deal


@transaction.atomic
def reopen_deal(deal: Deal, user, reason: str = "") -> Deal:
    """
    Reopens a closed deal (WON or LOST) back to its previous stage.
    Must be executed by a user with manager permissions.
    """
    if not getattr(user, "is_manager", False) and not getattr(user, "is_superuser", False):
        raise PermissionDenied("Only sales managers can reopen closed deals.")

    if not deal.is_closed:
        raise ValidationError("Only closed deals (WON or LOST) can be reopened.")

    target_stage = deal.previous_stage or DealStage.NEGOTIATION
    old_stage = deal.stage

    deal.stage = target_stage
    deal.previous_stage = old_stage
    deal.closed_at = None
    deal.save(update_fields=["stage", "previous_stage", "closed_at", "updated_at"])

    DealHistory.objects.create(
        deal=deal,
        user=user,
        action=DealHistoryAction.REOPENED,
        from_stage=old_stage,
        to_stage=target_stage,
        notes=reason.strip() or f"Reopened by {user.get_full_name() or user.email}",
    )

    return deal


@transaction.atomic
def reassign_deal_owner(deal: Deal, new_owner, user) -> Deal:
    """
    Reassigns deal ownership and records audit log.
    """
    if deal.owner_id == new_owner.id:
        return deal

    old_owner_name = deal.owner.get_full_name() or deal.owner.email
    new_owner_name = new_owner.get_full_name() or new_owner.email

    deal.owner = new_owner
    deal.save(update_fields=["owner", "updated_at"])

    DealHistory.objects.create(
        deal=deal,
        user=user,
        action=DealHistoryAction.OWNER_REASSIGNED,
        from_stage=deal.stage,
        to_stage=deal.stage,
        notes=f"Owner reassigned from {old_owner_name} to {new_owner_name}",
    )

    return deal


# Pipeline weighting configuration by stage
STAGE_WEIGHTS = {
    DealStage.NEW: Decimal("0.10"),
    DealStage.QUALIFIED: Decimal("0.30"),
    DealStage.PROPOSAL: Decimal("0.60"),
    DealStage.NEGOTIATION: Decimal("0.80"),
    DealStage.WON: Decimal("1.00"),
    DealStage.LOST: Decimal("0.00"),
}


def bulk_advance_deals(deal_ids: list[int], user) -> dict:
    """
    Advances multiple deals to their next sequential forward stage where possible.
    Reports per-deal success and rejection details without failing the entire batch.
    """
    deals_dict = {
        d.id: d for d in Deal.objects.filter(id__in=deal_ids).select_related("company", "owner")
    }

    results = []
    succeeded_count = 0
    failed_count = 0

    for deal_id in deal_ids:
        deal = deals_dict.get(deal_id)
        if not deal:
            failed_count += 1
            results.append({
                "deal_id": deal_id,
                "title": f"Deal #{deal_id}",
                "status": "REJECTED",
                "from_stage": None,
                "to_stage": None,
                "reason": f"Deal #{deal_id} was not found.",
            })
            continue

        if deal.is_closed:
            failed_count += 1
            results.append({
                "deal_id": deal.id,
                "title": deal.title,
                "status": "REJECTED",
                "from_stage": deal.stage,
                "to_stage": None,
                "reason": f"Deal is closed ({deal.stage}) and cannot advance.",
            })
            continue

        allowed_next = ALLOWED_FORWARD_TRANSITIONS.get(deal.stage, [])
        if not allowed_next:
            failed_count += 1
            results.append({
                "deal_id": deal.id,
                "title": deal.title,
                "status": "REJECTED",
                "from_stage": deal.stage,
                "to_stage": None,
                "reason": f"Deal in {deal.stage} stage has no automated next stage.",
            })
            continue

        # If deal is in NEGOTIATION, automated next stage cannot choose between WON and LOST
        if deal.stage == DealStage.NEGOTIATION:
            failed_count += 1
            results.append({
                "deal_id": deal.id,
                "title": deal.title,
                "status": "REJECTED",
                "from_stage": deal.stage,
                "to_stage": None,
                "reason": "Negotiation deals must be closed individually as Won or Lost.",
            })
            continue

        next_stage = allowed_next[0]
        try:
            with transaction.atomic():
                transition_deal_stage(deal, next_stage, user, reason="Bulk advanced by sales manager")
            succeeded_count += 1
            results.append({
                "deal_id": deal.id,
                "title": deal.title,
                "status": "SUCCESS",
                "from_stage": deal.previous_stage,
                "to_stage": next_stage,
                "reason": f"Successfully advanced from {deal.previous_stage} to {next_stage}.",
            })
        except ValidationError as e:
            failed_count += 1
            results.append({
                "deal_id": deal.id,
                "title": deal.title,
                "status": "REJECTED",
                "from_stage": deal.stage,
                "to_stage": next_stage,
                "reason": str(e),
            })

    return {
        "total_selected": len(deal_ids),
        "succeeded_count": succeeded_count,
        "failed_count": failed_count,
        "results": results,
    }


def bulk_reassign_deals(deal_ids: list[int], new_owner, user) -> dict:
    """
    Reassigns multiple deals to a new sales owner.
    Reports per-deal success and rejection details without failing the entire batch.
    """
    deals_dict = {
        d.id: d for d in Deal.objects.filter(id__in=deal_ids).select_related("owner")
    }

    results = []
    succeeded_count = 0
    failed_count = 0
    new_owner_name = new_owner.get_full_name() or new_owner.email

    for deal_id in deal_ids:
        deal = deals_dict.get(deal_id)
        if not deal:
            failed_count += 1
            results.append({
                "deal_id": deal_id,
                "title": f"Deal #{deal_id}",
                "status": "REJECTED",
                "reason": f"Deal #{deal_id} was not found.",
            })
            continue

        if deal.owner_id == new_owner.id:
            results.append({
                "deal_id": deal.id,
                "title": deal.title,
                "status": "SKIPPED",
                "reason": f"Deal is already owned by {new_owner_name}.",
            })
            succeeded_count += 1
            continue

        try:
            with transaction.atomic():
                old_owner_name = deal.owner.get_full_name() or deal.owner.email
                reassign_deal_owner(deal, new_owner, user)
            succeeded_count += 1
            results.append({
                "deal_id": deal.id,
                "title": deal.title,
                "status": "SUCCESS",
                "reason": f"Reassigned ownership from {old_owner_name} to {new_owner_name}.",
            })
        except Exception as e:
            failed_count += 1
            results.append({
                "deal_id": deal.id,
                "title": deal.title,
                "status": "REJECTED",
                "reason": str(e),
            })

    return {
        "total_selected": len(deal_ids),
        "succeeded_count": succeeded_count,
        "failed_count": failed_count,
        "new_owner": {
            "id": new_owner.id,
            "name": new_owner_name,
            "email": new_owner.email,
        },
        "results": results,
    }


def export_deals_csv(queryset) -> str:
    """
    Generates CSV string content for open pipeline deals with company, stage,
    value, and stage-weighted value.
    """
    output = io.StringIO()
    writer = csv.writer(output)

    # Header
    writer.writerow([
        "Deal ID",
        "Deal Title",
        "Company",
        "Stage",
        "Deal Value (USD)",
        "Stage Weight",
        "Stage-Weighted Value (USD)",
        "Owner",
        "Owner Email",
        "Expected Close Date",
        "Created At",
    ])

    for deal in queryset.select_related("company", "owner"):
        weight = STAGE_WEIGHTS.get(deal.stage, Decimal("0.00"))
        weighted_val = (deal.value * weight).quantize(Decimal("0.01"))
        weight_pct = f"{int(weight * 100)}%"

        writer.writerow([
            deal.id,
            deal.title,
            deal.company.name if deal.company else "",
            deal.stage,
            f"{deal.value:.2f}",
            weight_pct,
            f"{weighted_val:.2f}",
            deal.owner.get_full_name() if deal.owner else "",
            deal.owner.email if deal.owner else "",
            deal.expected_close_date.strftime("%Y-%m-%d") if deal.expected_close_date else "",
            deal.created_at.strftime("%Y-%m-%d %H:%M:%S") if deal.created_at else "",
        ])

    return output.getvalue()
