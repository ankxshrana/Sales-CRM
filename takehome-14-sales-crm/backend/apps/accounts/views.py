from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from apps.accounts.models import User
from apps.accounts.serializers import (
    CustomTokenObtainPairSerializer,
    UserMeSerializer,
    UserSerializer,
)


class LoginView(TokenObtainPairView):
    """Obtain JWT access and refresh token pair with user profile."""

    serializer_class = CustomTokenObtainPairSerializer


class RefreshView(TokenRefreshView):
    """Refresh JWT access token using refresh token."""

    pass


class LogoutView(APIView):
    """
    Blacklist the refresh token to securely log out.
    """

    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        refresh_token = request.data.get("refresh")
        if not refresh_token:
            return Response(
                {"error": "Refresh token is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response(
                {"detail": "Successfully logged out."},
                status=status.HTTP_200_OK,
            )
        except TokenError as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )


class CurrentUserView(generics.RetrieveUpdateAPIView):
    """Retrieve or update the currently authenticated user's profile."""

    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = UserMeSerializer

    def get_object(self):
        return self.request.user


class UserListView(generics.ListAPIView):
    """List all active CRM users (useful for deal assignment and collaboration)."""

    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = UserSerializer
    queryset = User.objects.filter(is_active=True).order_by("first_name", "last_name")
    search_fields = ["first_name", "last_name", "email"]
