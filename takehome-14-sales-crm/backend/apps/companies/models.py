from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class Company(models.Model):
    """Company account representing a client or prospect organization."""

    name = models.CharField(_("company name"), max_length=255, db_index=True)
    industry = models.CharField(_("industry"), max_length=100, blank=True, db_index=True)
    website = models.URLField(_("website"), max_length=255, blank=True)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="companies",
        verbose_name=_("owner"),
    )
    is_archived = models.BooleanField(_("is archived"), default=False, db_index=True)
    created_at = models.DateTimeField(_("created at"), auto_now_add=True)
    updated_at = models.DateTimeField(_("updated at"), auto_now=True)

    class Meta:
        verbose_name = _("company")
        verbose_name_plural = _("companies")
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["name", "is_archived"]),
            models.Index(fields=["owner", "is_archived"]),
        ]

    def __str__(self):
        return self.name

    def archive(self):
        self.is_archived = True
        self.save(update_fields=["is_archived", "updated_at"])

    def restore(self):
        self.is_archived = False
        self.save(update_fields=["is_archived", "updated_at"])
