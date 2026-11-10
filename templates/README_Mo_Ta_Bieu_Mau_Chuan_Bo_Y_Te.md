# Danh mục Biểu mẫu Y tế Chuẩn Bộ Y tế (Thư mục `templates`)

Thư mục này lưu trữ các biểu mẫu chuẩn y tế dùng để xuất báo cáo cận lâm sàng trên hệ thống **MedTech AI Platform** và làm minh chứng đối chiếu khi báo cáo / bảo vệ đồ án.

---

## 1. Danh sách các file mẫu và mục đích sử dụng

| STT | Tên file trong thư mục `templates/` | Mục đích & Chức năng của file mẫu |
| :---: | :--- | :--- |
| **1** | `Mau_18_BV_01_Phieu_Ket_Qua_Chup_XQuang_Chuan_Bo_Y_Te.html` | **File mẫu gốc (Template chuẩn Bộ Y tế — Mẫu số: 18/BV-01)** dùng để xuất **Phiếu Chiếu / Chụp X-quang** khổ chuẩn A4. Biểu mẫu tuân thủ quy định Hồ sơ bệnh án của Bộ Y tế (Quyết định số `4069/2001/QĐ-BYT` và Thông tư `32/2023/TT-BYT`). |
| **2** | `Bang_Chung_Xuat_Phieu_Ket_Qua_XQuang_Benh_Nhan_Nguyen_Van_An.html` | **File bằng chứng kết quả xuất thực tế (Sample Output Evidence)** đã kết xuất đầy đủ dữ liệu từ PostgreSQL của bệnh nhân **Nguyễn Văn An** (Mã kết quả: `XQ-20261108-104510-A309`, Mã phim gốc: `IMG-20261108-104510-A309`, Lần chụp thứ `3/3`). Dùng để mở trực tiếp minh họa khi báo cáo hội đồng. |

---

## 2. Cấu trúc chuẩn Y khoa của Mẫu số `18/BV-01` (Bộ Y tế)

1. **Phần Tiêu đề & Hành chính cơ sở khám chữa bệnh:**
   - Góc trên trái: Tên Sở Y tế, Tên Bệnh viện (`BỆNH VIỆN ĐA KHOA QUỐC TẾ MEDTECH SÀI GÒN`), Khoa chuyên môn (`KHOA CHẨN ĐOÁN HÌNH ẢNH`).
   - Góc trên phải: Ký hiệu biểu mẫu **`Mẫu số: 18/BV-01`**, Số phiếu / Mã kết quả duy nhất (`XQ-...`) và Mã định danh phim X-quang gốc (`IMG-...`).
2. **Phần I — Thông tin hành chính & Chỉ định lâm sàng:**
   - Họ và tên người bệnh, Tuổi, Giới tính, Mã số bệnh nhân (`#BN-...`).
   - Khoa/Phòng chỉ định, Thời gian thực hiện chụp, Yêu cầu chiếu/chụp (`Chụp X-quang ngực thẳng kỹ thuật số — Tư thế PA`), Chẩn đoán lâm sàng (`ICD-10`).
3. **Phần II — Hình ảnh Phim X-quang gốc (Trắng đen — Không phủ lớp nhiệt) & Bảng chỉ số đo lường:**
   - **Nguyên tắc kỹ thuật in y tế:** Khi xuất hoặc in báo cáo ra giấy/PDF (đặc biệt trên máy in laser trắng đen tại bệnh viện), lớp phủ nhiệt màu (`Grad-CAM color heatmap`) nếu chuyển sang thang xám sẽ làm che khuất cấu trúc giải phẫu của nhu mô phổi và xương sườn. Do đó, biểu mẫu xuất báo cáo **chỉ hiển thị ảnh phim X-quang gốc (`original_image`) ở thang xám chuẩn DICOM**, hoàn toàn **không chồng lớp phủ nhiệt**.
4. **Phần III — Kết quả đọc phim của Bác sĩ chuyên khoa (2 mục bắt buộc theo Bộ Y tế):**
   - **1. Mô tả hình ảnh X-quang (Description of Findings):** Mô tả chi tiết trường phổi hai bên, bóng tim & trung thất (chỉ số tim-ngực CTR), vòm hoành và góc sườn hoành.
   - **2. Kết luận chẩn đoán hình ảnh (Diagnostic Conclusion):** Kết luận chính thức của Bác sĩ chuyên khoa Chẩn đoán hình ảnh kèm mã ICD-10.
5. **Phần IV — Ngày tháng & Chữ ký xác nhận:**
   - Cột trái: Kỹ thuật viên X-quang thực hiện.
   - Cột phải: Bác sĩ chuyên khoa Chẩn đoán hình ảnh ký duyệt kết quả.

