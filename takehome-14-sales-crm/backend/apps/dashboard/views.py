from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.dashboard.services import get_dashboard_metrics


class DashboardMetricsView(APIView):
    """
    Returns aggregated CRM metrics, pipeline value, stage breakdown, and 8-week win trends.
    """

    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        metrics = get_dashboard_metrics(user=request.user)
        return Response(metrics, status=status.HTTP_200_OK)
