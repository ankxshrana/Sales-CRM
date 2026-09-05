from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _


class AlertType(models.TextChoices):
    PAST_DUE = "PAST_DUE", _("Past Due Expected Close")


class DealAlert(models.Model):
    """
    Alert notification for deals requiring sales attention.
    """

    deal = models.ForeignKey(
        "deals.Deal",
        on_delete=models.CASCADE,
        related_name="alerts",
        verbose_name=_("deal"),
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="deal_alerts",
        verbose_name=_("user"),
    )
    alert_type = models.CharField(
        max_length=50,
        choices=AlertType.choices,
        default=AlertType.PAST_DUE,
    )
    is_dismissed = models.BooleanField(
        _("is dismissed"),
        default=False,
        db_index=True,
    )
    dismissed_at = models.DateTimeField(_("dismissed at"), null=True, blank=True)
    last_expected_close_date = models.DateField(
        _("last seen expected close date"),
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(_("created at"), auto_now_add=True)
    updated_at = models.DateTimeField(_("updated at"), auto_now=True)

    class Meta:
        verbose_name = _("deal alert")
        verbose_name_plural = _("deal alerts")
        ordering = ["-created_at"]
        unique_together = ("deal", "user", "alert_type")

    def __str__(self):
        return f"{self.alert_type} on Deal #{self.deal_id} for {self.user.email}"

    def dismiss(self):
        self.is_dismissed = True
        self.dismissed_at = timezone.now()
        if self.deal:
            self.last_expected_close_date = self.deal.expected_close_date
        self.save(update_fields=["is_dismissed", "dismissed_at", "last_expected_close_date", "updated_at"])
