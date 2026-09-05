from rest_framework import serializers

from apps.alerts.models import DealAlert


class DealAlertSerializer(serializers.ModelSerializer):
    deal_title = serializers.CharField(source="deal.title", read_only=True)
    deal_company = serializers.CharField(source="deal.company.name", read_only=True)
    deal_value = serializers.CharField(source="deal.value", read_only=True)
    deal_stage = serializers.CharField(source="deal.stage", read_only=True)
    expected_close_date = serializers.DateField(source="deal.expected_close_date", read_only=True)

    class Meta:
        model = DealAlert
        fields = (
            "id",
            "deal",
            "deal_title",
            "deal_company",
            "deal_value",
            "deal_stage",
            "expected_close_date",
            "alert_type",
            "is_dismissed",
            "dismissed_at",
            "created_at",
        )
        read_only_fields = fields
