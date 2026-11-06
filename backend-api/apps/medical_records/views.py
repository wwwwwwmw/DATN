"""
Medical Records Views.
"""
from rest_framework import generics
from .models import MedicalRecord
from .serializers import MedicalRecordSerializer


class MedicalRecordListView(generics.ListAPIView):
    serializer_class = MedicalRecordSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == 'PATIENT':
            return MedicalRecord.objects.filter(patient=user)
        elif user.role == 'DOCTOR':
            return MedicalRecord.objects.filter(doctor=user.doctor_profile)
        return MedicalRecord.objects.all()


class MedicalRecordDetailView(generics.RetrieveAPIView):
    serializer_class = MedicalRecordSerializer
    queryset = MedicalRecord.objects.all()
