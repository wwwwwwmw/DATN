"""
Medical Records Models — MedicalRecord, XrayAnalysisResult, ChatSession, ChatMessage.
"""
from django.db import models
from apps.accounts.models import CustomUser, DoctorProfile
from apps.appointments.models import Appointment


class MedicalRecord(models.Model):
    """Hồ sơ y tế sau mỗi lần khám."""
    patient = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='medical_records')
    doctor = models.ForeignKey(DoctorProfile, on_delete=models.CASCADE, related_name='medical_records')
    appointment = models.OneToOneField(Appointment, on_delete=models.SET_NULL, null=True, blank=True, related_name='medical_record')
    diagnosis = models.TextField(blank=True, default='')
    symptoms = models.TextField(blank=True, default='')
    prescription = models.TextField(blank=True, default='')
    notes = models.TextField(blank=True, default='')
    follow_up_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'medical_records_medicalrecord'
        ordering = ['-created_at']

    def __str__(self):
        return f"Hồ sơ #{self.id}: {self.patient} - {self.diagnosis[:50]}"


class XrayAnalysisResult(models.Model):
    """Kết quả phân tích ảnh X-quang từ AI Vision service."""
    xray_code = models.CharField(max_length=40, unique=True, db_index=True, null=True, blank=True)
    image_code = models.CharField(max_length=40, unique=True, db_index=True, null=True, blank=True)
    patient = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='xray_results')
    original_image = models.ImageField(upload_to='xrays/originals/')
    heatmap_image = models.ImageField(upload_to='xrays/heatmaps/', blank=True, default='')
    predictions = models.JSONField(default=dict)  # {"Pneumonia": 0.89, ...}
    doctor_review = models.TextField(blank=True, default='')
    doctor_agrees_with_ai = models.BooleanField(null=True, blank=True)
    reviewed_by = models.ForeignKey(DoctorProfile, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_xrays')
    # Digital signature: HMAC-SHA256 hash of review content for non-repudiation
    digital_signature = models.CharField(max_length=128, blank=True, default='')
    signature_timestamp = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'medical_records_xrayanalysisresult'
        ordering = ['-created_at', '-id']

    def save(self, *args, **kwargs):
        import uuid
        from django.utils import timezone
        now_dt = self.created_at or timezone.now()
        stamp = now_dt.strftime('%Y%m%d-%H%M%S')
        if not self.xray_code:
            suffix = uuid.uuid4().hex[:4].upper()
            candidate = f"XQ-{stamp}-{suffix}"
            while XrayAnalysisResult.objects.filter(xray_code=candidate).exclude(pk=self.pk).exists():
                suffix = uuid.uuid4().hex[:4].upper()
                candidate = f"XQ-{stamp}-{suffix}"
            self.xray_code = candidate
        if not self.image_code:
            suffix = self.xray_code.split('-')[-1] if '-' in self.xray_code else uuid.uuid4().hex[:4].upper()
            img_candidate = f"IMG-{stamp}-{suffix}"
            while XrayAnalysisResult.objects.filter(image_code=img_candidate).exclude(pk=self.pk).exists():
                img_candidate = f"IMG-{stamp}-{uuid.uuid4().hex[:4].upper()}"
            self.image_code = img_candidate
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.xray_code} ({self.image_code}): {self.patient}"

    @property
    def top_findings(self):
        """Top 3 predictions by probability."""
        sorted_preds = sorted(self.predictions.items(), key=lambda x: x[1], reverse=True)
        return [{'name': k, 'probability': round(v, 4)} for k, v in sorted_preds[:3]]

    def sign_review(self, doctor_user):
        """
        Generate HMAC-SHA256 digital signature for the doctor's review.
        Signs: xray_code + doctor_review + doctor_id + agrees_with_ai.
        Uses doctor's email as the signing key (unique per doctor).
        """
        import hmac
        import hashlib
        from django.utils import timezone

        # Build the data to sign
        sign_data = (
            f"{self.xray_code}|"
            f"{self.doctor_review}|"
            f"{doctor_user.id}|"
            f"{self.doctor_agrees_with_ai}|"
            f"{self.predictions}"
        )

        # Use doctor's email (unique, private) as HMAC key
        key = doctor_user.email.encode('utf-8')
        signature = hmac.new(key, sign_data.encode('utf-8'), hashlib.sha256).hexdigest()

        self.digital_signature = signature
        self.signature_timestamp = timezone.now()
        return signature

    def verify_signature(self, doctor_user):
        """Verify the digital signature matches the current review content."""
        import hmac
        import hashlib

        if not self.digital_signature:
            return False

        sign_data = (
            f"{self.xray_code}|"
            f"{self.doctor_review}|"
            f"{doctor_user.id}|"
            f"{self.doctor_agrees_with_ai}|"
            f"{self.predictions}"
        )
        key = doctor_user.email.encode('utf-8')
        expected = hmac.new(key, sign_data.encode('utf-8'), hashlib.sha256).hexdigest()
        return hmac.compare_digest(self.digital_signature, expected)


class ChatSession(models.Model):
    """Phiên chat sơ vấn y tế (RAG)."""
    patient = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='chat_sessions')
    title = models.CharField(max_length=200, default='Phiên tư vấn mới')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'medical_records_chatsession'
        ordering = ['-updated_at']

    def __str__(self):
        return f"Chat #{self.id}: {self.patient} - {self.title}"


class ChatMessage(models.Model):
    """Tin nhắn trong phiên chat."""

    class Role(models.TextChoices):
        USER = 'user', 'Người dùng'
        ASSISTANT = 'assistant', 'Trợ lý AI'
        SYSTEM = 'system', 'Hệ thống'

    session = models.ForeignKey(ChatSession, on_delete=models.CASCADE, related_name='messages')
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.USER)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'medical_records_chatmessage'
        ordering = ['created_at']

    def __str__(self):
        return f"[{self.role}] {self.content[:50]}..."
