"""Notifications Views."""
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'title', 'message', 'type', 'is_read', 'related_object_type', 'related_object_id', 'created_at']


class NotificationListView(generics.ListAPIView):
    serializer_class = NotificationSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == 'ADMIN':
            qs = Notification.objects.all()
        else:
            qs = Notification.objects.filter(user=user)
        is_read = self.request.query_params.get('is_read')
        if is_read is not None:
            qs = qs.filter(is_read=is_read.lower() == 'true')
        notif_type = self.request.query_params.get('type')
        if notif_type:
            qs = qs.filter(type=notif_type)
        return qs


class MarkReadView(APIView):
    def patch(self, request, pk):
        try:
            if request.user.role == 'ADMIN':
                notif = Notification.objects.get(pk=pk)
            else:
                notif = Notification.objects.get(pk=pk, user=request.user)
            notif.is_read = True
            notif.save()
            return Response({'status': 'success', 'message': 'Đã đánh dấu đã đọc.'})
        except Notification.DoesNotExist:
            return Response({'status': 'error', 'message': 'Không tìm thấy.'}, status=404)


class MarkAllReadView(APIView):
    def post(self, request):
        if request.user.role == 'ADMIN':
            count = Notification.objects.filter(is_read=False).update(is_read=True)
        else:
            count = Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({'status': 'success', 'message': f'Đã đánh dấu {count} thông báo đã đọc.'})
