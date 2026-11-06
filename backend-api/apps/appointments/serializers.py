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
    patient_name = serializers.SerializerMethodField()
    patient_email = serializers.CharField(source='patient.email', read_only=True)
    patient_phone = serializers.CharField(source='patient.phone', read_only=True)
    patient_code = serializers.SerializerMethodField()
    patient_age = serializers.SerializerMethodField()
    patient_gender = serializers.SerializerMethodField()
    patient_blood_type = serializers.SerializerMethodField()
    patient_address = serializers.SerializerMethodField()
    patient_history = serializers.SerializerMethodField()
    patient_emergency_contact = serializers.SerializerMethodField()
    doctor_name = serializers.SerializerMethodField()
    doctor_specialization = serializers.CharField(source='doctor.specialization', read_only=True)
    clinic_name = serializers.CharField(source='clinic.name', read_only=True)
    clinic_address = serializers.CharField(source='clinic.address', read_only=True)
    date = serializers.DateField(source='time_slot.date', read_only=True)
    start_time = serializers.TimeField(source='time_slot.start_time', read_only=True)
    end_time = serializers.TimeField(source='time_slot.end_time', read_only=True)
    medical_record = serializers.SerializerMethodField()
    telehealth_status = serializers.SerializerMethodField()

    class Meta:
        model = Appointment
        fields = [
            'id', 'patient', 'patient_name', 'patient_email', 'patient_phone',
            'patient_code', 'patient_age', 'patient_gender', 'patient_blood_type',
            'patient_address', 'patient_history', 'patient_emergency_contact',
            'doctor', 'doctor_name', 'doctor_specialization',
            'clinic', 'clinic_name', 'clinic_address',
            'time_slot', 'date', 'start_time', 'end_time',
            'status', 'reason', 'notes', 'sa_score',
            'medical_record', 'telehealth_status', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'patient', 'doctor', 'clinic', 'sa_score', 'created_at', 'updated_at']

    def get_patient_name(self, obj):
        return obj.patient.get_full_name() or obj.patient.username

    def get_patient_code(self, obj):
        return f"#BN-{10000 + obj.patient_id}"

    def get_patient_age(self, obj):
        from datetime import date
        profile = getattr(obj.patient, 'patient_profile', None)
        if profile and profile.date_of_birth:
            return date.today().year - profile.date_of_birth.year
        return None

    def get_patient_gender(self, obj):
        profile = getattr(obj.patient, 'patient_profile', None)
        if profile:
            return profile.get_gender_display()
        return ''

    def get_patient_blood_type(self, obj):
        profile = getattr(obj.patient, 'patient_profile', None)
        return getattr(profile, 'blood_type', '') or ''

    def get_patient_address(self, obj):
        profile = getattr(obj.patient, 'patient_profile', None)
        return getattr(profile, 'address', '') or ''

    def get_patient_history(self, obj):
        profile = getattr(obj.patient, 'patient_profile', None)
        return getattr(profile, 'medical_history', '') or ''

    def get_patient_emergency_contact(self, obj):
        profile = getattr(obj.patient, 'patient_profile', None)
        return getattr(profile, 'emergency_contact', '') or ''

    def get_doctor_name(self, obj):
        if obj.doctor and obj.doctor.user:
            return obj.doctor.user.get_full_name() or obj.doctor.user.username
        return ''

    def get_medical_record(self, obj):
        mr = getattr(obj, 'medical_record', None)
        if not mr:
            return None
        return {
            'id': mr.id,
            'diagnosis': mr.diagnosis,
            'symptoms': mr.symptoms,
            'prescription': mr.prescription,
            'notes': mr.notes,
            'follow_up_date': str(mr.follow_up_date) if mr.follow_up_date else None,
            'created_at': mr.created_at.isoformat() if mr.created_at else None,
        }

    def get_telehealth_status(self, obj):
        room = getattr(obj, 'telehealth_room', None)
        if not room:
            return {
                'doctor_in_room': False,
                'patient_in_room': False,
                'is_connected': False,
                'doctor_mic': True,
                'doctor_video': True,
                'patient_mic': True,
                'patient_video': True,
                'message_count': 0,
                'last_message': '',
                'last_message_time': '',
            }
        last_msg = room.messages.order_by('-created_at').first()
        return {
            'doctor_in_room': room.doctor_in_room,
            'patient_in_room': room.patient_in_room,
            'is_connected': bool(room.doctor_in_room and room.patient_in_room),
            'doctor_mic': room.doctor_mic,
            'doctor_video': room.doctor_video,
            'patient_mic': room.patient_mic,
            'patient_video': room.patient_video,
            'message_count': room.messages.count(),
            'last_message': last_msg.content if last_msg else '',
            'last_message_time': last_msg.created_at.strftime('%H:%M') if last_msg else '',
        }


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
