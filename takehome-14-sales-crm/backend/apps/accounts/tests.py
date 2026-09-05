import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from apps.accounts.models import UserRole

User = get_user_model()


@pytest.mark.django_db
class TestAccounts:
    def test_create_user(self):
        user = User.objects.create_user(
            email="rep@example.com",
            password="testpassword123",
            first_name="Jane",
            last_name="Doe",
            role=UserRole.REP,
        )
        assert user.email == "rep@example.com"
        assert user.role == UserRole.REP
        assert user.is_rep is True
        assert user.is_manager is False
        assert user.check_password("testpassword123") is True

    def test_create_manager_superuser(self):
        manager = User.objects.create_superuser(
            email="manager@example.com",
            password="testpassword123",
            first_name="Boss",
            last_name="Man",
        )
        assert manager.is_staff is True
        assert manager.is_superuser is True
        assert manager.is_manager is True

    def test_jwt_login_and_me_endpoint(self):
        user = User.objects.create_user(
            email="auth_test@example.com",
            password="securePassword123!",
            first_name="Test",
            last_name="User",
            role=UserRole.REP,
        )
        client = APIClient()

        # Login
        login_res = client.post(
            "/api/v1/auth/login/",
            {"email": "auth_test@example.com", "password": "securePassword123!"},
            format="json",
        )
        assert login_res.status_code == 200
        assert "access" in login_res.data
        assert "refresh" in login_res.data
        assert login_res.data["user"]["email"] == "auth_test@example.com"
        assert login_res.data["user"]["role"] == "REP"

        # Access /api/v1/auth/me/ with bearer token
        token = login_res.data["access"]
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        me_res = client.get("/api/v1/auth/me/")
        assert me_res.status_code == 200
        assert me_res.data["email"] == "auth_test@example.com"
        assert me_res.data["is_rep"] is True
