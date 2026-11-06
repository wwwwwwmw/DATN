# 🎨 MedTech AI - Design Review

## Tổng hợp 9 màn hình từ Figma

### 1. Bảng điều khiển Bác sĩ (`01-doctor-dashboard`)
![Doctor Dashboard](C:/Users/LECOO/.gemini/antigravity-ide/brain/1396a9d3-32ab-43f0-a21c-f66ba45630d4/01-doctor-dashboard.png)

**Các thành phần chính:**
- Header: MedTech AI logo + search bar + notifications + user profile
- Stats cards: Tổng lịch hẹn (18 ca), Đang chờ khám (4), Cần duyệt AI (6), Khẩn cấp (1)
- Lịch làm việc hôm nay (timeline): trạng thái bệnh nhân, color-coded urgency
- Yêu cầu đặt lịch mới (3 chờ duyệt): AI Match score
- Kết quả AI cần ký duyệt: X-ray thumbnail + phần trăm risk
- Footer: "Hệ thống Sẵn sàng v2.4-MED", PKI-ACTIVE badge

---

### 2. Bản đồ Phòng khám GIS (`02-clinic-map-gis`)
![Clinic Map GIS](C:/Users/LECOO/.gemini/antigravity-ide/brain/1396a9d3-32ab-43f0-a21c-f66ba45630d4/02-clinic-map-gis.png)

**Các thành phần chính:**
- Bản đồ OpenStreetMap Hà Nội, đánh dấu vị trí BN + bệnh viện
- Sidebar trái: danh sách phòng khám (sort by khoảng cách)
- Filter: Tất cả / Mở cửa 24/7 / Cấp cứu
- Info popup: thời gian lái xe, hàng đợi, nút "Đặt lịch ngay"
- Bán kính tìm kiếm: 5.0 km (GIS circle overlay)
- Badge: "Cấp cứu can thiệp 24/7", "Vệ tinh trực tuyến"

---

### 3. Chat Tư vấn AI (`03-chat-ai-clinical`)
![Chat AI Clinical](C:/Users/LECOO/.gemini/antigravity-ide/brain/1396a9d3-32ab-43f0-a21c-f66ba45630d4/03-chat-ai-clinical.png)

**Các thành phần chính:**
- Patient info bar: vitals realtime (huyết áp, nhịp tim, SpO2)
- Chat bubbles: user (xanh phải) + AI assistant (trái trắng)
- AI response: phân loại triệu chứng, trích dẫn phác đồ, mã ICD-10
- Right panel: MỨC ĐỘ KHẨN CẤP (badge đỏ), gợi ý chuyên khoa (Tim mạch 89%)
- Phân tích nguy cơ thứ cấp: progress bars với %
- Nút: "Đặt lịch khám Tim mạch ngay", "Khởi động Khám cấp cứu Video"
- Disclaimer: "Thông tin chỉ mang tính tham khảo..."

---

### 4. Cài đặt & Bảo mật (`04-settings-security`)
![Settings Security](C:/Users/LECOO/.gemini/antigravity-ide/brain/1396a9d3-32ab-43f0-a21c-f66ba45630d4/04-settings-security.png)

**Các thành phần chính:**
- Sub-menu: Thông tin cá nhân, Bảo mật, Định danh, Chia sẻ dữ liệu, Thông báo
- Bảo vệ dữ liệu: AES-256, FIPS 140-2, HIPAA/GDPR badges
- CCCD: masked input (**** **** 2819), xác thực VNeID
- BHYT: mã thẻ, thời hạn, mức hưởng 80%, nơi ĐK
- MPI (Mã định danh cá nhân): QR code MED-VN-2024-884219
- Chữ ký số: SmartCA (VNPT-CA/Viettel-CA) hoặc OTP SMS/Zalo
- Liên hệ khẩn cấp: người giám hộ, đã ủy quyền

---

### 5. Cổng thông tin Bệnh nhân (`05-patient-portal`)
![Patient Portal](C:/Users/LECOO/.gemini/antigravity-ide/brain/1396a9d3-32ab-43f0-a21c-f66ba45630d4/05-patient-portal.png)

**Các thành phần chính:**
- Welcome header: "Xin chào, Nguyễn Văn An", CCCD & BHYT verified badges
- 3 quick-action cards: Đặt lịch (AI), X-quang (CheXNet V4), Chat AI (24/7)
- Lịch hẹn sắp tới: chi tiết bác sĩ, phòng khám, trạng thái "Chờ mở phòng"
- Lịch sử khám bệnh: bảng với ICD-10 codes, đơn thuốc, BHYT 80%
- Nút: "Mã y tế QR", "Yêu cầu cấp thuốc", "Xuất EMR (.PDF)"

---

### 6. Hồ sơ Bệnh án & ICD-10 (`06-medical-records-icd10`)
![Medical Records](C:/Users/LECOO/.gemini/antigravity-ide/brain/1396a9d3-32ab-43f0-a21c-f66ba45630d4/06-medical-records-icd10.png)

**Các thành phần chính:**
- Timeline trái: các đợt khám (Cấp cứu → Ngoại trú → Định kỳ) với ICD-10
- Chi tiết: BS phụ trách, ngày khám, đợt điều trị hiện tại
- Chẩn đoán ICD-10: I20.0 (Cơn đau thắt ngực), J18.9 (Viêm phổi), I10 (Tăng HA)
- Đơn thuốc: bảng chi tiết (tên, liều, cách dùng, số ngày, ghi chú)
- Audit Trail: "Xem lịch sử chỉnh sửa (Audit Trail) - 3 lần cập nhật"
- Bảo mật: SHA-256 hash, FIPS 140-2 compliance
- Export: "In tóm tắt bệnh án (.PDF)", "Xuất dữ liệu chuẩn HL7/FHIR"

---

### 7. Khám bệnh từ xa WebRTC (`07-telehealth-webrtc`)
![Telehealth WebRTC](C:/Users/LECOO/.gemini/antigravity-ide/brain/1396a9d3-32ab-43f0-a21c-f66ba45630d4/07-telehealth-webrtc.png)

**Các thành phần chính:**
- Video area: bác sĩ (lớn) + bệnh nhân (nhỏ, PiP)
- Status: "ĐANG GHI NHẬN PHIÊN KHÁM", timer 12:50
- Network badge: "Tín hiệu mạng: 98% (Ổn định)", 18ms, 60fps
- Mã hóa: DTLS-SRTP 256-bit
- Controls: Mic, Video, Chia sẻ kết quả X-quang, Trò chuyện, Kết thúc
- Vitals bar: Nhịp tim 104, HA 148/92, SpO2 96%, Thân nhiệt 37.1°C
- Right panel: Hồ sơ BN tóm tắt, dị ứng (Penicillin - cảnh báo đỏ), tiền sử
- Sổ khám bệnh: ICD-10 autocomplete, triệu chứng, kê đơn nhanh
- "Ký số & Lưu vào Hồ sơ Bệnh án điện tử"

---

### 8. Phân tích X-quang AI (`08-xray-ai-gradcam`)
![X-ray AI](C:/Users/LECOO/.gemini/antigravity-ide/brain/1396a9d3-32ab-43f0-a21c-f66ba45630d4/08-xray-ai-gradcam.png)

**Các thành phần chính:**
- Upload area: Drag & drop DICOM/JPG (max 128MB)
- Patient info: Mã ca #XQ-8820, tên BN, tệp DICOM, model DenseNet-121
- X-ray viewer: ảnh gốc (PA) + Grad-CAM heatmap (side-by-side)
- Heatmap opacity slider: 0.0 → 1.0
- Kết quả 14 bệnh: sorted by probability, color-coded badges
- Bác sĩ duyệt: checkbox "Đồng ý với AI", chẩn đoán chính thức (ICD-10 dropdown)
- Actions: "Xuất báo cáo DICOM (.PDF)", "Gửi báo cáo / Huấn luyện lại mô hình"

---

### 9. Đặt lịch khám thông minh SA (`09-smart-booking-sa`)
![Smart Booking SA](C:/Users/LECOO/.gemini/antigravity-ide/brain/1396a9d3-32ab-43f0-a21c-f66ba45630d4/09-smart-booking-sa.png)

**Các thành phần chính:**
- Mô hình tối ưu: "Thuật toán tôi luyện thép mô phỏng v3.4"
- Input: Triệu chứng (phân loại tự động), chuyên khoa, bán kính GIS (slider)
- Trọng số: Thời gian chờ 40% + Quãng đường 35% + Thâm niên BS 25%
- Gợi ý bác sĩ: 3 kết quả sorted by fitness score f(x)
  - Khoảng cách, giờ sớm nhất, BHYT, lưu lượng phòng khám
- Right panel: Lưới khung giờ theo tuần (CA SÁNG + CA CHIỀU)
  - Xanh đậm = đang chọn, Xanh nhạt = còn chỗ, Xám = kín lịch
- Confirmation: BS, giờ, ngày, bảo hiểm tạm tính 45.000đ

---

## 📝 Notes cho Frontend Dev

> [!IMPORTANT]
> Phong cách **Clinical Precision**: chuyên nghiệp, data-dense, border-based (không dùng shadow mờ). Font **Inter**. Primary color **#0F52BA**.

> [!TIP]
> Tất cả `code.html` trong mỗi thư mục là CSS reference. Dùng để lấy chính xác spacing, colors, font sizes.

> [!WARNING]
> i18n bắt buộc: Mọi text hiển thị phải dùng translation key (`react-i18next`), KHÔNG hardcode tiếng Việt hay tiếng Anh.
