"""
Clinics Serializers.
"""
from rest_framework import serializers
from .models import Clinic


class ClinicSerializer(serializers.ModelSerializer):
    """Serializer cho Clinic."""
    latitude = serializers.FloatField(read_only=True)
    longitude = serializers.FloatField(read_only=True)
    distance_km = serializers.FloatField(read_only=True, required=False, default=None)

    class Meta:
        model = Clinic
        fields = [
            'id', 'name', 'address', 'latitude', 'longitude',
            'phone', 'email', 'opening_hours', 'specializations',
            'rating', 'is_active', 'image', 'distance_km',
            'created_at', 'updated_at'
        ]


class ClinicCreateSerializer(serializers.ModelSerializer):
    """Serializer cho tạo/cập nhật Clinic (Admin)."""
    latitude = serializers.FloatField(write_only=True)
    longitude = serializers.FloatField(write_only=True)

    class Meta:
        model = Clinic
        fields = [
            'id', 'name', 'address', 'latitude', 'longitude',
            'phone', 'email', 'opening_hours', 'specializations',
            'rating', 'is_active', 'image'
        ]

    def create(self, validated_data):
        from django.contrib.gis.geos import Point
        lat = validated_data.pop('latitude')
        lng = validated_data.pop('longitude')
        validated_data['location'] = Point(lng, lat, srid=4326)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        from django.contrib.gis.geos import Point
        lat = validated_data.pop('latitude', None)
        lng = validated_data.pop('longitude', None)
        if lat is not None and lng is not None:
            validated_data['location'] = Point(lng, lat, srid=4326)
        return super().update(instance, validated_data)
