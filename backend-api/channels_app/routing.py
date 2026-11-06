"""
WebSocket URL Routing.
"""
from django.urls import re_path
from .consumers import videocall_consumer, chat_consumer

websocket_urlpatterns = [
    re_path(r'ws/videocall/(?P<room_id>\w+)/$', videocall_consumer.VideoCallConsumer.as_asgi()),
    re_path(r'ws/chat/$', chat_consumer.ChatConsumer.as_asgi()),
]
