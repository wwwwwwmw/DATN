# 📡 API Specification — RESTful API Endpoints

> **Base URL:** `http://localhost:8000/api`  
> **Authentication:** JWT Bearer Token  
> **Content-Type:** `application/json` (trừ upload file: `multipart/form-data`)

---

## 📋 Mục lục

1. [Authentication](#1-authentication)
2. [Users](#2-users)
3. [Clinics](#3-clinics--gis)
4. [Appointments](#4-appointments--scheduling)
5. [X-ray Analysis](#5-x-ray-analysis)
6. [Chat (RAG)](#6-chat-rag)
7. [Notifications](#7-notifications)
8. [Admin](#8-admin)

---

## Response Format chuẩn

### Success Response
```json
{
    "status": "success",
    "data": { ... },
    "message": "Operation completed successfully"
}
```

### Error Response
```json
{
    "status": "error",
    "code": "VALIDATION_ERROR",
    "message": "Mô tả lỗi chi tiết",
    "errors": {
        "email": ["Email đã tồn tại"],
        "password": ["Mật khẩu phải có ít nhất 8 ký tự"]
    }
}
```

### Pagination Response
```json
{
    "status": "success",
    "data": {
        "results": [ ... ],
        "count": 100,
        "next": "http://localhost:8000/api/resource/?page=3",
        "previous": "http://localhost:8000/api/resource/?page=1"
    }
}
```

---

## 1. Authentication

### POST `/auth/register/`
Đăng ký tài khoản mới.

**Request:**
```json
{
    "email": "patient@example.com",
    "username": "nguyenvana",
    "password": "SecurePass123!",
    "password_confirm": "SecurePass123!",
    "role": "PATIENT",
    "first_name": "Nguyễn",
    "last_name": "Văn A",
    "phone": "0901234567"
}
```

**Response (201):**
```json
{
    "status": "success",
    "data": {
        "id": 1,
        "email": "patient@example.com",
        "username": "nguyenvana",
        "role": "PATIENT",
        "first_name": "Nguyễn",
        "last_name": "Văn A"
    },
    "message": "Đăng ký thành công"
}
```

**Errors:** `400` — Email đã tồn tại, mật khẩu không khớp, validation errors

---

### POST `/auth/login/`
Đăng nhập, nhận JWT tokens.

**Request:**
```json
{
    "email": "patient@example.com",
    "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
    "status": "success",
    "data": {
        "access": "eyJhbGciOiJIUzI1NiIs...",
        "refresh": "eyJhbGciOiJIUzI1NiIs...",
        "user": {
            "id": 1,
            "email": "patient@example.com",
            "role": "PATIENT",
            "first_name": "Nguyễn",
            "last_name": "Văn A"
        }
    }
}
```

**Errors:** `401` — Sai email/mật khẩu, tài khoản bị khóa

---

### POST `/auth/token/refresh/`
Refresh JWT access token.

**Request:**
```json
{
    "refresh": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response (200):**
```json
{
    "access": "eyJhbGciOiJIUzI1NiIs..."
}
```

---

### POST `/auth/forgot-password/`

**Request:**
```json
{
    "email": "patient@example.com"
}
```

**Response (200):**
```json
{
    "message": "Email reset mật khẩu đã được gửi"
}
```

---

### POST `/auth/reset-password/`

**Request:**
```json
{
    "token": "reset-token-from-email",
    "new_password": "NewSecurePass456!",
    "new_password_confirm": "NewSecurePass456!"
}
```

---

## 2. Users

### GET `/users/me/` 🔒
Lấy thông tin user hiện tại.

**Headers:** `Authorization: Bearer <access_token>`

**Response (200):**
```json
{
    "status": "success",
    "data": {
        "id": 1,
        "email": "patient@example.com",
        "username": "nguyenvana",
        "role": "PATIENT",
        "first_name": "Nguyễn",
        "last_name": "Văn A",
        "phone": "0901234567",
        "avatar": "/media/avatars/user_1.jpg",
        "is_verified": true,
        "profile": {
            "date_of_birth": "1990-05-15",
            "gender": "male",
            "blood_type": "O+",
            "address": "123 Nguyễn Huệ, Q.1, TP.HCM",
            "emergency_contact": "0909876543",
            "medical_history": "Không có tiền sử bệnh nền"
        }
    }
}
```

### PUT `/users/me/` 🔒
Cập nhật thông tin user.

### PATCH `/users/me/avatar/` 🔒
Upload avatar. **Content-Type:** `multipart/form-data`

---

## 3. Clinics & GIS

### GET `/clinics/`
Danh sách tất cả phòng khám.

**Query Params:**
- `search` — Tìm theo tên
- `specialization` — Lọc theo chuyên khoa
- `rating_min` — Rating tối thiểu
- `page` — Trang (pagination)

---

### GET `/clinics/nearby/`
Tìm phòng khám lân cận (PostGIS).

**Query Params (required):**
- `lat` — Latitude bệnh nhân (vd: `10.7735`)
- `lng` — Longitude bệnh nhân (vd: `106.6985`)
- `radius` — Bán kính tìm kiếm (mét, default: `5000`)

**Response (200):**
```json
{
    "status": "success",
    "data": {
        "results": [
            {
                "id": 1,
                "name": "Bệnh viện Đại học Y Dược TP.HCM",
                "address": "215 Hồng Bàng, Quận 5",
                "latitude": 10.7588,
                "longitude": 106.6583,
                "distance_km": 1.23,
                "phone": "028-3855-4269",
                "rating": 4.5,
                "specializations": ["Đa khoa", "Tim mạch", "Hô hấp"],
                "opening_hours": { ... }
            },
            {
                "id": 2,
                "name": "Bệnh viện Chợ Rẫy",
                "distance_km": 2.15,
                ...
            }
        ],
        "count": 5,
        "search_radius_km": 5
    }
}
```

---

### GET `/clinics/{id}/`
Chi tiết phòng khám.

### GET `/clinics/{id}/doctors/`
Danh sách bác sĩ tại phòng khám.

### POST `/clinics/` 🔒 (Admin)
Tạo phòng khám mới.

### PUT `/clinics/{id}/` 🔒 (Admin)
Cập nhật phòng khám.

---

## 4. Appointments & Scheduling

### GET `/appointments/optimal-slots/` 🔒
Lấy khung giờ tối ưu từ Simulated Annealing.

**Query Params:**
- `clinic_id` (required) — ID phòng khám
- `doctor_id` (optional) — ID bác sĩ (nếu không chọn → tất cả bác sĩ)
- `date` (required) — Ngày khám (YYYY-MM-DD)
- `patient_lat` (optional) — Latitude bệnh nhân (cho SA distance cost)
- `patient_lng` (optional) — Longitude bệnh nhân

**Response (200):**
```json
{
    "status": "success",
    "data": {
        "slots": [
            {
                "id": 42,
                "doctor": {
                    "id": 5,
                    "name": "BS. Trần Văn B",
                    "specialization": "Hô hấp"
                },
                "date": "2026-09-15",
                "start_time": "09:00",
                "end_time": "09:30",
                "sa_score": 0.92,
                "is_recommended": true,
                "reasons": [
                    "Khoảng cách gần nhất (1.2km)",
                    "Ít bệnh nhân trong khung giờ này",
                    "Phù hợp chuyên khoa"
                ]
            },
            {
                "id": 43,
                "sa_score": 0.78,
                "is_recommended": false,
                ...
            }
        ],
        "algorithm": "simulated_annealing",
        "computation_time_ms": 45
    }
}
```

---

### POST `/appointments/` 🔒
Tạo lịch hẹn mới.

**Request:**
```json
{
    "time_slot_id": 42,
    "reason": "Ho kéo dài, đau ngực",
    "notes": "Mong muốn được khám buổi sáng"
}
```

**Response (201):**
```json
{
    "status": "success",
    "data": {
        "id": 100,
        "patient": { "id": 1, "name": "Nguyễn Văn A" },
        "doctor": { "id": 5, "name": "BS. Trần Văn B" },
        "clinic": { "id": 1, "name": "BV ĐH Y Dược" },
        "date": "2026-09-15",
        "start_time": "09:00",
        "end_time": "09:30",
        "status": "PENDING",
        "reason": "Ho kéo dài, đau ngực",
        "sa_score": 0.92
    }
}
```

---

### GET `/appointments/` 🔒
Danh sách lịch hẹn (của user hiện tại).

### GET `/appointments/{id}/` 🔒
Chi tiết lịch hẹn.

### PATCH `/appointments/{id}/status/` 🔒 (Doctor/Admin)
Cập nhật trạng thái.

**Request:**
```json
{
    "status": "CONFIRMED",
    "notes": "Đã xác nhận. Vui lòng đến đúng giờ."
}
```

### DELETE `/appointments/{id}/` 🔒
Hủy lịch hẹn (chỉ trước 24h).

---

## 5. X-ray Analysis

### POST `/xray/analyze/` 🔒
Upload ảnh X-quang → phân tích bởi DenseNet121.

**Content-Type:** `multipart/form-data`

**Request:**
```
image: [binary file - JPEG/PNG/DICOM]
```

**Response (200):**
```json
{
    "status": "success",
    "data": {
        "id": 50,
        "predictions": {
            "Pneumonia": 0.89,
            "Atelectasis": 0.72,
            "Cardiomegaly": 0.15,
            "Consolidation": 0.08,
            "Edema": 0.05,
            "Pleural Effusion": 0.03,
            "Pneumothorax": 0.02,
            "No Finding": 0.11
        },
        "top_findings": [
            {
                "name": "Pneumonia",
                "name_vi": "Viêm phổi",
                "probability": 0.89,
                "severity": "high"
            },
            {
                "name": "Atelectasis",
                "name_vi": "Xẹp phổi",
                "probability": 0.72,
                "severity": "moderate"
            }
        ],
        "heatmaps": {
            "Pneumonia": "/media/xrays/heatmaps/50_pneumonia.jpg",
            "Atelectasis": "/media/xrays/heatmaps/50_atelectasis.jpg"
        },
        "original_image": "/media/xrays/originals/50_original.jpg",
        "model_version": "densenet121_v1.0",
        "processing_time_ms": 245,
        "disclaimer": "Kết quả chỉ mang tính tham khảo, không thay thế chẩn đoán của bác sĩ."
    }
}
```

---

### GET `/xray/results/` 🔒
Lịch sử kết quả phân tích.

### GET `/xray/results/{id}/` 🔒
Chi tiết kết quả.

### PATCH `/xray/results/{id}/review/` 🔒 (Doctor)
Bác sĩ review kết quả AI.

**Request:**
```json
{
    "doctor_review": "Đồng ý với kết quả AI. Cần chụp thêm CT scan.",
    "doctor_agrees_with_ai": true
}
```

---

## 6. Chat (RAG)

### POST `/chat/` 🔒
Gửi triệu chứng, nhận tư vấn y tế từ RAG.

**Request:**
```json
{
    "message": "Tôi bị ho kéo dài 3 ngày, kèm theo sốt nhẹ và đau ngực bên phải",
    "session_id": 10
}
```

**Response (200):**
```json
{
    "status": "success",
    "data": {
        "answer": "Dựa trên các triệu chứng bạn mô tả (ho kéo dài, sốt nhẹ, đau ngực), có thể liên quan đến các tình trạng sau:\n\n1. **Viêm phổi (Pneumonia):** Triệu chứng phổ biến bao gồm ho có đờm, sốt, đau ngực khi hít thở sâu...\n\n2. **Viêm phế quản cấp:** ...\n\n**Khuyến nghị:**\n- Đến cơ sở y tế khám trực tiếp\n- Có thể cần chụp X-quang ngực\n- Nếu khó thở nghiêm trọng, gọi 115 ngay\n\n⚠️ Kết quả này chỉ mang tính tham khảo.",
        "sources": [
            {
                "content": "Viêm phổi là tình trạng nhiễm trùng nhu mô phổi...",
                "source": "Nội khoa cơ bản - Chương 5, trang 120",
                "relevance_score": 0.92
            },
            {
                "content": "Triệu chứng viêm phế quản bao gồm ho, sốt...",
                "source": "Hướng dẫn chẩn đoán BYT 2023",
                "relevance_score": 0.85
            }
        ],
        "suggested_specialties": ["Hô hấp", "Nội tổng quát"],
        "urgency_level": "moderate",
        "session_id": 10,
        "disclaimer": "Kết quả tư vấn chỉ mang tính tham khảo..."
    }
}
```

---

### GET `/chat/sessions/` 🔒
Danh sách phiên chat.

### GET `/chat/sessions/{id}/` 🔒
Lịch sử tin nhắn trong phiên.

### DELETE `/chat/sessions/{id}/` 🔒
Xóa phiên chat.

---

## 7. Notifications

### GET `/notifications/` 🔒
Danh sách thông báo.

**Query Params:**
- `is_read` — `true`/`false` (lọc đã đọc/chưa đọc)
- `type` — `APPOINTMENT`/`XRAY_RESULT`/`CHAT`/`SYSTEM`/`REMINDER`

### PATCH `/notifications/{id}/read/` 🔒
Đánh dấu đã đọc.

### POST `/notifications/read-all/` 🔒
Đánh dấu tất cả đã đọc.

---

## 8. Admin

> 🔒 Tất cả endpoints Admin yêu cầu `role = ADMIN`

### GET `/admin/users/`
Danh sách users (paginated, filterable).

### PATCH `/admin/users/{id}/`
Cập nhật user (khóa/mở khóa, đổi role).

### GET `/admin/statistics/`
Thống kê tổng quan.

**Response (200):**
```json
{
    "status": "success",
    "data": {
        "total_patients": 1250,
        "total_doctors": 45,
        "total_appointments": 3400,
        "appointments_today": 28,
        "xray_analyses_total": 890,
        "ai_agreement_rate": 0.87,
        "top_diseases": [
            {"name": "Pneumonia", "count": 245},
            {"name": "Cardiomegaly", "count": 180},
            {"name": "Atelectasis", "count": 156}
        ],
        "appointments_by_status": {
            "PENDING": 12,
            "CONFIRMED": 15,
            "COMPLETED": 3200,
            "CANCELLED": 150,
            "NO_SHOW": 23
        }
    }
}
```

---

## 🔐 Authentication Notes

| Biểu tượng | Ý nghĩa |
|-------------|---------|
| 🔓 | Public — Không cần token |
| 🔒 | Authenticated — Cần JWT Bearer token |
| 🔒 (Doctor) | Chỉ role DOCTOR |
| 🔒 (Admin) | Chỉ role ADMIN |

### Headers mẫu
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

---

## ⚡ WebSocket Endpoints

### `ws://localhost:8000/ws/videocall/{room_id}/`
WebRTC signaling cho Video Call.

**Messages:**
```json
// Client → Server
{"type": "join_room"}
{"type": "offer", "sdp": "...", "target_user_id": 5}
{"type": "answer", "sdp": "...", "target_user_id": 1}
{"type": "ice_candidate", "candidate": "...", "target_user_id": 5}
{"type": "leave_room"}

// Server → Client
{"type": "user_joined", "user_id": 5, "username": "BS. Trần Văn B"}
{"type": "offer", "sdp": "...", "sender_id": 1}
{"type": "answer", "sdp": "...", "sender_id": 5}
{"type": "ice_candidate", "candidate": "...", "sender_id": 1}
{"type": "user_left", "user_id": 5}
```

### `ws://localhost:8000/ws/chat/`
RAG Chat streaming.

**Messages:**
```json
// Client → Server
{"type": "message", "content": "Tôi bị đau đầu...", "session_id": 10}

// Server → Client (streaming)
{"type": "token", "content": "Dựa"}
{"type": "token", "content": " trên"}
{"type": "token", "content": " triệu"}
{"type": "token", "content": " chứng..."}
{"type": "end", "sources": [...], "disclaimer": "..."}
```

---

## HTTP Status Codes

| Code | Ý nghĩa | Khi nào |
|------|---------|---------|
| 200 | OK | Request thành công |
| 201 | Created | Tạo mới thành công |
| 204 | No Content | Xóa thành công |
| 400 | Bad Request | Validation error, dữ liệu sai |
| 401 | Unauthorized | Token thiếu hoặc hết hạn |
| 403 | Forbidden | Không có quyền (sai role) |
| 404 | Not Found | Resource không tồn tại |
| 409 | Conflict | Trùng lặp (email đã tồn tại) |
| 413 | Payload Too Large | File upload quá lớn |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Lỗi server |
