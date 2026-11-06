"""
X-ray Views — Upload + Proxy to AI Vision service.
"""
import httpx
import logging
from django.conf import settings
from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser

from apps.medical_records.models import XrayAnalysisResult
from apps.medical_records.serializers import XrayAnalysisResultSerializer
from apps.accounts.permissions import IsDoctor

logger = logging.getLogger(__name__)

# Tên bệnh lý tiếng Việt
DISEASE_NAME_VI = {
    'Atelectasis': 'Xẹp phổi',
    'Cardiomegaly': 'Tim to',
    'Consolidation': 'Đông đặc phổi',
    'Edema': 'Phù phổi',
    'Pleural Effusion': 'Tràn dịch màng phổi',
    'Pneumonia': 'Viêm phổi',
    'Pneumothorax': 'Tràn khí màng phổi',
    'No Finding': 'Không phát hiện bất thường',
}


class XrayAnalyzeView(APIView):
    """
    POST /api/xray/analyze/
    Upload ảnh X-quang → proxy đến AI Vision service → lưu kết quả.
    """
    parser_classes = [MultiPartParser]

    def post(self, request):
        image = request.FILES.get('image')
        if not image:
            return Response({
                'status': 'error',
                'message': 'Vui lòng upload ảnh X-quang.'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Validate file type
        allowed_types = ['image/jpeg', 'image/png', 'image/dicom']
        if image.content_type not in allowed_types:
            return Response({
                'status': 'error',
                'message': f'Định dạng file không hỗ trợ. Chấp nhận: {", ".join(allowed_types)}'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Create initial result record (save original image)
        result = XrayAnalysisResult.objects.create(
            patient=request.user,
            original_image=image,
        )

        # Proxy to AI Vision service
        try:
            ai_vision_url = f"{settings.AI_VISION_URL}/api/predict"

            with httpx.Client(timeout=30.0) as client:
                response = client.post(
                    ai_vision_url,
                    files={'image': (image.name, result.original_image.open('rb'), image.content_type)}
                )

            if response.status_code == 200:
                ai_data = response.json()
                result.predictions = ai_data.get('predictions', {})

                # Save heatmap if provided
                heatmap_url = ai_data.get('heatmap_url')
                if heatmap_url:
                    result.heatmap_image = heatmap_url

                result.save()
            else:
                logger.error(f"AI Vision returned status {response.status_code}")
                # Return with empty predictions (AI service unavailable)
                result.predictions = {'error': 'AI service temporarily unavailable'}
                result.save()

        except httpx.RequestError as e:
            logger.error(f"AI Vision connection error: {e}")
            result.predictions = {'error': 'Cannot connect to AI service'}
            result.save()

        # Format response with Vietnamese names
        top_findings = []
        for name, prob in sorted(result.predictions.items(), key=lambda x: x[1] if isinstance(x[1], (int, float)) else 0, reverse=True):
            if isinstance(prob, (int, float)):
                severity = 'high' if prob > 0.7 else 'moderate' if prob > 0.4 else 'low'
                top_findings.append({
                    'name': name,
                    'name_vi': DISEASE_NAME_VI.get(name, name),
                    'probability': round(prob, 4),
                    'severity': severity,
                })

        return Response({
            'status': 'success',
            'data': {
                'id': result.id,
                'predictions': result.predictions,
                'top_findings': top_findings[:5],
                'original_image': request.build_absolute_uri(result.original_image.url) if result.original_image else None,
                'heatmap_image': request.build_absolute_uri(result.heatmap_image.url) if result.heatmap_image else None,
                'disclaimer': '⚠️ Kết quả chỉ mang tính tham khảo, không thay thế chẩn đoán của bác sĩ.'
            }
        })


class XrayResultListView(generics.ListAPIView):
    """GET /api/xray/results/ — Lịch sử kết quả X-ray."""
    serializer_class = XrayAnalysisResultSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == 'PATIENT':
            return XrayAnalysisResult.objects.filter(patient=user)
        elif user.role == 'DOCTOR':
            return XrayAnalysisResult.objects.all()
        return XrayAnalysisResult.objects.all()


class XrayResultDetailView(generics.RetrieveAPIView):
    """GET /api/xray/results/<id>/ — Chi tiết kết quả."""
    serializer_class = XrayAnalysisResultSerializer
    queryset = XrayAnalysisResult.objects.all()


class XrayReviewView(APIView):
    """PATCH /api/xray/results/<id>/review/ — Bác sĩ review."""
    permission_classes = [IsDoctor]

    def patch(self, request, pk):
        try:
            result = XrayAnalysisResult.objects.get(pk=pk)
        except XrayAnalysisResult.DoesNotExist:
            return Response({'status': 'error', 'message': 'Không tìm thấy.'}, status=404)

        result.doctor_review = request.data.get('doctor_review', '')
        result.doctor_agrees_with_ai = request.data.get('doctor_agrees_with_ai')
        result.reviewed_by = request.user.doctor_profile
        result.save()

        return Response({
            'status': 'success',
            'data': XrayAnalysisResultSerializer(result).data,
            'message': 'Đã lưu nhận xét của bác sĩ.'
        })
