"""
Clinics Serializers.
"""
from rest_framework import serializers
from .models import Clinic


class ClinicSerializer(serializers.ModelSerializer):
    """Serializer cho Clinic."""
    latitude = serializers.FloatField(read_only=True)
    longitude = serializers.FloatField(read_only=True)
    distance_km = serializers.SerializerMethodField()

    def get_distance_km(self, obj):
        dist = getattr(obj, 'distance', None)
        if dist is not None and hasattr(dist, 'km'):
            return round(dist.km, 2)
        return None

    class Meta:
        model = Clinic
        fields = [
            'id', 'name', 'address', 'latitude', 'longitude',
            'phone', 'email', 'opening_hours', 'specializations',
            'rating', 'is_active', 'is_open', 'image', 'distance_km',
            'created_at', 'updated_at'
        ]


class ClinicCreateSerializer(serializers.ModelSerializer):
    """Serializer cho tạo/cập nhật Clinic (Admin)."""
    latitude = serializers.FloatField(required=False)
    longitude = serializers.FloatField(required=False)

    class Meta:
        model = Clinic
        fields = [
            'id', 'name', 'address', 'latitude', 'longitude',
            'phone', 'email', 'opening_hours', 'specializations',
            'rating', 'is_active', 'is_open', 'image'
        ]

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        ret['latitude'] = instance.latitude
        ret['longitude'] = instance.longitude
        return ret

    def create(self, validated_data):
        from django.contrib.gis.geos import Point
        lat = validated_data.pop('latitude', 10.7732)
        lng = validated_data.pop('longitude', 106.6983)
        validated_data['location'] = Point(float(lng), float(lat), srid=4326)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        from django.contrib.gis.geos import Point
        lat = validated_data.pop('latitude', None)
        lng = validated_data.pop('longitude', None)
        if lat is not None and lng is not None:
            validated_data['location'] = Point(float(lng), float(lat), srid=4326)
        elif lat is not None:
            cur_lng = instance.longitude if instance.longitude is not None else 106.6983
            validated_data['location'] = Point(float(cur_lng), float(lat), srid=4326)
        elif lng is not None:
            cur_lat = instance.latitude if instance.latitude is not None else 10.7732
            validated_data['location'] = Point(float(lng), float(cur_lat), srid=4326)
        return super().update(instance, validated_data)
