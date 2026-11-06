from django.urls import path
from . import views

app_name = 'appointments'

urlpatterns = [
    path('dashboard/', views.DoctorDashboardView.as_view(), name='dashboard'),
    path('', views.AppointmentListView.as_view(), name='list'),
    path('create/', views.CreateAppointmentView.as_view(), name='create'),
    path('optimal-slots/', views.OptimalSlotsView.as_view(), name='optimal_slots'),
    path('<int:pk>/', views.AppointmentDetailView.as_view(), name='detail'),
    path('<int:pk>/status/', views.UpdateAppointmentStatusView.as_view(), name='update_status'),
    path('<int:pk>/telehealth-room/', views.TelehealthRoomView.as_view(), name='telehealth_room'),
]
