"""
Accounts Models — CustomUser, DoctorProfile, PatientProfile
"""
from django.contrib.auth.models import AbstractUser, UserManager
from django.contrib.gis.db import models as gis_models
from django.db import models


class CustomUserManager(UserManager):
    """Superuser auto-sets role=ADMIN."""
    def create_superuser(self, username, email=None, password=None, **extra_fields):
        extra_fields.setdefault('role', 'ADMIN')
        return super().create_superuser(username, email, password, **extra_fields)


class CustomUser(AbstractUser):
    """Custom User model with role-based access."""

    class Role(models.TextChoices):
        PATIENT = 'PATIENT', 'Bệnh nhân'
        DOCTOR = 'DOCTOR', 'Bác sĩ'
        ADMIN = 'ADMIN', 'Quản trị viên'

    email = models.EmailField(unique=True)
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.PATIENT)
    phone = models.CharField(max_length=15, blank=True, default='')
    avatar = models.ImageField(upload_to='avatars/', blank=True, default='')
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = CustomUserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    class Meta:
        db_table = 'accounts_customuser'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.get_full_name()} ({self.role})"

    @property
    def is_doctor(self):
        return self.role == self.Role.DOCTOR

    @property
    def is_patient(self):
        return self.role == self.Role.PATIENT

    @property
    def is_admin_user(self):
        return self.role == self.Role.ADMIN


class DoctorProfile(models.Model):
    """Profile bổ sung cho Bác sĩ."""
    user = models.OneToOneField(
        CustomUser, on_delete=models.CASCADE, related_name='doctor_profile'
    )
    specialization = models.CharField(max_length=100, blank=True, default='')
    license_number = models.CharField(max_length=50, blank=True, default='')
    experience_years = models.IntegerField(default=0)
    bio = models.TextField(blank=True, default='')
    clinic = models.ForeignKey(
        'clinics.Clinic', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='doctors'
    )
    consultation_fee = models.DecimalField(max_digits=10, decimal_places=0, default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'accounts_doctorprofile'

    def __str__(self):
        return f"BS. {self.user.get_full_name()} - {self.specialization}"


class PatientProfile(models.Model):
    """Profile bổ sung cho Bệnh nhân."""
    user = models.OneToOneField(
        CustomUser, on_delete=models.CASCADE, related_name='patient_profile'
    )
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=10, blank=True, default='')
    blood_type = models.CharField(max_length=5, blank=True, default='')
    address = models.TextField(blank=True, default='')
    emergency_contact = models.CharField(max_length=15, blank=True, default='')
    medical_history = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'accounts_patientprofile'

    def __str__(self):
        return f"BN. {self.user.get_full_name()}"
