"""
Django base settings — shared across all environments.
"""
import os
from pathlib import Path
from datetime import timedelta

# === GDAL Configuration (Windows) ===
# Using PostGIS-bundled GDAL from PostgreSQL 17 bin
import platform
if platform.system() == 'Windows':
    _PG_BIN = r'C:\Program Files\PostgreSQL\17\bin'
    if _PG_BIN not in os.environ.get('PATH', ''):
        os.environ['PATH'] = _PG_BIN + ';' + os.environ.get('PATH', '')
    if hasattr(os, 'add_dll_directory'):
        os.add_dll_directory(_PG_BIN)
    GDAL_LIBRARY_PATH = os.path.join(_PG_BIN, 'libgdal-35.dll')
    GEOS_LIBRARY_PATH = os.path.join(_PG_BIN, 'libgeos_c.dll')

# ─── Paths ───────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent.parent
PROJECT_DIR = BASE_DIR.parent  # project root

# ─── Security ────────────────────────────────────
SECRET_KEY = os.environ.get(
    'DJANGO_SECRET_KEY',
    'django-insecure-dev-key-change-in-production-medtech-2026'
)
DEBUG = os.environ.get('DJANGO_DEBUG', 'True').lower() in ('true', '1', 'yes')

ALLOWED_HOSTS = os.environ.get(
    'DJANGO_ALLOWED_HOSTS', 'localhost,127.0.0.1,0.0.0.0'
).split(',')

# ─── Application Definition ─────────────────────
INSTALLED_APPS = [
    # Django built-in
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.gis',  # GeoDjango for PostGIS

    # Third-party
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'channels',
    'django_filters',

    # Project apps
    'apps.accounts',
    'apps.clinics',
    'apps.appointments',
    'apps.medical_records',
    'apps.xray',
    'apps.chat',
    'apps.notifications',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'
ASGI_APPLICATION = 'config.asgi.application'

# ─── Database (PostGIS) ─────────────────────────
DATABASES = {
    'default': {
        'ENGINE': 'django.contrib.gis.db.backends.postgis',
        'NAME': os.environ.get('DB_NAME', 'medtech_db'),
        'USER': os.environ.get('DB_USER', 'medtech_user'),
        'PASSWORD': os.environ.get('DB_PASSWORD', 'medtech_password_2026'),
        'HOST': os.environ.get('DB_HOST', 'localhost'),
        'PORT': os.environ.get('DB_PORT', '5432'),
    }
}

# ─── Custom User Model ──────────────────────────
AUTH_USER_MODEL = 'accounts.CustomUser'

# ─── Password Validation ────────────────────────
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
     'OPTIONS': {'min_length': 8}},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# ─── i18n ────────────────────────────────────────
LANGUAGE_CODE = 'vi'
TIME_ZONE = 'Asia/Ho_Chi_Minh'
USE_I18N = True
USE_TZ = True

# ─── Static & Media ─────────────────────────────
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# ─── Default PK ──────────────────────────────────
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ─── REST Framework ──────────────────────────────
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '30/minute',
        'user': '100/minute',
    },
    'EXCEPTION_HANDLER': 'utils.exception_handler.custom_exception_handler',
}

# ─── JWT Settings ────────────────────────────────
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
}

# ─── CORS ────────────────────────────────────────
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOWED_ORIGINS = os.environ.get(
    'CORS_ALLOWED_ORIGINS',
    'http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174'
).split(',')
CORS_ALLOW_CREDENTIALS = True

# ─── Channels (WebSocket) ───────────────────────
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            'hosts': [os.environ.get('REDIS_URL', 'redis://localhost:6379/0')],
        },
    }
}

# ─── Microservice URLs ──────────────────────────
AI_VISION_URL = os.environ.get('AI_VISION_URL', 'http://localhost:8001')
LLM_RAG_URL = os.environ.get('LLM_RAG_URL', 'http://localhost:8002')
OLLAMA_URL = os.environ.get('OLLAMA_URL', 'http://100.85.178.6:11434')
OLLAMA_MODEL = os.environ.get('OLLAMA_MODEL', 'qwen2.5:7b')

# ─── File Upload ─────────────────────────────────
FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10 MB
DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024

# ─── Email Settings (SMTP) ──────────────────────
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = os.environ.get('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', 587))
EMAIL_USE_TLS = os.environ.get('EMAIL_USE_TLS', 'True').lower() in ('true', '1')
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', '1150080125@sv.hcmunre.edu.vn')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', 'jbldcavanjsrbdoe')
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', 'MedTech AI <1150080125@sv.hcmunre.edu.vn>')

