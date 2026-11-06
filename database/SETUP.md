# 🗄️ Database — Hướng dẫn Chạy

## Yêu cầu
- PostgreSQL 17 đã cài đặt và đang chạy ✅
- PostGIS extension (cài qua Stack Builder hoặc tải riêng)
- pgvector extension

## Cài đặt PostGIS & pgvector (nếu chưa có)

### PostGIS
1. Mở **Stack Builder** (đi kèm PostgreSQL installer)
2. Chọn PostgreSQL 17 → Spatial Extensions → PostGIS 3.x
3. Hoặc tải từ: https://postgis.net/windows_downloads/

### pgvector
```cmd
REM Cách 1: Dùng pre-built binary
REM Tải từ: https://github.com/pgvector/pgvector/releases
REM Copy vector.dll vào thư mục lib của PostgreSQL
REM Copy vector.control + vector--*.sql vào thư mục share\extension

REM Cách 2: Build từ source (cần Visual Studio Build Tools)
git clone https://github.com/pgvector/pgvector.git
cd pgvector
nmake /F Makefile.win
nmake /F Makefile.win install
```

## Chạy Setup

### Lần đầu (tạo mới toàn bộ):
```cmd
cd database
setup.bat
```
Script sẽ:
1. Tạo user `medtech_user` (nếu chưa có)
2. Tạo database `medtech_db` (nếu chưa có)
3. Cài extensions: postgis, vector, uuid-ossp
4. Tạo 12 bảng với indexes và constraints
5. Insert dữ liệu mẫu: 8 users, 8 phòng khám, time slots, 10 tài liệu y khoa

### Thêm bảng/dữ liệu mới (migration):
```cmd
cd database
migrate.bat
```
An toàn chạy nhiều lần — chỉ thêm cái mới, không xóa cái cũ.

### Reset toàn bộ (xóa sạch & tạo lại):
```cmd
cd database
reset.bat
```
⚠️ Sẽ xóa toàn bộ dữ liệu!

## Kiểm tra sau khi chạy

```cmd
REM Kết nối vào database
psql -U medtech_user -d medtech_db -h localhost

REM Kiểm tra bảng
\dt

REM Kiểm tra extensions
SELECT extname, extversion FROM pg_extension;

REM Kiểm tra dữ liệu mẫu
SELECT id, email, role FROM accounts_customuser;
SELECT id, name, ST_AsText(location) FROM clinics_clinic;
SELECT COUNT(*) FROM appointments_timeslot;
```

## Thông tin kết nối

| Key | Value |
|-----|-------|
| Host | localhost |
| Port | 5432 |
| Database | medtech_db |
| User | medtech_user |
| Password | medtech_password_2026 |
| Connection String | `postgresql://medtech_user:medtech_password_2026@localhost:5432/medtech_db` |
