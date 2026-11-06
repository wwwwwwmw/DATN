"""
Appointments Serializers.
"""
from rest_framework import serializers
from .models import Appointment, TimeSlot
from apps.accounts.serializers import UserSerializer, DoctorProfileSerializer
from apps.clinics.serializers import ClinicSerializer


class TimeSlotSerializer(serializers.ModelSerializer):
    doctor_name = serializers.CharField(source='doctor.user.get_full_name', read_only=True)
    doctor_specialization = serializers.CharField(source='doctor.specialization', read_only=True)
    remaining_slots = serializers.IntegerField(read_only=True)

    class Meta:
        model = TimeSlot
        fields = [
            'id', 'doctor', 'doctor_name', 'doctor_specialization',
            'clinic', 'date', 'start_time', 'end_time',
            'is_available', 'max_patients', 'current_patients',
            'remaining_slots'
        ]


class AppointmentSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.get_full_name', read_only=True)
    doctor_name = serializers.CharField(source='doctor.user.get_full_name', read_only=True)
    doctor_specialization = serializers.CharField(source='doctor.specialization', read_only=True)
    clinic_name = serializers.CharField(source='clinic.name', read_only=True)
    date = serializers.DateField(source='time_slot.date', read_only=True)
    start_time = serializers.TimeField(source='time_slot.start_time', read_only=True)
    end_time = serializers.TimeField(source='time_slot.end_time', read_only=True)

    class Meta:
        model = Appointment
        fields = [
            'id', 'patient', 'patient_name',
            'doctor', 'doctor_name', 'doctor_specialization',
            'clinic', 'clinic_name',
            'time_slot', 'date', 'start_time', 'end_time',
            'status', 'reason', 'notes', 'sa_score',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'patient', 'doctor', 'clinic', 'sa_score', 'created_at', 'updated_at']


class CreateAppointmentSerializer(serializers.Serializer):
    time_slot_id = serializers.IntegerField()
    reason = serializers.CharField(required=False, default='')
    notes = serializers.CharField(required=False, default='')

    def validate_time_slot_id(self, value):
        try:
            slot = TimeSlot.objects.get(id=value)
        except TimeSlot.DoesNotExist:
            raise serializers.ValidationError('Khung giờ không tồn tại.')
        if not slot.is_available or slot.is_full:
            raise serializers.ValidationError('Khung giờ đã đầy hoặc không khả dụng.')
        return value


class UpdateAppointmentStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Appointment.Status.choices)
    notes = serializers.CharField(required=False, default='')
