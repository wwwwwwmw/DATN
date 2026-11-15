"""
Appointments Views — CRUD + Simulated Annealing optimal slots.
"""
import os
import io
import calendar
from datetime import datetime, date as dt_date, time as dt_time, timedelta
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from django.http import HttpResponse

from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.gis.geos import Point
from django.contrib.gis.db.models.functions import Distance
from django.db import models, transaction

from .models import Appointment, TimeSlot, TelehealthRoom, TelehealthMessage
from .serializers import (
    AppointmentSerializer, CreateAppointmentSerializer,
    TimeSlotSerializer, UpdateAppointmentStatusSerializer,
)
from .services.simulated_annealing import simulated_annealing, SAConfig
from apps.accounts.permissions import IsDoctor, IsDoctorOrReadOnly, IsAdminUser
from apps.accounts.models import DoctorProfile
from apps.clinics.models import Clinic


class OptimalSlotsView(APIView):
    """
    GET /api/appointments/optimal-slots/
    Lấy khung giờ tối ưu từ Simulated Annealing.
    """

    def get(self, request):
        clinic_id = request.query_params.get('clinic_id')
        doctor_id = request.query_params.get('doctor_id')
        date_str = request.query_params.get('date')
        patient_lat = request.query_params.get('patient_lat')
        patient_lng = request.query_params.get('patient_lng')
        preferred_time_str = request.query_params.get('preferred_time')

        if not clinic_id or not date_str:
            return Response({
                'status': 'error',
                'message': 'Thiếu clinic_id và date.'
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response({
                'status': 'error',
                'message': 'date phải có format YYYY-MM-DD.'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Build queryset
        slots = TimeSlot.objects.filter(
            clinic_id=clinic_id,
            date=target_date,
            is_available=True,
        ).select_related('doctor__user', 'clinic')

        if doctor_id:
            slots = slots.filter(doctor_id=doctor_id)

        # Exclude full slots
        slots = [s for s in slots if not s.is_full]

        if not slots:
            return Response({
                'status': 'success',
                'data': {'slots': [], 'algorithm': 'simulated_annealing', 'computation_time_ms': 0}
            })

        # Patient location for distance scoring
        patient_location = None
        if patient_lat and patient_lng:
            try:
                patient_location = Point(float(patient_lng), float(patient_lat), srid=4326)
                # Annotate distance
                slot_ids = [s.id for s in slots]
                annotated = TimeSlot.objects.filter(id__in=slot_ids).annotate(
                    distance=Distance('clinic__location', patient_location)
                )
                dist_map = {s.id: s.distance for s in annotated}
                for slot in slots:
                    slot.distance = dist_map.get(slot.id)
            except (ValueError, TypeError):
                pass

        # Preferred time
        preferred_time = None
        if preferred_time_str:
            try:
                preferred_time = datetime.strptime(preferred_time_str, '%H:%M').time()
            except ValueError:
                pass

        # Run SA
        result, meta = simulated_annealing(slots, patient_location, preferred_time)

        # Serialize
        response_slots = []
        for item in result:
            slot = item['slot']
            response_slots.append({
                'id': slot.id,
                'doctor': {
                    'id': slot.doctor.id,
                    'name': slot.doctor.user.get_full_name(),
                    'specialization': slot.doctor.specialization,
                },
                'date': str(slot.date),
                'start_time': slot.start_time.strftime('%H:%M'),
                'end_time': slot.end_time.strftime('%H:%M'),
                'remaining_slots': slot.remaining_slots,
                'sa_score': round(item['score'], 4),
                'is_recommended': item['is_recommended'],
                'reasons': item['reasons'],
            })

        return Response({
            'status': 'success',
            'data': {
                'slots': response_slots,
                **meta,
            }
        })


class AppointmentListView(generics.ListAPIView):
    """GET /api/appointments/ — Danh sách lịch hẹn (PATIENT: của mình, DOCTOR: của bác sĩ đó, ADMIN: toàn bộ)."""
    serializer_class = AppointmentSerializer

    def get_queryset(self):
        user = self.request.user
        qs = Appointment.objects.select_related(
            'patient', 'patient__patient_profile',
            'doctor__user', 'clinic', 'time_slot', 'medical_record', 'telehealth_room'
        )
        if user.role == 'PATIENT':
            return qs.filter(patient=user)
        elif user.role == 'DOCTOR':
            return qs.filter(doctor__user=user)
        return qs  # admin sees all


class AppointmentDetailView(generics.RetrieveAPIView):
    """GET /api/appointments/<id>/ — Chi tiết lịch hẹn."""
    serializer_class = AppointmentSerializer

    def get_queryset(self):
        user = self.request.user
        qs = Appointment.objects.select_related(
            'patient', 'patient__patient_profile',
            'doctor__user', 'clinic', 'time_slot', 'medical_record', 'telehealth_room'
        )
        if user.role == 'PATIENT':
            return qs.filter(patient=user)
        elif user.role == 'DOCTOR':
            return qs.filter(doctor__user=user)
        return qs


class CreateAppointmentView(APIView):
    """POST /api/appointments/ — Tạo lịch hẹn."""

    def post(self, request):
        serializer = CreateAppointmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        slot_id = serializer.validated_data['time_slot_id']
        slot = TimeSlot.objects.select_related('doctor', 'clinic').get(id=slot_id)

        with transaction.atomic():
            # Create or update appointment if same patient & slot exists
            appointment, created = Appointment.objects.update_or_create(
                patient=request.user,
                time_slot=slot,
                defaults={
                    'doctor': slot.doctor,
                    'clinic': slot.clinic,
                    'status': Appointment.Status.PENDING,
                    'reason': serializer.validated_data.get('reason', ''),
                    'notes': serializer.validated_data.get('notes', ''),
                    'sa_score': 0.94,
                }
            )

            if created:
                slot.current_patients += 1
                if slot.current_patients >= slot.max_patients:
                    slot.is_available = False
                slot.save()

        return Response({
            'status': 'success',
            'data': AppointmentSerializer(appointment).data,
            'message': 'Đặt lịch hẹn thành công.'
        }, status=status.HTTP_201_CREATED)


class UpdateAppointmentStatusView(APIView):
    """PATCH /api/appointments/<id>/status/ — Cập nhật trạng thái."""
    permission_classes = [IsDoctorOrReadOnly]

    def patch(self, request, pk):
        user = request.user
        qs = Appointment.objects.all()
        if user.role == 'DOCTOR':
            qs = qs.filter(doctor__user=user)
        try:
            appointment = qs.get(pk=pk)
        except Appointment.DoesNotExist:
            return Response({
                'status': 'error',
                'message': 'Lịch hẹn không tồn tại hoặc không thuộc quyền quản lý của bạn.'
            }, status=status.HTTP_404_NOT_FOUND)

        serializer = UpdateAppointmentStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        appointment.status = serializer.validated_data['status']
        if serializer.validated_data.get('notes'):
            appointment.notes = serializer.validated_data['notes']
        appointment.save()

        return Response({
            'status': 'success',
            'data': AppointmentSerializer(appointment).data,
            'message': f'Cập nhật trạng thái thành {appointment.get_status_display()}.'
        })


class DoctorDashboardView(APIView):
    """
    GET /api/appointments/dashboard/
    Lấy toàn bộ dữ liệu thực tế cho Bảng điều khiển Bác sĩ / Admin:
    - DOCTOR: chỉ thấy lịch hẹn, yêu cầu đặt lịch, X-ray của bệnh nhân thuộc bác sĩ đó.
    - ADMIN: thấy toàn bộ lịch hẹn, yêu cầu đặt lịch, X-ray của toàn hệ thống.
    - PATIENT: chỉ thấy lịch hẹn của chính bệnh nhân đó.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from apps.medical_records.models import XrayAnalysisResult, MedicalRecord
        from datetime import date

        today = date.today()
        user = request.user

        # 1. Appointments Queryset scoped by role
        qs = Appointment.objects.select_related(
            'patient', 'patient__patient_profile',
            'doctor__user', 'clinic', 'time_slot', 'medical_record', 'telehealth_room'
        )
        if user.role == 'PATIENT':
            qs = qs.filter(patient=user)
        elif user.role == 'DOCTOR':
            qs = qs.filter(doctor__user=user)
        # ADMIN: qs remains all appointments

        # Appointments for today (or all ordered by date/time)
        today_appointments = qs.filter(time_slot__date=today).order_by('time_slot__start_time')
        if not today_appointments.exists():
            today_appointments = qs.order_by('-time_slot__date', 'time_slot__start_time')

        all_appointments_count = qs.count()
        waiting_count = qs.filter(status=Appointment.Status.PENDING).count()
        urgent_count = qs.filter(
            models.Q(reason__icontains='cấp') |
            models.Q(reason__icontains='đau thắt ngực') |
            models.Q(reason__icontains='urgent') |
            models.Q(reason__icontains='emergency') |
            models.Q(notes__icontains='khẩn cấp')
        ).count()

        # 2. AI Review pending count scoped by role
        ai_pending_qs = XrayAnalysisResult.objects.filter(
            doctor_agrees_with_ai__isnull=True
        ).select_related('patient', 'patient__patient_profile', 'reviewed_by__user')

        if user.role == 'PATIENT':
            ai_pending_qs = ai_pending_qs.filter(patient=user)
        elif user.role == 'DOCTOR':
            ai_pending_qs = ai_pending_qs.filter(
                models.Q(patient__appointments__doctor__user=user) |
                models.Q(patient__medical_records__doctor__user=user) |
                models.Q(reviewed_by__user=user)
            ).distinct()

        ai_review_count = ai_pending_qs.count()

        # 3. Build Schedule items from real DB records
        schedule_data = []
        for app in today_appointments[:12]:
            p = app.patient
            profile = getattr(p, 'patient_profile', None)
            age = None
            if profile and profile.date_of_birth:
                age = today.year - profile.date_of_birth.year
            gender_display = profile.get_gender_display() if profile else ''

            is_emergency = any(
                kw in (app.reason or '').lower() or kw in (app.notes or '').lower()
                for kw in ['cấp', 'urgent', 'đau thắt ngực', 'khẩn cấp']
            )
            is_video = 'telehealth' in (app.reason or '').lower() or 'video' in (app.reason or '').lower()

            status_key = 'confirmed'
            if app.status == Appointment.Status.COMPLETED:
                status_key = 'completed'
            elif app.status == Appointment.Status.PENDING:
                status_key = 'waiting'
            elif is_emergency:
                status_key = 'emergency'
            elif is_video:
                status_key = 'in_progress'

            start_t = app.time_slot.start_time.strftime('%H:%M')
            hour = app.time_slot.start_time.hour
            period = 'Sáng' if hour < 12 else ('Buổi trưa' if hour == 12 else 'Chiều')
            if is_emergency:
                period = 'CẤP CỨU'
            elif is_video:
                period = 'Trực tuyến'

            # Fetch real MedicalRecord linked to this appointment or latest for this patient+doctor
            mr = getattr(app, 'medical_record', None)
            if not mr and app.status == Appointment.Status.COMPLETED:
                mr = MedicalRecord.objects.filter(patient=p, doctor=app.doctor).first()

            mr_data = None
            if mr:
                mr_data = {
                    'id': mr.id,
                    'diagnosis': mr.diagnosis,
                    'symptoms': mr.symptoms,
                    'prescription': mr.prescription,
                    'notes': mr.notes,
                    'follow_up_date': str(mr.follow_up_date) if mr.follow_up_date else '',
                }

            schedule_data.append({
                'id': app.id,
                'patient_id': p.id,
                'time': start_t,
                'date': str(app.time_slot.date),
                'period': period,
                'name': p.get_full_name() or p.username,
                'age': age,
                'gender': gender_display,
                'blood_type': getattr(profile, 'blood_type', '') or '',
                'patient_history': getattr(profile, 'medical_history', '') or '',
                'code': f'#BA-{1000 + app.id}',
                'type': app.reason or 'Khám bệnh chuyên khoa',
                'notes': app.notes or '',
                'status': status_key,
                'isVideo': is_video,
                'doctor': f'BS. {app.doctor.user.get_full_name()}',
                'doctor_specialization': app.doctor.specialization,
                'clinic_name': app.clinic.name if app.clinic else '',
                'medical_record': mr_data,
            })

        # 4. New Booking Requests (status=PENDING)
        pending_qs = qs.filter(status=Appointment.Status.PENDING).order_by('-created_at')[:8]
        requests_data = []
        for req in pending_qs:
            rp = req.patient
            r_profile = getattr(rp, 'patient_profile', None)
            r_age = (today.year - r_profile.date_of_birth.year) if (r_profile and r_profile.date_of_birth) else None
            r_gender = r_profile.get_gender_display() if r_profile else ''
            r_video = 'telehealth' in (req.reason or '').lower()
            requests_data.append({
                'id': req.id,
                'patient_id': rp.id,
                'name': rp.get_full_name() or rp.username,
                'age': r_age,
                'gender': r_gender,
                'phone': rp.phone or '',
                'blood_type': getattr(r_profile, 'blood_type', '') or '',
                'patient_history': getattr(r_profile, 'medical_history', '') or '',
                'doctor_name': f'BS. {req.doctor.user.get_full_name()}',
                'clinic_name': req.clinic.name if req.clinic else '',
                'specialty': req.doctor.specialization or (req.clinic.name if req.clinic else ''),
                'time': f"{req.time_slot.start_time.strftime('%H:%M')} ({req.time_slot.date.strftime('%d/%m/%Y')})",
                'reason': req.reason or '',
                'note': req.notes or req.reason or '',
                'aiMatch': int(round(req.sa_score * 100)) if req.sa_score else 95,
                'isVideo': r_video,
            })

        # 5. AI Results Pending Review
        ai_results_data = []
        for x in ai_pending_qs[:6]:
            xp = x.patient
            x_profile = getattr(xp, 'patient_profile', None)
            x_age = None
            if x_profile and x_profile.date_of_birth:
                x_age = today.year - x_profile.date_of_birth.year

            sorted_preds = sorted(
                [(k, v) for k, v in (x.predictions or {}).items() if isinstance(v, (int, float))],
                key=lambda item: item[1],
                reverse=True
            )
            top_finding = sorted_preds[0][0] if sorted_preds else 'Chưa xác định'
            top_prob = round(sorted_preds[0][1] * 100, 1) if sorted_preds else 0.0

            secondary = sorted_preds[1][0] if len(sorted_preds) > 1 else ''
            sec_prob = round(sorted_preds[1][1] * 100, 1) if len(sorted_preds) > 1 else 0.0

            ai_results_data.append({
                'id': x.id,
                'code': f'#XQ-{8800 + x.id}',
                'patient': xp.get_full_name() or xp.username,
                'age': x_age,
                'finding': top_finding,
                'prob': top_prob,
                'secondary': secondary,
                'secProb': sec_prob,
            })

        return Response({
            'status': 'success',
            'data': {
                'scope_role': user.role,
                'scope_user': user.get_full_name() or user.username,
                'stats': {
                    'total_appointments': all_appointments_count,
                    'waiting': waiting_count,
                    'ai_review': ai_review_count,
                    'urgent': urgent_count,
                },
                'schedule': schedule_data,
                'requests': requests_data,
                'ai_results': ai_results_data,
            }
        })


class TelehealthRoomView(APIView):
    """
    GET / POST /api/appointments/<int:pk>/telehealth-room/
    Quản lý trạng thái phòng gọi trực tuyến WebRTC, thông báo chờ kết nối 2 chiều
    (Bác sĩ <-> Bệnh nhân), tín hiệu WebRTC (Offer/Answer/ICE), và tin nhắn Chat trong cuộc gọi.
    """
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = []  # Không giới hạn rate-limit cho tín hiệu WebRTC (Offer/Answer/ICE) và polling thời gian thực

    def _get_authorized_appointment(self, request, pk):
        user = request.user
        qs = Appointment.objects.select_related('patient', 'doctor__user', 'clinic', 'time_slot')
        if user.role == 'PATIENT':
            qs = qs.filter(patient=user)
        elif user.role == 'DOCTOR':
            qs = qs.filter(doctor__user=user)
        return qs.filter(pk=pk).first()

    def _serialize_room(self, room, appointment):
        messages = [
            {
                'id': m.id,
                'sender_id': m.sender_id,
                'sender_name': m.sender_name,
                'sender_role': m.sender_role,
                'content': m.content,
                'created_at': m.created_at.strftime('%H:%M:%S'),
            }
            for m in room.messages.all()
        ]
        return {
            'appointment_id': appointment.id,
            'appointment_code': f'#BA-{1000 + appointment.id}',
            'patient_id': appointment.patient_id,
            'patient_name': appointment.patient.get_full_name() or appointment.patient.username,
            'doctor_user_id': appointment.doctor.user_id,
            'doctor_name': appointment.doctor.user.get_full_name() or appointment.doctor.user.username,
            'doctor_specialization': appointment.doctor.specialization,
            'clinic_name': appointment.clinic.name if appointment.clinic else '',
            'doctor_in_room': room.doctor_in_room,
            'patient_in_room': room.patient_in_room,
            'is_connected': bool(room.doctor_in_room and room.patient_in_room),
            'doctor_mic': room.doctor_mic,
            'doctor_video': room.doctor_video,
            'patient_mic': room.patient_mic,
            'patient_video': room.patient_video,
            'webrtc_offer': room.webrtc_offer,
            'webrtc_answer': room.webrtc_answer,
            'doctor_ice_candidates': room.doctor_ice_candidates or [],
            'patient_ice_candidates': room.patient_ice_candidates or [],
            'started_at': room.started_at.isoformat() if room.started_at else None,
            'updated_at': room.updated_at.isoformat() if room.updated_at else None,
            'messages': messages,
        }

    def get(self, request, pk):
        appointment = self._get_authorized_appointment(request, pk)
        if not appointment:
            return Response(
                {'status': 'error', 'message': 'Không tìm thấy ca khám hoặc bạn không có quyền truy cập.'},
                status=status.HTTP_404_NOT_FOUND
            )
        room, _ = TelehealthRoom.objects.get_or_create(appointment=appointment)
        return Response({
            'status': 'success',
            'data': self._serialize_room(room, appointment)
        })

    def post(self, request, pk):
        from django.utils import timezone
        from apps.notifications.models import Notification

        appointment = self._get_authorized_appointment(request, pk)
        if not appointment:
            return Response(
                {'status': 'error', 'message': 'Không tìm thấy ca khám hoặc bạn không có quyền truy cập.'},
                status=status.HTTP_404_NOT_FOUND
            )

        room, _ = TelehealthRoom.objects.get_or_create(appointment=appointment)
        user = request.user
        action = request.data.get('action', '')
        acting_as_patient = (
            user.role == 'PATIENT'
            or (user.id == appointment.patient_id)
            or (user.role == 'ADMIN' and request.data.get('participant_role') == 'PATIENT')
        )

        if action == 'join':
            if acting_as_patient:
                was_in_room = room.patient_in_room
                room.patient_in_room = True
                room.patient_mic = bool(request.data.get('mic', True))
                room.patient_video = bool(request.data.get('video', True))
                if not was_in_room and not room.doctor_in_room:
                    room.webrtc_offer = None
                    room.webrtc_answer = None
                    room.doctor_ice_candidates = []
                    room.patient_ice_candidates = []
                if room.doctor_in_room and not room.started_at:
                    room.started_at = timezone.now()
                room.save()

                if not was_in_room:
                    pat_name = appointment.patient.get_full_name() or appointment.patient.username
                    Notification.objects.create(
                        user=appointment.doctor.user,
                        title=f'Bệnh nhân {pat_name} đang chờ trong cuộc gọi Telehealth',
                        message=f'Bệnh nhân {pat_name} (Ca #BA-{1000 + appointment.id}) đã vào phòng khám trực tuyến và đang chờ Bác sĩ kết nối.',
                        type='APPOINTMENT',
                        related_object_type='appointment',
                        related_object_id=appointment.id,
                    )
            else:
                was_in_room = room.doctor_in_room
                room.doctor_in_room = True
                room.doctor_mic = bool(request.data.get('mic', True))
                room.doctor_video = bool(request.data.get('video', True))
                if not was_in_room and not room.patient_in_room:
                    room.webrtc_offer = None
                    room.webrtc_answer = None
                    room.doctor_ice_candidates = []
                    room.patient_ice_candidates = []
                if room.patient_in_room and not room.started_at:
                    room.started_at = timezone.now()
                room.save()

                if not was_in_room:
                    doc_name = appointment.doctor.user.get_full_name() or appointment.doctor.user.username
                    Notification.objects.create(
                        user=appointment.patient,
                        title=f'BS. {doc_name} đang chờ bạn trong cuộc gọi Telehealth',
                        message=f'BS. {doc_name} đã vào phòng khám trực tuyến ca #BA-{1000 + appointment.id}. Hãy nhấn vào phòng để kết nối ngay!',
                        type='APPOINTMENT',
                        related_object_type='appointment',
                        related_object_id=appointment.id,
                    )

        elif action == 'leave':
            if acting_as_patient:
                room.patient_in_room = False
            else:
                room.doctor_in_room = False
            if not room.doctor_in_room and not room.patient_in_room:
                room.started_at = None
                room.webrtc_offer = None
                room.webrtc_answer = None
                room.doctor_ice_candidates = []
                room.patient_ice_candidates = []
            room.save()

        elif action == 'toggle_media':
            if acting_as_patient:
                if 'mic' in request.data:
                    room.patient_mic = bool(request.data['mic'])
                if 'video' in request.data:
                    room.patient_video = bool(request.data['video'])
            else:
                if 'mic' in request.data:
                    room.doctor_mic = bool(request.data['mic'])
                if 'video' in request.data:
                    room.doctor_video = bool(request.data['video'])
            room.save()

        elif action == 'send_message':
            content = (request.data.get('content') or '').strip()
            if content:
                sender_role_label = 'PATIENT' if acting_as_patient else 'DOCTOR'
                sender_display = user.get_full_name() or user.username
                TelehealthMessage.objects.create(
                    room=room,
                    sender=user,
                    sender_name=sender_display,
                    sender_role=sender_role_label,
                    content=content,
                )
                room.save()  # update updated_at

        elif action == 'webrtc_signal':
            sig_type = request.data.get('signal_type')
            sig_data = request.data.get('signal_data')
            if sig_type == 'offer':
                room.webrtc_offer = sig_data
                room.webrtc_answer = None
                room.doctor_ice_candidates = []
                room.patient_ice_candidates = []
                room.save()
            elif sig_type == 'answer':
                room.webrtc_answer = sig_data
                room.save()
            elif sig_type in ('ice', 'ice_batch') and sig_data:
                items = sig_data if isinstance(sig_data, list) else [sig_data]
                if acting_as_patient:
                    cands = list(room.patient_ice_candidates or [])
                    cands.extend(items)
                    room.patient_ice_candidates = cands[-150:]
                else:
                    cands = list(room.doctor_ice_candidates or [])
                    cands.extend(items)
                    room.doctor_ice_candidates = cands[-150:]
                room.save()

        return Response({
            'status': 'success',
            'data': self._serialize_room(room, appointment)
        })


# =========================================================================
# QUẢN LÝ CA LÀM VIỆC & LỊCH TRỰC BÁC SĨ (ADMIN TIMESLOT MANAGEMENT)
# =========================================================================

class AdminTimeSlotListView(APIView):
    """
    GET /api/appointments/time-slots/
    Lấy danh sách ca trực bác sĩ với bộ lọc: bác sĩ, phòng khám, ngày, tháng, năm.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = TimeSlot.objects.select_related('doctor__user', 'clinic').all()

        doctor_id = request.query_params.get('doctor_id')
        clinic_id = request.query_params.get('clinic_id')
        date_str = request.query_params.get('date')
        month = request.query_params.get('month')
        year = request.query_params.get('year')
        future_only = request.query_params.get('future_only', '').lower() in ['true', '1']

        if doctor_id:
            qs = qs.filter(doctor_id=doctor_id)
        if clinic_id:
            qs = qs.filter(clinic_id=clinic_id)
        if date_str:
            try:
                d = datetime.strptime(date_str, '%Y-%m-%d').date()
                qs = qs.filter(date=d)
            except ValueError:
                pass
        if month:
            try:
                qs = qs.filter(date__month=int(month))
            except ValueError:
                pass
        if year:
            try:
                qs = qs.filter(date__year=int(year))
            except ValueError:
                pass
        if future_only:
            from django.utils import timezone
            qs = qs.filter(date__gte=timezone.now().date())

        qs = qs.order_by('date', 'start_time')[:500]
        serializer = TimeSlotSerializer(qs, many=True)
        return Response({
            'status': 'success',
            'count': len(serializer.data),
            'data': serializer.data
        })


class AdminTimeSlotCreateView(APIView):
    """
    POST /api/appointments/time-slots/create/
    Tạo ca trực thủ công (Admin).
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        data = request.data
        doctor_id = data.get('doctor_id')
        clinic_id = data.get('clinic_id')
        date_str = data.get('date')
        start_time_str = data.get('start_time')
        end_time_str = data.get('end_time')
        max_patients = int(data.get('max_patients', 3))

        if not doctor_id or not date_str or not start_time_str or not end_time_str:
            return Response({
                'status': 'error',
                'message': 'Vui lòng cung cấp đầy đủ: doctor_id, date, start_time, end_time.'
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            doctor = DoctorProfile.objects.select_related('clinic').get(pk=doctor_id)
        except DoctorProfile.DoesNotExist:
            return Response({'status': 'error', 'message': 'Không tìm thấy bác sĩ.'}, status=status.HTTP_404_NOT_FOUND)

        clinic = None
        if clinic_id:
            try:
                clinic = Clinic.objects.get(pk=clinic_id)
            except Clinic.DoesNotExist:
                pass
        if not clinic:
            clinic = doctor.clinic
        if not clinic:
            clinic = Clinic.objects.first()

        try:
            slot_date = datetime.strptime(date_str, '%Y-%m-%d').date() if isinstance(date_str, str) else date_str
            st = datetime.strptime(start_time_str, '%H:%M').time() if isinstance(start_time_str, str) else start_time_str
            et = datetime.strptime(end_time_str, '%H:%M').time() if isinstance(end_time_str, str) else end_time_str
        except Exception as e:
            return Response({'status': 'error', 'message': f'Định dạng ngày/giờ không hợp lệ: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

        if st >= et:
            return Response({'status': 'error', 'message': 'Giờ bắt đầu phải trước giờ kết thúc.'}, status=status.HTTP_400_BAD_REQUEST)

        # Kiểm tra trùng ca
        existing = TimeSlot.objects.filter(doctor=doctor, date=slot_date, start_time=st).first()
        if existing:
            return Response({'status': 'error', 'message': f'Bác sĩ đã có ca trực vào {st.strftime("%H:%M")} ngày {slot_date}.'}, status=status.HTTP_400_BAD_REQUEST)

        slot = TimeSlot.objects.create(
            doctor=doctor,
            clinic=clinic,
            date=slot_date,
            start_time=st,
            end_time=et,
            max_patients=max_patients,
            is_available=True
        )

        return Response({
            'status': 'success',
            'data': TimeSlotSerializer(slot).data,
            'message': f'Đã thêm ca trực {st.strftime("%H:%M")} - {et.strftime("%H:%M")} ngày {slot_date} cho BS. {doctor.user.get_full_name()}.'
        }, status=status.HTTP_201_CREATED)


class AdminTimeSlotUpdateView(APIView):
    """
    PUT/PATCH /api/appointments/time-slots/<id>/update/
    Chỉnh sửa ca trực (Admin).
    """
    permission_classes = [permissions.AllowAny]

    def put(self, request, pk):
        return self.patch(request, pk)

    def patch(self, request, pk):
        try:
            slot = TimeSlot.objects.get(pk=pk)
        except TimeSlot.DoesNotExist:
            return Response({'status': 'error', 'message': 'Không tìm thấy ca trực.'}, status=status.HTTP_404_NOT_FOUND)

        data = request.data
        if 'date' in data and data['date']:
            try:
                slot.date = datetime.strptime(data['date'], '%Y-%m-%d').date() if isinstance(data['date'], str) else data['date']
            except Exception:
                pass
        if 'start_time' in data and data['start_time']:
            try:
                slot.start_time = datetime.strptime(data['start_time'][:5], '%H:%M').time() if isinstance(data['start_time'], str) else data['start_time']
            except Exception:
                pass
        if 'end_time' in data and data['end_time']:
            try:
                slot.end_time = datetime.strptime(data['end_time'][:5], '%H:%M').time() if isinstance(data['end_time'], str) else data['end_time']
            except Exception:
                pass
        if 'clinic_id' in data:
            c = Clinic.objects.filter(id=data['clinic_id']).first()
            if c:
                slot.clinic = c
        if 'max_patients' in data and data['max_patients']:
            try:
                slot.max_patients = int(data['max_patients'])
            except Exception:
                pass
        if 'is_available' in data:
            slot.is_available = bool(data['is_available'])

        slot.save()
        return Response({
            'status': 'success',
            'data': TimeSlotSerializer(slot).data,
            'message': f'Đã cập nhật ca trực ngày {slot.date} ({slot.start_time.strftime("%H:%M")} - {slot.end_time.strftime("%H:%M")}) thành công!'
        })


class AdminTimeSlotDeleteView(APIView):
    """
    DELETE /api/appointments/time-slots/<id>/delete/
    Xóa ca trực (Admin).
    """
    permission_classes = [permissions.AllowAny]

    def delete(self, request, pk):
        try:
            slot = TimeSlot.objects.get(pk=pk)
        except TimeSlot.DoesNotExist:
            return Response({'status': 'error', 'message': 'Không tìm thấy ca trực.'}, status=status.HTTP_404_NOT_FOUND)

        active_apps = slot.appointments.filter(status__in=['PENDING', 'CONFIRMED']).count()
        if active_apps > 0:
            return Response({
                'status': 'error',
                'message': f'Ca trực này hiện đang có {active_apps} lịch hẹn đang chờ khám. Không thể xóa!'
            }, status=status.HTTP_400_BAD_REQUEST)

        info = f"{slot.doctor} | {slot.date} {slot.start_time}-{slot.end_time}"
        slot.delete()
        return Response({
            'status': 'success',
            'message': f'Đã xóa ca trực ({info}) thành công.'
        })


class AdminTimeSlotBulkMonthView(APIView):
    """
    POST /api/appointments/time-slots/bulk-month/
    Tạo tự động hàng loạt ca trực cho Bác sĩ theo tháng (Admin).
    Body:
    {
        "doctor_id": 1,
        "clinic_id": 2, (optional)
        "year": 2026,
        "month": 11,
        "weekdays": [0, 1, 2, 3, 4], // Thứ 2 đến Thứ 6 (0=Mon, 6=Sun)
        "shifts": [
            {"start_time": "08:00", "end_time": "09:30", "max_patients": 3},
            {"start_time": "10:00", "end_time": "11:30", "max_patients": 3},
            {"start_time": "14:00", "end_time": "15:30", "max_patients": 3}
        ]
    }
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        data = request.data
        doctor_id = data.get('doctor_id')
        clinic_id = data.get('clinic_id')
        year = int(data.get('year', datetime.now().year))
        month = int(data.get('month', datetime.now().month))
        weekdays = data.get('weekdays', [0, 1, 2, 3, 4])  # 0=Monday ... 6=Sunday
        shifts = data.get('shifts', [])

        if not doctor_id:
            return Response({'status': 'error', 'message': 'Vui lòng chọn bác sĩ.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            doctor = DoctorProfile.objects.select_related('clinic', 'user').get(pk=doctor_id)
        except DoctorProfile.DoesNotExist:
            return Response({'status': 'error', 'message': 'Không tìm thấy bác sĩ.'}, status=status.HTTP_404_NOT_FOUND)

        clinic = None
        if clinic_id:
            try:
                clinic = Clinic.objects.get(pk=clinic_id)
            except Clinic.DoesNotExist:
                pass
        if not clinic:
            clinic = doctor.clinic
        if not clinic:
            clinic = Clinic.objects.first()

        if not shifts:
            shifts = [
                {"start_time": "08:00", "end_time": "09:30", "max_patients": 3},
                {"start_time": "09:30", "end_time": "11:00", "max_patients": 3},
                {"start_time": "13:30", "end_time": "15:00", "max_patients": 3},
                {"start_time": "15:00", "end_time": "16:30", "max_patients": 3},
            ]

        # Tính số ngày trong tháng
        num_days = calendar.monthrange(year, month)[1]
        created_count = 0
        skipped_count = 0

        parsed_shifts = []
        for s in shifts:
            try:
                st = datetime.strptime(s['start_time'][:5], '%H:%M').time()
                et = datetime.strptime(s['end_time'][:5], '%H:%M').time()
                mp = int(s.get('max_patients', 3))
                parsed_shifts.append((st, et, mp))
            except Exception:
                continue

        if not parsed_shifts:
            return Response({'status': 'error', 'message': 'Danh sách khung giờ ca trực không hợp lệ.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            for day in range(1, num_days + 1):
                cur_date = dt_date(year, month, day)
                if cur_date.weekday() in weekdays:
                    for st, et, mp in parsed_shifts:
                        _, created = TimeSlot.objects.get_or_create(
                            doctor=doctor,
                            date=cur_date,
                            start_time=st,
                            defaults={
                                'clinic': clinic,
                                'end_time': et,
                                'max_patients': mp,
                                'is_available': True,
                            }
                        )
                        if created:
                            created_count += 1
                        else:
                            skipped_count += 1

        return Response({
            'status': 'success',
            'created_count': created_count,
            'skipped_count': skipped_count,
            'message': f'Đã sinh {created_count} ca trực trong tháng {month}/{year} cho BS. {doctor.user.get_full_name()} ({skipped_count} ca đã tồn tại).'
        })


class AdminTimeSlotImportExcelView(APIView):
    """
    POST /api/appointments/time-slots/import-excel/
    Nhập hàng loạt ca làm việc từ file Excel (.xlsx) (Admin).
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        excel_file = request.FILES.get('file')
        if not excel_file:
            return Response({'status': 'error', 'message': 'Vui lòng chọn file Excel (.xlsx).'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            wb = openpyxl.load_workbook(excel_file, data_only=True)
            ws = wb.active
        except Exception as e:
            return Response({'status': 'error', 'message': f'Không thể đọc file Excel: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

        default_clinic = Clinic.objects.first()
        created_slots = []
        errors = []

        row_idx = 1
        for row in ws.iter_rows(min_row=2, values_only=True):
            row_idx += 1
            if not any(row):
                continue

            doc_identifier = str(row[0] or '').strip()
            clinic_name = str(row[1] or '').strip()
            date_raw = row[2]
            start_raw = row[3]
            end_raw = row[4]
            max_patients_raw = row[5]

            if not doc_identifier:
                errors.append(f'Dòng {row_idx}: Thiếu thông tin Bác sĩ (Email hoặc Họ tên).')
                continue

            # Tìm bác sĩ
            doctor = DoctorProfile.objects.filter(
                models.Q(user__email__iexact=doc_identifier) |
                models.Q(user__username__iexact=doc_identifier) |
                models.Q(user__last_name__icontains=doc_identifier)
            ).first()

            if not doctor:
                errors.append(f'Dòng {row_idx}: Không tìm thấy Bác sĩ "{doc_identifier}".')
                continue

            # Tìm bệnh viện
            clinic = doctor.clinic or default_clinic
            if clinic_name:
                matched_clinic = Clinic.objects.filter(name__icontains=clinic_name).first()
                if matched_clinic:
                    clinic = matched_clinic

            # Phân tích Ngày
            slot_date = None
            if isinstance(date_raw, (datetime, dt_date)):
                slot_date = date_raw.date() if isinstance(date_raw, datetime) else date_raw
            elif isinstance(date_raw, str):
                date_str = date_raw.strip()
                for fmt in ('%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y'):
                    try:
                        slot_date = datetime.strptime(date_str, fmt).date()
                        break
                    except ValueError:
                        pass

            if not slot_date:
                errors.append(f'Dòng {row_idx}: Ngày khám không hợp lệ ({date_raw}).')
                continue

            # Phân tích Giờ Bắt đầu & Kết thúc
            def parse_time(val, default_val):
                if isinstance(val, dt_time):
                    return val
                if isinstance(val, datetime):
                    return val.time()
                if isinstance(val, str) and val.strip():
                    for fmt in ('%H:%M:%S', '%H:%M'):
                        try:
                            return datetime.strptime(val.strip(), fmt).time()
                        except ValueError:
                            pass
                return default_val

            st = parse_time(start_raw, dt_time(8, 0))
            et = parse_time(end_raw, dt_time(9, 30))

            try:
                mp = int(max_patients_raw) if max_patients_raw else 3
            except (ValueError, TypeError):
                mp = 3

            slot, is_created = TimeSlot.objects.get_or_create(
                doctor=doctor,
                date=slot_date,
                start_time=st,
                defaults={
                    'clinic': clinic,
                    'end_time': et,
                    'max_patients': mp,
                    'is_available': True
                }
            )

            created_slots.append({
                'doctor': doctor.user.get_full_name(),
                'date': str(slot_date),
                'start_time': st.strftime('%H:%M'),
                'end_time': et.strftime('%H:%M'),
                'clinic': clinic.name if clinic else '',
                'action': 'Tạo mới' if is_created else 'Đã tồn tại'
            })

        return Response({
            'status': 'success',
            'imported_count': len([s for s in created_slots if s['action'] == 'Tạo mới']),
            'total_rows': len(created_slots),
            'errors': errors,
            'data': created_slots,
            'message': f'Nhập thành công {len(created_slots)} ca trực từ file Excel!'
        })


class AdminTimeSlotExportTemplateView(APIView):
    """
    GET /api/appointments/time-slots/export-template/
    Tải file Excel mẫu chuẩn nhập Ca trực Bác sĩ.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        template_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'media', 'templates', 'Mau_Ca_Truc_Bac_Si.xlsx')
        if os.path.exists(template_path):
            with open(template_path, 'rb') as f:
                content = f.read()
            response = HttpResponse(
                content,
                content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            )
            response['Content-Disposition'] = 'attachment; filename="Mau_Ca_Truc_Bac_Si.xlsx"'
            return response
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Mẫu Ca Trực Bác Sĩ"

        headers = [
            "Email / Mã Bác Sĩ (*)",
            "Họ và Tên Bác Sĩ (Ghi chú)",
            "Tên Bệnh Viện / Cơ Sở Y Tế",
            "Ngày Trực (YYYY-MM-DD hoặc DD/MM/YYYY) (*)",
            "Giờ Bắt Đầu (HH:MM) (*)",
            "Giờ Kết Thúc (HH:MM) (*)",
            "Số Lượng Bệnh Nhân Tối Đa"
        ]
        ws.append(headers)

        # Style header
        header_fill = PatternFill(start_color="0068FF", end_color="0068FF", fill_type="solid")
        header_font = Font(name="Arial", size=11, bold=True, color="FFFFFF")
        center_align = Alignment(horizontal="center", vertical="center", wrap_text=True)

        for col_idx in range(1, len(headers) + 1):
            cell = ws.cell(row=1, column=col_idx)
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = center_align

        # Sample rows with real doctors in DB
        sample_rows = [
            ["anhle081004@gmail.com", "BS. Sarah Jenkins", "Bệnh viện Đa khoa Quốc tế MedTech Sài Gòn", "2026-11-20", "08:00", "09:30", 3],
            ["anhle081004@gmail.com", "BS. Sarah Jenkins", "Bệnh viện Đa khoa Quốc tế MedTech Sài Gòn", "2026-11-20", "10:00", "11:30", 3],
            ["bs.ngoc.tieuhoa@medtech.vn", "BS. Trần Bảo Ngọc", "Bệnh viện Chợ Rẫy", "2026-11-21", "13:30", "15:00", 4],
            ["bs.khai.mat@medtech.vn", "BS. Phạm Quang Khải", "Bệnh viện Đại học Y Dược TP.HCM (Cơ sở 1)", "2026-11-21", "08:30", "10:00", 3],
        ]

        for r in sample_rows:
            ws.append(r)

        ws.column_dimensions['A'].width = 28
        ws.column_dimensions['B'].width = 24
        ws.column_dimensions['C'].width = 38
        ws.column_dimensions['D'].width = 22
        ws.column_dimensions['E'].width = 16
        ws.column_dimensions['F'].width = 16
        ws.column_dimensions['G'].width = 18

        output = io.BytesIO()
        wb.save(output)
        output.seek(0)

        response = HttpResponse(
            output.getvalue(),
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
        response['Content-Disposition'] = 'attachment; filename="Mau_Ca_Truc_Bac_Si.xlsx"'
        return response


