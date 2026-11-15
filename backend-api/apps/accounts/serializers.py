"""
Accounts Serializers — Auth, Profile, User management.
"""
import re
from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import CustomUser, DoctorProfile, PatientProfile


def validate_strong_password(value: str):
    """
    Quy chuẩn bảo mật mật khẩu:
    - Ít nhất 8 ký tự
    - Ít nhất 1 chữ hoa (A-Z)
    - Ít nhất 1 ký tự đặc biệt (!@#$%^&*...)
    """
    if len(value) < 8:
        raise serializers.ValidationError("Mật khẩu phải có độ dài ít nhất 8 ký tự.")
    if not re.search(r'[A-Z]', value):
        raise serializers.ValidationError("Mật khẩu phải chứa ít nhất 1 chữ in hoa (A-Z).")
    if not re.search(r'[^A-Za-z0-9]', value):
        raise serializers.ValidationError("Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt (ví dụ: @, #, $, !, %, *...).")
    return value


class RegisterSerializer(serializers.ModelSerializer):
    """Đăng ký tài khoản mới."""
    password = serializers.CharField(write_only=True, validators=[validate_strong_password])
    password_confirm = serializers.CharField(write_only=True)


    class Meta:
        model = CustomUser
        fields = [
            'id', 'email', 'username', 'password', 'password_confirm',
            'role', 'first_name', 'last_name', 'phone'
        ]
        extra_kwargs = {
            'first_name': {'required': True},
            'last_name': {'required': True},
        }

    def validate(self, attrs):
        if attrs['password'] != attrs.pop('password_confirm'):
            raise serializers.ValidationError({
                'password_confirm': 'Mật khẩu xác nhận không khớp.'
            })
        return attrs

    def create(self, validated_data):
        # Mặc định người dùng tự đăng ký luôn có role là PATIENT
        user = CustomUser.objects.create_user(
            email=validated_data['email'],
            username=validated_data['username'],
            password=validated_data['password'],
            role=CustomUser.Role.PATIENT,
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            phone=validated_data.get('phone', ''),
        )
        PatientProfile.objects.get_or_create(user=user)
        return user



class LoginSerializer(serializers.Serializer):
    """Đăng nhập bằng email + password."""
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        user = authenticate(
            username=attrs['email'],
            password=attrs['password']
        )
        if not user:
            raise serializers.ValidationError('Email hoặc mật khẩu không đúng.')
        if not user.is_active:
            raise serializers.ValidationError('Tài khoản đã bị khóa.')
        attrs['user'] = user
        return attrs


class UserSerializer(serializers.ModelSerializer):
    """Thông tin user cơ bản."""
    class Meta:
        model = CustomUser
        fields = [
            'id', 'email', 'username', 'role',
            'first_name', 'last_name', 'phone',
            'avatar', 'is_verified', 'created_at'
        ]
        read_only_fields = ['id', 'email', 'role', 'is_verified', 'created_at']


class DoctorProfileSerializer(serializers.ModelSerializer):
    """Profile bác sĩ kèm khung giờ khám thực tế từ database."""
    user = UserSerializer(read_only=True)
    clinic_name = serializers.CharField(source='clinic.name', read_only=True, default='')
    clinic_address = serializers.CharField(source='clinic.address', read_only=True, default='')
    clinic_latitude = serializers.FloatField(source='clinic.latitude', read_only=True, default=None)
    clinic_longitude = serializers.FloatField(source='clinic.longitude', read_only=True, default=None)
    clinic_is_open = serializers.BooleanField(source='clinic.is_open', read_only=True, default=True)
    queue_count = serializers.SerializerMethodField()
    available_slots = serializers.SerializerMethodField()

    class Meta:
        model = DoctorProfile
        fields = [
            'id', 'user', 'specialization', 'license_number',
            'experience_years', 'bio', 'clinic', 'clinic_name',
            'clinic_address', 'clinic_latitude', 'clinic_longitude', 'clinic_is_open',
            'consultation_fee', 'queue_count', 'available_slots', 'created_at'
        ]

    def get_queue_count(self, obj):
        return obj.appointments.filter(status__in=['PENDING', 'CONFIRMED']).count()

    def get_available_slots(self, obj):
        from django.utils import timezone
        now = timezone.localtime()
        today = now.date()
        current_time = now.time()

        slots = obj.time_slots.filter(
            is_available=True,
            date__gte=today
        ).order_by('date', 'start_time')

        valid_slots = []
        for s in slots:
            if s.is_full:
                continue
            # Nếu ca vào ngày hôm nay nhưng giờ bắt đầu <= giờ hiện tại thì bỏ qua (đã qua giờ bắt đầu)
            if s.date == today and s.start_time <= current_time:
                continue
            valid_slots.append({
                'id': s.id,
                'date': str(s.date),
                'start_time': s.start_time.strftime('%H:%M'),
                'end_time': s.end_time.strftime('%H:%M'),
                'is_available': s.is_available and not s.is_full,
                'remaining_slots': s.remaining_slots,
            })
            if len(valid_slots) >= 120:
                break
        return valid_slots


class PatientProfileSerializer(serializers.ModelSerializer):
    """Profile bệnh nhân."""
    user = UserSerializer(read_only=True)

    class Meta:
        model = PatientProfile
        fields = [
            'id', 'user', 'date_of_birth', 'gender', 'blood_type',
            'address', 'emergency_contact', 'medical_history', 'created_at'
        ]


class UserDetailSerializer(serializers.ModelSerializer):
    """User + profile đầy đủ (response cho /users/me/)."""
    doctor_profile = DoctorProfileSerializer(read_only=True)
    patient_profile = PatientProfileSerializer(read_only=True)

    class Meta:
        model = CustomUser
        fields = [
            'id', 'email', 'username', 'role',
            'first_name', 'last_name', 'phone',
            'avatar', 'is_verified', 'created_at',
            'doctor_profile', 'patient_profile'
        ]
        read_only_fields = ['id', 'email', 'role', 'is_verified', 'created_at']


class ChangePasswordSerializer(serializers.Serializer):
    """Đổi mật khẩu."""
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, validators=[validate_strong_password])
    new_password_confirm = serializers.CharField(write_only=True)


    def validate(self, attrs):
        if attrs['new_password'] != attrs.pop('new_password_confirm'):
            raise serializers.ValidationError({
                'new_password_confirm': 'Mật khẩu xác nhận không khớp.'
            })
        return attrs


class AdminUserManageSerializer(serializers.ModelSerializer):
    """Serializer quản trị tài khoản cho Admin."""
    doctor_profile = DoctorProfileSerializer(read_only=True)
    patient_profile = PatientProfileSerializer(read_only=True)
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = [
            'id', 'email', 'username', 'role',
            'first_name', 'last_name', 'full_name',
            'phone', 'avatar', 'is_active', 'is_verified',
            'created_at', 'updated_at',
            'doctor_profile', 'patient_profile'
        ]

    def get_full_name(self, obj):
        return f"{obj.last_name or ''} {obj.first_name or ''}".strip() or obj.username

