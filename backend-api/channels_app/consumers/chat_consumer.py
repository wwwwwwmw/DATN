"""
Chat WebSocket Consumer — RAG streaming (placeholder).
"""
import json
from channels.generic.websocket import AsyncWebsocketConsumer


class ChatConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer cho RAG Chat streaming.
    (Placeholder — full streaming sẽ được implement khi LLM-RAG service sẵn sàng)
    """

    async def connect(self):
        self.user = self.scope.get('user')
        if self.user and self.user.is_authenticated:
            await self.accept()
        else:
            await self.close()

    async def disconnect(self, close_code):
        pass

    async def receive(self, text_data):
        data = json.loads(text_data)
        message = data.get('content', '')

        # Placeholder response
        # Khi LLM-RAG service sẵn sàng, sẽ stream từng token
        response = (
            f"Cảm ơn bạn đã chia sẻ triệu chứng. "
            f"Để tư vấn chính xác, vui lòng sử dụng API /api/chat/ "
            f"hoặc đợi hệ thống RAG được kích hoạt."
        )

        # Simulate streaming
        words = response.split()
        for word in words:
            await self.send(text_data=json.dumps({
                'type': 'token',
                'content': word + ' ',
            }))

        await self.send(text_data=json.dumps({
            'type': 'end',
            'sources': [],
            'disclaimer': '⚠️ Kết quả tư vấn chỉ mang tính tham khảo.',
        }))
