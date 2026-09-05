from rest_framework import permissions


class IsSalesManager(permissions.BasePermission):
    """Allows access only to authenticated users with the SALES MANAGER role or superusers."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (request.user.is_manager or request.user.is_superuser)
        )


class IsSalesRep(permissions.BasePermission):
    """Allows access only to authenticated users with the SALES REP role."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (request.user.is_rep or request.user.is_superuser)
        )


class IsCompanyOwner(permissions.BasePermission):
    """Allows access to company owner or sales managers."""

    def has_object_permission(self, request, view, obj):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.user.is_manager or request.user.is_superuser:
            return True
        return obj.owner_id == request.user.id


class IsDealOwner(permissions.BasePermission):
    """Allows access to deal owner or sales managers."""

    def has_object_permission(self, request, view, obj):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.user.is_manager or request.user.is_superuser:
            return True
        return obj.owner_id == request.user.id


class IsDealOwnerOrCollaborator(permissions.BasePermission):
    """
    Allows read/modify access if the user is the deal owner, a collaborator,
    or a sales manager.
    """

    def has_object_permission(self, request, view, obj):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.user.is_manager or request.user.is_superuser:
            return True
        if obj.owner_id == request.user.id:
            return True
        # Check if user is in collaborators
        return obj.collaborators.filter(id=request.user.id).exists()


class CanManageCollaborators(permissions.BasePermission):
    """
    Only deal owners or sales managers can add or remove collaborators on a deal.
    """

    def has_object_permission(self, request, view, obj):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.user.is_manager or request.user.is_superuser:
            return True
        return obj.owner_id == request.user.id
