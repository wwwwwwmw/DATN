"""
Clinics Views — CRUD + Nearby search (PostGIS).
"""
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.gis.geos import Point
from django.contrib.gis.db.models.functions import Distance
from django.contrib.gis.measure import D

from .models import Clinic
from .serializers import ClinicSerializer, ClinicCreateSerializer
from apps.accounts.permissions import IsAdminUser


class ClinicListView(generics.ListAPIView):
    """GET /api/clinics/ — Danh sách phòng khám (hỗ trợ tính khoảng cách PostGIS nếu truyền lat/lng)."""
    serializer_class = ClinicSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None
    search_fields = ['name', 'address']
    ordering_fields = ['rating', 'name', 'created_at']

    def get_queryset(self):
        include_all = self.request.query_params.get('all', '').lower() in ['true', '1']
        if include_all:
            qs = Clinic.objects.all()
        else:
            qs = Clinic.objects.filter(is_active=True)

        lat = self.request.query_params.get('lat')
        lng = self.request.query_params.get('lng')
        if lat and lng:
            try:
                user_pt = Point(float(lng), float(lat), srid=4326)
                qs = qs.annotate(distance=Distance('location', user_pt)).order_by('distance')
            except (ValueError, TypeError):
                pass
        return qs


class ClinicDetailView(generics.RetrieveAPIView):
    """GET /api/clinics/<id>/ — Chi tiết phòng khám."""
    serializer_class = ClinicSerializer
    permission_classes = [permissions.AllowAny]
    queryset = Clinic.objects.all()


class NearbyClinicView(APIView):
    """
    GET /api/clinics/nearby/?lat=10.77&lng=106.70&radius=5000
    Tìm phòng khám lân cận bằng PostGIS.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        lat = request.query_params.get('lat')
        lng = request.query_params.get('lng')
        radius = int(request.query_params.get('radius', 5000))  # meters

        if not lat or not lng:
            return Response({
                'status': 'error',
                'message': 'Thiếu tham số lat và lng.'
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            lat = float(lat)
            lng = float(lng)
        except (ValueError, TypeError):
            return Response({
                'status': 'error',
                'message': 'lat và lng phải là số.'
            }, status=status.HTTP_400_BAD_REQUEST)

        # PostGIS Point (longitude, latitude)
        patient_location = Point(lng, lat, srid=4326)

        # Query: tìm clinics trong bán kính, sắp xếp theo khoảng cách
        clinics = (
            Clinic.objects
            .filter(is_active=True)
            .filter(location__distance_lte=(patient_location, D(m=radius)))
            .annotate(distance=Distance('location', patient_location))
            .order_by('distance')
        )

        # Serialize with distance
        results = []
        for clinic in clinics:
            data = ClinicSerializer(clinic).data
            data['distance_km'] = round(clinic.distance.km, 2)
            results.append(data)

        return Response({
            'status': 'success',
            'data': {
                'results': results,
                'count': len(results),
                'search_radius_km': radius / 1000
            }
        })


class ClinicCreateView(generics.CreateAPIView):
    """POST /api/clinics/create/ — Tạo phòng khám mới (Admin)."""
    serializer_class = ClinicCreateSerializer
    permission_classes = [permissions.AllowAny]


class ClinicUpdateView(generics.UpdateAPIView):
    """PUT /api/clinics/<id>/update/ — Cập nhật phòng khám (Admin)."""
    serializer_class = ClinicCreateSerializer
    permission_classes = [permissions.AllowAny]
    queryset = Clinic.objects.all()


class ClinicDestroyView(generics.DestroyAPIView):
    """DELETE /api/clinics/<id>/delete/ — Xóa phòng khám (Admin)."""
    permission_classes = [permissions.AllowAny]
    queryset = Clinic.objects.all()

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        name = instance.name
        self.perform_destroy(instance)
        return Response({
            'status': 'success',
            'message': f'Đã xóa cơ sở y tế "{name}" thành công.'
        }, status=status.HTTP_200_OK)


class ClinicToggleOpenView(APIView):
    """POST /api/clinics/<id>/toggle-status/ — Đổi trạng thái Mở cửa / Đóng cửa (Admin)."""
    permission_classes = [permissions.AllowAny]

    def post(self, request, pk):
        try:
            clinic = Clinic.objects.get(pk=pk)
        except Clinic.DoesNotExist:
            return Response({'status': 'error', 'message': 'Không tìm thấy bệnh viện.'}, status=status.HTTP_404_NOT_FOUND)

        # Toggle is_open
        clinic.is_open = not clinic.is_open
        clinic.save(update_fields=['is_open', 'updated_at'])

        status_label = 'Mở cửa' if clinic.is_open else 'Đã đóng cửa'
        return Response({
            'status': 'success',
            'data': ClinicSerializer(clinic).data,
            'is_open': clinic.is_open,
            'message': f'Đã cập nhật trạng thái "{clinic.name}" thành: {status_label}.'
        })

