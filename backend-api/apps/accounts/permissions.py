"""
Custom Permissions — Role-based access control.
"""
from rest_framework import permissions


class IsDoctor(permissions.BasePermission):
    """Chỉ cho phép Bác sĩ truy cập."""
    message = 'Chỉ bác sĩ mới có quyền truy cập.'

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == 'DOCTOR'
        )


class IsPatient(permissions.BasePermission):
    """Chỉ cho phép Bệnh nhân truy cập."""
    message = 'Chỉ bệnh nhân mới có quyền truy cập.'

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == 'PATIENT'
        )


class IsAdminUser(permissions.BasePermission):
    """Chỉ cho phép Admin truy cập."""
    message = 'Chỉ quản trị viên mới có quyền truy cập.'

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == 'ADMIN'
        )


class IsOwnerOrAdmin(permissions.BasePermission):
    """Chỉ chủ sở hữu hoặc Admin mới được truy cập."""
    def has_object_permission(self, request, view, obj):
        if request.user.role == 'ADMIN':
            return True
        # obj phải có user attribute hoặc chính là user
        if hasattr(obj, 'user'):
            return obj.user == request.user
        if hasattr(obj, 'patient'):
            return obj.patient == request.user
        return obj == request.user


class IsDoctorOrReadOnly(permissions.BasePermission):
    """Bác sĩ full access, người khác chỉ đọc."""
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == 'DOCTOR'
        )
