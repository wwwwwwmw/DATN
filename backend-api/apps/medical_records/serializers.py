"""
Medical Records Serializers.
"""
from datetime import date
from rest_framework import serializers
from .models import MedicalRecord, XrayAnalysisResult, ChatSession, ChatMessage


class MedicalRecordSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()
    patient_email = serializers.CharField(source='patient.email', read_only=True)
    patient_phone = serializers.CharField(source='patient.phone', read_only=True)
    patient_code = serializers.SerializerMethodField()
    patient_age = serializers.SerializerMethodField()
    patient_dob = serializers.SerializerMethodField()
    patient_gender = serializers.SerializerMethodField()
    patient_blood_type = serializers.SerializerMethodField()
    patient_address = serializers.SerializerMethodField()
    patient_emergency_contact = serializers.SerializerMethodField()
    patient_history = serializers.SerializerMethodField()
    doctor_name = serializers.SerializerMethodField()
    doctor_specialization = serializers.CharField(source='doctor.specialization', read_only=True, default='')
    clinic_name = serializers.SerializerMethodField()
    appointment_date = serializers.SerializerMethodField()
    appointment_time = serializers.SerializerMethodField()
    appointment_status = serializers.CharField(source='appointment.status', read_only=True, default='COMPLETED')

    class Meta:
        model = MedicalRecord
        fields = [
            'id', 'patient', 'patient_name', 'patient_email', 'patient_phone',
            'patient_code', 'patient_age', 'patient_dob', 'patient_gender',
            'patient_blood_type', 'patient_address', 'patient_emergency_contact',
            'patient_history', 'doctor', 'doctor_name', 'doctor_specialization',
            'clinic_name', 'appointment', 'appointment_date', 'appointment_time',
            'appointment_status', 'diagnosis', 'symptoms', 'prescription',
            'notes', 'follow_up_date', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
        extra_kwargs = {
            'doctor': {'required': False},
        }

    def get_patient_name(self, obj):
        return obj.patient.get_full_name() or obj.patient.username

    def get_patient_code(self, obj):
        return f"#BN-{10000 + obj.patient_id}"

    def get_patient_age(self, obj):
        profile = getattr(obj.patient, 'patient_profile', None)
        if profile and profile.date_of_birth:
            return date.today().year - profile.date_of_birth.year
        return None

    def get_patient_dob(self, obj):
        profile = getattr(obj.patient, 'patient_profile', None)
        if profile and profile.date_of_birth:
            return profile.date_of_birth.strftime('%d/%m/%Y')
        return ''

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

    def get_patient_emergency_contact(self, obj):
        profile = getattr(obj.patient, 'patient_profile', None)
        return getattr(profile, 'emergency_contact', '') or ''

    def get_patient_history(self, obj):
        profile = getattr(obj.patient, 'patient_profile', None)
        return getattr(profile, 'medical_history', '') or ''

    def get_doctor_name(self, obj):
        if obj.doctor and obj.doctor.user:
            return obj.doctor.user.get_full_name() or obj.doctor.user.username
        return ''

    def get_clinic_name(self, obj):
        if obj.appointment and obj.appointment.clinic:
            return obj.appointment.clinic.name
        if obj.doctor and obj.doctor.clinic:
            return obj.doctor.clinic.name
        return ''

    def get_appointment_date(self, obj):
        if obj.appointment and obj.appointment.time_slot:
            return str(obj.appointment.time_slot.date)
        return obj.created_at.strftime('%Y-%m-%d') if obj.created_at else ''

    def get_appointment_time(self, obj):
        if obj.appointment and obj.appointment.time_slot:
            return obj.appointment.time_slot.start_time.strftime('%H:%M')
        return obj.created_at.strftime('%H:%M') if obj.created_at else ''


class XrayAnalysisResultSerializer(serializers.ModelSerializer):
    case_code = serializers.SerializerMethodField()
    xray_code = serializers.SerializerMethodField()
    image_code = serializers.SerializerMethodField()
    original_image_url = serializers.SerializerMethodField()
    heatmap_image_url = serializers.SerializerMethodField()
    scan_number = serializers.SerializerMethodField()
    total_patient_scans = serializers.SerializerMethodField()
    patient_name = serializers.SerializerMethodField()
    patient_email = serializers.CharField(source='patient.email', read_only=True)
    patient_code = serializers.SerializerMethodField()
    patient_age = serializers.SerializerMethodField()
    patient_gender = serializers.SerializerMethodField()
    attending_doctor_name = serializers.SerializerMethodField()
    top_findings = serializers.ListField(read_only=True)
    reviewed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = XrayAnalysisResult
        fields = [
            'id', 'xray_code', 'image_code', 'case_code',
            'scan_number', 'total_patient_scans',
            'patient', 'patient_name', 'patient_email',
            'patient_code', 'patient_age', 'patient_gender', 'attending_doctor_name',
            'original_image', 'original_image_url',
            'heatmap_image', 'heatmap_image_url',
            'predictions', 'top_findings',
            'doctor_review', 'doctor_agrees_with_ai',
            'reviewed_by', 'reviewed_by_name',
            'created_at'
        ]
        read_only_fields = ['id', 'xray_code', 'image_code', 'predictions', 'heatmap_image', 'created_at']

    def get_xray_code(self, obj):
        return obj.xray_code or f"XQ-{obj.created_at.strftime('%Y%m%d') if obj.created_at else '20261110'}-{1000 + obj.id}"

    def get_image_code(self, obj):
        return obj.image_code or f"IMG-{obj.created_at.strftime('%Y%m%d') if obj.created_at else '20261110'}-{1000 + obj.id}"

    def get_case_code(self, obj):
        return self.get_xray_code(obj)

    def get_original_image_url(self, obj):
        if not obj.original_image:
            return ''
        url = obj.original_image.url
        request = self.context.get('request')
        return request.build_absolute_uri(url) if request else url

    def get_heatmap_image_url(self, obj):
        if not obj.heatmap_image:
            return ''
        url = obj.heatmap_image.url
        request = self.context.get('request')
        return request.build_absolute_uri(url) if request else url

    def get_scan_number(self, obj):
        # Tính thứ tự lần chụp của bệnh nhân này theo thời gian tăng dần (Lần 1, Lần 2, ...)
        older_or_equal = XrayAnalysisResult.objects.filter(
            patient_id=obj.patient_id,
            created_at__lte=obj.created_at
        ).count()
        return max(1, older_or_equal)

    def get_total_patient_scans(self, obj):
        return XrayAnalysisResult.objects.filter(patient_id=obj.patient_id).count()

    def get_patient_name(self, obj):
        return obj.patient.get_full_name() or obj.patient.username

    def get_patient_code(self, obj):
        return f"#BN-{10000 + obj.patient_id}"

    def get_patient_age(self, obj):
        profile = getattr(obj.patient, 'patient_profile', None)
        if profile and profile.date_of_birth:
            return date.today().year - profile.date_of_birth.year
        return None

    def get_patient_gender(self, obj):
        profile = getattr(obj.patient, 'patient_profile', None)
        if profile:
            return profile.get_gender_display()
        return ''

    def get_attending_doctor_name(self, obj):
        if obj.reviewed_by and obj.reviewed_by.user:
            return obj.reviewed_by.user.get_full_name()
        latest_app = obj.patient.appointments.select_related('doctor__user').first()
        if latest_app and latest_app.doctor:
            return latest_app.doctor.user.get_full_name()
        return ''

    def get_reviewed_by_name(self, obj):
        if obj.reviewed_by and obj.reviewed_by.user:
            return obj.reviewed_by.user.get_full_name() or obj.reviewed_by.user.username
        return ''



class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = ['id', 'role', 'content', 'created_at']
        read_only_fields = ['id', 'created_at']


class ChatSessionSerializer(serializers.ModelSerializer):
    messages = ChatMessageSerializer(many=True, read_only=True)
    message_count = serializers.IntegerField(source='messages.count', read_only=True)

    class Meta:
        model = ChatSession
        fields = ['id', 'title', 'messages', 'message_count', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class ChatSessionListSerializer(serializers.ModelSerializer):
    """Lighter serializer for listing sessions (no messages)."""
    message_count = serializers.IntegerField(source='messages.count', read_only=True)

    class Meta:
        model = ChatSession
        fields = ['id', 'title', 'message_count', 'created_at', 'updated_at']
