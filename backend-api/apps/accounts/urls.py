"""
Accounts URL Configuration.
"""
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

app_name = 'accounts'

urlpatterns = [
    # Authentication & Password Recovery
    path('register/', views.RegisterView.as_view(), name='register'),
    path('login/', views.LoginView.as_view(), name='login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('change-password/', views.ChangePasswordView.as_view(), name='change_password'),
    path('forgot-password/', views.ForgotPasswordView.as_view(), name='forgot_password'),

    # Profile & Email OTP Verification
    path('profile/', views.ProfileView.as_view(), name='profile'),
    path('otp/send/', views.SendProfileOTPView.as_view(), name='otp_send'),
    path('otp/verify/', views.VerifyProfileOTPView.as_view(), name='otp_verify'),

    # Doctors public directory
    path('doctors/', views.DoctorListView.as_view(), name='doctor_list'),
    path('doctors/<int:pk>/', views.DoctorDetailView.as_view(), name='doctor_detail'),

    # Admin User Management & Excel Batch Import
    path('admin/users/', views.AdminUserListView.as_view(), name='admin_user_list'),
    path('admin/users/<int:pk>/', views.AdminUserDetailView.as_view(), name='admin_user_detail'),
    path('admin/import-excel/', views.AdminImportExcelView.as_view(), name='admin_import_excel'),
    path('admin/export-template/', views.AdminExportTemplateView.as_view(), name='admin_export_template'),
]
