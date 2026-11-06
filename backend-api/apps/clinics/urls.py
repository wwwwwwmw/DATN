from django.urls import path
from . import views

app_name = 'clinics'

urlpatterns = [
    path('', views.ClinicListView.as_view(), name='list'),
    path('nearby/', views.NearbyClinicView.as_view(), name='nearby'),
    path('create/', views.ClinicCreateView.as_view(), name='create'),
    path('<int:pk>/', views.ClinicDetailView.as_view(), name='detail'),
    path('<int:pk>/update/', views.ClinicUpdateView.as_view(), name='update'),
]
