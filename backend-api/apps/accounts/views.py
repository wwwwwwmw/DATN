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
    """GET/PUT /api/auth/profile/ — Xem/cập nhật profile thực tế trong Database."""
    serializer_class = UserDetailSerializer

    def get_object(self):
        return self.request.user

    def update(self, request, *args, **kwargs):
        user = self.get_object()
        for field in ['first_name', 'last_name', 'phone']:
            if field in request.data:
                setattr(user, field, request.data[field])
        user.save()

        if user.role == 'PATIENT':
            profile, _ = PatientProfile.objects.get_or_create(user=user)
            p_data = request.data.get('patient_profile', request.data)
            for pf in ['date_of_birth', 'gender', 'blood_type', 'address', 'emergency_contact', 'medical_history']:
                if pf in p_data and p_data[pf] is not None:
                    setattr(profile, pf, p_data[pf] or None if pf == 'date_of_birth' else p_data[pf])
            profile.save()
        elif user.role == 'DOCTOR':
            profile, _ = DoctorProfile.objects.get_or_create(user=user)
            d_data = request.data.get('doctor_profile', request.data)
            for df in ['specialization', 'license_number', 'experience_years', 'bio', 'consultation_fee']:
                if df in d_data and d_data[df] is not None:
                    setattr(profile, df, d_data[df])
            profile.save()

        return Response({
            'status': 'success',
            'data': UserDetailSerializer(user).data,
            'message': 'Cập nhật hồ sơ thành công.'
        })


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
