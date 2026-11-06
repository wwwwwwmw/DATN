# ✅ Master Checklist — Bảng Kiểm Tra Tiến Độ Toàn Dự Án

> **Dựa theo kế hoạch 15 tuần từ đề cương**  
> **Thời gian:** 24/08 – 04/12/2026  
> **Cập nhật lần cuối:** 10/09/2026

---

## Tổng quan tiến độ

| Module | Tổng tasks | Hoàn thành | Đang làm | Còn lại | % |
|--------|-----------|------------|----------|---------|---|
| Database | 15 | 0 | 0 | 15 | 0% |
| AI Vision | 30 | 0 | 0 | 30 | 0% |
| LLM RAG | 25 | 0 | 0 | 25 | 0% |
| Backend API | 40 | 0 | 0 | 40 | 0% |
| Frontend Web | 50 | 0 | 0 | 50 | 0% |
| Deployment | 16 | 0 | 0 | 16 | 0% |
| **TỔNG** | **176** | **0** | **0** | **176** | **0%** |

---

## 📅 Tuần 1 (24/08 – 30/08): Thu thập dữ liệu & Nghiên cứu lý thuyết

### Datasets
- [ ] Tải xong CheXpert dataset (~11GB) → `CheXpert/`
- [ ] Tải xong NIH Chest X-rays dataset (~45GB) → `NIH_Chest_X_rays/`
- [ ] Verify toàn bộ ảnh readable (script check corrupt files)
- [ ] Chạy EDA: phân phối labels, tuổi, giới tính

### Nghiên cứu
- [ ] Đọc paper DenseNet121 (Huang et al., CVPR 2017)
- [ ] Đọc paper CheXpert (Irvin et al., 2019)
- [ ] Đọc paper RAG (Lewis et al., NeurIPS 2020)
- [ ] Đọc paper Simulated Annealing (Van Laarhoven & Aarts, 1987)
- [ ] Hoàn thiện đề cương đồ án

---

## 📅 Tuần 2 (31/08 – 06/09): Phân tích yêu cầu & Thiết kế CSDL

### Phân tích
- [ ] Xác định use cases (Patient, Doctor, Admin)
- [ ] Vẽ Use Case Diagram
- [ ] Vẽ Sequence Diagram cho luồng chính
- [ ] Vẽ Activity Diagram

### Database
- [ ] Cài đặt PostgreSQL 16
- [ ] Kích hoạt PostGIS extension
- [ ] Kích hoạt pgvector extension
- [ ] Thiết kế ERD hoàn chỉnh
- [ ] Tạo toàn bộ bảng (SQL schemas)
- [ ] Insert seed data (phòng khám TP.HCM)

---

## 📅 Tuần 3 (07/09 – 13/09): Tiền xử lý dữ liệu cho RAG

### LLM RAG — Data Processing
- [ ] Thu thập tài liệu y khoa (PDF, DOCX)
- [ ] Script parse PDF/DOCX → text
- [ ] Script chia nhỏ văn bản (chunking)
- [ ] Chọn embedding model (OpenAI hoặc local)
- [ ] Script nhúng tài liệu vào pgvector
- [ ] Verify: similarity search trả kết quả hợp lý

---

## 📅 Tuần 4 (14/09 – 20/09): Xây dựng DenseNet121

### AI Vision — Model Building
- [ ] Script tiền xử lý CheXpert (xử lý uncertain labels)
- [ ] Script tiền xử lý NIH (parse multi-label)
- [ ] Script gộp datasets (8 bệnh chung)
- [ ] Tạo PyTorch Dataset class
- [ ] Data augmentation pipeline
- [ ] Xây dựng kiến trúc DenseNet121 (custom head)
- [ ] Implement WeightedBCELoss
- [ ] Implement metrics (AUC, F1, Precision, Recall)
- [ ] Bắt đầu training (epoch 1-10)

---

## 📅 Tuần 5 (21/09 – 27/09): Huấn luyện & Khởi tạo Backend

### AI Vision — Training
- [ ] Tiếp tục training DenseNet121 (epoch 11-50)
- [ ] Early stopping & model selection
- [ ] Đánh giá trên validation set
- [ ] Tuning hyperparameters (learning rate, batch size)
- [ ] Implement Grad-CAM
- [ ] Lưu best model weights

### Backend API — Khởi tạo
- [ ] Khởi tạo Django project
- [ ] Cấu hình settings (base, dev, prod)
- [ ] Cấu hình PostgreSQL + PostGIS
- [ ] Cấu hình Django Channels + Redis
- [ ] Tạo `CustomUser` model
- [ ] Tạo `DoctorProfile`, `PatientProfile` models

---

## 📅 Tuần 6 (28/09 – 04/10): Backend API — Auth & AI Integration

### Backend API
- [ ] API Register (POST /api/auth/register/)
- [ ] API Login + JWT tokens
- [ ] API Refresh token
- [ ] Custom permissions (IsDoctor, IsPatient, IsAdmin)
- [ ] API proxy tới AI Vision service
  - [ ] Upload ảnh → forward → lưu kết quả
- [ ] API proxy tới LLM RAG service
  - [ ] Nhận triệu chứng → forward → trả response
- [ ] FastAPI app cho AI Vision serving
- [ ] FastAPI app cho LLM RAG serving

---

## 📅 Tuần 7 (05/10 – 11/10): Simulated Annealing

### Backend API — Scheduling
- [ ] Tạo model `Clinic` (với PostGIS PointField)
- [ ] Tạo model `TimeSlot`
- [ ] Tạo model `Appointment`
- [ ] Implement hàm mục tiêu SA (objective function)
- [ ] Implement SA algorithm (neighbor, cooling schedule)
- [ ] API optimal-slots (gọi SA, trả ranked slots)
- [ ] API CRUD appointments
- [ ] Unit tests cho SA algorithm
- [ ] Tuning SA parameters (T_initial, alpha, weights)

---

## 📅 Tuần 8 (12/10 – 18/10): GIS Integration (PostGIS)

### Backend API — GIS
- [ ] GIS query: tìm phòng khám lân cận
- [ ] GIS query: tính khoảng cách bệnh nhân → phòng khám
- [ ] API nearby clinics (GET /api/clinics/nearby/)
- [ ] CRUD API cho clinics (Admin)
- [ ] Tích hợp khoảng cách GIS vào SA objective function
- [ ] Spatial index optimization
- [ ] Insert seed data phòng khám thực tế TP.HCM

---

## 📅 Tuần 9 (19/10 – 25/10): Frontend — Khởi tạo & Auth & RAG Chat

### Frontend Web
- [ ] Khởi tạo Vite + React + TypeScript
- [ ] Cấu hình project (ESLint, Prettier, paths)
- [ ] Tạo cấu trúc thư mục
- [ ] Tạo Axios instance + interceptors
- [ ] React Router setup + ProtectedRoute
- [ ] Trang Đăng ký
- [ ] Trang Đăng nhập
- [ ] Auth Context (JWT management)
- [ ] Chat UI (ChatWindow, MessageBubble)
- [ ] Kết nối chat API tới RAG endpoint
- [ ] Lịch sử chat (sidebar)

---

## 📅 Tuần 10 (26/10 – 01/11): Frontend — X-quang, GIS, Đặt lịch

### Frontend Web
- [ ] Upload ảnh X-quang (drag & drop)
- [ ] Hiển thị kết quả phân loại + confidence scores
- [ ] Hiển thị Grad-CAM heatmap overlay
- [ ] Bản đồ GIS (react-leaflet)
- [ ] Markers phòng khám + popup info
- [ ] Tìm phòng khám lân cận (filter bán kính)
- [ ] BookingForm (wizard multi-step)
- [ ] TimeSlotPicker (hiển thị SA results)
- [ ] ScheduleCalendar (lịch hẹn sắp tới)

---

## 📅 Tuần 11 (02/11 – 08/11): WebRTC Video Call

### Backend API — WebSocket
- [ ] Django Channels routing
- [ ] VideoCall Consumer (signaling)
- [ ] WebSocket JWT authentication middleware
- [ ] Room management logic

### Frontend Web — Video Call
- [ ] useWebRTC hook (PeerConnection, ICE, tracks)
- [ ] VideoRoom component (local + remote video)
- [ ] VideoControls (mute, camera on/off, end call)
- [ ] Camera/Mic check screen trước khi join
- [ ] Signaling via WebSocket

---

## 📅 Tuần 12 (09/11 – 15/11): Admin Dashboard

### Frontend Web — Admin
- [ ] Dashboard Admin (thống kê tổng quan)
- [ ] Quản lý Người dùng (CRUD, lock/unlock)
- [ ] Quản lý Phòng khám (CRUD + map preview)
- [ ] Biểu đồ thống kê (chart.js/recharts)

### Frontend Web — Doctor
- [ ] Dashboard Bác sĩ
- [ ] Quản lý Lịch hẹn (xác nhận/từ chối/dời)
- [ ] Chi tiết Bệnh nhân + lịch sử khám
- [ ] Xem kết quả AI X-quang + review

### Backend API — Admin
- [ ] Admin API endpoints
- [ ] Statistics service
- [ ] Django Admin customization

---

## 📅 Tuần 13 (16/11 – 22/11): Đo lường & Bắt đầu báo cáo

### Đánh giá AI Vision
- [ ] Chạy evaluate.py trên test set
- [ ] Bảng AUC-ROC per class
- [ ] Bảng F1, Precision, Recall per class
- [ ] Vẽ ROC curves
- [ ] Vẽ Confusion Matrix
- [ ] So sánh với baseline/paper gốc

### Đánh giá RAG
- [ ] Chạy evaluate_rag.py (50+ test queries)
- [ ] Keyword recall metrics
- [ ] Faithfulness score
- [ ] Disclaimer rate
- [ ] Response time statistics

### Đánh giá Simulated Annealing
- [ ] Convergence curve (objective value vs iterations)
- [ ] So sánh với random scheduling
- [ ] Thời gian chạy SA per request

### Báo cáo
- [ ] Viết Lời mở đầu
- [ ] Viết Chương 1: Tổng quan

---

## 📅 Tuần 14 (23/11 – 29/11): Viết báo cáo

### Báo cáo
- [ ] Chương 2: Phân tích & Thiết kế
  - [ ] Use Case Diagram
  - [ ] Sequence Diagrams
  - [ ] Activity Diagrams
  - [ ] ERD
  - [ ] Kiến trúc hệ thống
- [ ] Chương 3: Cài đặt & Thực nghiệm
  - [ ] Mô tả cài đặt từng module
  - [ ] Screenshots giao diện
  - [ ] Biểu đồ đánh giá AI
  - [ ] Bảng kết quả metrics
  - [ ] So sánh thuật toán
- [ ] Kết luận
  - [ ] Tổng kết đóng góp
  - [ ] Hạn chế
  - [ ] Hướng phát triển tương lai

---

## 📅 Tuần 15 (30/11 – 04/12): Hoàn thiện & Bảo vệ

### Hoàn thiện
- [ ] Rà soát format báo cáo (theo chuẩn trường)
- [ ] Kiểm tra chính tả, ngữ pháp
- [ ] Đánh số trang, mục lục, danh mục hình, bảng
- [ ] Chuẩn bị slide thuyết trình (15-20 slides)
  - [ ] Slide: Giới thiệu đề tài & mục tiêu
  - [ ] Slide: Kiến trúc hệ thống (diagram)
  - [ ] Slide: DenseNet121 & kết quả
  - [ ] Slide: RAG Pipeline & demo
  - [ ] Slide: Simulated Annealing & kết quả
  - [ ] Slide: GIS & Video Call
  - [ ] Slide: Demo trực tiếp
  - [ ] Slide: Kết luận & hướng phát triển
- [ ] Tổng duyệt phần mềm (demo chạy end-to-end)
- [ ] In ấn, đóng quyển báo cáo

---

## 🏷️ Ký hiệu

| Ký hiệu | Ý nghĩa |
|----------|---------|
| `[ ]` | Chưa bắt đầu |
| `[/]` | Đang thực hiện |
| `[x]` | Hoàn thành |
| `[-]` | Bỏ qua / Không cần thiết |

---

## 📌 Ghi chú

- Tick `[x]` khi hoàn thành task
- Cập nhật bảng tổng quan % mỗi tuần
- Nếu task bị delay, ghi chú lý do bên cạnh
- Review checklist này mỗi đầu tuần để đánh giá tiến độ
