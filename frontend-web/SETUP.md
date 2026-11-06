# 🖥️ Frontend Web — Hướng dẫn Chạy

## Yêu cầu
- Node.js 18+ ✅
- npm 9+ ✅

## Quick Start

```cmd
REM 1. Cài dependencies
cd frontend-web
npm install

REM 2. Cấu hình API URL (optional)
REM Tạo file .env.local
echo VITE_API_URL=http://localhost:8000 > .env.local

REM 3. Chạy dev server
npm run dev
```

Mở browser tại: **http://localhost:5173**

## Chức năng

| Trang | URL | Mô tả |
|-------|-----|-------|
| Login/Register | / | Đăng nhập / Đăng ký |
| Dashboard | / | Tổng quan, thống kê |
| Tư vấn AI | /chat | Chat sơ vấn RAG |
| X-quang | /xray | Upload + phân tích DenseNet121 |
| Bản đồ | /map | Leaflet GIS tìm phòng khám |
| Lịch hẹn | /appointments | Đặt lịch SA tối ưu |

## Tech Stack

- **React 19** + TypeScript
- **Vite** (build tool)
- **React Router** (routing)
- **Axios** (HTTP client with JWT interceptors)
- **React-Leaflet** (GIS map)
- **Lucide React** (icons)
- **Socket.io** (WebSocket)
- **Simple-Peer** (WebRTC video call)

## Build Production

```cmd
npm run build
REM Output: dist/
```

## Lưu ý
- Backend API phải chạy ở `http://localhost:8000` (hoặc đổi VITE_API_URL)
- Leaflet cần internet để tải tile map từ OpenStreetMap
