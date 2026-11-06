"""
Appointments Models — TimeSlot, Appointment.
"""
from django.db import models
from apps.accounts.models import CustomUser, DoctorProfile
from apps.clinics.models import Clinic


class TimeSlot(models.Model):
    """Khung giờ khám của bác sĩ."""
    doctor = models.ForeignKey(
        DoctorProfile, on_delete=models.CASCADE, related_name='time_slots'
    )
    clinic = models.ForeignKey(
        Clinic, on_delete=models.CASCADE, related_name='time_slots'
    )
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    is_available = models.BooleanField(default=True)
    max_patients = models.IntegerField(default=1)
    current_patients = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'appointments_timeslot'
        ordering = ['date', 'start_time']
        unique_together = ['doctor', 'date', 'start_time']

    def __str__(self):
        return f"{self.doctor} | {self.date} {self.start_time}-{self.end_time}"

    @property
    def is_full(self):
        return self.current_patients >= self.max_patients

    @property
    def remaining_slots(self):
        return max(0, self.max_patients - self.current_patients)


class Appointment(models.Model):
    """Lịch hẹn khám bệnh."""

    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Chờ xác nhận'
        CONFIRMED = 'CONFIRMED', 'Đã xác nhận'
        CANCELLED = 'CANCELLED', 'Đã hủy'
        COMPLETED = 'COMPLETED', 'Hoàn thành'
        NO_SHOW = 'NO_SHOW', 'Vắng mặt'

    patient = models.ForeignKey(
        CustomUser, on_delete=models.CASCADE, related_name='appointments'
    )
    doctor = models.ForeignKey(
        DoctorProfile, on_delete=models.CASCADE, related_name='appointments'
    )
    clinic = models.ForeignKey(
        Clinic, on_delete=models.CASCADE, related_name='appointments'
    )
    time_slot = models.ForeignKey(
        TimeSlot, on_delete=models.CASCADE, related_name='appointments'
    )
    status = models.CharField(
        max_length=15, choices=Status.choices, default=Status.PENDING
    )
    reason = models.TextField(blank=True, default='')
    notes = models.TextField(blank=True, default='')
    sa_score = models.FloatField(default=0)  # Simulated Annealing score
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'appointments_appointment'
        ordering = ['-created_at']
        unique_together = ['patient', 'time_slot']

    def __str__(self):
        return f"Lịch hẹn #{self.id}: {self.patient} → {self.doctor} ({self.status})"


class TelehealthRoom(models.Model):
    """Phòng khám trực tuyến WebRTC gắn với từng Lịch hẹn (Appointment)."""
    appointment = models.OneToOneField(
        Appointment, on_delete=models.CASCADE, related_name='telehealth_room'
    )
    doctor_in_room = models.BooleanField(default=False)
    patient_in_room = models.BooleanField(default=False)
    doctor_mic = models.BooleanField(default=True)
    doctor_video = models.BooleanField(default=True)
    patient_mic = models.BooleanField(default=True)
    patient_video = models.BooleanField(default=True)
    webrtc_offer = models.JSONField(null=True, blank=True, default=None)
    webrtc_answer = models.JSONField(null=True, blank=True, default=None)
    doctor_ice_candidates = models.JSONField(default=list, blank=True)
    patient_ice_candidates = models.JSONField(default=list, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'appointments_telehealthroom'

    def __str__(self):
        return f"TelehealthRoom #{self.appointment_id} (Doc={self.doctor_in_room}, Pat={self.patient_in_room})"


class TelehealthMessage(models.Model):
    """Tin nhắn trao đổi trực tiếp giữa Bác sĩ và Bệnh nhân trong phiên Telehealth."""
    room = models.ForeignKey(
        TelehealthRoom, on_delete=models.CASCADE, related_name='messages'
    )
    sender = models.ForeignKey(
        CustomUser, on_delete=models.CASCADE, related_name='telehealth_messages'
    )
    sender_name = models.CharField(max_length=150)
    sender_role = models.CharField(max_length=20)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'appointments_telehealthmessage'
        ordering = ['created_at']

    def __str__(self):
        return f"[{self.sender_role}] {self.sender_name}: {self.content[:40]}"
