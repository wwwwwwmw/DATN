"""
Medical Records Serializers.
"""
from rest_framework import serializers
from .models import MedicalRecord, XrayAnalysisResult, ChatSession, ChatMessage
from apps.accounts.serializers import UserSerializer


class MedicalRecordSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.get_full_name', read_only=True)
    doctor_name = serializers.CharField(source='doctor.user.get_full_name', read_only=True)

    class Meta:
        model = MedicalRecord
        fields = '__all__'
        read_only_fields = ['id', 'created_at']


class XrayAnalysisResultSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.get_full_name', read_only=True)
    top_findings = serializers.ListField(read_only=True)
    reviewed_by_name = serializers.CharField(source='reviewed_by.user.get_full_name', read_only=True, default='')

    class Meta:
        model = XrayAnalysisResult
        fields = [
            'id', 'patient', 'patient_name',
            'original_image', 'heatmap_image',
            'predictions', 'top_findings',
            'doctor_review', 'doctor_agrees_with_ai',
            'reviewed_by', 'reviewed_by_name',
            'created_at'
        ]
        read_only_fields = ['id', 'predictions', 'heatmap_image', 'created_at']


class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = ['id', 'role', 'content', 'created_at']
        read_only_fields = ['id', 'created_at']


class ChatSessionSerializer(serializers.ModelSerializer):
    messages = ChatMessageSerializer(many=True, read_only=True)
    message_count = serializers.IntegerField(source='messages.count', read_only=True)

    class Meta:
        model = ChatSession
        fields = ['id', 'title', 'messages', 'message_count', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class ChatSessionListSerializer(serializers.ModelSerializer):
    """Lighter serializer for listing sessions (no messages)."""
    message_count = serializers.IntegerField(source='messages.count', read_only=True)

    class Meta:
        model = ChatSession
        fields = ['id', 'title', 'message_count', 'created_at', 'updated_at']
