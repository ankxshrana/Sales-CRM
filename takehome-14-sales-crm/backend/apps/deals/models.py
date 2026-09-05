from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.utils.translation import gettext_lazy as _
from decimal import Decimal


class DealStage(models.TextChoices):
    NEW = "NEW", _("New")
    QUALIFIED = "QUALIFIED", _("Qualified")
    PROPOSAL = "PROPOSAL", _("Proposal")
    NEGOTIATION = "NEGOTIATION", _("Negotiation")
    WON = "WON", _("Won")
    LOST = "LOST", _("Lost")


class Deal(models.Model):
    """
    Core Deal/Opportunity entity in the sales pipeline.
    """

    title = models.CharField(_("deal title"), max_length=255, db_index=True)
    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="deals",
        verbose_name=_("company"),
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="owned_deals",
        verbose_name=_("deal owner"),
    )
    stage = models.CharField(
        _("stage"),
        max_length=20,
        choices=DealStage.choices,
        default=DealStage.NEW,
        db_index=True,
    )
    previous_stage = models.CharField(
        _("previous stage"),
        max_length=20,
        choices=DealStage.choices,
        null=True,
        blank=True,
    )
    value = models.DecimalField(
        _("deal value"),
        max_digits=14,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.00"))],
        help_text=_("Deal value in exact currency amount."),
    )
    expected_close_date = models.DateField(
        _("expected close date"),
        db_index=True,
    )
    closed_at = models.DateTimeField(
        _("closed at"),
        null=True,
        blank=True,
    )
    collaborators = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        through="DealCollaborator",
        related_name="collaborating_deals",
        blank=True,
    )
    created_at = models.DateTimeField(_("created at"), auto_now_add=True)
    updated_at = models.DateTimeField(_("updated at"), auto_now=True)

    class Meta:
        verbose_name = _("deal")
        verbose_name_plural = _("deals")
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["stage", "expected_close_date"]),
            models.Index(fields=["owner", "stage"]),
        ]

    def __str__(self):
        return f"{self.title} (${self.value}) - {self.stage}"

    @property
    def is_closed(self):
        return self.stage in (DealStage.WON, DealStage.LOST)

    @property
    def is_won(self):
        return self.stage == DealStage.WON

    @property
    def is_lost(self):
        return self.stage == DealStage.LOST


class CollaboratorRole(models.TextChoices):
    CONTRIBUTOR = "CONTRIBUTOR", _("Contributor")
    VIEWER = "VIEWER", _("Viewer")


class DealCollaborator(models.Model):
    """Through-model for Deal collaborators."""

    deal = models.ForeignKey(
        Deal,
        on_delete=models.CASCADE,
        related_name="deal_collaborators",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="deal_collaborations",
    )
    role = models.CharField(
        max_length=20,
        choices=CollaboratorRole.choices,
        default=CollaboratorRole.CONTRIBUTOR,
    )
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _("deal collaborator")
        verbose_name_plural = _("deal collaborators")
        unique_together = ("deal", "user")

    def __str__(self):
        return f"{self.user.email} on {self.deal.title}"


class DealHistoryAction(models.TextChoices):
    CREATED = "CREATED", _("Created")
    STAGE_CHANGE = "STAGE_CHANGE", _("Stage Changed")
    REOPENED = "REOPENED", _("Reopened")
    OWNER_REASSIGNED = "OWNER_REASSIGNED", _("Owner Reassigned")
    COLLABORATOR_ADDED = "COLLABORATOR_ADDED", _("Collaborator Added")
    COLLABORATOR_REMOVED = "COLLABORATOR_REMOVED", _("Collaborator Removed")
    UPDATED = "UPDATED", _("Updated")


class DealHistory(models.Model):
    """
    Append-only, immutable audit trail of all actions and stage transitions on a deal.
    There is no update or delete operation permitted on this model.
    """

    deal = models.ForeignKey(
        Deal,
        on_delete=models.CASCADE,
        related_name="history",
        verbose_name=_("deal"),
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="deal_history_entries",
        verbose_name=_("user"),
    )
    action = models.CharField(
        max_length=50,
        choices=DealHistoryAction.choices,
        default=DealHistoryAction.STAGE_CHANGE,
    )
    from_stage = models.CharField(
        max_length=20,
        choices=DealStage.choices,
        null=True,
        blank=True,
    )
    to_stage = models.CharField(
        max_length=20,
        choices=DealStage.choices,
        null=True,
        blank=True,
    )
    notes = models.TextField(_("notes / reason"), blank=True)
    created_at = models.DateTimeField(_("timestamp"), auto_now_add=True)

    class Meta:
        verbose_name = _("deal history entry")
        verbose_name_plural = _("deal history entries")
        ordering = ["-created_at"]

    def __str__(self):
        return f"Deal {self.deal_id} {self.action}: {self.from_stage} -> {self.to_stage} at {self.created_at}"

    def save(self, *args, **kwargs):
        # Prevent editing existing history records
        if self.pk is not None:
            raise ValueError("DealHistory records are immutable and cannot be updated.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        # Prevent deleting existing history records
        raise ValueError("DealHistory records are immutable and cannot be deleted.")
