"""
Chat Views — Autonomous Medical Consultation Intelligence Engine.
Tự động phân loại triệu chứng, sửa lỗi tên thuốc, phát hiện chuỗi ký tự vô nghĩa, không phụ thuộc Ollama bên ngoài.
"""
import logging
from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.medical_records.models import ChatSession, ChatMessage
from apps.medical_records.serializers import (
    ChatSessionSerializer, ChatSessionListSerializer, ChatMessageSerializer
)
from apps.chat.engine import process_consultation_message

logger = logging.getLogger(__name__)


class ChatView(APIView):
    """
    POST /api/chat/
    Tư vấn y khoa thông minh: tự xử lý triệu chứng, nhận diện thuốc gõ sai,
    phát hiện từ vô nghĩa, gợi ý chuyên khoa và mức độ khẩn cấp.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        message = request.data.get('message', '').strip()
        session_id = request.data.get('session_id')

        if not message:
            return Response({
                'status': 'error',
                'message': 'Vui lòng nhập triệu chứng hoặc câu hỏi y khoa.'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Get or create session
        user = request.user if request.user.is_authenticated else None
        if not user:
            from apps.accounts.models import CustomUser
            user = CustomUser.objects.filter(role='PATIENT').first() or CustomUser.objects.first()

        session = None
        if session_id:
            session = ChatSession.objects.filter(id=session_id).first()
            if session and user and not session.patient:
                session.patient = user
                session.save(update_fields=['patient'])

        if not session:
            session = ChatSession.objects.create(patient=user, title=message[:100])

        # Get prior conversation history for multi-turn context (most recent 10 messages)
        history_qs = ChatMessage.objects.filter(session=session).order_by('-created_at')[:10]
        history = list(reversed(list(history_qs.values('role', 'content'))))

        # Save user message
        ChatMessage.objects.create(session=session, role='user', content=message)

        # Process through autonomous in-house Medical Intelligence Engine with history
        try:
            consult_result = process_consultation_message(message, history=history)
            answer = consult_result.get('answer', 'Xin lỗi, tôi chưa thể trả lời câu hỏi này.')
            sources = consult_result.get('sources', [])
            suggested_specialties = consult_result.get('suggested_specialties', ['Đa khoa'])
            urgency = consult_result.get('urgency_level', 'NORMAL')
        except Exception as e:
            logger.error(f"Consultation engine error: {e}")
            answer = "Dạ, hệ thống đang tiếp nhận thông tin của bạn. Vui lòng mô tả rõ hơn về triệu chứng hoặc tên thuốc bạn cần hỗ trợ nhé!"
            sources = []
            suggested_specialties = ['Đa khoa']
            urgency = 'NORMAL'

        # Save assistant response
        ChatMessage.objects.create(session=session, role='assistant', content=answer)

        # Update session title if first message
        if session.messages.count() <= 2:
            session.title = message[:100]
            session.save()

        return Response({
            'status': 'success',
            'data': {
                'answer': answer,
                'sources': sources,
                'suggested_specialties': suggested_specialties,
                'urgency_level': urgency,
                'session_id': session.id,
                'disclaimer': '⚠️ Kết quả tư vấn chỉ mang tính chất tham khảo, KHÔNG thay thế cho việc khám bệnh trực tiếp.'
            }
        })


class ChatSessionListView(generics.ListAPIView):
    """GET /api/chat/sessions/ — Danh sách phiên chat."""
    serializer_class = ChatSessionListSerializer

    def get_queryset(self):
        return ChatSession.objects.filter(patient=self.request.user)


class ChatSessionDetailView(generics.RetrieveDestroyAPIView):
    """GET/DELETE /api/chat/sessions/<id>/ — Chi tiết/xóa phiên chat."""
    serializer_class = ChatSessionSerializer

    def get_queryset(self):
        return ChatSession.objects.filter(patient=self.request.user)
