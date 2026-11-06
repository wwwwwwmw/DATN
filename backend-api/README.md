# ⚙️ Backend API — Django REST Framework

> **Port:** 8000 | **Framework:** Django 5 + DRF + Django Channels

## Quick Start

```bash
# Tạo virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows

# Cài đặt dependencies
pip install -r requirements/development.txt

# Chạy migrations
python manage.py migrate

# Tạo superuser
python manage.py createsuperuser

# Chạy development server
python manage.py runserver 0.0.0.0:8000
```

## Tài liệu chi tiết

Xem [docs/backend-api/README.md](../docs/backend-api/README.md) cho checklist nghiệp vụ đầy đủ.

## Cấu trúc

```
backend-api/
├── config/              # Project settings
│   ├── settings/        # base.py, development.py, production.py
│   ├── urls.py
│   ├── asgi.py          # ASGI (Django Channels)
│   └── wsgi.py
├── apps/
│   ├── accounts/        # User & Authentication
│   ├── appointments/    # Lịch hẹn & Simulated Annealing
│   ├── clinics/         # Phòng khám & GIS (PostGIS)
│   ├── medical_records/ # Hồ sơ y tế
│   ├── xray/            # Proxy → AI-Vision service
│   ├── chat/            # Proxy → LLM-RAG service
│   └── notifications/   # Thông báo
├── channels_app/        # WebSocket consumers
└── utils/               # Shared utilities
```

## Biến môi trường

```env
DATABASE_URL=postgis://medtech_user:password@localhost:5432/medtech_db
REDIS_URL=redis://localhost:6379/0
AI_VISION_URL=http://localhost:8001
LLM_RAG_URL=http://localhost:8002
SECRET_KEY=your-django-secret-key
DEBUG=True
```
# DATN_BACKEND_API
