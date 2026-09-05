from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.alerts.models import DealAlert
from apps.alerts.serializers import DealAlertSerializer
from apps.alerts.services import sync_and_get_alerts


class AlertListView(APIView):
    """
    List active alerts for the current user and provide navigation badge count.
    """

    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        alerts_qs = sync_and_get_alerts(request.user)
        serializer = DealAlertSerializer(alerts_qs, many=True)
        return Response(
            {
                "count": alerts_qs.count(),
                "results": serializer.data,
            },
            status=status.HTTP_200_OK,
        )


class AlertDismissView(APIView):
    """
    Dismiss a specific alert.
    """

    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request, pk):
        if request.user.is_manager or request.user.is_superuser:
            alert = get_object_or_404(DealAlert, id=pk)
        else:
            alert = get_object_or_404(DealAlert, id=pk, user=request.user)
        alert.dismiss()
        return Response(
            {"detail": "Alert dismissed successfully.", "id": alert.id},
            status=status.HTTP_200_OK,
        )
