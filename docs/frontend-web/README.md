# 🖥️ Frontend Web — Tài liệu Kỹ thuật & Checklist Nghiệp vụ

> **Công nghệ:** React 18 + TypeScript + Vite  
> **Port:** 3000  
> **Vai trò:** Giao diện người dùng cho Bệnh nhân, Bác sĩ và Admin

---

## 📁 Cấu trúc thư mục đề xuất

```
frontend-web/
├── public/
│   ├── favicon.ico
│   └── index.html
├── src/
│   ├── api/                    # Axios instances & API calls
│   │   ├── axiosInstance.ts    # Base axios config (baseURL, interceptors)
│   │   ├── authApi.ts          # Login, Register, Refresh token
│   │   ├── appointmentApi.ts   # CRUD lịch hẹn
│   │   ├── chatApi.ts          # RAG Chat API
│   │   ├── xrayApi.ts          # Upload & kết quả X-quang
│   │   └── gisApi.ts           # Tìm phòng khám lân cận
│   ├── assets/                 # Hình ảnh, icons, fonts
│   ├── components/             # Reusable UI components
│   │   ├── common/             # Button, Input, Modal, Loading...
│   │   ├── layout/             # Navbar, Sidebar, Footer
│   │   ├── chat/               # ChatWindow, MessageBubble, SymptomInput
│   │   ├── xray/               # XrayUpload, XrayResult, HeatmapOverlay
│   │   ├── map/                # ClinicMap, ClinicMarker, DistanceInfo
│   │   ├── appointment/        # BookingForm, TimeSlotPicker, ScheduleCalendar
│   │   └── videocall/          # VideoRoom, LocalVideo, RemoteVideo, Controls
│   ├── contexts/               # React Context (Auth, Theme, Socket)
│   ├── hooks/                  # Custom hooks
│   │   ├── useAuth.ts
│   │   ├── useWebSocket.ts
│   │   ├── useWebRTC.ts
│   │   └── useGeolocation.ts
│   ├── pages/                  # Page-level components (route targets)
│   │   ├── patient/
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── ChatPage.tsx
│   │   │   ├── XrayUploadPage.tsx
│   │   │   ├── MapPage.tsx
│   │   │   ├── BookingPage.tsx
│   │   │   └── VideoCallPage.tsx
│   │   ├── doctor/
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── AppointmentListPage.tsx
│   │   │   ├── PatientDetailPage.tsx
│   │   │   ├── XrayReviewPage.tsx
│   │   │   └── VideoCallPage.tsx
│   │   ├── admin/
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── UserManagementPage.tsx
│   │   │   ├── ClinicManagementPage.tsx
│   │   │   └── StatisticsPage.tsx
│   │   ├── auth/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── RegisterPage.tsx
│   │   │   └── ForgotPasswordPage.tsx
│   │   └── NotFoundPage.tsx
│   ├── router/                 # React Router config
│   │   ├── index.tsx
│   │   ├── ProtectedRoute.tsx
│   │   └── RoleBasedRoute.tsx
│   ├── store/                  # State management (nếu dùng Redux/Zustand)
│   ├── types/                  # TypeScript interfaces & types
│   │   ├── user.ts
│   │   ├── appointment.ts
│   │   ├── xray.ts
│   │   └── chat.ts
│   ├── utils/                  # Helper functions
│   │   ├── formatDate.ts
│   │   ├── validators.ts
│   │   └── constants.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css               # Global styles
├── .env.example
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## 🔧 Thư viện cần cài đặt

```json
{
  "dependencies": {
    "react": "^18.x",
    "react-dom": "^18.x",
    "react-router-dom": "^6.x",
    "axios": "^1.x",
    "socket.io-client": "^4.x",
    "simple-peer": "^9.x",
    "react-leaflet": "^4.x",
    "leaflet": "^1.9.x",
    "@types/leaflet": "^1.9.x",
    "zustand": "^4.x",
    "react-hook-form": "^7.x",
    "react-hot-toast": "^2.x",
    "date-fns": "^3.x",
    "lucide-react": "^0.x"
  },
  "devDependencies": {
    "typescript": "^5.x",
    "vite": "^5.x",
    "@vitejs/plugin-react": "^4.x",
    "eslint": "^8.x",
    "prettier": "^3.x"
  }
}
```

---

## ✅ Checklist Nghiệp vụ Chi tiết

### PHASE 1: Cấu hình & Cơ sở hạ tầng

- [ ] **FE-001** — Khởi tạo dự án Vite + React + TypeScript (`npx create-vite`)
- [ ] **FE-002** — Cấu hình ESLint, Prettier, path aliases (`@/components`, `@/pages`)
- [ ] **FE-003** — Thiết lập cấu trúc thư mục theo chuẩn (xem trên)
- [ ] **FE-004** — Cấu hình biến môi trường (`.env`): `VITE_API_URL`, `VITE_WS_URL`, `VITE_MAPBOX_TOKEN`
- [ ] **FE-005** — Tạo Axios instance với `baseURL`, `interceptors` (auto attach JWT, handle 401 → refresh token)
- [ ] **FE-006** — Thiết lập React Router v6 với layout lồng nhau (nested routes)
- [ ] **FE-007** — Tạo `ProtectedRoute` component kiểm tra JWT trước khi render
- [ ] **FE-008** — Tạo `RoleBasedRoute` component phân quyền theo role (PATIENT / DOCTOR / ADMIN)

---

### PHASE 2: Xác thực & Quản lý User

- [ ] **FE-010** — Trang **Đăng ký** (`RegisterPage.tsx`)
  - Form fields: Họ tên, Email, Số điện thoại, Mật khẩu, Xác nhận mật khẩu, Vai trò (Bệnh nhân/Bác sĩ)
  - Validation: Email format, mật khẩu ≥ 8 ký tự, khớp xác nhận
  - Gọi `POST /api/auth/register/`
  - Xử lý lỗi: Email đã tồn tại, validation error từ backend
  - Redirect tới trang Login sau khi đăng ký thành công

- [ ] **FE-011** — Trang **Đăng nhập** (`LoginPage.tsx`)
  - Form fields: Email, Mật khẩu, Remember me
  - Gọi `POST /api/auth/login/` → nhận `access_token` + `refresh_token`
  - Lưu tokens vào `localStorage` hoặc `httpOnly cookie`
  - Redirect theo role: Patient → `/patient/dashboard`, Doctor → `/doctor/dashboard`, Admin → `/admin/dashboard`
  - Xử lý lỗi: Sai thông tin, tài khoản bị khóa

- [ ] **FE-012** — Trang **Quên mật khẩu** (`ForgotPasswordPage.tsx`)
  - Form: Nhập email → Gọi `POST /api/auth/forgot-password/`
  - Thông báo kiểm tra email
  - Trang reset mật khẩu với token từ link email

- [ ] **FE-013** — **Auth Context** quản lý trạng thái đăng nhập
  - `user`, `isAuthenticated`, `role`
  - `login()`, `logout()`, `refreshToken()`
  - Auto refresh token trước khi hết hạn (14 phút nếu token sống 15 phút)

- [ ] **FE-014** — **Trang cá nhân** (Profile Page)
  - Hiển thị và chỉnh sửa thông tin: Họ tên, SĐT, Địa chỉ, Ảnh đại diện
  - Upload avatar → `PUT /api/users/me/`
  - Đổi mật khẩu

---

### PHASE 3: Giao diện Bệnh nhân

#### 3.1 Chat Sơ vấn Y tế (RAG)

- [ ] **FE-020** — Component `ChatWindow`
  - Giao diện chat bubbles kiểu Messenger/ChatGPT
  - Phân biệt tin nhắn người dùng (phải, xanh) và AI (trái, xám)
  - Hiển thị avatar AI và timestamp
  - Auto-scroll xuống tin nhắn mới
  - Typing indicator khi AI đang xử lý

- [ ] **FE-021** — Component `SymptomInput`
  - Text input với nút gửi
  - Hỗ trợ gửi bằng Enter
  - Gợi ý triệu chứng phổ biến (autocomplete chips)
  - Disable input khi đang chờ phản hồi

- [ ] **FE-022** — Kết nối WebSocket/REST tới Backend → LLM-RAG
  - Gửi triệu chứng qua `POST /api/chat/` hoặc WebSocket channel
  - Nhận phản hồi streaming (hiển thị từng token) hoặc full response
  - Lưu lịch sử chat vào context/store
  - Xử lý lỗi mạng: retry, thông báo mất kết nối

- [ ] **FE-023** — Lịch sử chat
  - Sidebar hiển thị danh sách phiên chat trước đó
  - Click vào phiên → load lại lịch sử tin nhắn
  - Nút tạo phiên chat mới

- [ ] **FE-024** — Disclaimer y tế
  - Banner cảnh báo: "Kết quả chỉ mang tính tham khảo, không thay thế khám bệnh trực tiếp"
  - Hiển thị ở đầu mỗi phiên chat

#### 3.2 Upload & Phân tích Ảnh X-quang

- [ ] **FE-030** — Component `XrayUpload`
  - Drag & Drop zone hoặc Click to upload
  - Chỉ chấp nhận file: `.jpg`, `.jpeg`, `.png`, `.dcm` (DICOM)
  - Giới hạn kích thước: ≤ 10MB
  - Preview ảnh trước khi gửi
  - Progress bar upload
  - Gọi `POST /api/xray/analyze/` (multipart/form-data)

- [ ] **FE-031** — Component `XrayResult`
  - Hiển thị bảng kết quả phân loại (14 bệnh lý) với confidence score
  - Mã màu theo mức độ: Xanh (< 30%), Vàng (30-70%), Đỏ (> 70%)
  - Sắp xếp theo confidence giảm dần
  - Hiển thị tên bệnh lý bằng tiếng Việt + tiếng Anh

- [ ] **FE-032** — Component `HeatmapOverlay`
  - Hiển thị ảnh X-quang gốc
  - Overlay Grad-CAM heatmap lên vùng bất thường
  - Toggle hiển thị/ẩn heatmap
  - Zoom & Pan trên ảnh

- [ ] **FE-033** — Lịch sử phân tích
  - Danh sách các lần phân tích trước đó
  - Hiển thị: ngày giờ, thumbnail ảnh, kết quả chính
  - Click vào → xem chi tiết kết quả

#### 3.3 Bản đồ GIS — Tìm phòng khám

- [ ] **FE-040** — Component `ClinicMap` (react-leaflet)
  - Hiển thị bản đồ OpenStreetMap
  - Marker vị trí hiện tại của bệnh nhân (GPS)
  - Markers các phòng khám lân cận (từ Backend GIS query)
  - Popup hiển thị thông tin phòng khám: tên, địa chỉ, khoảng cách, rating
  - Cluster markers khi zoom out

- [ ] **FE-041** — Component `ClinicSearch`
  - Bộ lọc: bán kính tìm kiếm (1km, 3km, 5km, 10km)
  - Bộ lọc: chuyên khoa, rating tối thiểu
  - Gọi `GET /api/clinics/nearby/?lat=...&lng=...&radius=...`
  - Hiển thị danh sách phòng khám dạng list bên cạnh bản đồ

- [ ] **FE-042** — Hook `useGeolocation`
  - Lấy tọa độ GPS qua `navigator.geolocation`
  - Xử lý từ chối quyền truy cập vị trí
  - Fallback: cho phép nhập địa chỉ thủ công → geocoding

- [ ] **FE-043** — Chỉ đường tới phòng khám
  - Click phòng khám → hiển thị đường đi trên bản đồ
  - Khoảng cách (km) và thời gian ước tính
  - Nút "Mở Google Maps" để dẫn đường ngoài app

#### 3.4 Đặt lịch hẹn thông minh

- [ ] **FE-050** — Component `BookingForm`
  - Bước 1: Chọn phòng khám (từ bản đồ hoặc search)
  - Bước 2: Chọn bác sĩ (danh sách bác sĩ available tại phòng khám)
  - Bước 3: Chọn ngày (DatePicker, chỉ hiển thị ngày có slot trống)
  - Bước 4: Chọn khung giờ tối ưu (từ Simulated Annealing)
  - Bước 5: Nhập lý do khám, ghi chú
  - Bước 6: Xác nhận & Gửi

- [ ] **FE-051** — Component `TimeSlotPicker`
  - Gọi `GET /api/appointments/optimal-slots/?clinic_id=...&doctor_id=...&date=...`
  - Hiển thị khung giờ dạng grid
  - Mã màu: Xanh lá (tối ưu nhất), Xanh dương (tốt), Xám (đã đầy)
  - Badge "Đề xuất" cho slot có score cao nhất từ SA algorithm

- [ ] **FE-052** — Component `ScheduleCalendar`
  - Lịch hẹn sắp tới dạng calendar view (tuần/tháng)
  - Hiển thị trạng thái: Chờ xác nhận / Đã xác nhận / Đã hủy / Hoàn thành
  - Click vào lịch hẹn → chi tiết (bác sĩ, phòng khám, giờ, ghi chú)
  - Nút hủy lịch hẹn (trước 24h)

- [ ] **FE-053** — Thông báo
  - Push notification khi lịch hẹn được xác nhận
  - Nhắc nhở trước 1 giờ
  - Thông báo khi bác sĩ hủy/dời lịch

#### 3.5 Video Call (Khám từ xa)

- [ ] **FE-060** — Component `VideoRoom`
  - Hiển thị video local (camera bệnh nhân) và video remote (bác sĩ)
  - Layout responsive: picture-in-picture hoặc side-by-side

- [ ] **FE-061** — Component `VideoControls`
  - Nút Bật/Tắt microphone
  - Nút Bật/Tắt camera
  - Nút kết thúc cuộc gọi
  - Nút chia sẻ màn hình (screen share)
  - Nút chuyển camera (front/back nếu di động)

- [ ] **FE-062** — Hook `useWebRTC`
  - Tạo `RTCPeerConnection` với ICE servers (STUN/TURN)
  - Gửi/nhận Offer, Answer, ICE candidates qua WebSocket
  - Xử lý `ontrack` → gắn remote stream vào `<video>` element
  - Xử lý ngắt kết nối, reconnect
  - Cleanup connection khi unmount

- [ ] **FE-063** — Signaling qua WebSocket
  - Kết nối tới `ws://backend/ws/videocall/{room_id}/`
  - Giao thức: `join_room`, `offer`, `answer`, `ice_candidate`, `leave_room`
  - Xử lý nhiều participant (nếu mở rộng)

- [ ] **FE-064** — Trước khi vào phòng
  - Màn hình kiểm tra camera & micro trước khi join
  - Preview video local
  - Chọn thiết bị (nếu có nhiều camera/micro)

---

### PHASE 4: Giao diện Bác sĩ

- [ ] **FE-070** — **Dashboard Bác sĩ**
  - Tổng quan ngày: số lịch hẹn, số bệnh nhân chờ, lịch hẹn tiếp theo
  - Thống kê tuần/tháng: biểu đồ số lượt khám
  - Danh sách lịch hẹn hôm nay

- [ ] **FE-071** — **Quản lý Lịch hẹn**
  - Danh sách lịch hẹn: filters (ngày, trạng thái, bệnh nhân)
  - Xác nhận / Từ chối lịch hẹn
  - Dời lịch hẹn (chọn slot mới)
  - Ghi chú cho bệnh nhân

- [ ] **FE-072** — **Chi tiết Bệnh nhân**
  - Thông tin cá nhân bệnh nhân
  - Lịch sử khám bệnh
  - Lịch sử phân tích X-quang (xem ảnh + kết quả AI)
  - Lịch sử chat sơ vấn (read-only)
  - Ghi chú y tế của bác sĩ

- [ ] **FE-073** — **Xem kết quả AI X-quang**
  - Xem ảnh X-quang bệnh nhân + Grad-CAM heatmap
  - Xem confidence scores từ DenseNet121
  - Ghi nhận ý kiến bác sĩ (đồng ý / không đồng ý với AI)
  - Viết kết luận chẩn đoán chính thức

- [ ] **FE-074** — **Video Call với Bệnh nhân**
  - Cùng components với phía bệnh nhân
  - Thêm nút "Ghi chú trong khi khám" (side panel)
  - Hiển thị thông tin bệnh nhân trong cuộc gọi

---

### PHASE 5: Giao diện Admin

- [ ] **FE-080** — **Dashboard Admin**
  - Tổng số users (bệnh nhân, bác sĩ, admin)
  - Tổng số lịch hẹn (theo trạng thái)
  - Biểu đồ thống kê: lượt khám/ngày, loại bệnh phổ biến
  - Hoạt động gần đây (log)

- [ ] **FE-081** — **Quản lý Người dùng**
  - Bảng danh sách users: search, filter, sort, pagination
  - Xem chi tiết, chỉnh sửa thông tin
  - Khóa/Mở khóa tài khoản
  - Phân quyền (thay đổi role)

- [ ] **FE-082** — **Quản lý Phòng khám**
  - CRUD phòng khám: tên, địa chỉ, tọa độ GPS, SĐT, giờ làm việc
  - Gán bác sĩ vào phòng khám
  - Hiển thị phòng khám trên bản đồ (preview)

- [ ] **FE-083** — **Thống kê & Báo cáo**
  - Dashboard với chart.js hoặc recharts
  - Export báo cáo CSV/PDF
  - Filters: khoảng thời gian, phòng khám, bác sĩ

---

### PHASE 6: UI/UX & Polish

- [ ] **FE-090** — Responsive design (Desktop + Tablet + Mobile)
- [ ] **FE-091** — Dark mode / Light mode toggle
- [ ] **FE-092** — Loading skeletons cho tất cả API calls
- [ ] **FE-093** — Error boundaries cho crash graceful
- [ ] **FE-094** — Toast notifications (thành công, lỗi, cảnh báo)
- [ ] **FE-095** — Empty states cho danh sách trống
- [ ] **FE-096** — Internationalization (i18n) — Tiếng Việt / English
- [ ] **FE-097** — SEO meta tags cho tất cả pages
- [ ] **FE-098** — Accessibility (ARIA labels, keyboard navigation)
- [ ] **FE-099** — Performance: lazy loading routes, image optimization

---

## 🧪 Testing Checklist

- [ ] **FE-T01** — Unit tests cho utility functions (formatDate, validators)
- [ ] **FE-T02** — Component tests cho form validation
- [ ] **FE-T03** — Integration tests cho API calls (mock axios)
- [ ] **FE-T04** — E2E tests: flow đăng ký → đăng nhập → chat → đặt lịch
- [ ] **FE-T05** — Cross-browser testing (Chrome, Firefox, Safari, Edge)
- [ ] **FE-T06** — Mobile responsive testing (DevTools + thiết bị thật)

---

## ⚠️ Lưu ý quan trọng

1. **JWT token phải được refresh tự động** — không để user bị logout đột ngột
2. **Mọi API call phải có loading state** — tránh user click nhiều lần
3. **Upload ảnh X-quang phải validate kỹ** — chỉ chấp nhận ảnh y khoa hợp lệ
4. **WebRTC cần STUN/TURN server** — nếu chỉ dùng STUN, sẽ không hoạt động qua NAT phức tạp
5. **Bản đồ cần fallback** — nếu user từ chối GPS, phải cho nhập địa chỉ thủ công
6. **Chat disclaimer bắt buộc** — luôn cảnh báo kết quả AI chỉ mang tính tham khảo
