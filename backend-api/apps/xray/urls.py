from django.urls import path
from . import views

app_name = 'xray'

urlpatterns = [
    path('analyze/', views.XrayAnalyzeView.as_view(), name='analyze'),
    path('results/', views.XrayResultListView.as_view(), name='result_list'),
    path('results/<int:pk>/', views.XrayResultDetailView.as_view(), name='result_detail'),
    path('results/<int:pk>/review/', views.XrayReviewView.as_view(), name='review'),
]
