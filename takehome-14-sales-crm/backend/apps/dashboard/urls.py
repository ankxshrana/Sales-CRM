from django.urls import path

from apps.dashboard.views import DashboardMetricsView

urlpatterns = [
    path("", DashboardMetricsView.as_view(), name="dashboard-metrics"),
    path("metrics/", DashboardMetricsView.as_view(), name="dashboard-metrics-alias"),
]

