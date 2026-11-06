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
    """POST /api/clinics/ — Tạo phòng khám mới (Admin)."""
    serializer_class = ClinicCreateSerializer
    permission_classes = [IsAdminUser]


class ClinicUpdateView(generics.UpdateAPIView):
    """PUT /api/clinics/<id>/ — Cập nhật phòng khám (Admin)."""
    serializer_class = ClinicCreateSerializer
    permission_classes = [IsAdminUser]
    queryset = Clinic.objects.all()
