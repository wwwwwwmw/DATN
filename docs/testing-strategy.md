# 🧪 Testing Strategy — Chiến lược Kiểm thử

> Tài liệu mô tả chiến lược kiểm thử cho toàn bộ hệ thống MedTech AI Platform

---

## 1. Tổng quan Test Pyramid

```
        ┌────────────────┐
        │   E2E Tests    │  ← Ít nhất, chậm nhất, giá trị cao
        │   (Cypress/    │
        │    Playwright)  │
        ├────────────────┤
        │ Integration    │  ← Trung bình
        │ Tests          │
        │ (API, DB,      │
        │  Service-to-   │
        │  Service)      │
        ├────────────────┤
        │                │
        │  Unit Tests    │  ← Nhiều nhất, nhanh nhất
        │  (pytest,      │
        │   Jest/Vitest) │
        │                │
        └────────────────┘
```

---

## 2. Unit Tests

### 2.1 Backend API (pytest + pytest-django)

```bash
cd backend-api
pytest apps/ -v --cov=apps --cov-report=html
```

| Module | File | Test gì |
|--------|------|---------|
| Accounts | `test_models.py` | CustomUser creation, profile signals |
| Accounts | `test_serializers.py` | Validation rules, data transformation |
| Accounts | `test_views.py` | Register, Login API responses |
| Appointments | `test_simulated_annealing.py` | SA algorithm convergence, objective function |
| Appointments | `test_scheduling.py` | Slot availability, conflict detection |
| Clinics | `test_gis.py` | PostGIS distance calculations |
| Xray | `test_vision_client.py` | Mock AI-Vision HTTP calls |
| Chat | `test_rag_client.py` | Mock LLM-RAG HTTP calls |

### 2.2 AI Vision (pytest)

```bash
cd ai-vision
pytest tests/ -v
```

| File | Test gì |
|------|---------|
| `test_model.py` | Forward pass shape, output range [0, 1] |
| `test_transforms.py` | Preprocessing output shape, normalization |
| `test_gradcam.py` | Heatmap output shape matches input |
| `test_prediction.py` | End-to-end inference pipeline |
| `test_api.py` | FastAPI endpoint responses |

### 2.3 LLM RAG (pytest)

```bash
cd llm-rag
pytest tests/ -v
```

| File | Test gì |
|------|---------|
| `test_document_processor.py` | Chunking size, overlap, metadata |
| `test_embeddings.py` | Output dimension, batch processing |
| `test_vector_store.py` | Insert, similarity search |
| `test_rag_pipeline.py` | Full pipeline with mocked LLM |
| `test_api.py` | FastAPI endpoint responses |

### 2.4 Frontend Web (Vitest + React Testing Library)

```bash
cd frontend-web
npm run test
```

| File | Test gì |
|------|---------|
| `utils/*.test.ts` | formatDate, validators, helpers |
| `hooks/*.test.ts` | useAuth, useGeolocation logic |
| `components/*.test.tsx` | Component render, user interactions |
| `api/*.test.ts` | API call mocking, error handling |

---

## 3. Integration Tests

### 3.1 API Integration (Backend)

```python
# Test flow: Register → Login → Create Appointment → Check

@pytest.mark.django_db
class TestAppointmentFlow:
    def test_full_booking_flow(self, api_client):
        # 1. Register patient
        response = api_client.post('/api/auth/register/', {...})
        assert response.status_code == 201
        
        # 2. Login
        response = api_client.post('/api/auth/login/', {...})
        token = response.data['access']
        
        # 3. Get nearby clinics
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = api_client.get('/api/clinics/nearby/?lat=10.77&lng=106.70&radius=5000')
        assert response.status_code == 200
        clinic_id = response.data['results'][0]['id']
        
        # 4. Get optimal slots (SA)
        response = api_client.get(f'/api/appointments/optimal-slots/?clinic_id={clinic_id}&date=2026-09-15')
        assert response.status_code == 200
        slot_id = response.data['slots'][0]['id']
        
        # 5. Create appointment
        response = api_client.post('/api/appointments/', {
            'time_slot_id': slot_id,
            'reason': 'Ho kéo dài'
        })
        assert response.status_code == 201
```

### 3.2 Service-to-Service Integration

```python
# Test Backend → AI-Vision communication
@pytest.mark.integration
async def test_xray_analysis_flow():
    # 1. Upload image to Backend
    # 2. Backend forwards to AI-Vision
    # 3. AI-Vision returns predictions
    # 4. Backend saves result to DB
    # 5. Verify result in DB
    pass
```

### 3.3 Database Integration

```python
# Test PostGIS spatial queries
@pytest.mark.django_db
def test_nearby_clinic_query():
    # Create clinics with known coordinates
    clinic_1km = Clinic.objects.create(
        name="Clinic 1km",
        location=Point(106.70, 10.78, srid=4326)
    )
    clinic_10km = Clinic.objects.create(
        name="Clinic 10km", 
        location=Point(106.80, 10.85, srid=4326)
    )
    
    # Query within 2km
    patient_location = Point(106.70, 10.77, srid=4326)
    nearby = Clinic.objects.filter(
        location__distance_lte=(patient_location, D(km=2))
    )
    
    assert clinic_1km in nearby
    assert clinic_10km not in nearby
```

---

## 4. E2E Tests (End-to-End)

### 4.1 Critical User Flows

| # | Flow | Steps |
|---|------|-------|
| 1 | **Đăng ký + Đăng nhập** | Register → Verify → Login → See Dashboard |
| 2 | **Chat sơ vấn** | Login → Open Chat → Type symptoms → Get response |
| 3 | **Upload X-quang** | Login → Upload image → Wait → See results + heatmap |
| 4 | **Đặt lịch** | Login → Find clinic (map) → Select slot → Confirm |
| 5 | **Video Call** | Login → Join room → Camera/Mic check → Connect |
| 6 | **Bác sĩ review** | Doctor login → View appointments → Review X-ray → Write notes |

### 4.2 Tools đề xuất
- **Playwright** (khuyến nghị) hoặc **Cypress**
- Run headless trong CI/CD

---

## 5. AI Model Evaluation

### 5.1 DenseNet121 Metrics

```python
# Chạy evaluation script
python ai-vision/training/evaluate.py \
    --checkpoint weights/best_densenet121.pth \
    --test-data ../../CheXpert/valid.csv \
    --output results/evaluation_report.json
```

**Metrics cần đo:**

| Metric | Per-class | Overall | Target |
|--------|-----------|---------|--------|
| AUC-ROC | ✅ | Mean AUC | > 0.80 |
| F1-Score | ✅ | Macro F1 | > 0.60 |
| Precision | ✅ | Macro Precision | > 0.60 |
| Recall (Sensitivity) | ✅ | Macro Recall | > 0.65 |
| Specificity | ✅ | — | > 0.80 |
| Inference Time | — | Per image | < 500ms |

### 5.2 RAG Quality Metrics

| Metric | Đo gì | Target |
|--------|--------|--------|
| Keyword Recall | % keywords quan trọng trong answer | > 70% |
| Faithfulness | Answer chỉ dựa trên context (no hallucination) | > 90% |
| Disclaimer Rate | % response có cảnh báo y tế | 100% |
| Emergency Detection | Phát hiện đúng trường hợp cấp cứu | 100% |
| Response Time | Thời gian từ query → full response | < 5s |

### 5.3 Simulated Annealing Evaluation

| Metric | Đo gì | Target |
|--------|--------|--------|
| Convergence | SA converge tới near-optimal solution | < 1000 iterations |
| vs Random | SA score tốt hơn random assignment | > 30% improvement |
| Computation Time | Thời gian tính toán | < 200ms |
| Slot Utilization | Tỷ lệ phân bổ đều giữa bác sĩ | σ < 2 patients |

---

## 6. Performance Testing

### 6.1 Load Testing (Locust)

```python
# locustfile.py
from locust import HttpUser, task, between

class PatientUser(HttpUser):
    wait_time = between(1, 3)
    
    def on_start(self):
        # Login
        response = self.client.post("/api/auth/login/", json={
            "email": "test@example.com",
            "password": "password123"
        })
        self.token = response.json()["data"]["access"]
    
    @task(3)
    def view_clinics(self):
        self.client.get("/api/clinics/nearby/?lat=10.77&lng=106.70&radius=5000",
                       headers={"Authorization": f"Bearer {self.token}"})
    
    @task(2)
    def get_optimal_slots(self):
        self.client.get("/api/appointments/optimal-slots/?clinic_id=1&date=2026-09-15",
                       headers={"Authorization": f"Bearer {self.token}"})
    
    @task(1)
    def chat_query(self):
        self.client.post("/api/chat/", 
                        json={"message": "Tôi bị đau đầu", "session_id": 1},
                        headers={"Authorization": f"Bearer {self.token}"})
```

### 6.2 Performance Targets

| Endpoint | Concurrent Users | Response Time (p95) | Throughput |
|----------|-----------------|---------------------|------------|
| GET /clinics/nearby/ | 50 | < 200ms | > 100 req/s |
| GET /appointments/optimal-slots/ | 30 | < 500ms | > 50 req/s |
| POST /chat/ | 20 | < 5s | > 10 req/s |
| POST /xray/analyze/ | 10 | < 3s | > 5 req/s |
| Auth endpoints | 100 | < 100ms | > 200 req/s |

---

## 7. Security Testing Checklist

- [ ] SQL Injection: Test tất cả input fields
- [ ] XSS: Test text input hiển thị trên UI
- [ ] CSRF: Verify CSRF protection trên forms
- [ ] JWT: Test expired token, tampered token, missing token
- [ ] RBAC: Patient không access Doctor endpoints (và ngược lại)
- [ ] File Upload: Test upload file không phải ảnh, file quá lớn
- [ ] Rate Limiting: Verify rate limit hoạt động đúng
- [ ] CORS: Verify chỉ allow Frontend origin
