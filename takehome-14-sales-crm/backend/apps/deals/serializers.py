from rest_framework import serializers

from apps.accounts.models import User
from apps.accounts.serializers import UserSerializer
from apps.companies.serializers import CompanySerializer
from apps.deals.models import (
    Deal,
    DealCollaborator,
    DealHistory,
    DealStage,
)


class DealCollaboratorSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source="user",
        write_only=True,
    )

    class Meta:
        model = DealCollaborator
        fields = ("id", "user", "user_id", "role", "added_at")
        read_only_fields = ("id", "added_at")


class DealHistorySerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = DealHistory
        fields = (
            "id",
            "deal_id",
            "user",
            "action",
            "from_stage",
            "to_stage",
            "notes",
            "created_at",
        )
        read_only_fields = fields


class DealSerializer(serializers.ModelSerializer):
    """Read serializer for Deals."""

    company_name = serializers.CharField(source="company.name", read_only=True)
    company_details = CompanySerializer(source="company", read_only=True)
    owner_details = UserSerializer(source="owner", read_only=True)
    collaborators_list = UserSerializer(source="collaborators", many=True, read_only=True)
    is_closed = serializers.BooleanField(read_only=True)
    is_won = serializers.BooleanField(read_only=True)
    is_lost = serializers.BooleanField(read_only=True)
    value = serializers.DecimalField(max_digits=14, decimal_places=2, coerce_to_string=True)

    class Meta:
        model = Deal
        fields = (
            "id",
            "title",
            "company",
            "company_name",
            "company_details",
            "owner",
            "owner_details",
            "stage",
            "previous_stage",
            "value",
            "expected_close_date",
            "closed_at",
            "is_closed",
            "is_won",
            "is_lost",
            "collaborators_list",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "previous_stage",
            "closed_at",
            "is_closed",
            "is_won",
            "is_lost",
            "created_at",
            "updated_at",
        )


class DealCreateUpdateSerializer(serializers.ModelSerializer):
    """Write serializer for creating and updating Deals."""

    value = serializers.DecimalField(max_digits=14, decimal_places=2)
    owner = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        required=False,
    )

    class Meta:
        model = Deal
        fields = (
            "id",
            "title",
            "company",
            "owner",
            "stage",
            "value",
            "expected_close_date",
        )
        read_only_fields = ("id",)

    def validate(self, attrs):
        request = self.context.get("request")
        user = request.user if request else None
        is_manager = getattr(user, "is_manager", False) or getattr(user, "is_superuser", False)

        if self.instance is not None:
            # Updating existing deal
            # 1. Owner reassignment check: Only sales managers can reassign deal ownership
            if "owner" in attrs and attrs["owner"] != self.instance.owner:
                if not is_manager:
                    raise serializers.ValidationError({"owner": "Only sales managers can reassign deal ownership."})

            # 2. Stage changes on closed deals
            if "stage" in attrs and attrs["stage"] != self.instance.stage:
                if self.instance.is_closed:
                    raise serializers.ValidationError({
                        "stage": "Closed deals cannot change stage unless reopened by a sales manager."
                    })
                from apps.deals.services import can_transition_stage
                is_valid, is_backward, msg = can_transition_stage(self.instance.stage, attrs["stage"])
                if not is_valid:
                    raise serializers.ValidationError({"stage": msg})
                if is_backward:
                    raise serializers.ValidationError({
                        "stage": "Backward stage transitions must use the dedicated stage change endpoint with a reason."
                    })
        else:
            # Creating new deal
            # Sales reps can only create deals owned by themselves
            if "owner" in attrs and user and attrs["owner"] != user and not is_manager:
                raise serializers.ValidationError({
                    "owner": "Sales reps can only create deals owned by themselves."
                })

        return attrs

    def create(self, validated_data):
        request = self.context.get("request")
        user = request.user if request else None
        is_manager = getattr(user, "is_manager", False) or getattr(user, "is_superuser", False)

        # Default owner to current user if not provided or if non-manager
        if not is_manager or "owner" not in validated_data or validated_data["owner"] is None:
            if user and user.is_authenticated:
                validated_data["owner"] = user

        deal = super().create(validated_data)
        # Create initial audit history entry
        if user and user.is_authenticated:
            DealHistory.objects.create(
                deal=deal,
                user=user,
                action="CREATED",
                to_stage=deal.stage,
                notes="Deal created",
            )
        return deal


class DealStageTransitionSerializer(serializers.Serializer):
    new_stage = serializers.ChoiceField(choices=DealStage.choices)
    reason = serializers.CharField(required=False, allow_blank=True, default="")


class DealReopenSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False, allow_blank=True, default="")


class DealReassignSerializer(serializers.Serializer):
    new_owner_id = serializers.IntegerField()


class AddCollaboratorSerializer(serializers.Serializer):
    user_id = serializers.IntegerField()
    role = serializers.ChoiceField(
        choices=["CONTRIBUTOR", "VIEWER"],
        default="CONTRIBUTOR",
    )


class BulkAdvanceSerializer(serializers.Serializer):
    deal_ids = serializers.ListField(
        child=serializers.IntegerField(),
        allow_empty=False,
    )


class BulkReassignSerializer(serializers.Serializer):
    deal_ids = serializers.ListField(
        child=serializers.IntegerField(),
        allow_empty=False,
    )
    new_owner_id = serializers.IntegerField()

