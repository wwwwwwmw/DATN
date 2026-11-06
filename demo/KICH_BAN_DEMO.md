# 🎬 KỊCH BẢN DEMO — Hệ thống Y tế Thông minh MedTech AI
**Đồ án Tốt nghiệp — Phiên bản v2.4-MED**

---

## 📌 THÔNG TIN HỆ THỐNG

| Thông tin | Chi tiết |
|-----------|----------|
| **Tên sản phẩm** | MedTech AI — Nền tảng Y tế Lâm sàng Thông minh |
| **Frontend Web** | http://localhost:5174/ (React 18 + Vite + TypeScript) |
| **Backend API** | http://localhost:8000/ (Django REST Framework + SimpleJWT) |
| **AI Vision Service** | http://localhost:8001/ (FastAPI + DenseNet-121) |
| **LLM-RAG Service** | http://localhost:8002/ (FastAPI + LangChain) |
| **Ngôn ngữ mặc định** | **Tiếng Việt có dấu chuẩn 100%** |
| **Nút đổi ngôn ngữ** | 🌐 **VI / EN** hiển thị cố định trên Header ở mọi màn hình |

---

## 👤 TÀI KHOẢN DEMO & PHÂN QUYỀN

| Vai trò | Email | Mật khẩu | Quyền hạn & Chức năng |
|---------|-------|-----------|----------------------|
| **Bác sĩ (Doctor)** | `sarah.jenkins@medtech.ai` | `doctor123` | Bảng điều khiển Bác sĩ (Doctor Dashboard), duyệt lịch hẹn, vào phòng khám Telehealth, ký duyệt kết quả X-quang AI |
| **Quản trị viên (Admin)** | `admin@medtech.vn` | `admin123` | Toàn quyền quản trị hệ thống, xem dashboard bác sĩ, quản lý thông báo, cấu hình bảo mật |
| **Bệnh nhân (Patient)** | `nguyenvanan@medtech.ai` | `patient123` | Cổng bệnh nhân, tư vấn AI RAG, đặt lịch khám thông minh SA, xem hồ sơ bệnh án ICD-10, xem bản đồ GIS |

---

## 🚀 CÁC TÍNH NĂNG TƯƠNG TÁC THỰC TẾ TRÊN DATABASE

### 1. 🔔 Nút Thông báo trên Thanh điều hướng (Header)
- **Tương tác**: Biểu tượng chuông thông báo có huy hiệu đỏ (`badge`) hiển thị số lượng thông báo chưa đọc từ API `/api/notifications/`.
- **Hành động khi nhấn**:
  + Mở menu Dropdown hiển thị danh sách thông báo thực tế (ca cấp cứu khẩn cấp, kết quả X-quang chờ ký, lịch hẹn mới, đồng bộ thẻ BHYT & VNeID).
  + Nút "Đọc tất cả" gọi API `POST /api/notifications/read-all/` để xóa badge.
  + Nhấn vào từng thông báo: tự động gọi `PATCH /api/notifications/<id>/read/` và **nhảy ngay tới màn hình chức năng liên quan** (thông báo X-quang nhảy sang `/xray`, thông báo Telehealth nhảy sang `/telehealth`, thông báo lịch hẹn nhảy sang `/booking` hoặc trang chủ).

### 2. 📊 Dữ liệu thật & Chuyển hướng từ các con số / Thẻ Stat trang chủ
Toàn bộ số liệu trên màn hình được lấy trực tiếp từ Database qua API `GET /api/appointments/dashboard/`:
- **Thẻ `TỔNG LỊCH HẸN` (`TOTAL APPOINTMENTS`)**:
  + Hiển thị tổng số ca khám thực tế trong ngày từ cơ sở dữ liệu.
  + **Khi nhấn vào**: Chuyển bộ lọc sang `Tất cả` (`all`) và cuộn xuống bảng lịch khám hôm nay.
- **Thẻ `ĐANG CHỜ` (`WAITING`)**:
  + Hiển thị số lượng ca hẹn đang ở trạng thái chờ khám hoặc chờ duyệt (`status=PENDING`).
  + **Khi nhấn vào**: Kích hoạt bộ lọc ca chờ khám, làm nổi bật các ca đang chờ bệnh nhân tới lượt.
- **Thẻ `CHỜ AI DUYỆT` (`AI REVIEW`)**:
  + Hiển thị số ca phân tích X-quang AI đang chờ bác sĩ thẩm định (`doctor_agrees_with_ai=None`).
  + **Khi nhấn vào**: **Nhảy trực tiếp sang trang Phân tích & Ký duyệt X-quang AI (`/xray`)** để bác sĩ xem bản đồ nhiệt Grad-CAM và ký duyệt.
- **Thẻ `KHẨN CẤP` (`URGENT`)**:
  + Hiển thị số ca bệnh nhân có triệu chứng cấp cứu (đau thắt ngực cấp, suy hô hấp).
  + **Khi nhấn vào**: **Lọc ngay lập tức danh sách lịch khám chỉ hiển thị các ca cấp cứu khẩn cấp** với viền đỏ cảnh báo để ưu tiên xử trí.
- **Nút `Vào phòng khám` (`Enter clinic room`)**:
  + Xuất hiện trên các ca khám Telehealth trực tuyến.
  + **Khi nhấn vào**: **Nhảy trực tiếp vào phòng khám video Telehealth trực tuyến (`/telehealth`)**.
- **Nút `Phê duyệt` (`Approve`) & `Từ chối` (`Reject`) trên yêu cầu đặt lịch mới**:
  + **Khi nhấn vào**: Gọi API `PATCH /api/appointments/<id>/status/` cập nhật trạng thái `CONFIRMED` hoặc `CANCELLED` trực tiếp vào Database và cập nhật ngay lập tức trên giao diện.

---

## 🎬 KỊCH BẢN THỰC THI 11 BƯỚC

1. **Bước 1**: Đăng nhập tài khoản Bác sĩ/Admin hoặc Bệnh nhân (Giao diện Tiếng Việt có dấu).
2. **Bước 2**: Bảng điều khiển Bác sĩ / Cổng bệnh nhân hiển thị số liệu lấy từ DB.
3. **Bước 3**: Nhấn vào nút Chuông thông báo -> Dropdown mở ra xem thông báo thật.
4. **Bước 4**: Nhấn vào thẻ `CHỜ AI DUYỆT` -> Hệ thống chuyển hướng ngay sang `/xray`.
5. **Bước 5**: Quay lại trang chủ, nhấn thẻ `KHẨN CẤP` -> Hệ thống lọc danh sách ca cấp cứu.
6. **Bước 6**: Nhấn nút `Vào phòng khám` -> Hệ thống chuyển hướng ngay sang `/telehealth`.
7. **Bước 7**: Chat AI RAG: Bệnh nhân mô tả triệu chứng -> AI phân tích và trả về kết quả.
8. **Bước 8**: Đặt lịch thông minh: Thuật toán Simulated Annealing tính toán điểm tối ưu.
9. **Bước 9**: Hồ sơ y tế điện tử: Hiển thị chẩn đoán mã ICD-10 và bảng đơn thuốc.
10. **Bước 10**: Bản đồ GIS: Định vị phòng khám gần nhất trên nền tảng Leaflet.
11. **Bước 11**: Nhấn nút 🌐 VI trên Header để đổi sang Tiếng Anh, nhấn lại để về Tiếng Việt, sau đó Đăng xuất an toàn.
