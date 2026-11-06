# 03. PHONG KHAM & TIM KIEM GIS
# (clinics)

## Tong quan
Quan ly phong kham/benh vien voi toa do GPS (PostGIS).
Benh nhan tim phong kham gan nhat tren ban do.

---

## Chuc nang

### 3.1. Tim phong kham gan nhat
- **Actor**: Benh nhan (PATIENT)
- **Input**: Vi tri hien tai (latitude, longitude), ban kinh tim kiem (km)
- **Luong nghiep vu**:
  1. Frontend lay vi tri GPS cua nguoi dung (browser Geolocation API)
  2. Gui request: GET /api/clinics/nearby/?lat=10.78&lng=106.7&radius=5
  3. Backend su dung PostGIS:
     ```sql
     SELECT *, ST_Distance(location, ST_SetSRID(ST_MakePoint(lng, lat), 4326))
     AS distance
     FROM clinics_clinic
     WHERE ST_DWithin(location, ST_SetSRID(ST_MakePoint(lng, lat), 4326), radius_in_meters)
     AND is_active = TRUE
     ORDER BY distance;
     ```
  4. Tra ve danh sach phong kham kem:
     - Khoang cach (m/km)
     - Thong tin: ten, dia chi, SDT, chuyen khoa, rating
     - Danh sach bac si tai phong kham
  5. Frontend hien thi tren ban do (Leaflet/OpenStreetMap)

### 3.2. Xem chi tiet phong kham
- **Actor**: Tat ca nguoi dung
- **Hien thi**:
  - Thong tin co ban: ten, dia chi, SDT, email
  - Gio mo cua (opening_hours - JSON)
  - Cac chuyen khoa (specializations)
  - Danh gia trung binh (rating)
  - Danh sach bac si + lich trong
  - Vi tri tren ban do

### 3.3. Quan ly phong kham (Admin)
- **Actor**: ADMIN
- **Chuc nang**: CRUD phong kham
- **Luu y**: Khi tao phong kham phai nhap toa do (lat, lng)
  - Frontend: chon tren ban do hoac nhap thu cong
  - Backend: chuyen (lat, lng) thanh PostGIS Point(lng, lat)
  - CHU Y: PostGIS dung thu tu (longitude, latitude) KHAC voi Google Maps (lat, lng)

---

## Thuat toan GIS

**ST_DWithin**: Tim cac diem nam trong ban kinh (nhanh, dung index)
**ST_Distance**: Tinh khoang cach giua 2 diem (met hoac do)
**SRID 4326**: He toa do WGS84 (chuan GPS toan cau)

**Uu diem PostGIS so voi tinh bang code**:
- Nhanh hon 100x nho spatial index (GiST index)
- Chinh xac hon (tinh theo mat cau, khong phai mat phang)
- Ho tro nhieu phep toan dia ly phuc tap

---

## Mo hinh du lieu

```
Clinic
  - name, address, phone, email
  - location: PostGIS PointField(srid=4326)  -- (longitude, latitude)
  - opening_hours: JSON  -- {"mon": "08:00-17:00", "tue": "08:00-17:00", ...}
  - specializations: JSON  -- ["Noi khoa", "Tim mach", ...]
  - rating: Decimal(3,2)  -- 0.00 - 5.00
  - is_active: bool
  - image
```

---

## API Endpoints

| Method | URL | Quyen | Mo ta |
|--------|-----|-------|-------|
| GET | /api/clinics/ | Public | Danh sach phong kham |
| GET | /api/clinics/{id}/ | Public | Chi tiet phong kham |
| GET | /api/clinics/nearby/?lat=&lng=&radius= | Public | Tim gan nhat |
| POST | /api/clinics/ | ADMIN | Tao phong kham |
| PATCH | /api/clinics/{id}/ | ADMIN | Cap nhat |
| DELETE | /api/clinics/{id}/ | ADMIN | Xoa |