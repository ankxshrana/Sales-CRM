from django.core.exceptions import PermissionDenied, ValidationError
from django.db import models
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from apps.accounts.models import User
from apps.accounts.permissions import (
    CanManageCollaborators,
    IsDealOwner,
    IsDealOwnerOrCollaborator,
    IsSalesManager,
)
from apps.deals.filters import DealFilter
from apps.deals.models import (
    Deal,
    DealCollaborator,
    DealHistory,
    DealHistoryAction,
    DealStage,
)
from apps.deals.serializers import (
    AddCollaboratorSerializer,
    BulkAdvanceSerializer,
    BulkReassignSerializer,
    DealCollaboratorSerializer,
    DealCreateUpdateSerializer,
    DealHistorySerializer,
    DealReassignSerializer,
    DealReopenSerializer,
    DealSerializer,
    DealStageTransitionSerializer,
)
from apps.deals.services import (
    bulk_advance_deals,
    bulk_reassign_deals,
    export_deals_csv,
    reassign_deal_owner,
    reopen_deal,
    transition_deal_stage,
)


class StandardDealPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 100


class DealOrderingFilter(filters.OrderingFilter):
    """
    Ordering filter with field alias mapping and deterministic tiebreaking.
    """

    def get_ordering(self, request, queryset, view):
        params = request.query_params.get(self.ordering_param)
        if params:
            fields = [param.strip() for param in params.split(",")]
            mapped_fields = []
            for f in fields:
                desc = f.startswith("-")
                clean = f.lstrip("-")
                if clean in ("company", "company_name"):
                    mapped_fields.append("-company__name" if desc else "company__name")
                elif clean == "owner":
                    mapped_fields.append("-owner__first_name" if desc else "owner__first_name")
                elif clean in ("last_update", "last_updated"):
                    mapped_fields.append("-updated_at" if desc else "updated_at")
                else:
                    mapped_fields.append(f)
            ordering = self.remove_invalid_fields(queryset, mapped_fields, view, request)
            if ordering:
                # Add deterministic tiebreaker
                if "id" not in [f.lstrip("-") for f in ordering]:
                    return list(ordering) + ["-id" if ordering[0].startswith("-") else "id"]
                return ordering
        return ("-updated_at", "-id")


class DealViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Deal operations, lifecycle stage transitions, collaborators, and bulk actions.
    """

    queryset = (
        Deal.objects.select_related("company", "owner")
        .prefetch_related("collaborators", "history")
        .all()
    )
    pagination_class = StandardDealPagination
    filter_backends = (
        DjangoFilterBackend,
        filters.SearchFilter,
        DealOrderingFilter,
    )
    filterset_class = DealFilter
    search_fields = ("title", "company__name", "owner__first_name", "owner__last_name", "owner__email")
    ordering_fields = (
        "value",
        "expected_close_date",
        "created_at",
        "updated_at",
        "stage",
        "title",
        "company__name",
        "owner__first_name",
    )
    ordering = ("-updated_at", "-id")

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return DealCreateUpdateSerializer
        return DealSerializer

    def get_permissions(self):
        if self.action in ("reopen", "bulk_reassign", "bulk_advance", "reassign"):
            permission_classes = [permissions.IsAuthenticated, IsSalesManager]
        elif self.action in ("destroy",):
            permission_classes = [permissions.IsAuthenticated, IsDealOwner]
        elif self.action in ("update", "partial_update", "change_stage"):
            permission_classes = [permissions.IsAuthenticated, IsDealOwnerOrCollaborator]
        elif self.action in ("history",):
            permission_classes = [permissions.IsAuthenticated, IsDealOwnerOrCollaborator]
        elif self.action in ("collaborators",):
            permission_classes = [permissions.IsAuthenticated, CanManageCollaborators]
        else:
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not user or not user.is_authenticated:
            return qs.none()
        # Sales managers can see and act on every deal.
        # Sales reps can see ONLY deals they own or collaborate on.
        if not user.is_manager and not user.is_superuser:
            qs = qs.filter(models.Q(owner=user) | models.Q(collaborators=user))
        return qs.distinct()

    def perform_update(self, serializer):
        deal = self.get_object()
        new_owner = serializer.validated_data.get("owner")
        if new_owner and new_owner != deal.owner:
            reassign_deal_owner(deal=deal, new_owner=new_owner, user=self.request.user)
        serializer.save()

    @action(detail=True, methods=["post"], url_path="reassign")
    def reassign(self, request, pk=None):
        """Reassign deal to a new owner (Sales Manager only)."""
        deal = self.get_object()
        serializer = DealReassignSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        new_owner_id = serializer.validated_data["new_owner_id"]
        new_owner = get_object_or_404(User, id=new_owner_id)
        updated_deal = reassign_deal_owner(deal=deal, new_owner=new_owner, user=request.user)
        return Response(DealSerializer(updated_deal).data, status=status.HTTP_200_OK)


    @action(detail=True, methods=["post"], url_path="stage")
    def change_stage(self, request, pk=None):
        """Transition deal stage with validation and audit logging."""
        deal = self.get_object()
        serializer = DealStageTransitionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        new_stage = serializer.validated_data["new_stage"]
        reason = serializer.validated_data.get("reason", "")

        try:
            updated_deal = transition_deal_stage(
                deal=deal,
                new_stage=new_stage,
                user=request.user,
                reason=reason,
            )
            return Response(DealSerializer(updated_deal).data, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response(
                {"error": e.message if hasattr(e, "message") else str(e.messages[0] if hasattr(e, "messages") else e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=True, methods=["post"], url_path="reopen")
    def reopen(self, request, pk=None):
        """Reopen closed deal to previous stage (Sales Manager only)."""
        deal = self.get_object()
        serializer = DealReopenSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        reason = serializer.validated_data.get("reason", "")
        try:
            updated_deal = reopen_deal(deal=deal, user=request.user, reason=reason)
            return Response(DealSerializer(updated_deal).data, status=status.HTTP_200_OK)
        except (ValidationError, PermissionDenied) as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=True, methods=["get"], url_path="history")
    def history(self, request, pk=None):
        """Retrieve immutable audit history timeline for a deal."""
        deal = self.get_object()
        history_entries = DealHistory.objects.filter(deal=deal).select_related("user").order_by("-created_at")
        serializer = DealHistorySerializer(history_entries, many=True)
        return Response(serializer.data)

    @action(
        detail=True,
        methods=["post", "delete"],
        url_path=r"collaborators(?:/(?P<user_id>\d+))?",
    )
    def collaborators(self, request, pk=None, user_id=None):
        """Add or remove a collaborator from the deal."""
        deal = self.get_object()

        if request.method == "POST":
            serializer = AddCollaboratorSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            collab_user_id = serializer.validated_data["user_id"]
            role = serializer.validated_data.get("role", "CONTRIBUTOR")

            user_to_add = get_object_or_404(User, id=collab_user_id)
            if user_to_add.id == deal.owner_id:
                return Response(
                    {"error": "Deal owner cannot be added as a collaborator."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            collaborator, created = DealCollaborator.objects.update_or_create(
                deal=deal,
                user=user_to_add,
                defaults={"role": role},
            )

            DealHistory.objects.create(
                deal=deal,
                user=request.user,
                action=DealHistoryAction.COLLABORATOR_ADDED,
                notes=f"Added collaborator {user_to_add.get_full_name() or user_to_add.email} as {role}",
            )
            return Response(DealCollaboratorSerializer(collaborator).data, status=status.HTTP_201_CREATED)

        elif request.method == "DELETE":
            if not user_id:
                return Response({"error": "user_id is required in URL path."}, status=status.HTTP_400_BAD_REQUEST)

            collab = get_object_or_404(DealCollaborator, deal=deal, user_id=user_id)
            user_removed = collab.user
            collab.delete()

            DealHistory.objects.create(
                deal=deal,
                user=request.user,
                action=DealHistoryAction.COLLABORATOR_REMOVED,
                notes=f"Removed collaborator {user_removed.get_full_name() or user_removed.email}",
            )
            return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=["post"], url_path="bulk-advance")
    def bulk_advance(self, request):
        """Advance multiple deals to the next stage."""
        serializer = BulkAdvanceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        deal_ids = serializer.validated_data["deal_ids"]
        result = bulk_advance_deals(deal_ids=deal_ids, user=request.user)
        return Response(result, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], url_path="bulk-reassign")
    def bulk_reassign(self, request):
        """Bulk reassign deals to a new owner (Manager only)."""
        serializer = BulkReassignSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        deal_ids = serializer.validated_data["deal_ids"]
        new_owner_id = serializer.validated_data["new_owner_id"]
        new_owner = get_object_or_404(User, id=new_owner_id)

        result = bulk_reassign_deals(deal_ids=deal_ids, new_owner=new_owner, user=request.user)
        return Response(result, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], url_path="export")
    def export_csv(self, request):
        """Export the pipeline (every open deal with stage-weighted values) as CSV."""
        queryset = self.filter_queryset(self.get_queryset())
        include_all = request.query_params.get("include_all", "").lower() in ("true", "1")
        if not include_all and "stage" not in request.query_params:
            queryset = queryset.filter(stage__in=[
                DealStage.NEW,
                DealStage.QUALIFIED,
                DealStage.PROPOSAL,
                DealStage.NEGOTIATION,
            ])
        csv_data = export_deals_csv(queryset)
        response = HttpResponse(csv_data, content_type="text/csv; charset=utf-8")
        filename = f"pipeline_export_{timezone.localdate().isoformat()}.csv"
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response
