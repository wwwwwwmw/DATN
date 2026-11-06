# 🏗️ Kiến trúc Tổng Thể Hệ Thống - Architecture Overview

## 1. Triết lý thiết kế

Hệ thống được thiết kế theo mô hình **Microservice**, trong đó mỗi module hoạt động **độc lập**, giao tiếp qua **REST API nội bộ** hoặc **WebSocket**. Điều này đảm bảo:

- **Khả năng mở rộng (Scalability):** Mỗi service có thể scale riêng biệt.
- **Cách ly lỗi (Fault Isolation):** Lỗi ở AI-Vision không ảnh hưởng tới Backend-API.
- **Triển khai độc lập (Independent Deployment):** Cập nhật model AI không cần redeploy Frontend.
- **Phát triển song song (Parallel Development):** Các nhóm có thể làm việc đồng thời.

---

## 2. Sơ đồ kiến trúc chi tiết

```
                           ┌──────────────────┐
                           │   NGINX Reverse   │
                           │   Proxy (Port 80) │
                           └───┬──────┬────┬───┘
                               │      │    │
              ┌────────────────┘      │    └────────────────┐
              ▼                       ▼                     ▼
  ┌───────────────────┐   ┌──────────────────┐   ┌─────────────────┐
  │  FRONTEND-WEB     │   │  BACKEND-API     │   │  Static Files   │
  │  React + TS       │   │  Django + DRF    │   │  (Media/Assets) │
  │  Vite Dev Server  │   │  Gunicorn + ASGI │   │                 │
  │  Port: 3000       │   │  Port: 8000      │   │                 │
  └───────────────────┘   └────┬───┬───┬─────┘   └─────────────────┘
                               │   │   │
            ┌──────────────────┘   │   └──────────────────┐
            ▼                      ▼                      ▼
  ┌──────────────────┐   ┌──────────────────┐   ┌─────────────────┐
  │  AI-VISION       │   │  LLM-RAG         │   │  Redis          │
  │  FastAPI          │   │  FastAPI          │   │  (Cache/Broker) │
  │  DenseNet121     │   │  LangChain       │   │  Port: 6379     │
  │  Port: 8001      │   │  Port: 8002      │   │                 │
  └────────┬─────────┘   └────────┬─────────┘   └─────────────────┘
           │                      │
           └──────────┬───────────┘
                      ▼
           ┌──────────────────────┐
           │   PostgreSQL 16      │
           │   + PostGIS          │
           │   + pgvector         │
           │   Port: 5432         │
           └──────────────────────┘
```

---

## 3. Luồng dữ liệu chính (Data Flows)

### 3.1. Luồng Sơ vấn Y tế (RAG Chat)

```
Bệnh nhân nhập triệu chứng
        │
        ▼
┌─────────────────┐     WebSocket/REST     ┌─────────────────┐
│   Frontend      │ ─────────────────────> │   Backend-API   │
│   (Chat UI)     │                        │   (Proxy)       │
└─────────────────┘                        └────────┬────────┘
                                                    │ HTTP Internal
                                                    ▼
                                           ┌─────────────────┐
                                           │   LLM-RAG       │
                                           │                 │
                                           │ 1. Embedding    │
                                           │    triệu chứng  │
                                           │ 2. Vector search │
                                           │    (pgvector)   │
                                           │ 3. Ghép context │
                                           │ 4. Gửi LLM     │
                                           │ 5. Trả kết quả  │
                                           └─────────────────┘
```

### 3.2. Luồng Phân tích Ảnh X-quang

```
Bệnh nhân tải ảnh X-quang
        │
        ▼
┌─────────────────┐     Multipart/Form     ┌─────────────────┐
│   Frontend      │ ─────────────────────> │   Backend-API   │
│   (Upload UI)   │                        │   (Validate &   │
└─────────────────┘                        │    Store)       │
                                           └────────┬────────┘
                                                    │ HTTP Internal
                                                    ▼
                                           ┌─────────────────┐
                                           │   AI-Vision     │
                                           │                 │
                                           │ 1. Preprocess   │
                                           │    (Resize,     │
                                           │     Normalize)  │
                                           │ 2. DenseNet121  │
                                           │    Inference    │
                                           │ 3. Multi-label  │
                                           │    prediction   │
                                           │ 4. Grad-CAM     │
                                           │    heatmap      │
                                           └─────────────────┘
```

### 3.3. Luồng Đặt lịch thông minh (Simulated Annealing)

```
Bệnh nhân chọn phòng khám & khung giờ mong muốn
        │
        ▼
┌─────────────────┐                        ┌─────────────────┐
│   Frontend      │ ──── REST API ───────> │   Backend-API   │
│   (Booking UI)  │                        │                 │
└─────────────────┘                        │ 1. Truy vấn     │
                                           │    PostGIS      │
                                           │    (khoảng cách)│
                                           │ 2. Simulated    │
                                           │    Annealing    │
                                           │    (tối ưu slot)│
                                           │ 3. Trả danh sách│
                                           │    khung giờ    │
                                           │    tối ưu       │
                                           └─────────────────┘
```

### 3.4. Luồng Video Call (WebRTC)

```
┌──────────────┐                           ┌──────────────┐
│  Bệnh nhân   │                           │   Bác sĩ     │
│  (Browser)    │                           │  (Browser)   │
└──────┬───────┘                            └──────┬───────┘
       │  WebSocket                                │ WebSocket
       │  (Offer/Answer/ICE)                       │
       ▼                                           ▼
┌──────────────────────────────────────────────────────────┐
│                  Backend-API                             │
│              Django Channels                             │
│           (Signaling Server)                             │
│                                                          │
│   Room Management ◄──► STUN/TURN Config                  │
└──────────────────────────────────────────────────────────┘
       │                                           │
       └──────── Peer-to-Peer Media Stream ────────┘
               (Audio + Video trực tiếp)
```

---

## 4. Bảo mật & Xác thực

```
┌─────────────────────────────────────────────────────────────┐
│                     Security Architecture                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   Frontend ──── JWT Access Token (15 min) ──── Backend      │
│            ──── JWT Refresh Token (7 days) ────              │
│                                                             │
│   Backend  ──── Service-to-Service Token ──── AI-Vision     │
│            ──── Service-to-Service Token ──── LLM-RAG       │
│                                                             │
│   Mã hóa:  HTTPS/TLS cho tất cả giao tiếp bên ngoài       │
│   CORS:     Chỉ cho phép origin từ Frontend domain          │
│   Rate Limit: Giới hạn request/phút theo role              │
│                                                             │
│   Roles: PATIENT | DOCTOR | ADMIN                           │
│   Permissions: RBAC (Role-Based Access Control)             │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Công nghệ theo từng service

| Service | Runtime | Framework | Server | Đặc biệt |
|---------|---------|-----------|--------|-----------|
| Frontend-Web | Node.js 20 | React 18 + TypeScript | Vite | react-leaflet, socket.io-client, simple-peer |
| Backend-API | Python 3.11+ | Django 5 + DRF | Gunicorn + Daphne | Django Channels, PostGIS ORM |
| AI-Vision | Python 3.11+ | FastAPI | Uvicorn | PyTorch, DenseNet121, Grad-CAM |
| LLM-RAG | Python 3.11+ | FastAPI | Uvicorn | LangChain, pgvector, OpenAI API |
| Database | — | PostgreSQL 16 | — | PostGIS 3.4, pgvector 0.5 |
| Cache/Broker | — | Redis 7 | — | Channel Layer, Rate Limiting |

---

## 6. Môi trường triển khai

### Development
- Docker Compose chạy toàn bộ services trên localhost
- Hot-reload cho Frontend (Vite HMR) và Backend (Django runserver)
- Database seed data tự động

### Staging / Production
- Container orchestration bằng Docker Compose (hoặc Kubernetes cho scale lớn)
- NGINX reverse proxy xử lý SSL termination và load balancing
- PostgreSQL managed (hoặc self-hosted với backup cron)
- Environment variables qua `.env` file hoặc Secret Manager

---

## 7. Monitoring & Logging (Đề xuất)

| Thành phần | Công cụ đề xuất | Mục đích |
|------------|-----------------|----------|
| Application Logs | Python `logging` + Structured JSON | Ghi log nghiệp vụ |
| Request Tracing | OpenTelemetry | Theo dõi request xuyên suốt services |
| Metrics | Prometheus + Grafana | CPU, Memory, Response Time |
| Error Tracking | Sentry | Bắt và phân loại lỗi runtime |
| Health Check | `/health` endpoint mỗi service | Kiểm tra service đang sống |
