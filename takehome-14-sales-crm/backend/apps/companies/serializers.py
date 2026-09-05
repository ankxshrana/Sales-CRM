from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.accounts.serializers import UserSerializer
from apps.companies.models import Company

User = get_user_model()


class CompanySerializer(serializers.ModelSerializer):
    owner = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        required=False,
    )
    owner_details = UserSerializer(source="owner", read_only=True)
    deals_count = serializers.IntegerField(source="deals.count", read_only=True)

    class Meta:
        model = Company
        fields = (
            "id",
            "name",
            "industry",
            "website",
            "owner",
            "owner_details",
            "is_archived",
            "deals_count",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at", "deals_count", "is_archived")

    def validate(self, attrs):
        request = self.context.get("request")
        if request and request.user:
            user = request.user
            is_manager = getattr(user, "is_manager", False) or getattr(user, "is_superuser", False)
            if "owner" in attrs and attrs["owner"] != user and not is_manager:
                raise serializers.ValidationError({"owner": "Sales reps cannot assign companies to other owners."})
        return attrs

    def create(self, validated_data):
        request = self.context.get("request")
        user = request.user if request else None
        is_manager = getattr(user, "is_manager", False) or getattr(user, "is_superuser", False)
        if not is_manager or "owner" not in validated_data or validated_data["owner"] is None:
            if user and user.is_authenticated:
                validated_data["owner"] = user
        return super().create(validated_data)

