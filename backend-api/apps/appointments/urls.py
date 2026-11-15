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

    # Admin TimeSlots Management
    path('time-slots/', views.AdminTimeSlotListView.as_view(), name='time_slot_list'),
    path('time-slots/create/', views.AdminTimeSlotCreateView.as_view(), name='time_slot_create'),
    path('time-slots/<int:pk>/update/', views.AdminTimeSlotUpdateView.as_view(), name='time_slot_update'),
    path('time-slots/<int:pk>/delete/', views.AdminTimeSlotDeleteView.as_view(), name='time_slot_delete'),
    path('time-slots/bulk-month/', views.AdminTimeSlotBulkMonthView.as_view(), name='time_slot_bulk_month'),
    path('time-slots/import-excel/', views.AdminTimeSlotImportExcelView.as_view(), name='time_slot_import_excel'),
    path('time-slots/export-template/', views.AdminTimeSlotExportTemplateView.as_view(), name='time_slot_export_template'),
]
