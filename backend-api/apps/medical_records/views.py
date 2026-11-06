"""
Medical Records Views — Role-Scoped (PATIENT: own, DOCTOR: own patients, ADMIN: all).
"""
from django.db import models
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from .models import MedicalRecord
from .serializers import MedicalRecordSerializer
from apps.accounts.models import DoctorProfile
from apps.appointments.models import Appointment


class MedicalRecordListView(generics.ListCreateAPIView):
    serializer_class = MedicalRecordSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = MedicalRecord.objects.select_related(
            'patient', 'patient__patient_profile',
            'doctor__user', 'doctor__clinic',
            'appointment__clinic', 'appointment__time_slot'
        )
        if user.role == 'PATIENT':
            return qs.filter(patient=user)
        elif user.role == 'DOCTOR':
            return qs.filter(
                models.Q(doctor__user=user) |
                models.Q(patient__appointments__doctor__user=user)
            ).distinct()
        return qs

    def create(self, request, *args, **kwargs):
        user = request.user
        if user.role not in ('DOCTOR', 'ADMIN'):
            return Response(
                {'status': 'error', 'message': 'Chỉ Bác sĩ hoặc Quản trị viên mới có quyền tạo bệnh án.'},
                status=status.HTTP_403_FORBIDDEN
            )

        data = request.data.copy()
        appointment_id = data.get('appointment')
        doctor_profile = getattr(user, 'doctor_profile', None)

        if not doctor_profile:
            if appointment_id:
                app = Appointment.objects.filter(id=appointment_id).select_related('doctor').first()
                if app:
                    doctor_profile = app.doctor
            if not doctor_profile and data.get('doctor'):
                doctor_profile = DoctorProfile.objects.filter(id=data.get('doctor')).first()
            if not doctor_profile:
                doctor_profile = DoctorProfile.objects.first()

        if appointment_id:
            existing = MedicalRecord.objects.filter(appointment_id=appointment_id).first()
            if existing:
                for field in ('diagnosis', 'symptoms', 'prescription', 'notes', 'follow_up_date'):
                    if field in data:
                        setattr(existing, field, data[field])
                if doctor_profile:
                    existing.doctor = doctor_profile
                existing.save()
                Appointment.objects.filter(id=appointment_id).update(status=Appointment.Status.COMPLETED)
                return Response({
                    'status': 'success',
                    'data': MedicalRecordSerializer(existing).data,
                    'message': 'Đã cập nhật hồ sơ bệnh án thành công.'
                })

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        record = serializer.save(doctor=doctor_profile)
        if record.appointment_id:
            Appointment.objects.filter(id=record.appointment_id).update(status=Appointment.Status.COMPLETED)
        return Response({
            'status': 'success',
            'data': MedicalRecordSerializer(record).data,
            'message': 'Đã tạo hồ sơ bệnh án thành công.'
        }, status=status.HTTP_201_CREATED)


class MedicalRecordDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = MedicalRecordSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = MedicalRecord.objects.select_related(
            'patient', 'patient__patient_profile',
            'doctor__user', 'doctor__clinic',
            'appointment__clinic', 'appointment__time_slot'
        )
        if user.role == 'PATIENT':
            return qs.filter(patient=user)
        elif user.role == 'DOCTOR':
            return qs.filter(
                models.Q(doctor__user=user) |
                models.Q(patient__appointments__doctor__user=user)
            ).distinct()
        return qs

