# ⚙️ Backend API — Hướng dẫn Chạy

## Yêu cầu
- Python 3.11+ ✅
- PostgreSQL 17 + PostGIS ✅
- Redis (cho WebSocket channels)
- GDAL library (cho GeoDjango)

## Cài đặt GDAL (Windows)

GeoDjango cần GDAL system library:

### Cách 1: OSGeo4W (khuyến nghị)
1. Tải OSGeo4W: https://trac.osgeo.org/osgeo4w/
2. Cài đặt → chọn GDAL
3. Thêm vào PATH: `C:\OSGeo4W\bin`
4. Thêm biến môi trường: `GDAL_DATA=C:\OSGeo4W\share\gdal`

### Cách 2: Standalone GDAL
1. Tải từ: https://www.gisinternals.com/release.php
2. Chọn phiên bản phù hợp (MSVC 2022, x64)
3. Giải nén và thêm vào PATH

## Quick Start

```cmd
REM 1. Tạo virtual environment
cd backend-api
python -m venv venv
venv\Scripts\activate

REM 2. Cài đặt dependencies
pip install -r requirements.txt

REM 3. Khởi tạo database (nếu chưa chạy)
cd ..\database
setup.bat
cd ..\backend-api

REM 4. Django migrations (sync models ↔ database)
python manage.py makemigrations accounts clinics appointments medical_records notifications
python manage.py migrate

REM 5. Tạo superuser (admin)
python manage.py createsuperuser

REM 6. Chạy server
python manage.py runserver 0.0.0.0:8000
```

## Chạy với WebSocket (Daphne)

```cmd
REM Cần Redis chạy trước
docker run -d --name medtech-redis -p 6379:6379 redis:7-alpine

REM Chạy ASGI server (hỗ trợ cả HTTP + WebSocket)
daphne -b 0.0.0.0 -p 8000 config.asgi:application
```

## Test APIs

### Đăng ký
```cmd
curl -X POST http://localhost:8000/api/auth/register/ ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"test@test.com\",\"username\":\"testuser\",\"password\":\"TestPass123!\",\"password_confirm\":\"TestPass123!\",\"role\":\"PATIENT\",\"first_name\":\"Test\",\"last_name\":\"User\"}"
```

### Đăng nhập
```cmd
curl -X POST http://localhost:8000/api/auth/login/ ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"test@test.com\",\"password\":\"TestPass123!\"}"
```

### Tìm phòng khám lân cận
```cmd
curl http://localhost:8000/api/clinics/nearby/?lat=10.7735^&lng=106.6985^&radius=5000
```

### Optimal slots (SA)
```cmd
curl -H "Authorization: Bearer YOUR_TOKEN" ^
  "http://localhost:8000/api/appointments/optimal-slots/?clinic_id=1&date=2026-09-15"
```

### Health check
```cmd
curl http://localhost:8000/api/health/
```

## Admin Panel
```
http://localhost:8000/admin/
```

## Endpoints tổng quan

| Method | URL | Mô tả |
|--------|-----|-------|
| POST | /api/auth/register/ | Đăng ký |
| POST | /api/auth/login/ | Đăng nhập |
| POST | /api/auth/token/refresh/ | Refresh JWT |
| GET | /api/auth/profile/ | Xem profile |
| GET | /api/clinics/ | Danh sách phòng khám |
| GET | /api/clinics/nearby/ | Tìm phòng khám lân cận |
| GET | /api/appointments/optimal-slots/ | SA optimal slots |
| POST | /api/appointments/create/ | Đặt lịch hẹn |
| GET | /api/appointments/ | Danh sách lịch hẹn |
| POST | /api/xray/analyze/ | Upload + phân tích X-quang |
| POST | /api/chat/ | Chat sơ vấn RAG |
| GET | /api/notifications/ | Thông báo |
| GET | /api/health/ | Health check |
