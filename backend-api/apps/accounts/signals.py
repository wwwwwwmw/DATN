"""
Accounts Signals — Auto-create profiles on user creation.
"""
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import CustomUser, DoctorProfile, PatientProfile


@receiver(post_save, sender=CustomUser)
def create_user_profile(sender, instance, created, **kwargs):
    """Tự động tạo profile tương ứng khi user được tạo."""
    if created:
        if instance.role == CustomUser.Role.DOCTOR:
            DoctorProfile.objects.get_or_create(user=instance)
        elif instance.role == CustomUser.Role.PATIENT:
            PatientProfile.objects.get_or_create(user=instance)
