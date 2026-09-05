from django.urls import path
from rest_framework.routers import DefaultRouter

from apps.deals.views import DealViewSet

router = DefaultRouter()
router.register(r"", DealViewSet, basename="deal")

urlpatterns = [
    # Custom explicit route for deleting a collaborator with user_id parameter
    path(
        "<int:pk>/collaborators/<int:user_id>/",
        DealViewSet.as_view({"delete": "collaborators"}),
        name="deal-collaborator-delete",
    ),
] + router.urls
