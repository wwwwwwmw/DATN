"""
Accounts Views — Register, Login, Profile CRUD.
"""
from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import CustomUser, DoctorProfile, PatientProfile
from .serializers import (
    RegisterSerializer, LoginSerializer,
    UserSerializer, UserDetailSerializer,
    DoctorProfileSerializer, PatientProfileSerializer,
    ChangePasswordSerializer,
)
from .permissions import IsDoctor, IsPatient


class RegisterView(generics.CreateAPIView):
    """POST /api/auth/register/ — Đăng ký tài khoản."""
    queryset = CustomUser.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Auto-generate JWT tokens
        refresh = RefreshToken.for_user(user)

        return Response({
            'status': 'success',
            'data': {
                'user': UserSerializer(user).data,
                'tokens': {
                    'access': str(refresh.access_token),
                    'refresh': str(refresh),
                }
            },
            'message': 'Đăng ký thành công.'
        }, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    """POST /api/auth/login/ — Đăng nhập."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']

        refresh = RefreshToken.for_user(user)

        return Response({
            'status': 'success',
            'data': {
                'user': UserSerializer(user).data,
                'tokens': {
                    'access': str(refresh.access_token),
                    'refresh': str(refresh),
                }
            }
        })


class ProfileView(generics.RetrieveUpdateAPIView):
    """GET/PUT /api/auth/profile/ — Xem/cập nhật profile."""
    serializer_class = UserDetailSerializer

    def get_object(self):
        return self.request.user


class ChangePasswordView(APIView):
    """POST /api/auth/change-password/ — Đổi mật khẩu."""

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        if not user.check_password(serializer.validated_data['old_password']):
            return Response({
                'status': 'error',
                'message': 'Mật khẩu cũ không đúng.'
            }, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(serializer.validated_data['new_password'])
        user.save()

        return Response({
            'status': 'success',
            'message': 'Đổi mật khẩu thành công.'
        })


class DoctorListView(generics.ListAPIView):
    """GET /api/auth/doctors/ — Danh sách bác sĩ."""
    serializer_class = DoctorProfileSerializer
    permission_classes = [permissions.AllowAny]
    queryset = DoctorProfile.objects.select_related('user', 'clinic').all()
    filterset_fields = ['specialization', 'clinic']
    search_fields = ['user__first_name', 'user__last_name', 'specialization']


class DoctorDetailView(generics.RetrieveAPIView):
    """GET /api/auth/doctors/<id>/ — Chi tiết bác sĩ."""
    serializer_class = DoctorProfileSerializer
    permission_classes = [permissions.AllowAny]
    queryset = DoctorProfile.objects.select_related('user', 'clinic').all()
