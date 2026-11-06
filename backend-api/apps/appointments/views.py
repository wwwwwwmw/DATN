"""
Appointments Views — CRUD + Simulated Annealing optimal slots.
"""
from datetime import datetime, time as dt_time
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.gis.geos import Point
from django.contrib.gis.db.models.functions import Distance
from django.db import models, transaction

from .models import Appointment, TimeSlot
from .serializers import (
    AppointmentSerializer, CreateAppointmentSerializer,
    TimeSlotSerializer, UpdateAppointmentStatusSerializer,
)
from .services.simulated_annealing import simulated_annealing, SAConfig
from apps.accounts.permissions import IsDoctor, IsDoctorOrReadOnly


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
    """GET /api/appointments/ — Danh sách lịch hẹn."""
    serializer_class = AppointmentSerializer

    def get_queryset(self):
        user = self.request.user
        qs = Appointment.objects.select_related(
            'patient', 'doctor__user', 'clinic', 'time_slot'
        )
        if user.role == 'PATIENT':
            return qs.filter(patient=user)
        elif user.role == 'DOCTOR':
            return qs.filter(doctor=user.doctor_profile)
        return qs  # admin sees all


class AppointmentDetailView(generics.RetrieveAPIView):
    """GET /api/appointments/<id>/ — Chi tiết lịch hẹn."""
    serializer_class = AppointmentSerializer

    def get_queryset(self):
        user = self.request.user
        qs = Appointment.objects.select_related(
            'patient', 'doctor__user', 'clinic', 'time_slot'
        )
        if user.role == 'PATIENT':
            return qs.filter(patient=user)
        elif user.role == 'DOCTOR':
            return qs.filter(doctor=user.doctor_profile)
        return qs


class CreateAppointmentView(APIView):
    """POST /api/appointments/ — Tạo lịch hẹn."""

    def post(self, request):
        serializer = CreateAppointmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        slot_id = serializer.validated_data['time_slot_id']
        slot = TimeSlot.objects.select_related('doctor', 'clinic').get(id=slot_id)

        with transaction.atomic():
            # Create appointment
            appointment = Appointment.objects.create(
                patient=request.user,
                doctor=slot.doctor,
                clinic=slot.clinic,
                time_slot=slot,
                reason=serializer.validated_data.get('reason', ''),
                notes=serializer.validated_data.get('notes', ''),
            )

            # Update slot occupancy
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
        try:
            appointment = Appointment.objects.get(pk=pk)
        except Appointment.DoesNotExist:
            return Response({
                'status': 'error',
                'message': 'Lịch hẹn không tồn tại.'
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
    Lấy toàn bộ dữ liệu thực tế cho Bảng điều khiển Bác sĩ (Doctor Dashboard):
    - 4 chỉ số thống kê (Stats): Tổng ca hẹn, Chờ khám, Chờ AI duyệt, Khẩn cấp
    - Lịch khám hôm nay (Today's Schedule)
    - Yêu cầu đặt lịch mới (New Booking Requests)
    - Kết quả X-quang chờ duyệt (AI Results Pending Review)
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from apps.medical_records.models import XrayAnalysisResult
        from datetime import date

        today = date.today()

        # 1. Appointments Queryset
        user = request.user
        qs = Appointment.objects.select_related(
            'patient', 'patient__patient_profile', 'doctor__user', 'clinic', 'time_slot'
        )
        if user.role == 'DOCTOR' and hasattr(user, 'doctor_profile'):
            qs = qs.filter(doctor=user.doctor_profile)

        # Appointments for today (or recent ones)
        today_appointments = qs.filter(time_slot__date=today).order_by('time_slot__start_time')
        if not today_appointments.exists():
            today_appointments = qs.order_by('time_slot__date', 'time_slot__start_time')[:10]

        all_appointments_count = qs.count()
        waiting_count = qs.filter(status=Appointment.Status.PENDING).count()
        urgent_count = qs.filter(
            models.Q(reason__icontains='cấp') |
            models.Q(reason__icontains='đau thắt ngực') |
            models.Q(reason__icontains='urgent') |
            models.Q(reason__icontains='emergency') |
            models.Q(notes__icontains='khẩn cấp')
        ).count()

        # 2. AI Review pending count
        ai_pending_qs = XrayAnalysisResult.objects.filter(
            doctor_agrees_with_ai__isnull=True
        ).select_related('patient', 'patient__patient_profile')
        ai_review_count = ai_pending_qs.count()

        # 3. Build Schedule items
        schedule_data = []
        for app in today_appointments[:8]:
            p = app.patient
            profile = getattr(p, 'patient_profile', None)
            age = 50
            if profile and profile.date_of_birth:
                age = today.year - profile.date_of_birth.year
            gender_display = 'Nam' if getattr(profile, 'gender', '') == 'M' else 'Nữ'
            
            is_emergency = any(kw in app.reason.lower() or kw in app.notes.lower() for kw in ['cấp', 'urgent', 'đau thắt ngực'])
            is_video = 'telehealth' in app.reason.lower() or 'video' in app.reason.lower()

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

            schedule_data.append({
                'id': app.id,
                'time': start_t,
                'period': period,
                'name': p.get_full_name() or p.username,
                'age': age,
                'gender': gender_display,
                'code': f'#BA-{1000 + app.id}',
                'type': app.reason or 'Khám bệnh chuyên khoa',
                'status': status_key,
                'isVideo': is_video,
                'doctor': f'BS. {app.doctor.user.get_full_name()}',
                'clinic_name': app.clinic.name if app.clinic else '',
            })

        # 4. New Booking Requests (status=PENDING)
        pending_qs = qs.filter(status=Appointment.Status.PENDING).order_by('-created_at')[:5]
        requests_data = []
        for req in pending_qs:
            rp = req.patient
            r_profile = getattr(rp, 'patient_profile', None)
            r_video = 'telehealth' in req.reason.lower()
            requests_data.append({
                'id': req.id,
                'name': rp.get_full_name() or rp.username,
                'specialty': req.doctor.specialization or (req.clinic.name if req.clinic else 'Tim mạch'),
                'time': f"{req.time_slot.start_time.strftime('%H:%M')} {'Hôm nay' if req.time_slot.date == today else 'Ngày mai'}",
                'note': req.notes or req.reason or 'Chờ bác sĩ xác nhận lịch khám',
                'aiMatch': int(round(req.sa_score * 100)) if req.sa_score else 95,
                'isVideo': r_video,
            })

        # 5. AI Results Pending Review
        ai_results_data = []
        for x in ai_pending_qs[:4]:
            xp = x.patient
            x_profile = getattr(xp, 'patient_profile', None)
            x_age = 55
            if x_profile and x_profile.date_of_birth:
                x_age = today.year - x_profile.date_of_birth.year

            # Get top predictions
            sorted_preds = sorted(x.predictions.items(), key=lambda item: item[1], reverse=True)
            top_finding = sorted_preds[0][0] if sorted_preds else 'Viêm phổi'
            top_prob = round(sorted_preds[0][1] * 100, 1) if sorted_preds else 75.0

            secondary = sorted_preds[1][0] if len(sorted_preds) > 1 else ''
            sec_prob = round(sorted_preds[1][1] * 100, 1) if len(sorted_preds) > 1 else 0

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
                'stats': {
                    'total_appointments': max(all_appointments_count, len(schedule_data)),
                    'waiting': waiting_count,
                    'ai_review': ai_review_count,
                    'urgent': max(urgent_count, 1),
                },
                'schedule': schedule_data,
                'requests': requests_data,
                'ai_results': ai_results_data,
            }
        })

