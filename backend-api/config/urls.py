"""
Django URL Configuration for MedTech API.
"""
from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.views.static import serve

def _home_view(request):
    """Landing page - xac nhan Backend API dang chay."""
    html = """<!DOCTYPE html>
    <html lang="vi">
    <head>
        <meta charset="UTF-8">
        <title>MedTech API</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                min-height: 100vh;
                display: flex; align-items: center; justify-content: center;
                background: #0a0e1a;
                font-family: 'Segoe UI', system-ui, sans-serif;
                color: #e0e6f0;
            }
            .card {
                text-align: center;
                background: rgba(255,255,255,0.04);
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 16px;
                padding: 48px 56px;
                backdrop-filter: blur(12px);
            }
            .pulse {
                display: inline-block;
                width: 12px; height: 12px;
                background: #22c55e;
                border-radius: 50%;
                margin-right: 8px;
                animation: pulse 2s infinite;
            }
            @keyframes pulse {
                0%, 100% { box-shadow: 0 0 0 0 rgba(34,197,94,0.5); }
                50% { box-shadow: 0 0 0 10px rgba(34,197,94,0); }
            }
            h1 { font-size: 28px; margin-bottom: 12px; }
            .status { font-size: 18px; color: #22c55e; margin-bottom: 24px; }
            .info { color: #8892a8; font-size: 14px; line-height: 2; }
            a { color: #60a5fa; text-decoration: none; }
            a:hover { text-decoration: underline; }
        </style>
    </head>
    <body>
        <div class="card">
            <h1>MedTech AI Platform</h1>
            <div class="status"><span class="pulse"></span> Backend API dang hoat dong</div>
            <div class="info">
                Server: 0.0.0.0:8000<br>
                API Docs: <a href="/api/health/">/api/health/</a><br>
                Admin: <a href="/admin/">/admin/</a>
            </div>
        </div>
    </body>
    </html>"""
    from django.http import HttpResponse
    return HttpResponse(html)


urlpatterns = [
    # Landing page
    path('', _home_view, name='home'),

    # Admin
    path('admin/', admin.site.urls),

    # API v1
    path('api/auth/', include('apps.accounts.urls')),
    path('api/clinics/', include('apps.clinics.urls')),
    path('api/appointments/', include('apps.appointments.urls')),
    path('api/medical-records/', include('apps.medical_records.urls')),
    path('api/xray/', include('apps.xray.urls')),
    path('api/chat/', include('apps.chat.urls')),
    path('api/notifications/', include('apps.notifications.urls')),

    # Health check
    path('api/health/', lambda request: __import__('django.http', fromlist=['JsonResponse']).JsonResponse({
        'status': 'ok',
        'service': 'backend-api',
        'version': '1.0.0'
    })),
]

# Serve media files (real patient X-ray images & Grad-CAM heatmaps)
urlpatterns += [
    re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
]
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
