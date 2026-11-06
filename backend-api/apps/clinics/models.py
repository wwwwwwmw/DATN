"""
Clinics Models — PostGIS PointField for GIS queries.
"""
from django.contrib.gis.db import models


class Clinic(models.Model):
    """Phòng khám / Bệnh viện với tọa độ PostGIS."""
    name = models.CharField(max_length=200)
    address = models.TextField()
    location = models.PointField(srid=4326)  # PostGIS Point (lng, lat)
    phone = models.CharField(max_length=15, blank=True, default='')
    email = models.EmailField(blank=True, default='')
    opening_hours = models.JSONField(default=dict)
    specializations = models.JSONField(default=list)
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.00)
    is_active = models.BooleanField(default=True)
    image = models.ImageField(upload_to='clinics/', blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'clinics_clinic'
        ordering = ['-rating']

    def __str__(self):
        return self.name

    @property
    def latitude(self):
        return self.location.y if self.location else None

    @property
    def longitude(self):
        return self.location.x if self.location else None
