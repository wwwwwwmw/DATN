"""
JWT Authentication Middleware for Django Channels WebSocket.
"""
from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import AccessToken
from apps.accounts.models import CustomUser


@database_sync_to_async
def get_user(token_key):
    """Lấy user từ JWT token."""
    try:
        access_token = AccessToken(token_key)
        user_id = access_token['user_id']
        return CustomUser.objects.get(id=user_id)
    except Exception:
        return AnonymousUser()


class JWTAuthMiddleware(BaseMiddleware):
    """
    Middleware xác thực JWT cho WebSocket connections.
    Token được truyền qua query string: ws://host/ws/path/?token=xxx
    """

    async def __call__(self, scope, receive, send):
        # Parse token from query string
        query_string = scope.get('query_string', b'').decode('utf-8')
        query_params = dict(
            param.split('=', 1) for param in query_string.split('&') if '=' in param
        )
        token = query_params.get('token', '')

        if token:
            scope['user'] = await get_user(token)
        else:
            scope['user'] = AnonymousUser()

        return await super().__call__(scope, receive, send)
