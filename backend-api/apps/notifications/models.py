"""Notifications Models."""
from django.db import models
from apps.accounts.models import CustomUser


class Notification(models.Model):
    class Type(models.TextChoices):
        INFO = 'INFO', 'Thông tin'
        APPOINTMENT = 'APPOINTMENT', 'Lịch hẹn'
        XRAY_RESULT = 'XRAY_RESULT', 'Kết quả X-quang'
        CHAT = 'CHAT', 'Tin nhắn chat'
        SYSTEM = 'SYSTEM', 'Hệ thống'
        REMINDER = 'REMINDER', 'Nhắc nhở'

    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=200)
    message = models.TextField()
    type = models.CharField(max_length=20, choices=Type.choices, default=Type.INFO)
    is_read = models.BooleanField(default=False)
    related_object_type = models.CharField(max_length=50, blank=True, default='')
    related_object_id = models.IntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'notifications_notification'
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.type}] {self.title}"
