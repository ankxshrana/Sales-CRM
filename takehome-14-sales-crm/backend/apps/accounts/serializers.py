from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from apps.accounts.models import User


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source="get_full_name", read_only=True)

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "first_name",
            "last_name",
            "full_name",
            "role",
            "is_active",
            "date_joined",
        )
        read_only_fields = ("id", "date_joined")


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Custom SimpleJWT token obtain pair serializer adding user metadata to JWT and response."""

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Custom claims embedded in token payload
        token["email"] = user.email
        token["role"] = user.role
        token["full_name"] = user.get_full_name()
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        # Include serialized user object in login response
        data["user"] = UserSerializer(self.user).data
        return data


class UserMeSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source="get_full_name", read_only=True)
    is_manager = serializers.BooleanField(read_only=True)
    is_rep = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "first_name",
            "last_name",
            "full_name",
            "role",
            "is_manager",
            "is_rep",
            "is_active",
            "date_joined",
        )
        read_only_fields = (
            "id",
            "email",
            "role",
            "is_manager",
            "is_rep",
            "is_active",
            "date_joined",
        )
