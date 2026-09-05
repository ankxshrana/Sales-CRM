from django.db import models
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.accounts.permissions import IsCompanyOwner, IsSalesManager
from apps.companies.models import Company
from apps.companies.serializers import CompanySerializer


class CompanyViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Company CRUD, archive, and restore operations.
    """

    queryset = Company.objects.select_related("owner").all()
    serializer_class = CompanySerializer
    filter_backends = (
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    )
    filterset_fields = ("is_archived", "industry", "owner")
    search_fields = ("name", "industry", "website")
    ordering_fields = ("name", "created_at", "updated_at")
    ordering = ("-created_at",)

    def get_permissions(self):
        if self.action in ("destroy",):
            permission_classes = [permissions.IsAuthenticated, IsSalesManager]
        elif self.action in ("archive", "restore", "update", "partial_update"):
            permission_classes = [permissions.IsAuthenticated, IsCompanyOwner]
        else:
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not user or not user.is_authenticated:
            return qs.none()
        # Sales managers can see every company.
        # Sales reps can see ONLY the companies they own or collaborate on (via deals).
        if not user.is_manager and not user.is_superuser:
            qs = qs.filter(
                models.Q(owner=user)
                | models.Q(deals__owner=user)
                | models.Q(deals__collaborators=user)
            ).distinct()

        # By default, do not show archived companies in list view unless include_archived=true or is_archived is specified
        include_archived = self.request.query_params.get("include_archived", "").lower() in ("true", "1")
        is_archived_param = self.request.query_params.get("is_archived")
        if is_archived_param is not None:
            qs = qs.filter(is_archived=is_archived_param.lower() in ("true", "1"))
        elif not include_archived and self.action == "list":
            qs = qs.filter(is_archived=False)

        return qs

    @action(detail=True, methods=["post"])
    def archive(self, request, pk=None):
        company = self.get_object()
        company.archive()
        return Response(
            {"detail": f"Company '{company.name}' has been archived.", "is_archived": True},
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"])
    def restore(self, request, pk=None):
        company = self.get_object()
        company.restore()
        return Response(
            {"detail": f"Company '{company.name}' has been restored.", "is_archived": False},
            status=status.HTTP_200_OK,
        )
