from django.utils import timezone

from apps.alerts.models import AlertType, DealAlert
from apps.deals.models import Deal, DealStage


def sync_and_get_alerts(user):
    """
    Syncs past-due deal alerts for the given user, handles reappearance when expected
    close date changes, and returns active alerts with unread navigation count.
    """
    today = timezone.localdate()

    # Open deals query
    open_stages = [
        DealStage.NEW,
        DealStage.QUALIFIED,
        DealStage.PROPOSAL,
        DealStage.NEGOTIATION,
    ]

    base_deals = Deal.objects.filter(stage__in=open_stages)
    if not user.is_manager and not user.is_superuser:
        from django.db.models import Q
        base_deals = base_deals.filter(Q(owner=user) | Q(collaborators=user)).distinct()

    past_due_deals = base_deals.filter(expected_close_date__lt=today)

    for deal in past_due_deals:
        alert, created = DealAlert.objects.get_or_create(
            deal=deal,
            user=user,
            alert_type=AlertType.PAST_DUE,
            defaults={
                "is_dismissed": False,
                "last_expected_close_date": deal.expected_close_date,
            },
        )
        if not created:
            # Check if expected close date was updated to a new date that is also past due
            if alert.is_dismissed and alert.last_expected_close_date != deal.expected_close_date:
                alert.is_dismissed = False
                alert.dismissed_at = None
                alert.last_expected_close_date = deal.expected_close_date
                alert.save(update_fields=["is_dismissed", "dismissed_at", "last_expected_close_date", "updated_at"])

    # Active alerts are non-dismissed alerts for open deals
    active_alerts = (
        DealAlert.objects.filter(user=user, is_dismissed=False, deal__stage__in=open_stages)
        .select_related("deal", "deal__company", "deal__owner")
        .order_by("deal__expected_close_date")
    )

    return active_alerts
