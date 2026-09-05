from datetime import timedelta
from decimal import Decimal
from django.db.models import Case, Count, DecimalField, F, Sum, Value, When
from django.db.models.functions import Coalesce, TruncWeek
from django.utils import timezone

from apps.deals.models import Deal, DealStage


# Pipeline weighting configuration by stage
STAGE_WEIGHTS = {
    DealStage.NEW: Decimal("0.10"),
    DealStage.QUALIFIED: Decimal("0.30"),
    DealStage.PROPOSAL: Decimal("0.60"),
    DealStage.NEGOTIATION: Decimal("0.80"),
}


def get_dashboard_metrics(user=None) -> dict:
    """
    Computes headline CRM numbers, stage breakdown, owner breakdown,
    and 8-week won deal trends directly via the Django ORM.
    """
    now = timezone.now()
    current_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    base_deals = Deal.objects.all()
    # Filter by user if rep and not manager
    if user and not getattr(user, "is_manager", False) and not getattr(user, "is_superuser", False):
        from django.db.models import Q
        base_deals = base_deals.filter(Q(owner=user) | Q(collaborators=user)).distinct()

    open_stages = [
        DealStage.NEW,
        DealStage.QUALIFIED,
        DealStage.PROPOSAL,
        DealStage.NEGOTIATION,
    ]

    open_deals_qs = base_deals.filter(stage__in=open_stages)

    # 1. Headline numbers: Open deal count & Total unweighted pipeline value
    open_stats = open_deals_qs.aggregate(
        open_count=Count("id"),
        total_value=Sum("value"),
    )
    open_deal_count = open_stats["open_count"] or 0
    total_pipeline_value = open_stats["total_value"] or Decimal("0.00")

    # 2. Headline numbers: Weighted pipeline value using database conditional expression
    weighted_case = Case(
        When(stage=DealStage.NEW, then=F("value") * Value(STAGE_WEIGHTS[DealStage.NEW])),
        When(stage=DealStage.QUALIFIED, then=F("value") * Value(STAGE_WEIGHTS[DealStage.QUALIFIED])),
        When(stage=DealStage.PROPOSAL, then=F("value") * Value(STAGE_WEIGHTS[DealStage.PROPOSAL])),
        When(stage=DealStage.NEGOTIATION, then=F("value") * Value(STAGE_WEIGHTS[DealStage.NEGOTIATION])),
        default=Value(Decimal("0.00")),
        output_field=DecimalField(max_digits=14, decimal_places=2),
    )
    weighted_agg = open_deals_qs.annotate(weighted_val=weighted_case).aggregate(
        weighted_sum=Sum("weighted_val")
    )
    weighted_pipeline_value = (weighted_agg["weighted_sum"] or Decimal("0.00")).quantize(Decimal("0.01"))

    # Effective closed timestamp (falling back to updated_at if closed_at is null)
    effective_closed = Coalesce("closed_at", "updated_at")

    # 3. Headline numbers: Deals won this month
    won_this_month = (
        base_deals.filter(stage=DealStage.WON)
        .annotate(effective_closed_at=effective_closed)
        .filter(effective_closed_at__gte=current_month_start)
        .aggregate(count=Count("id"), total_value=Sum("value"))
    )

    # 4. Headline numbers: Deals lost this month
    lost_this_month = (
        base_deals.filter(stage=DealStage.LOST)
        .annotate(effective_closed_at=effective_closed)
        .filter(effective_closed_at__gte=current_month_start)
        .aggregate(count=Count("id"), total_value=Sum("value"))
    )

    # 5. Open deals breakdown by stage
    stage_breakdown_raw = (
        open_deals_qs.values("stage")
        .annotate(count=Count("id"), total_value=Sum("value"))
        .order_by("stage")
    )
    stage_map = {item["stage"]: item for item in stage_breakdown_raw}
    open_deals_by_stage = []
    for stage_code in open_stages:
        stat = stage_map.get(
            stage_code,
            {"stage": stage_code, "count": 0, "total_value": Decimal("0.00")},
        )
        total_val = (stat["total_value"] or Decimal("0.00")).quantize(Decimal("0.01"))
        weight = STAGE_WEIGHTS[stage_code]
        weighted_val = (total_val * weight).quantize(Decimal("0.01"))

        open_deals_by_stage.append({
            "stage": stage_code,
            "label": DealStage(stage_code).label,
            "count": stat["count"],
            "total_value": str(total_val),
            "weight": float(weight),
            "weight_pct": f"{int(weight * 100)}%",
            "weighted_value": str(weighted_val),
        })

    # 6. Open deals breakdown by owner
    open_deals_by_owner_raw = (
        open_deals_qs.annotate(weighted_val=weighted_case)
        .values(
            "owner__id",
            "owner__first_name",
            "owner__last_name",
            "owner__email",
        )
        .annotate(
            count=Count("id"),
            total_value=Sum("value"),
            weighted_value=Sum("weighted_val"),
        )
        .order_by("-total_value")
    )
    open_deals_by_owner = [
        {
            "owner_id": item["owner__id"],
            "name": f"{item['owner__first_name']} {item['owner__last_name']}".strip() or item["owner__email"],
            "email": item["owner__email"],
            "count": item["count"],
            "total_value": str((item["total_value"] or Decimal("0.00")).quantize(Decimal("0.01"))),
            "weighted_value": str((item["weighted_value"] or Decimal("0.00")).quantize(Decimal("0.01"))),
        }
        for item in open_deals_by_owner_raw
    ]

    # 7. Deals won per week over the last eight weeks (8 consecutive chronological weeks)
    monday_curr = (now - timedelta(days=now.weekday())).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    # Build list of Mondays for the last 8 weeks (from 7 weeks ago through current week)
    weeks_list = [monday_curr - timedelta(weeks=i) for i in range(7, -1, -1)]
    eight_weeks_start = weeks_list[0]

    won_weekly_raw = (
        base_deals.filter(stage=DealStage.WON)
        .annotate(effective_closed_at=effective_closed)
        .filter(effective_closed_at__gte=eight_weeks_start)
        .annotate(week=TruncWeek("effective_closed_at"))
        .values("week")
        .annotate(count=Count("id"), total_value=Sum("value"))
        .order_by("week")
    )
    weekly_map = {}
    for item in won_weekly_raw:
        if item["week"]:
            w_date = item["week"].date() if hasattr(item["week"], "date") else item["week"]
            weekly_map[w_date] = item

    won_per_week = []
    for w in weeks_list:
        w_date = w.date() if hasattr(w, "date") else w
        stat = weekly_map.get(w_date, {"count": 0, "total_value": Decimal("0.00")})
        val = stat["total_value"] or Decimal("0.00")
        won_per_week.append({
            "week": w_date.strftime("%Y-%m-%d"),
            "label": w_date.strftime("%b %d"),
            "count": stat["count"],
            "total_value": str(Decimal(val).quantize(Decimal("0.01"))),
        })

    return {
        "open_deal_count": open_deal_count,
        "total_pipeline_value": str(total_pipeline_value.quantize(Decimal("0.01"))),
        "weighted_pipeline_value": str(weighted_pipeline_value),
        "deals_won_this_month": {
            "count": won_this_month["count"] or 0,
            "total_value": str((won_this_month["total_value"] or Decimal("0.00")).quantize(Decimal("0.01"))),
        },
        "deals_lost_this_month": {
            "count": lost_this_month["count"] or 0,
            "total_value": str((lost_this_month["total_value"] or Decimal("0.00")).quantize(Decimal("0.01"))),
        },
        "open_deals_by_stage": open_deals_by_stage,
        "open_deals_by_owner": open_deals_by_owner,
        "deals_won_per_week": won_per_week,
    }
