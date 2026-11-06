"""
VideoCall WebSocket Consumer — WebRTC Signaling.
"""
import json
from channels.generic.websocket import AsyncWebsocketConsumer


class VideoCallConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer cho Video Call (WebRTC signaling).
    Xử lý: join_room, offer, answer, ice_candidate, leave_room.
    """

    async def connect(self):
        self.room_id = self.scope['url_route']['kwargs']['room_id']
        self.room_group_name = f'videocall_{self.room_id}'
        self.user = self.scope.get('user')

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

        # Notify others
        if self.user and self.user.is_authenticated:
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'user_joined',
                    'user_id': self.user.id,
                    'username': self.user.get_full_name(),
                    'channel': self.channel_name,
                }
            )

    async def disconnect(self, close_code):
        # Notify others
        if self.user and self.user.is_authenticated:
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'user_left',
                    'user_id': self.user.id,
                    'username': self.user.get_full_name(),
                }
            )

        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        """Nhận message từ client."""
        data = json.loads(text_data)
        msg_type = data.get('type')

        if msg_type == 'offer':
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'webrtc_offer',
                    'sdp': data.get('sdp'),
                    'sender_id': self.user.id if self.user.is_authenticated else 0,
                    'sender_channel': self.channel_name,
                }
            )
        elif msg_type == 'answer':
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'webrtc_answer',
                    'sdp': data.get('sdp'),
                    'sender_id': self.user.id if self.user.is_authenticated else 0,
                    'sender_channel': self.channel_name,
                }
            )
        elif msg_type == 'ice_candidate':
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'webrtc_ice_candidate',
                    'candidate': data.get('candidate'),
                    'sender_id': self.user.id if self.user.is_authenticated else 0,
                    'sender_channel': self.channel_name,
                }
            )

    # ─── Group message handlers ─────────────────

    async def user_joined(self, event):
        if event['channel'] != self.channel_name:
            await self.send(text_data=json.dumps({
                'type': 'user_joined',
                'user_id': event['user_id'],
                'username': event['username'],
            }))

    async def user_left(self, event):
        await self.send(text_data=json.dumps({
            'type': 'user_left',
            'user_id': event['user_id'],
            'username': event['username'],
        }))

    async def webrtc_offer(self, event):
        if event['sender_channel'] != self.channel_name:
            await self.send(text_data=json.dumps({
                'type': 'offer',
                'sdp': event['sdp'],
                'sender_id': event['sender_id'],
            }))

    async def webrtc_answer(self, event):
        if event['sender_channel'] != self.channel_name:
            await self.send(text_data=json.dumps({
                'type': 'answer',
                'sdp': event['sdp'],
                'sender_id': event['sender_id'],
            }))

    async def webrtc_ice_candidate(self, event):
        if event['sender_channel'] != self.channel_name:
            await self.send(text_data=json.dumps({
                'type': 'ice_candidate',
                'candidate': event['candidate'],
                'sender_id': event['sender_id'],
            }))
