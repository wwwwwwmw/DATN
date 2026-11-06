# ⚙️ Backend API — Tài liệu Kỹ thuật & Checklist Nghiệp vụ

> **Công nghệ:** Python 3.11+ / Django 5 / Django REST Framework / Django Channels  
> **Port:** 8000  
> **Vai trò:** API gateway, xử lý nghiệp vụ, xác thực, GIS, WebSocket signaling, Simulated Annealing

---

## 📁 Cấu trúc thư mục đề xuất

```
backend-api/
├── config/                     # Project settings
│   ├── __init__.py
│   ├── settings/
│   │   ├── __init__.py
│   │   ├── base.py             # Shared settings
│   │   ├── development.py      # Dev-specific
│   │   └── production.py       # Prod-specific
│   ├── urls.py                 # Root URL config
│   ├── asgi.py                 # ASGI entry (Channels)
│   └── wsgi.py                 # WSGI entry (Gunicorn)
├── apps/
│   ├── accounts/               # User & Authentication
│   │   ├── models.py           # CustomUser, DoctorProfile, PatientProfile
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── permissions.py      # IsDoctor, IsPatient, IsAdmin
│   │   ├── backends.py         # JWT Authentication Backend
│   │   └── tests/
│   ├── appointments/           # Lịch hẹn & Scheduling
│   │   ├── models.py           # Appointment, TimeSlot, Schedule
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── services/
│   │   │   ├── simulated_annealing.py   # SA Algorithm
│   │   │   └── scheduling_service.py     # Business logic
│   │   └── tests/
│   ├── clinics/                # Phòng khám & GIS
│   │   ├── models.py           # Clinic (với PointField PostGIS)
│   │   ├── serializers.py
│   │   ├── views.py            # Nearby clinics (GIS query)
│   │   ├── urls.py
│   │   └── tests/
│   ├── medical_records/        # Hồ sơ y tế
│   │   ├── models.py           # MedicalRecord, XrayResult, ChatHistory
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   └── tests/
│   ├── xray/                   # Proxy tới AI-Vision service
│   │   ├── views.py            # Upload, forward to AI-Vision, save result
│   │   ├── serializers.py
│   │   ├── urls.py
│   │   └── services/
│   │       └── vision_client.py  # HTTP client gọi AI-Vision
│   ├── chat/                   # Proxy tới LLM-RAG service
│   │   ├── views.py
│   │   ├── serializers.py
│   │   ├── urls.py
│   │   └── services/
│   │       └── rag_client.py    # HTTP client gọi LLM-RAG
│   └── notifications/          # Thông báo
│       ├── models.py           # Notification
│       ├── views.py
│       └── services/
│           └── push_service.py
├── channels_app/               # WebSocket handling
│   ├── routing.py              # WebSocket URL routing
│   ├── consumers/
│   │   ├── videocall_consumer.py  # WebRTC signaling
│   │   └── chat_consumer.py       # RAG chat streaming
│   └── middleware.py           # JWT auth cho WebSocket
├── utils/
│   ├── pagination.py           # Custom pagination classes
│   ├── exceptions.py           # Custom exception handlers
│   └── helpers.py
├── manage.py
├── requirements/
│   ├── base.txt
│   ├── development.txt
│   └── production.txt
├── Dockerfile
├── docker-compose.yml
└── README.md
```

---

## 🔧 Dependencies chính

```txt
# requirements/base.txt
Django>=5.0,<6.0
djangorestframework>=3.15
djangorestframework-simplejwt>=5.3
django-cors-headers>=4.3
django-filter>=24.0
dj-database-url>=2.1
django-environ>=0.11

# PostgreSQL & GIS
psycopg2-binary>=2.9
django.contrib.gis               # Built-in (GeoDjango)

# WebSocket / Async
channels>=4.0
channels-redis>=4.1
daphne>=4.0

# HTTP Client (gọi AI-Vision, LLM-RAG)
httpx>=0.27
aiohttp>=3.9

# File handling
Pillow>=10.0

# Utilities
celery>=5.3                      # Background tasks (optional)
redis>=5.0
gunicorn>=22.0

# Testing
pytest-django>=4.8
factory-boy>=3.3
```

---

## ✅ Checklist Nghiệp vụ Chi tiết

### PHASE 1: Cấu hình & Cơ sở hạ tầng

- [ ] **BE-001** — Khởi tạo Django project (`django-admin startproject config .`)
- [ ] **BE-002** — Tách settings thành `base.py`, `development.py`, `production.py`
- [ ] **BE-003** — Cấu hình PostgreSQL + PostGIS trong `DATABASES`
- [ ] **BE-004** — Cấu hình `django-cors-headers` (allow Frontend origin)
- [ ] **BE-005** — Cấu hình `djangorestframework-simplejwt` (Access 15min, Refresh 7 days)
- [ ] **BE-006** — Cấu hình Django Channels + Redis channel layer
- [ ] **BE-007** — Tạo Dockerfile + docker-compose.yml
- [ ] **BE-008** — Cấu hình `MEDIA_ROOT` & `MEDIA_URL` cho upload ảnh X-quang
- [ ] **BE-009** — Custom Exception Handler (chuẩn hóa response format)

---

### PHASE 2: Accounts — Xác thực & Quản lý User

- [ ] **BE-010** — Model `CustomUser` (extends `AbstractUser`)
  ```python
  class CustomUser(AbstractUser):
      ROLE_CHOICES = [('PATIENT', 'Bệnh nhân'), ('DOCTOR', 'Bác sĩ'), ('ADMIN', 'Admin')]
      email = models.EmailField(unique=True)
      role = models.CharField(max_length=10, choices=ROLE_CHOICES)
      phone = models.CharField(max_length=15, blank=True)
      avatar = models.ImageField(upload_to='avatars/', blank=True)
      is_verified = models.BooleanField(default=False)
      
      USERNAME_FIELD = 'email'
      REQUIRED_FIELDS = ['username', 'role']
  ```

- [ ] **BE-011** — Model `DoctorProfile`
  ```python
  class DoctorProfile(models.Model):
      user = models.OneToOneField(CustomUser, on_delete=models.CASCADE)
      specialization = models.CharField(max_length=100)  # Chuyên khoa
      license_number = models.CharField(max_length=50)   # Số giấy phép hành nghề
      experience_years = models.IntegerField(default=0)
      bio = models.TextField(blank=True)
      clinic = models.ForeignKey('clinics.Clinic', on_delete=models.SET_NULL, null=True)
      consultation_fee = models.DecimalField(max_digits=10, decimal_places=0)
  ```

- [ ] **BE-012** — Model `PatientProfile`
  ```python
  class PatientProfile(models.Model):
      user = models.OneToOneField(CustomUser, on_delete=models.CASCADE)
      date_of_birth = models.DateField(null=True)
      gender = models.CharField(max_length=10)
      blood_type = models.CharField(max_length=5, blank=True)
      address = models.TextField(blank=True)
      emergency_contact = models.CharField(max_length=15, blank=True)
      medical_history = models.TextField(blank=True)  # Tiền sử bệnh
  ```

- [ ] **BE-013** — API Endpoints:
  ```
  POST   /api/auth/register/          # Đăng ký
  POST   /api/auth/login/             # Đăng nhập → JWT tokens
  POST   /api/auth/token/refresh/     # Refresh token
  POST   /api/auth/forgot-password/   # Quên mật khẩu
  POST   /api/auth/reset-password/    # Reset mật khẩu (với token)
  GET    /api/users/me/               # Thông tin user hiện tại
  PUT    /api/users/me/               # Cập nhật thông tin
  PATCH  /api/users/me/avatar/        # Upload avatar
  ```

- [ ] **BE-014** — Custom Permissions:
  ```python
  class IsDoctor(BasePermission):
      def has_permission(self, request, view):
          return request.user.role == 'DOCTOR'
  
  class IsPatient(BasePermission):
      def has_permission(self, request, view):
          return request.user.role == 'PATIENT'
  
  class IsAdmin(BasePermission):
      def has_permission(self, request, view):
          return request.user.role == 'ADMIN'
  ```

- [ ] **BE-015** — Signal tự động tạo Profile khi tạo User
  ```python
  @receiver(post_save, sender=CustomUser)
  def create_user_profile(sender, instance, created, **kwargs):
      if created:
          if instance.role == 'DOCTOR':
              DoctorProfile.objects.create(user=instance)
          elif instance.role == 'PATIENT':
              PatientProfile.objects.create(user=instance)
  ```

---

### PHASE 3: Clinics — Phòng khám & GIS (PostGIS)

- [ ] **BE-020** — Model `Clinic` (GeoDjango)
  ```python
  from django.contrib.gis.db import models as gis_models
  
  class Clinic(models.Model):
      name = models.CharField(max_length=200)
      address = models.TextField()
      location = gis_models.PointField(srid=4326)  # PostGIS Point
      phone = models.CharField(max_length=15)
      email = models.EmailField(blank=True)
      opening_hours = models.JSONField()  # {"mon": "08:00-17:00", ...}
      specializations = models.JSONField(default=list)  # ["Tim mạch", "Hô hấp"]
      rating = models.DecimalField(max_digits=3, decimal_places=2, default=0)
      is_active = models.BooleanField(default=True)
      image = models.ImageField(upload_to='clinics/', blank=True)
  ```

- [ ] **BE-021** — API tìm phòng khám lân cận
  ```python
  from django.contrib.gis.geos import Point
  from django.contrib.gis.db.models.functions import Distance
  
  class NearbyClinicView(ListAPIView):
      """
      GET /api/clinics/nearby/?lat=10.78&lng=106.69&radius=5000
      Trả về phòng khám trong bán kính (mét), sắp xếp theo khoảng cách
      """
      def get_queryset(self):
          lat = float(self.request.query_params['lat'])
          lng = float(self.request.query_params['lng'])
          radius = int(self.request.query_params.get('radius', 5000))
          
          user_location = Point(lng, lat, srid=4326)
          return Clinic.objects.filter(
              location__distance_lte=(user_location, D(m=radius)),
              is_active=True
          ).annotate(
              distance=Distance('location', user_location)
          ).order_by('distance')
  ```

- [ ] **BE-022** — API Endpoints:
  ```
  GET    /api/clinics/                 # Danh sách phòng khám
  GET    /api/clinics/{id}/            # Chi tiết phòng khám
  GET    /api/clinics/nearby/          # Tìm phòng khám lân cận (GIS)
  POST   /api/clinics/                 # Tạo phòng khám (Admin)
  PUT    /api/clinics/{id}/            # Cập nhật phòng khám (Admin)
  DELETE /api/clinics/{id}/            # Xóa phòng khám (Admin)
  GET    /api/clinics/{id}/doctors/    # Danh sách bác sĩ tại phòng khám
  ```

---

### PHASE 4: Appointments — Lịch hẹn & Simulated Annealing

- [ ] **BE-030** — Model `TimeSlot`
  ```python
  class TimeSlot(models.Model):
      doctor = models.ForeignKey(DoctorProfile, on_delete=models.CASCADE)
      clinic = models.ForeignKey(Clinic, on_delete=models.CASCADE)
      date = models.DateField()
      start_time = models.TimeField()
      end_time = models.TimeField()
      is_available = models.BooleanField(default=True)
      max_patients = models.IntegerField(default=1)
      current_patients = models.IntegerField(default=0)
  ```

- [ ] **BE-031** — Model `Appointment`
  ```python
  class Appointment(models.Model):
      STATUS_CHOICES = [
          ('PENDING', 'Chờ xác nhận'),
          ('CONFIRMED', 'Đã xác nhận'),
          ('CANCELLED', 'Đã hủy'),
          ('COMPLETED', 'Hoàn thành'),
          ('NO_SHOW', 'Vắng mặt'),
      ]
      patient = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
      doctor = models.ForeignKey(DoctorProfile, on_delete=models.CASCADE)
      clinic = models.ForeignKey(Clinic, on_delete=models.CASCADE)
      time_slot = models.ForeignKey(TimeSlot, on_delete=models.CASCADE)
      status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='PENDING')
      reason = models.TextField(blank=True)        # Lý do khám
      notes = models.TextField(blank=True)          # Ghi chú bác sĩ
      sa_score = models.FloatField(default=0)       # Score từ SA algorithm
      created_at = models.DateTimeField(auto_now_add=True)
      updated_at = models.DateTimeField(auto_now=True)
  ```

- [ ] **BE-032** — **Giải thuật Simulated Annealing (SA)**
  ```python
  # apps/appointments/services/simulated_annealing.py
  
  import math
  import random
  
  class AppointmentScheduler:
      """
      Simulated Annealing để tối ưu hóa lịch hẹn.
      
      Mục tiêu tối ưu (hàm mục tiêu - objective function):
      - Minimize khoảng cách bệnh nhân → phòng khám
      - Minimize thời gian chờ đợi
      - Maximize sự phân bổ đều giữa các bác sĩ
      - Ưu tiên khung giờ phù hợp với lịch bệnh nhân
      
      Parameters:
      - T_initial: Nhiệt độ ban đầu (1000)
      - T_min: Nhiệt độ tối thiểu (1)
      - alpha: Hệ số làm nguội (0.995)
      - max_iterations: Số lần lặp tối đa (10000)
      """
      
      def __init__(self, T_initial=1000, T_min=1, alpha=0.995, max_iterations=10000):
          self.T = T_initial
          self.T_min = T_min
          self.alpha = alpha
          self.max_iter = max_iterations
      
      def objective_function(self, solution, patient_location, clinic_locations, 
                             slot_loads, patient_preferences):
          """
          Hàm mục tiêu cần tối thiểu hóa.
          
          cost = w1 * distance_cost      (khoảng cách GIS)
               + w2 * wait_time_cost     (thời gian chờ dự kiến)
               + w3 * load_balance_cost  (cân bằng tải bác sĩ)
               + w4 * preference_cost    (khung giờ ưa thích)
          """
          # Implementation...
          pass
      
      def neighbor(self, current_solution):
          """Tạo lời giải lân cận bằng cách swap/shift slot"""
          pass
      
      def solve(self, available_slots, patient_data):
          """
          Chạy SA, trả về danh sách slots được rank theo score.
          Return: List[{slot_id, score, reasons}]
          """
          current = self.initial_solution(available_slots)
          best = current
          
          while self.T > self.T_min:
              for _ in range(self.max_iter):
                  new_solution = self.neighbor(current)
                  delta = self.objective_function(new_solution) - self.objective_function(current)
                  
                  if delta < 0 or random.random() < math.exp(-delta / self.T):
                      current = new_solution
                      if self.objective_function(current) < self.objective_function(best):
                          best = current
              
              self.T *= self.alpha
          
          return self.rank_slots(best)
  ```

- [ ] **BE-033** — API Endpoints:
  ```
  GET    /api/appointments/                    # Danh sách lịch hẹn (của user hiện tại)
  POST   /api/appointments/                    # Tạo lịch hẹn mới
  GET    /api/appointments/{id}/               # Chi tiết lịch hẹn
  PATCH  /api/appointments/{id}/status/        # Cập nhật trạng thái (Doctor/Admin)
  DELETE /api/appointments/{id}/               # Hủy lịch hẹn (trước 24h)
  GET    /api/appointments/optimal-slots/      # Lấy khung giờ tối ưu (SA)
       Query params: clinic_id, doctor_id, date, patient_lat, patient_lng
  GET    /api/appointments/doctor/             # Lịch hẹn của bác sĩ (Doctor only)
  ```

- [ ] **BE-034** — Business Rules:
  - Bệnh nhân không thể đặt 2 lịch cùng khung giờ
  - Chỉ hủy trước 24 giờ
  - Bác sĩ xác nhận → thông báo bệnh nhân
  - Tự động chuyển sang `COMPLETED` sau giờ hẹn + 2h
  - Tự động chuyển sang `NO_SHOW` nếu không check-in

---

### PHASE 5: Medical Records — Hồ sơ y tế

- [ ] **BE-040** — Model `MedicalRecord`
  ```python
  class MedicalRecord(models.Model):
      patient = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
      doctor = models.ForeignKey(DoctorProfile, on_delete=models.CASCADE)
      appointment = models.OneToOneField(Appointment, on_delete=models.CASCADE)
      diagnosis = models.TextField()           # Chẩn đoán
      symptoms = models.TextField()            # Triệu chứng
      prescription = models.TextField()        # Đơn thuốc
      notes = models.TextField(blank=True)     # Ghi chú thêm
      follow_up_date = models.DateField(null=True, blank=True)
      created_at = models.DateTimeField(auto_now_add=True)
  ```

- [ ] **BE-041** — Model `XrayAnalysisResult`
  ```python
  class XrayAnalysisResult(models.Model):
      patient = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
      original_image = models.ImageField(upload_to='xrays/originals/')
      heatmap_image = models.ImageField(upload_to='xrays/heatmaps/', blank=True)
      predictions = models.JSONField()  # {"Cardiomegaly": 0.85, "Effusion": 0.12, ...}
      doctor_review = models.TextField(blank=True)
      doctor_agrees_with_ai = models.BooleanField(null=True)
      reviewed_by = models.ForeignKey(DoctorProfile, null=True, on_delete=models.SET_NULL)
      created_at = models.DateTimeField(auto_now_add=True)
  ```

- [ ] **BE-042** — Model `ChatSession` & `ChatMessage`
  ```python
  class ChatSession(models.Model):
      patient = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
      title = models.CharField(max_length=200, default='Phiên tư vấn mới')
      created_at = models.DateTimeField(auto_now_add=True)
  
  class ChatMessage(models.Model):
      session = models.ForeignKey(ChatSession, on_delete=models.CASCADE)
      role = models.CharField(max_length=10)  # 'user' or 'assistant'
      content = models.TextField()
      created_at = models.DateTimeField(auto_now_add=True)
  ```

---

### PHASE 6: X-ray Proxy — Kết nối AI-Vision Service

- [ ] **BE-050** — Service Client gọi AI-Vision
  ```python
  # apps/xray/services/vision_client.py
  import httpx
  
  class VisionClient:
      BASE_URL = settings.AI_VISION_URL  # http://ai-vision:8001
      
      async def analyze_xray(self, image_bytes: bytes) -> dict:
          """
          Gửi ảnh X-quang tới AI-Vision service.
          Returns: {"predictions": {...}, "heatmap_base64": "..."}
          """
          async with httpx.AsyncClient(timeout=60) as client:
              response = await client.post(
                  f"{self.BASE_URL}/api/predict/",
                  files={"image": ("xray.jpg", image_bytes, "image/jpeg")}
              )
              response.raise_for_status()
              return response.json()
  ```

- [ ] **BE-051** — API Endpoints:
  ```
  POST   /api/xray/analyze/            # Upload ảnh → forward tới AI-Vision → lưu kết quả
  GET    /api/xray/results/            # Lịch sử kết quả phân tích (của user)
  GET    /api/xray/results/{id}/       # Chi tiết kết quả
  PATCH  /api/xray/results/{id}/review/ # Bác sĩ review kết quả AI
  ```

---

### PHASE 7: Chat Proxy — Kết nối LLM-RAG Service

- [ ] **BE-060** — Service Client gọi LLM-RAG
  ```python
  # apps/chat/services/rag_client.py
  import httpx
  
  class RAGClient:
      BASE_URL = settings.LLM_RAG_URL  # http://llm-rag:8002
      
      async def get_medical_advice(self, symptoms: str, chat_history: list) -> str:
          """
          Gửi triệu chứng tới LLM-RAG service.
          Returns: Lời khuyên y tế từ RAG pipeline
          """
          async with httpx.AsyncClient(timeout=120) as client:
              response = await client.post(
                  f"{self.BASE_URL}/api/chat/",
                  json={
                      "query": symptoms,
                      "chat_history": chat_history
                  }
              )
              response.raise_for_status()
              return response.json()["answer"]
  ```

- [ ] **BE-061** — API Endpoints:
  ```
  POST   /api/chat/                    # Gửi triệu chứng → nhận lời khuyên
  GET    /api/chat/sessions/           # Danh sách phiên chat
  GET    /api/chat/sessions/{id}/      # Lịch sử tin nhắn trong phiên
  DELETE /api/chat/sessions/{id}/      # Xóa phiên chat
  ```

---

### PHASE 8: WebSocket — Django Channels

- [ ] **BE-070** — WebRTC Signaling Consumer
  ```python
  # channels_app/consumers/videocall_consumer.py
  
  class VideoCallConsumer(AsyncJsonWebsocketConsumer):
      """
      WebSocket consumer xử lý signaling cho WebRTC Video Call.
      
      Protocol:
      - Client gửi: {"type": "join_room", "room_id": "..."}
      - Server broadcast: {"type": "user_joined", "user_id": "..."}
      - Client gửi: {"type": "offer", "sdp": "...", "target": "user_id"}
      - Client gửi: {"type": "answer", "sdp": "...", "target": "user_id"}
      - Client gửi: {"type": "ice_candidate", "candidate": "...", "target": "user_id"}
      - Client gửi: {"type": "leave_room"}
      """
      
      async def connect(self):
          self.room_id = self.scope['url_route']['kwargs']['room_id']
          self.room_group = f'videocall_{self.room_id}'
          await self.channel_layer.group_add(self.room_group, self.channel_name)
          await self.accept()
      
      async def receive_json(self, content):
          msg_type = content.get('type')
          if msg_type == 'offer':
              await self.channel_layer.group_send(self.room_group, {
                  'type': 'relay.offer',
                  'sdp': content['sdp'],
                  'sender': self.scope['user'].id
              })
          # ... handle answer, ice_candidate, etc.
  ```

- [ ] **BE-071** — Chat Streaming Consumer
  ```python
  class ChatConsumer(AsyncJsonWebsocketConsumer):
      """
      WebSocket consumer cho RAG chat streaming.
      Cho phép gửi response từng token thay vì chờ toàn bộ.
      """
      async def receive_json(self, content):
          query = content.get('message')
          session_id = content.get('session_id')
          
          # Stream response tokens
          async for token in self.rag_client.stream_response(query):
              await self.send_json({
                  'type': 'token',
                  'content': token
              })
          
          await self.send_json({'type': 'end'})
  ```

- [ ] **BE-072** — WebSocket Authentication Middleware
  ```python
  class JWTAuthMiddleware:
      """Xác thực JWT cho WebSocket connections"""
      async def __call__(self, scope, receive, send):
          token = parse_token_from_query_string(scope)
          scope['user'] = await get_user_from_token(token)
          return await self.inner(scope, receive, send)
  ```

- [ ] **BE-073** — Channel Routing
  ```python
  # channels_app/routing.py
  websocket_urlpatterns = [
      re_path(r'ws/videocall/(?P<room_id>\w+)/$', VideoCallConsumer.as_asgi()),
      re_path(r'ws/chat/$', ChatConsumer.as_asgi()),
  ]
  ```

---

### PHASE 9: Admin & Statistics

- [ ] **BE-080** — Admin API Endpoints:
  ```
  GET    /api/admin/users/              # Danh sách tất cả users (paginated, filterable)
  PATCH  /api/admin/users/{id}/         # Cập nhật user (khóa/mở, đổi role)
  GET    /api/admin/statistics/         # Thống kê tổng quan
  GET    /api/admin/statistics/appointments/ # Thống kê lịch hẹn
  GET    /api/admin/statistics/diseases/     # Thống kê bệnh lý phổ biến
  ```

- [ ] **BE-081** — Statistics Service
  - Số lượt khám theo ngày/tuần/tháng
  - Top bệnh lý được phát hiện bởi AI
  - Tỷ lệ bác sĩ đồng ý với kết quả AI
  - Phân bổ bệnh nhân theo phòng khám
  - Thời gian chờ trung bình

---

## 🧪 Testing Checklist

- [ ] **BE-T01** — Unit tests cho Simulated Annealing algorithm
- [ ] **BE-T02** — Unit tests cho GIS queries (PostGIS distance calculations)
- [ ] **BE-T03** — Integration tests cho Auth flow (register → login → refresh)
- [ ] **BE-T04** — Integration tests cho Appointment booking flow
- [ ] **BE-T05** — WebSocket tests cho VideoCall signaling
- [ ] **BE-T06** — API tests cho X-ray proxy (mock AI-Vision service)
- [ ] **BE-T07** — API tests cho Chat proxy (mock LLM-RAG service)
- [ ] **BE-T08** — Permission tests (RBAC: Patient vs Doctor vs Admin access)
- [ ] **BE-T09** — Load testing với Locust (concurrent appointment bookings)

---

## ⚠️ Lưu ý quan trọng

1. **PostGIS PHẢI được cài trong PostgreSQL** — `CREATE EXTENSION postgis;`
2. **Simulated Annealing cần tuning** — T_initial, alpha, weights cần thử nghiệm thực tế
3. **WebSocket cần Redis** — Django Channels dùng Redis làm channel layer
4. **Async views cho proxy calls** — Gọi AI-Vision/LLM-RAG phải dùng async để không block
5. **File upload limit** — Cấu hình `DATA_UPLOAD_MAX_MEMORY_SIZE` cho ảnh X-quang
6. **GDPR / Bảo mật y tế** — Dữ liệu y tế cần mã hóa, log audit trail
