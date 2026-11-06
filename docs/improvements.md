# 💡 Đề xuất Cải tiến — Improvements & Future Work

> Dựa trên phân tích đề cương và kiến trúc hiện tại, đây là các hướng cải tiến cho hệ thống.

---

## 1. Cải tiến AI Vision (Mô hình Học sâu)

### 1.1 Nâng cấp kiến trúc mạng

| Đề xuất | Mô tả | Độ phức tạp | Ưu tiên |
|---------|--------|-------------|---------|
| **EfficientNet-B4/B5** | Kiến trúc NAS-optimized, AUC cao hơn DenseNet trên CheXpert benchmark | Trung bình | ⭐⭐⭐ |
| **Vision Transformer (ViT)** | Attention-based, bắt được long-range dependencies trong ảnh X-quang | Cao | ⭐⭐ |
| **Ensemble Models** | Kết hợp DenseNet121 + ResNet50 + EfficientNet → voting/stacking | Cao | ⭐⭐⭐ |
| **Multi-task Learning** | 1 model cho cả classification + localization (bounding box) | Cao | ⭐⭐ |

### 1.2 Kỹ thuật huấn luyện nâng cao

- [ ] **IMP-AV-01** — **Label Smoothing:** Thay vì hard labels (0/1), dùng soft labels (0.1/0.9) → giảm overconfidence
- [ ] **IMP-AV-02** — **Mixup / CutMix augmentation:** Trộn 2 ảnh → tăng generalization
- [ ] **IMP-AV-03** — **Progressive Resizing:** Train 224→320→384 → tận dụng fine details
- [ ] **IMP-AV-04** — **Knowledge Distillation:** Train model nhỏ (MobileNet) từ model lớn → faster inference
- [ ] **IMP-AV-05** — **Test-Time Augmentation (TTA):** Predict nhiều augmented versions → average → tăng accuracy

### 1.3 Explainability (Giải thích AI)

- [ ] **IMP-AV-10** — **Grad-CAM++:** Phiên bản cải tiến của Grad-CAM, highlight chính xác hơn
- [ ] **IMP-AV-11** — **SHAP values:** Giải thích contribution từng pixel/feature
- [ ] **IMP-AV-12** — **Confidence calibration:** Đảm bảo probability 80% nghĩa là 80% đúng thực sự
- [ ] **IMP-AV-13** — **Report generation:** Tự động sinh text mô tả kết quả (Image → Text)

---

## 2. Cải tiến LLM RAG

### 2.1 Nâng cấp Pipeline RAG

| Đề xuất | Mô tả | Độ phức tạp | Ưu tiên |
|---------|--------|-------------|---------|
| **Hybrid Search** | Kết hợp vector search + BM25 keyword search | Trung bình | ⭐⭐⭐ |
| **Re-ranking** | Dùng Cross-Encoder để re-rank top-K documents | Trung bình | ⭐⭐⭐ |
| **Query Expansion** | Mở rộng query bằng medical synonyms (ho → cough, batuk) | Thấp | ⭐⭐ |
| **Multi-step Reasoning** | Chain-of-Thought cho phép suy luận phức tạp hơn | Cao | ⭐⭐ |
| **Agentic RAG** | LLM tự quyết định khi nào cần search, khi nào đã đủ context | Cao | ⭐ |

### 2.2 Cải thiện chất lượng

- [ ] **IMP-RAG-01** — **Metadata filtering:** Search theo chuyên khoa (Hô hấp, Tim mạch)
- [ ] **IMP-RAG-02** — **Multi-language support:** Hỗ trợ tài liệu Tiếng Anh + Tiếng Việt
- [ ] **IMP-RAG-03** — **Conversation memory:** Nhớ context dài hạn qua nhiều phiên chat
- [ ] **IMP-RAG-04** — **Hallucination detection:** Phát hiện khi LLM bịa thông tin
- [ ] **IMP-RAG-05** — **Citation verification:** Kiểm tra trích dẫn có khớp với nguồn tài liệu
- [ ] **IMP-RAG-06** — **Fine-tuned local model:** Train model tiếng Việt riêng thay vì dùng OpenAI API

### 2.3 Tích hợp AI Vision + RAG

- [ ] **IMP-CROSS-01** — **Multimodal RAG:** Kết quả X-quang AI → tự động sinh câu hỏi follow-up cho RAG
  ```
  AI Vision: "Phát hiện dấu hiệu Pneumonia (87%)"
  → RAG tự động: "Dựa trên kết quả phân tích ảnh X-quang, 
    bệnh nhân có dấu hiệu viêm phổi. Các bước tiếp theo gồm..."
  ```
- [ ] **IMP-CROSS-02** — **Smart triage:** Kết hợp symptoms (RAG) + X-quang (Vision) → đề xuất mức độ khẩn cấp

---

## 3. Cải tiến Simulated Annealing

### 3.1 Thuật toán tối ưu thay thế/bổ sung (theo đề cương)

| Đề xuất | Mô tả | Ưu điểm | Nhược điểm |
|---------|--------|---------|------------|
| **Particle Swarm Optimization (PSO)** | Tối ưu bầy đàn | Converge nhanh, ít parameters | Dễ mắc local optima |
| **Genetic Algorithm (GA)** | Tiến hóa | Explore tốt solution space | Chậm hơn SA |
| **Ant Colony Optimization (ACO)** | Kiến tìm đường | Tốt cho routing problems | Phức tạp implement |
| **SA + PSO Hybrid** | Kết hợp SA global + PSO local | Best of both worlds | Tuning phức tạp |

### 3.2 Cải tiến hàm mục tiêu

- [ ] **IMP-SA-01** — Thêm **lịch sử khám** vào objective: ưu tiên bác sĩ đã khám bệnh nhân trước đó
- [ ] **IMP-SA-02** — Thêm **traffic / thời tiết** vào distance cost (qua Google Maps API)
- [ ] **IMP-SA-03** — **Dynamic weights:** Tự động điều chỉnh weights theo feedback của bệnh nhân
- [ ] **IMP-SA-04** — **Multi-day scheduling:** Tối ưu lịch cho cả tuần, không chỉ 1 ngày
- [ ] **IMP-SA-05** — **Real-time rescheduling:** Khi có cancellation, SA chạy lại để reallocate slots

---

## 4. Cải tiến Backend & Infrastructure

### 4.1 Scalability

- [ ] **IMP-BE-01** — **Celery + Redis:** Background task queue cho:
  - AI Vision inference (async)
  - Gửi email thông báo
  - Tính toán SA lịch hẹn
  - Nhúng tài liệu mới vào vector store

- [ ] **IMP-BE-02** — **API Rate Limiting:**
  - Patient: 60 requests/phút
  - Doctor: 120 requests/phút
  - X-quang upload: 10/giờ
  - RAG chat: 30/giờ

- [ ] **IMP-BE-03** — **Caching layer (Redis):**
  - Cache clinic list (5 phút)
  - Cache doctor schedules (1 phút)
  - Cache GIS nearby results (10 phút per location hash)

- [ ] **IMP-BE-04** — **API Versioning:** `/api/v1/...` → dễ nâng cấp API mà không break clients

### 4.2 Security

- [ ] **IMP-SEC-01** — **Data encryption at rest:** Mã hóa cột dữ liệu y tế nhạy cảm
- [ ] **IMP-SEC-02** — **Audit trail logging:** Ghi log mọi thao tác truy cập dữ liệu bệnh nhân
- [ ] **IMP-SEC-03** — **2FA (Two-Factor Authentication):** Cho bác sĩ và admin
- [ ] **IMP-SEC-04** — **IP whitelisting:** Cho internal service communication
- [ ] **IMP-SEC-05** — **HIPAA/GDPR considerations:** Data retention policies, right to be forgotten

---

## 5. Cải tiến Frontend UX

### 5.1 Trải nghiệm người dùng

- [ ] **IMP-FE-01** — **PWA (Progressive Web App):** Offline support, installable trên mobile
- [ ] **IMP-FE-02** — **Push Notifications:** Browser push cho nhắc lịch hẹn
- [ ] **IMP-FE-03** — **Voice input:** Nhập triệu chứng bằng giọng nói (Web Speech API)
- [ ] **IMP-FE-04** — **Symptom checker wizard:** Guided flow thay vì free-text
  ```
  Bước 1: Chọn vùng cơ thể (đau ở đâu?)
  Bước 2: Chọn triệu chứng (đau, sưng, sốt?)
  Bước 3: Thời gian (bao lâu rồi?)
  Bước 4: Mức độ (nhẹ, vừa, nặng?)
  → Tổng hợp thành query cho RAG
  ```

- [ ] **IMP-FE-05** — **Drag-and-drop X-ray comparison:** So sánh 2 ảnh X-quang side-by-side
- [ ] **IMP-FE-06** — **Dark mode optimized cho ảnh X-quang:** X-quang hiển thị tốt hơn trên nền tối

### 5.2 Mobile App (Future)

- [ ] **IMP-FE-10** — **React Native app:** Chia sẻ code logic với web, native performance
- [ ] **IMP-FE-11** — **Camera capture:** Chụp ảnh X-quang trực tiếp từ camera điện thoại
- [ ] **IMP-FE-12** — **Offline first:** Cache lịch hẹn, chat history offline

---

## 6. Cải tiến Database & GIS

- [ ] **IMP-DB-01** — **Read replicas:** PostgreSQL streaming replication cho read-heavy queries
- [ ] **IMP-DB-02** — **Partitioning:** Partition bảng `appointments` theo tháng
- [ ] **IMP-DB-03** — **Full-text search:** PostgreSQL FTS cho search tài liệu y khoa (bổ sung vector search)
- [ ] **IMP-DB-04** — **GIS routing:** Tính toán đường đi thực tế (không chỉ khoảng cách đường chim bay)
- [ ] **IMP-DB-05** — **Vector store migration:** pgvector → Pinecone/Weaviate nếu scale lớn

---

## 7. Tích hợp bên thứ ba (Future Integrations)

| Tích hợp | Mục đích | Ưu tiên |
|----------|----------|---------|
| **Momo / VNPay** | Thanh toán phí khám online | ⭐⭐⭐ |
| **Zalo OA / SMS** | Gửi nhắc lịch hẹn qua Zalo/SMS | ⭐⭐⭐ |
| **Google Calendar** | Sync lịch hẹn với Google Calendar bệnh nhân | ⭐⭐ |
| **PACS System** | Kết nối với hệ thống lưu trữ ảnh y khoa bệnh viện | ⭐ |
| **HL7 FHIR** | Chuẩn trao đổi dữ liệu y tế quốc tế | ⭐ |
| **Google Maps API** | Directions, ETA chính xác cho tìm phòng khám | ⭐⭐ |

---

## 📌 Ma trận ưu tiên (Priority Matrix)

```
                    Tác động cao
                        │
    ┌───────────────────┤───────────────────┐
    │                   │                   │
    │  Ensemble Models  │  Hybrid RAG       │
    │  Celery Tasks     │  Re-ranking       │
    │  API Rate Limit   │  Multimodal RAG   │
    │  Caching          │  SA+PSO Hybrid    │
    │                   │                   │
Dễ ─┼───────────────────┼───────────────────┤─ Khó
    │                   │                   │
    │  PWA              │  React Native     │
    │  Push Notifs      │  HL7 FHIR         │
    │  Voice Input      │  PACS Integration │
    │  API Versioning   │  Fine-tuned LLM   │
    │                   │                   │
    └───────────────────┤───────────────────┘
                        │
                    Tác động thấp
```

**Giai đoạn 1 (MVP):** Góc trên-trái — Tác động cao, dễ triển khai  
**Giai đoạn 2 (Enhancement):** Góc trên-phải — Tác động cao, cần nghiên cứu  
**Giai đoạn 3 (Polish):** Góc dưới-trái — Tác động thấp, dễ triển khai  
**Giai đoạn 4 (Future):** Góc dưới-phải — Tác động thấp, phức tạp → later
