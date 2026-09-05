from django.urls import path

from apps.alerts.views import AlertDismissView, AlertListView

urlpatterns = [
    path("", AlertListView.as_view(), name="alert-list"),
    path("<int:pk>/dismiss/", AlertDismissView.as_view(), name="alert-dismiss"),
]
