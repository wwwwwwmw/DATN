from django.urls import path
from . import views

app_name = 'chat'

urlpatterns = [
    path('', views.ChatView.as_view(), name='chat'),
    path('sessions/', views.ChatSessionListView.as_view(), name='session_list'),
    path('sessions/<int:pk>/', views.ChatSessionDetailView.as_view(), name='session_detail'),
]
