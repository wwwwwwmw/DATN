"""
Accounts Views — Register, Login, Profile CRUD, OTP Verification, Password Reset, and Admin Management.
"""
import io
import re
import time as pytime
from datetime import date, time, timedelta
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

from django.http import HttpResponse
from django.db.models import Q
from django.contrib.auth import get_user_model, authenticate
from django.core.cache import cache
from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import CustomUser, DoctorProfile, PatientProfile
from .serializers import (
    RegisterSerializer, LoginSerializer,
    UserSerializer, UserDetailSerializer,
    DoctorProfileSerializer, PatientProfileSerializer,
    ChangePasswordSerializer, AdminUserManageSerializer,
    validate_strong_password,
)

from .permissions import IsDoctor, IsPatient, IsAdminUser
from utils.otp_service import (
    send_profile_update_otp, verify_profile_update_otp,
    is_user_otp_verified, clear_user_otp_verification,
    send_forgot_password_email,
)
from apps.clinics.models import Clinic
from apps.appointments.models import TimeSlot

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    """POST /api/auth/register/ — Đăng ký tài khoản (Mặc định Role: PATIENT)."""
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
            'message': 'Đăng ký thành công tài khoản Bệnh nhân.'
        }, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    """
    POST /api/auth/login/ — Đăng nhập hệ thống.
    Quy tắc an ninh:
    - Nếu đăng nhập không thành công 5 lần liên tiếp mà lần thứ 5 cách lần thứ nhất trong vòng 5 phút (300s):
      Khóa tài khoản không cho đăng nhập trong vòng 1 tiếng (3600s).
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = (request.data.get('email') or '').strip().lower()
        password = request.data.get('password') or ''

        if not email or not password:
            return Response({
                'status': 'error',
                'message': 'Vui lòng nhập đầy đủ Email và Mật khẩu.'
            }, status=status.HTTP_400_BAD_REQUEST)

        now = pytime.time()
        lockout_key = f"login_lockout_{email}"
        fail_history_key = f"login_fail_history_{email}"

        # 1. Kiểm tra tài khoản có đang trong thời gian bị khóa không
        locked_until = cache.get(lockout_key)
        if locked_until:
            remaining_seconds = locked_until - now
            if remaining_seconds > 0:
                return Response({
                    'status': 'error',
                    'message': 'Tài khoản đang bị tạm khóa do nhập sai mật khẩu nhiều lần. Vui lòng thử lại sau hoặc sử dụng tính năng "Quên mật khẩu".'
                }, status=status.HTTP_403_FORBIDDEN)
            else:
                cache.delete(lockout_key)

        # 2. Tiến hành xác thực thông tin đăng nhập
        user = authenticate(username=email, password=password)

        if not user:
            # Ghi nhận lần nhập sai
            fail_history = cache.get(fail_history_key) or []
            # Chỉ tính các lần đăng nhập sai xảy ra trong vòng 5 phút (300 giây) gần nhất
            valid_fails = [t for t in fail_history if now - t <= 300]
            valid_fails.append(now)

            if len(valid_fails) >= 5:
                # Điều kiện: Đăng nhập sai 5 lần mà lần thứ 5 cách lần thứ 1 <= 5 phút -> Khóa 1 tiếng (3600s)
                cache.set(lockout_key, now + 3600, timeout=3600)
                cache.delete(fail_history_key)
                return Response({
                    'status': 'error',
                    'message': 'Tài khoản đã bị tạm khóa do đăng nhập sai quá nhiều lần. Vui lòng thử lại sau hoặc bấm "Quên mật khẩu" để cấp lại mật khẩu mới.'
                }, status=status.HTTP_403_FORBIDDEN)
            else:
                cache.set(fail_history_key, valid_fails, timeout=300)
                remaining_attempts = 5 - len(valid_fails)
                return Response({
                    'status': 'error',
                    'message': f'Email hoặc mật khẩu không đúng. Bạn còn {remaining_attempts} lần thử.'
                }, status=status.HTTP_400_BAD_REQUEST)

        if not user.is_active:
            return Response({
                'status': 'error',
                'message': 'Tài khoản của bạn đã bị vô hiệu hóa bởi Quản trị viên.'
            }, status=status.HTTP_403_FORBIDDEN)

        # Đăng nhập thành công -> Xóa mọi lịch sử lần thử sai và cờ khóa
        cache.delete(lockout_key)
        cache.delete(fail_history_key)

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



class SendProfileOTPView(APIView):
    """POST /api/auth/otp/send/ — Gửi mã OTP xác thực qua email để sửa hồ sơ."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        res = send_profile_update_otp(request.user)
        if res['success']:
            return Response({'status': 'success', 'message': res['message']})
        return Response({'status': 'error', 'message': res['message']}, status=status.HTTP_400_BAD_REQUEST)


class VerifyProfileOTPView(APIView):
    """POST /api/auth/otp/verify/ — Xác thực mã OTP gửi qua email."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        code = str(request.data.get('code') or request.data.get('otp_code') or '').strip()
        if not code:
            return Response({'status': 'error', 'message': 'Vui lòng nhập mã OTP gồm 6 chữ số.'}, status=status.HTTP_400_BAD_REQUEST)

        success, err_msg = verify_profile_update_otp(request.user, code)
        if success:
            return Response({
                'status': 'success',
                'message': 'Xác thực mã OTP thành công! Bạn đã được mở quyền chỉnh sửa hồ sơ.'
            })
        return Response({
            'status': 'error',
            'message': err_msg or 'Mã OTP đã hết hạn. Yêu cầu thực hiện lại.'
        }, status=status.HTTP_400_BAD_REQUEST)


class ForgotPasswordView(APIView):
    """POST /api/auth/forgot-password/ — Quên mật khẩu, gửi mật khẩu mới qua email."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = (request.data.get('email') or '').strip()
        if not email:
            return Response({'status': 'error', 'message': 'Vui lòng nhập địa chỉ email của bạn.'}, status=status.HTTP_400_BAD_REQUEST)

        res = send_forgot_password_email(email)
        return Response({
            'status': 'success',
            'message': res['message']
        })


class ProfileView(generics.RetrieveUpdateAPIView):
    """GET/PUT /api/auth/profile/ — Xem/cập nhật profile thực tế trong Database."""
    serializer_class = UserDetailSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

    def update(self, request, *args, **kwargs):
        user = self.get_object()

        # 1. Với DOCTOR và PATIENT: Bắt buộc phải xác thực mã OTP trước khi cập nhật hồ sơ
        if user.role in ['DOCTOR', 'PATIENT']:
            otp_code = str(request.data.get('otp_code') or '').strip()
            is_verified = is_user_otp_verified(user)
            if not is_verified:
                if otp_code:
                    success, err_msg = verify_profile_update_otp(user, otp_code)
                    if not success:
                        return Response({
                            'status': 'error',
                            'message': err_msg or 'Mã OTP đã hết hạn. Yêu cầu thực hiện lại.'
                        }, status=status.HTTP_400_BAD_REQUEST)
                else:
                    return Response({
                        'status': 'error',
                        'message': 'Bảo mật Y tế: Bạn cần nhập mã OTP gửi qua email trước mới được lưu thay đổi hồ sơ.'
                    }, status=status.HTTP_400_BAD_REQUEST)

        # 2. Kiểm tra các mục bắt buộc: Họ và đệm, Tên, Số điện thoại, Email, Địa chỉ
        first_name = (request.data.get('first_name') or user.first_name or '').strip()
        last_name = (request.data.get('last_name') or user.last_name or '').strip()
        phone = (request.data.get('phone') or user.phone or '').strip()
        email = (request.data.get('email') or user.email or '').strip()

        p_data = request.data.get('patient_profile', request.data) or {}
        address = (p_data.get('address') or (getattr(user, 'patient_profile', None) and user.patient_profile.address) or '').strip()

        missing_fields = []
        if not last_name:
            missing_fields.append("Họ và đệm")
        if not first_name:
            missing_fields.append("Tên")
        if not phone:
            missing_fields.append("Số điện thoại liên hệ")
        if not email:
            missing_fields.append("Email đăng nhập")
        if user.role == 'PATIENT' and not address:
            missing_fields.append("Địa chỉ thường trú")

        if missing_fields:
            return Response({
                'status': 'error',
                'message': f"Vui lòng điền đầy đủ các mục bắt buộc: {', '.join(missing_fields)}."
            }, status=status.HTTP_400_BAD_REQUEST)

        # 3. Cập nhật User model
        user.first_name = first_name
        user.last_name = last_name
        user.phone = phone
        user.email = email

        # Cập nhật Avatar (nếu người dùng upload ảnh hoặc gửi link ảnh)
        if 'avatar' in request.data:
            avatar_val = request.data['avatar']
            if hasattr(avatar_val, 'read'):  # File upload
                user.avatar = avatar_val
            elif isinstance(avatar_val, str) and avatar_val.strip():
                # Lưu đường dẫn ảnh hoặc avatar URL
                user.avatar = avatar_val.strip()

        user.save()

        # 4. Cập nhật Profile tương ứng
        if user.role == 'PATIENT':
            profile, _ = PatientProfile.objects.get_or_create(user=user)
            for pf in ['date_of_birth', 'gender', 'blood_type', 'address', 'emergency_contact', 'medical_history']:
                if pf in p_data and p_data[pf] is not None:
                    val = p_data[pf]
                    setattr(profile, pf, val or None if pf == 'date_of_birth' else val)
            profile.save()
        elif user.role == 'DOCTOR':
            profile, _ = DoctorProfile.objects.get_or_create(user=user)
            d_data = request.data.get('doctor_profile', request.data) or {}
            for df in ['specialization', 'license_number', 'experience_years', 'bio', 'consultation_fee']:
                if df in d_data and d_data[df] is not None:
                    setattr(profile, df, d_data[df])
            profile.save()

        # Xóa cờ verified sau khi lưu xong
        clear_user_otp_verification(user)

        return Response({
            'status': 'success',
            'data': UserDetailSerializer(user).data,
            'message': 'Cập nhật hồ sơ thành công!'
        })


class ChangePasswordView(APIView):
    """POST /api/auth/change-password/ — Đổi mật khẩu."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        if not serializer.is_valid():
            first_err = 'Dữ liệu không hợp lệ.'
            for field, errs in serializer.errors.items():
                if isinstance(errs, list) and len(errs) > 0:
                    first_err = str(errs[0])
                    break
            return Response({
                'status': 'error',
                'message': first_err,
                'errors': serializer.errors,
            }, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        if not user.check_password(serializer.validated_data['old_password']):
            return Response({
                'status': 'error',
                'message': 'Mật khẩu cũ không chính xác.'
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


# =========================================================================
# QUẢN TRỊ VIÊN HỆ THỐNG (ADMIN MANAGEMENT APIs)
# =========================================================================

class AdminUserListView(APIView):
    """GET/POST /api/auth/admin/users/ — Admin quản lý danh sách người dùng toàn viện."""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def get(self, request):
        role_filter = request.query_params.get('role', '').strip().upper()
        search_query = request.query_params.get('search', '').strip()

        users = CustomUser.objects.all().select_related('doctor_profile', 'patient_profile', 'doctor_profile__clinic')

        if role_filter in ['ADMIN', 'DOCTOR', 'PATIENT']:
            users = users.filter(role=role_filter)

        if search_query:
            users = users.filter(
                Q(first_name__icontains=search_query) |
                Q(last_name__icontains=search_query) |
                Q(email__icontains=search_query) |
                Q(phone__icontains=search_query) |
                Q(username__icontains=search_query)
            )

        users = users.order_by('-created_at')
        serializer = AdminUserManageSerializer(users, many=True)
        return Response({
            'status': 'success',
            'total': users.count(),
            'data': serializer.data
        })

    def post(self, request):
        data = request.data
        email = (data.get('email') or '').strip().lower()
        if not email:
            return Response({'status': 'error', 'message': 'Email là bắt buộc.'}, status=status.HTTP_400_BAD_REQUEST)

        if CustomUser.objects.filter(email__iexact=email).exists():
            return Response({'status': 'error', 'message': f'Email {email} đã tồn tại trong hệ thống.'}, status=status.HTTP_400_BAD_REQUEST)

        username = (data.get('username') or email.split('@')[0]).strip()
        role = data.get('role', 'PATIENT')
        raw_password = data.get('password') or 'MedTech@123'

        try:
            validate_strong_password(raw_password)
        except Exception as e:
            msg = e.detail[0] if hasattr(e, 'detail') and isinstance(e.detail, list) else str(e)
            return Response({'status': 'error', 'message': f'Mật khẩu không đạt chuẩn: {msg}'}, status=status.HTTP_400_BAD_REQUEST)

        user = CustomUser.objects.create_user(
            username=username,
            email=email,
            password=raw_password,
            role=role,
            first_name=data.get('first_name', ''),
            last_name=data.get('last_name', ''),
            phone=data.get('phone', ''),
            avatar=data.get('avatar', ''),
        )

        if role == 'DOCTOR':
            clinic_id = data.get('clinic_id') or data.get('clinic')
            clinic = Clinic.objects.filter(id=clinic_id).first() if clinic_id else Clinic.objects.first()
            doc_prof, _ = DoctorProfile.objects.get_or_create(
                user=user,
                defaults={
                    'specialization': data.get('specialization', 'Nội tổng quát'),
                    'license_number': data.get('license_number', f'CCHN-{user.id:04d}-HCM'),
                    'experience_years': int(data.get('experience_years') or 5),
                    'clinic': clinic,
                    'bio': data.get('bio', ''),
                }
            )
            # Sinh timeslots cho bác sĩ mới
            today = date(2026, 11, 13)
            slot_hours = [(time(8, 30), time(9, 30)), (time(10, 0), time(11, 0)), (time(14, 0), time(15, 0))]
            for day_offset in range(14):
                slot_date = today + timedelta(days=day_offset)
                for st, et in slot_hours:
                    TimeSlot.objects.get_or_create(
                        doctor=doc_prof,
                        date=slot_date,
                        start_time=st,
                        defaults={'clinic': clinic, 'end_time': et, 'max_patients': 3, 'is_available': True}
                    )
        elif role == 'PATIENT':
            PatientProfile.objects.get_or_create(
                user=user,
                defaults={
                    'address': data.get('address', 'TP. Hồ Chí Minh'),
                    'gender': data.get('gender', 'Nam'),
                }
            )

        return Response({
            'status': 'success',
            'data': AdminUserManageSerializer(user).data,
            'message': f'Tạo tài khoản {user.email} ({role}) thành công.'
        }, status=status.HTTP_201_CREATED)


class AdminUserDetailView(APIView):
    """GET/PUT/DELETE /api/auth/admin/users/<id>/ — Xem, cập nhật Role, đổi mật khẩu, xóa tài khoản."""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def get_object(self, pk):
        try:
            return CustomUser.objects.get(pk=pk)
        except CustomUser.DoesNotExist:
            return None

    def get(self, request, pk):
        user = self.get_object(pk)
        if not user:
            return Response({'status': 'error', 'message': 'Không tìm thấy người dùng.'}, status=status.HTTP_404_NOT_FOUND)
        return Response({'status': 'success', 'data': AdminUserManageSerializer(user).data})

    def put(self, request, pk):
        user = self.get_object(pk)
        if not user:
            return Response({'status': 'error', 'message': 'Không tìm thấy người dùng.'}, status=status.HTTP_404_NOT_FOUND)

        data = request.data

        # 1. Cập nhật thông tin cơ bản
        if 'first_name' in data:
            user.first_name = data['first_name']
        if 'last_name' in data:
            user.last_name = data['last_name']
        if 'phone' in data:
            user.phone = data['phone']
        if 'email' in data and data['email'] != user.email:
            new_email = data['email'].strip().lower()
            if CustomUser.objects.filter(email__iexact=new_email).exclude(pk=user.pk).exists():
                return Response({'status': 'error', 'message': f'Email {new_email} đã được sử dụng.'}, status=status.HTTP_400_BAD_REQUEST)
            user.email = new_email
        if 'avatar' in data:
            user.avatar = data['avatar']
        if 'is_active' in data:
            user.is_active = bool(data['is_active'])

        # 2. Đổi Role (ADMIN, DOCTOR, PATIENT)
        old_role = user.role
        if 'role' in data and data['role'] in ['ADMIN', 'DOCTOR', 'PATIENT']:
            user.role = data['role']
            # Đảm bảo Profile đồng bộ khi đổi sang Doctor hoặc Patient
            if user.role == 'DOCTOR' and not hasattr(user, 'doctor_profile'):
                clinic = Clinic.objects.first()
                DoctorProfile.objects.create(
                    user=user,
                    specialization=data.get('specialization', 'Nội tổng quát'),
                    license_number=f'CCHN-{user.id:04d}-HCM',
                    clinic=clinic
                )
            elif user.role == 'PATIENT' and not hasattr(user, 'patient_profile'):
                PatientProfile.objects.create(user=user, address=data.get('address', 'TP. Hồ Chí Minh'))

        # 3. Đổi mật khẩu từ Admin
        if data.get('new_password'):
            try:
                validate_strong_password(data['new_password'])
            except Exception as e:
                msg = e.detail[0] if hasattr(e, 'detail') and isinstance(e.detail, list) else str(e)
                return Response({'status': 'error', 'message': f'Mật khẩu không đạt chuẩn: {msg}'}, status=status.HTTP_400_BAD_REQUEST)
            user.set_password(data['new_password'])


        user.save()

        # 4. Cập nhật thông tin profile chi tiết
        if user.role == 'DOCTOR' and hasattr(user, 'doctor_profile'):
            doc = user.doctor_profile
            if 'specialization' in data:
                doc.specialization = data['specialization']
            if 'license_number' in data:
                doc.license_number = data['license_number']
            if 'experience_years' in data:
                doc.experience_years = int(data['experience_years'] or 0)
            if 'clinic_id' in data:
                doc.clinic = Clinic.objects.filter(id=data['clinic_id']).first() or doc.clinic
            doc.save()

        elif user.role == 'PATIENT' and hasattr(user, 'patient_profile'):
            patient = user.patient_profile
            if 'address' in data:
                patient.address = data['address']
            if 'gender' in data:
                patient.gender = data['gender']
            if 'blood_type' in data:
                patient.blood_type = data['blood_type']
            if 'date_of_birth' in data:
                patient.date_of_birth = data['date_of_birth'] or None
            patient.save()

        return Response({
            'status': 'success',
            'data': AdminUserManageSerializer(user).data,
            'message': f'Cập nhật tài khoản {user.email} thành công!'
        })

    def delete(self, request, pk):
        user = self.get_object(pk)
        if not user:
            return Response({'status': 'error', 'message': 'Không tìm thấy người dùng.'}, status=status.HTTP_404_NOT_FOUND)

        if user.pk == request.user.pk:
            return Response({'status': 'error', 'message': 'Bạn không thể tự xóa tài khoản của chính mình.'}, status=status.HTTP_400_BAD_REQUEST)

        email = user.email
        user.delete()
        return Response({
            'status': 'success',
            'message': f'Đã xóa hoàn toàn tài khoản {email} khỏi hệ thống.'
        })


class AdminImportExcelView(APIView):
    """POST /api/auth/admin/import-excel/ — Nhập danh sách tài khoản Bác sĩ / Bệnh nhân hàng loạt bằng Excel."""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def post(self, request):
        excel_file = request.FILES.get('file')
        if not excel_file:
            return Response({'status': 'error', 'message': 'Vui lòng tải lên file Excel (.xlsx).'}, status=status.HTTP_400_BAD_REQUEST)

        if not (excel_file.name.endswith('.xlsx') or excel_file.name.endswith('.xls')):
            return Response({'status': 'error', 'message': 'Định dạng file không hợp lệ. Vui lòng sử dụng file .xlsx theo mẫu.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            wb = openpyxl.load_workbook(excel_file, data_only=True)
            sheet = wb.active
        except Exception as e:
            return Response({'status': 'error', 'message': f'Không thể đọc file Excel: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

        created_users = []
        errors = []

        default_clinic = Clinic.objects.filter(name__icontains='MedTech').first() or Clinic.objects.first()

        # Đọc từng dòng từ dòng 2 (dòng 1 là tiêu đề)
        for row_idx, row in enumerate(sheet.iter_rows(min_row=2, values_only=True), start=2):
            if not row or not any(row):
                continue

            last_name = str(row[0] or '').strip()
            first_name = str(row[1] or '').strip()
            email = str(row[2] or '').strip().lower()
            phone = str(row[3] or '').strip()
            role_raw = str(row[4] or 'DOCTOR').strip().upper()
            password_raw = str(row[5] or '').strip()
            specialization = str(row[6] or 'Đa khoa & Nội Tổng quát').strip()
            exp_raw = str(row[7] or '5').strip()
            license_number = str(row[8] or '').strip()
            clinic_name = str(row[9] or '').strip()

            if not email:
                errors.append(f'Dòng {row_idx}: Thiếu địa chỉ Email.')
                continue

            role = 'DOCTOR' if 'DOC' in role_raw or 'BAC' in role_raw else ('ADMIN' if 'ADMIN' in role_raw else 'PATIENT')
            password = password_raw if password_raw else ('doctor123' if role == 'DOCTOR' else 'patient123')

            try:
                raw_val = int(float(exp_raw)) if exp_raw else 2018
                # Nếu nhập số năm nhỏ (vd: 10), tự quy đổi ra năm bắt đầu hành nghề (2026 - 10 = 2016)
                if raw_val < 100:
                    start_practice_year = 2026 - raw_val
                else:
                    start_practice_year = raw_val
            except ValueError:
                start_practice_year = 2018


            # Tìm phòng khám tương ứng
            clinic = default_clinic
            if clinic_name:
                matched_clinic = Clinic.objects.filter(name__icontains=clinic_name).first()
                if matched_clinic:
                    clinic = matched_clinic

            username = email.split('@')[0]
            # Nếu user đã có thì cập nhật, nếu chưa thì tạo mới
            user, is_created = CustomUser.objects.get_or_create(
                email=email,
                defaults={
                    'username': username,
                    'first_name': first_name,
                    'last_name': last_name,
                    'phone': phone,
                    'role': role,
                }
            )

            user.set_password(password)
            user.first_name = first_name or user.first_name
            user.last_name = last_name or user.last_name
            user.phone = phone or user.phone
            user.role = role
            user.save()

            if role == 'DOCTOR':
                doc_prof, _ = DoctorProfile.objects.get_or_create(
                    user=user,
                    defaults={
                        'specialization': specialization,
                        'license_number': license_number or f'CCHN-{user.id:04d}-HCM',
                        'experience_years': start_practice_year,
                        'clinic': clinic,
                        'bio': f'Bác sĩ chuyên khoa {specialization} tại {clinic.name if clinic else "Bệnh viện MedTech"}.',
                    }
                )
                doc_prof.specialization = specialization
                doc_prof.experience_years = start_practice_year

                if license_number:
                    doc_prof.license_number = license_number
                if clinic:
                    doc_prof.clinic = clinic
                doc_prof.save()

                # Tự động sinh TimeSlots khám trong 14 ngày tới
                today = date(2026, 11, 13)
                slot_hours = [
                    (time(8, 30), time(9, 30)),
                    (time(9, 30), time(10, 30)),
                    (time(10, 30), time(11, 30)),
                    (time(14, 0), time(15, 0)),
                    (time(15, 0), time(16, 0)),
                    (time(16, 0), time(17, 0)),
                ]
                for day_offset in range(14):
                    slot_date = today + timedelta(days=day_offset)
                    for st, et in slot_hours:
                        TimeSlot.objects.get_or_create(
                            doctor=doc_prof,
                            date=slot_date,
                            start_time=st,
                            defaults={
                                'clinic': clinic,
                                'end_time': et,
                                'max_patients': 3,
                                'is_available': True
                            }
                        )
            elif role == 'PATIENT':
                pat_prof, _ = PatientProfile.objects.get_or_create(
                    user=user,
                    defaults={'address': 'TP. Hồ Chí Minh', 'gender': 'Nam'}
                )

            created_users.append({
                'email': user.email,
                'name': f"{user.last_name} {user.first_name}".strip(),
                'role': role,
                'specialization': specialization if role == 'DOCTOR' else '',
                'action': 'Tạo mới' if is_created else 'Cập nhật',
            })

        return Response({
            'status': 'success',
            'imported_count': len(created_users),
            'errors': errors,
            'data': created_users,
            'message': f'Nhập thành công {len(created_users)} tài khoản từ file Excel!'
        })


class AdminExportTemplateView(APIView):
    """GET /api/auth/admin/export-template/ — Tải file Excel mẫu chuẩn để Admin nhập tài khoản."""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def get(self, request):
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Mẫu Nhập Tài Khoản"

        # Headers
        headers = [
            "Họ và đệm (*)",
            "Tên (*)",
            "Email đăng nhập (*)",
            "Số điện thoại (*)",
            "Vai trò (DOCTOR / PATIENT / ADMIN)",
            "Mật khẩu (Mặc định: doctor123)",
            "Chuyên khoa (Nếu là Bác sĩ)",
            "Năm bắt đầu hành nghề (VD: 2015)",
            "Số CCHN",
            "Bệnh viện / Cơ sở y tế"
        ]
        ws.append(headers)

        # Style header
        header_fill = PatternFill(start_color="0068FF", end_color="0068FF", fill_type="solid")
        header_font = Font(name="Arial", size=11, bold=True, color="FFFFFF")
        center_align = Alignment(horizontal="center", vertical="center", wrap_text=True)

        for col_num in range(1, len(headers) + 1):
            cell = ws.cell(row=1, column=col_num)
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = center_align

        # Dữ liệu mẫu minh họa
        sample_rows = [
            [
                "Nguyễn Văn", "An", "bs.nguyenvanan.demo@medtech.vn", "0901234567",
                "DOCTOR", "doctor123", "Nội Tim mạch", 2014, "CCHN-09871-HCM",
                "Bệnh viện Đa khoa Quốc tế MedTech Sài Gòn"
            ],
            [
                "Trần Thị", "Hương", "bs.tranthihuong.demo@medtech.vn", "0912345678",
                "DOCTOR", "doctor123", "Nội Thần kinh", 2018, "CCHN-09872-HCM",
                "Bệnh viện Chợ Rẫy"
            ],
            [
                "Lê Văn", "Bình", "bn.levanbinh.demo@medtech.vn", "0987654321",
                "PATIENT", "patient123", "", "", "",
                ""
            ]
        ]


        for r in sample_rows:
            ws.append(r)

        # Tự động căn chỉnh độ rộng cột
        col_widths = [16, 12, 34, 18, 22, 22, 26, 14, 18, 38]
        for idx, width in enumerate(col_widths, start=1):
            ws.column_dimensions[openpyxl.utils.get_column_letter(idx)].width = width

        buffer = io.BytesIO()
        wb.save(buffer)
        buffer.seek(0)

        response = HttpResponse(
            buffer.getvalue(),
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
        response['Content-Disposition'] = 'attachment; filename="mau_nhap_tai_khoan_medtech.xlsx"'
        return response
