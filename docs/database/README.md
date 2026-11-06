# 🗄️ Database — Tài liệu Kỹ thuật & Checklist Nghiệp vụ

> **Công nghệ:** PostgreSQL 16  
> **Extensions:** PostGIS 3.4 + pgvector 0.5  
> **Port:** 5432  
> **Vai trò:** Lưu trữ dữ liệu quan hệ, truy vấn không gian GIS, vector similarity search

---

## 📁 Cấu trúc thư mục đề xuất

```
database/
├── schemas/
│   ├── 001_extensions.sql          # CREATE EXTENSION postgis, vector
│   ├── 002_accounts.sql            # Users, DoctorProfile, PatientProfile
│   ├── 003_clinics.sql             # Clinics (with PostGIS PointField)
│   ├── 004_appointments.sql        # Appointments, TimeSlots, Schedules
│   ├── 005_medical_records.sql     # MedicalRecord, XrayResult, ChatSession
│   ├── 006_medical_documents.sql   # Vector store cho RAG (pgvector)
│   └── 007_notifications.sql       # Notifications
├── seeds/
│   ├── seed_users.sql              # Dữ liệu mẫu users
│   ├── seed_clinics.sql            # Dữ liệu mẫu phòng khám (TP.HCM)
│   ├── seed_doctors.sql            # Dữ liệu mẫu bác sĩ
│   └── seed_timeslots.sql          # Dữ liệu mẫu khung giờ
├── migrations/                     # Django migrations (auto-generated)
├── backups/
│   └── backup_cron.sh              # Script backup định kỳ
├── scripts/
│   ├── init_db.sh                  # Khởi tạo database & extensions
│   ├── restore_db.sh               # Restore từ backup
│   └── performance_check.sql       # Kiểm tra performance queries
├── Dockerfile                      # PostgreSQL + PostGIS + pgvector image
├── docker-compose.yml
└── README.md
```

---

## 📊 Entity Relationship Diagram (ERD)

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   CustomUser     │     │  DoctorProfile   │     │  PatientProfile  │
├──────────────────┤     ├──────────────────┤     ├──────────────────┤
│ id (PK)          │◄──┐ │ id (PK)          │     │ id (PK)          │
│ email (UNIQUE)   │   │ │ user_id (FK) ────│──►  │ user_id (FK) ────│──►
│ username         │   │ │ specialization   │     │ date_of_birth    │
│ password_hash    │   │ │ license_number   │     │ gender           │
│ role (ENUM)      │   │ │ experience_years │     │ blood_type       │
│ phone            │   │ │ bio              │     │ address          │
│ avatar           │   │ │ clinic_id (FK)───│──┐  │ emergency_contact│
│ is_verified      │   │ │ consultation_fee │  │  │ medical_history  │
│ is_active        │   │ └──────────────────┘  │  └──────────────────┘
│ created_at       │   │                       │
│ updated_at       │   │                       │
└──────────────────┘   │  ┌──────────────────┐ │
                       │  │     Clinic       │◄┘
                       │  ├──────────────────┤
                       │  │ id (PK)          │
                       │  │ name             │
                       │  │ address          │
                       │  │ location (POINT) │ ← PostGIS geometry
                       │  │ phone            │
                       │  │ opening_hours    │ ← JSONB
                       │  │ specializations  │ ← JSONB
                       │  │ rating           │
                       │  │ is_active        │
                       │  └──────────────────┘
                       │
    ┌──────────────────┤  ┌──────────────────┐
    │                  │  │    TimeSlot      │
    │                  │  ├──────────────────┤
    │                  │  │ id (PK)          │
    │                  │  │ doctor_id (FK)   │
    │                  │  │ clinic_id (FK)   │
    │                  │  │ date             │
    │                  │  │ start_time       │
    │                  │  │ end_time         │
    │                  │  │ is_available     │
    │                  │  │ max_patients     │
    │                  │  │ current_patients │
    │                  │  └────────┬─────────┘
    │                  │           │
    │  ┌───────────────┴───────┐   │
    │  │    Appointment       │◄──┘
    │  ├──────────────────────┤
    │  │ id (PK)              │
    │  │ patient_id (FK)──────│──► CustomUser
    │  │ doctor_id (FK)───────│──► DoctorProfile
    │  │ clinic_id (FK)───────│──► Clinic
    │  │ time_slot_id (FK)────│──► TimeSlot
    │  │ status (ENUM)        │
    │  │ reason               │
    │  │ notes                │
    │  │ sa_score             │ ← Score từ Simulated Annealing
    │  │ created_at           │
    │  │ updated_at           │
    │  └──────────┬───────────┘
    │             │
    │  ┌──────────┴───────────┐
    │  │  MedicalRecord      │
    │  ├──────────────────────┤
    │  │ id (PK)              │
    │  │ patient_id (FK)      │
    │  │ doctor_id (FK)       │
    │  │ appointment_id (FK)  │
    │  │ diagnosis            │
    │  │ symptoms             │
    │  │ prescription         │
    │  │ notes                │
    │  │ follow_up_date       │
    │  │ created_at           │
    │  └──────────────────────┘
    │
    │  ┌──────────────────────┐
    │  │ XrayAnalysisResult  │
    │  ├──────────────────────┤
    │  │ id (PK)              │
    │  │ patient_id (FK)──────│──► CustomUser
    │  │ original_image       │
    │  │ heatmap_image        │
    │  │ predictions (JSONB)  │
    │  │ doctor_review        │
    │  │ doctor_agrees_ai     │
    │  │ reviewed_by (FK)─────│──► DoctorProfile
    │  │ created_at           │
    │  └──────────────────────┘
    │
    │  ┌──────────────────────┐     ┌──────────────────┐
    │  │   ChatSession       │     │   ChatMessage    │
    │  ├──────────────────────┤     ├──────────────────┤
    │  │ id (PK)              │◄────│ session_id (FK)  │
    │  │ patient_id (FK)──────│──►  │ id (PK)          │
    │  │ title                │     │ role (ENUM)      │
    │  │ created_at           │     │ content          │
    │  └──────────────────────┘     │ created_at       │
    │                               └──────────────────┘
    │
    │  ┌──────────────────────────────────────────────────┐
    │  │        MedicalDocument (pgvector)                │
    │  ├──────────────────────────────────────────────────┤
    │  │ id (PK)                                          │
    │  │ content (TEXT)                                    │
    │  │ embedding (vector(1536))  ← pgvector             │
    │  │ metadata (JSONB)                                  │
    │  │ source_file                                       │
    │  │ chunk_index                                       │
    │  │ created_at                                        │
    │  └──────────────────────────────────────────────────┘
    │
    │  ┌──────────────────────┐
    │  │   Notification      │
    │  ├──────────────────────┤
    │  │ id (PK)              │
    │  │ user_id (FK)─────────│──► CustomUser
    │  │ title                │
    │  │ message              │
    │  │ type (ENUM)          │
    │  │ is_read              │
    │  │ created_at           │
    │  └──────────────────────┘
```

---

## ✅ Checklist Nghiệp vụ Chi tiết

### PHASE 1: Khởi tạo Database

- [ ] **DB-001** — Cài đặt PostgreSQL 16
- [ ] **DB-002** — Kích hoạt extension PostGIS
  ```sql
  CREATE EXTENSION IF NOT EXISTS postgis;
  CREATE EXTENSION IF NOT EXISTS postgis_topology;
  SELECT PostGIS_Version();  -- Verify: 3.4.x
  ```

- [ ] **DB-003** — Kích hoạt extension pgvector
  ```sql
  CREATE EXTENSION IF NOT EXISTS vector;
  SELECT extversion FROM pg_extension WHERE extname = 'vector';  -- Verify: 0.5.x
  ```

- [ ] **DB-004** — Tạo database và user
  ```sql
  CREATE USER medtech_user WITH PASSWORD 'secure_password';
  CREATE DATABASE medtech_db OWNER medtech_user;
  GRANT ALL PRIVILEGES ON DATABASE medtech_db TO medtech_user;
  
  \c medtech_db
  CREATE EXTENSION postgis;
  CREATE EXTENSION vector;
  ```

- [ ] **DB-005** — Dockerfile cho database
  ```dockerfile
  FROM postgis/postgis:16-3.4
  
  # Install pgvector
  RUN apt-get update && apt-get install -y \
      build-essential \
      git \
      postgresql-server-dev-16 \
      && git clone --branch v0.5.1 https://github.com/pgvector/pgvector.git \
      && cd pgvector \
      && make && make install \
      && rm -rf /pgvector \
      && apt-get remove -y build-essential git postgresql-server-dev-16 \
      && apt-get autoremove -y
  
  COPY schemas/ /docker-entrypoint-initdb.d/
  ```

---

### PHASE 2: Schema Definitions

- [ ] **DB-010** — Schema `accounts` (xem ERD trên)
  - Indexes: `email` (UNIQUE), `role`, `is_active`
  - Constraints: `role IN ('PATIENT', 'DOCTOR', 'ADMIN')`

- [ ] **DB-011** — Schema `clinics`
  - **PostGIS PointField** cho `location`
  - **Spatial Index:** `CREATE INDEX idx_clinic_location ON clinics USING GIST (location);`
  - **JSONB Index:** `CREATE INDEX idx_clinic_hours ON clinics USING GIN (opening_hours);`

- [ ] **DB-012** — Schema `appointments`
  - **Composite index:** `(doctor_id, date, start_time)` cho scheduling queries
  - **Constraint:** `CHECK (end_time > start_time)`
  - **Constraint:** Unique constraint `(patient_id, time_slot_id)` — 1 bệnh nhân 1 slot

- [ ] **DB-013** — Schema `medical_documents` (pgvector)
  - **IVFFlat index:** Cho approximate nearest neighbor search
    ```sql
    CREATE INDEX idx_doc_embedding ON medical_documents 
        USING ivfflat (embedding vector_cosine_ops) 
        WITH (lists = 100);
    ```
  - **Lưu ý:** `lists` parameter nên = sqrt(total_rows), rebuild index khi data tăng đáng kể

---

### PHASE 3: GIS Queries (PostGIS)

- [ ] **DB-020** — Insert phòng khám với tọa độ GPS
  ```sql
  INSERT INTO clinics (name, address, location, phone) VALUES (
      'Phòng khám Đa khoa Sài Gòn',
      '125 Lê Lợi, Quận 1, TP.HCM',
      ST_SetSRID(ST_MakePoint(106.6985, 10.7735), 4326),  -- (lng, lat)
      '028-1234-5678'
  );
  ```

- [ ] **DB-021** — Query tìm phòng khám gần nhất
  ```sql
  -- Tìm phòng khám trong bán kính 5km, sắp xếp theo khoảng cách
  SELECT 
      id, name, address,
      ST_Distance(
          location::geography, 
          ST_SetSRID(ST_MakePoint(106.6985, 10.7735), 4326)::geography
      ) AS distance_meters
  FROM clinics
  WHERE ST_DWithin(
      location::geography,
      ST_SetSRID(ST_MakePoint(106.6985, 10.7735), 4326)::geography,
      5000  -- 5000 meters = 5km
  )
  AND is_active = TRUE
  ORDER BY distance_meters ASC
  LIMIT 10;
  ```

- [ ] **DB-022** — Query tính khoảng cách bệnh nhân → bác sĩ
  ```sql
  -- Dùng cho Simulated Annealing: tính khoảng cách từ bệnh nhân tới mỗi clinic
  SELECT 
      c.id AS clinic_id,
      c.name,
      d.id AS doctor_id,
      d.specialization,
      ST_Distance(
          c.location::geography,
          ST_SetSRID(ST_MakePoint(:patient_lng, :patient_lat), 4326)::geography
      ) / 1000.0 AS distance_km  -- Convert to km
  FROM clinics c
  JOIN doctor_profiles d ON d.clinic_id = c.id
  WHERE c.is_active = TRUE
  ORDER BY distance_km ASC;
  ```

---

### PHASE 4: Vector Queries (pgvector)

- [ ] **DB-030** — Insert document embedding
  ```sql
  INSERT INTO medical_documents (content, embedding, metadata, source_file, chunk_index)
  VALUES (
      'Viêm phổi là tình trạng nhiễm trùng phổi...',
      '[0.123, -0.456, 0.789, ...]'::vector,  -- 1536 dimensions
      '{"source": "Nội khoa cơ bản", "chapter": "5", "page": "120"}',
      'noikha_coban.pdf',
      42
  );
  ```

- [ ] **DB-031** — Similarity search query
  ```sql
  -- Tìm 5 documents gần nhất với query vector
  SELECT 
      id, content, metadata,
      1 - (embedding <=> :query_vector) AS similarity_score
  FROM medical_documents
  ORDER BY embedding <=> :query_vector  -- Cosine distance
  LIMIT 5;
  ```

- [ ] **DB-032** — Filtered similarity search
  ```sql
  -- Tìm documents liên quan, filter theo loại tài liệu
  SELECT id, content, metadata,
      1 - (embedding <=> :query_vector) AS similarity_score
  FROM medical_documents
  WHERE metadata->>'type' = 'clinical_guideline'
  ORDER BY embedding <=> :query_vector
  LIMIT 5;
  ```

---

### PHASE 5: Seed Data

- [ ] **DB-040** — Seed phòng khám TP.HCM (10-20 phòng khám mẫu)
  ```sql
  -- Các phòng khám thực tế tại TP.HCM (tọa độ thực)
  INSERT INTO clinics (name, address, location, specializations) VALUES
  ('BV Chợ Rẫy', '201B Nguyễn Chí Thanh, Q.5', ST_SetSRID(ST_MakePoint(106.6527, 10.7565), 4326), '["Đa khoa", "Tim mạch", "Hô hấp"]'),
  ('BV Nhân Dân 115', '527 Sư Vạn Hạnh, Q.10', ST_SetSRID(ST_MakePoint(106.6669, 10.7730), 4326), '["Đa khoa", "Cấp cứu"]'),
  ('BV ĐH Y Dược', '215 Hồng Bàng, Q.5', ST_SetSRID(ST_MakePoint(106.6583, 10.7588), 4326), '["Đa khoa", "Nhi khoa"]'),
  ('BV Phạm Ngọc Thạch', '120 Hùng Vương, Q.5', ST_SetSRID(ST_MakePoint(106.6530, 10.7555), 4326), '["Hô hấp", "Phổi"]');
  -- ... thêm nữa
  ```

- [ ] **DB-041** — Seed users mẫu
- [ ] **DB-042** — Seed doctors mẫu
- [ ] **DB-043** — Seed time slots mẫu (1 tuần tới)

---

### PHASE 6: Performance & Maintenance

- [ ] **DB-050** — Index optimization
  ```sql
  -- Kiểm tra index usage
  SELECT 
      schemaname, tablename, indexname, idx_scan, idx_tup_read
  FROM pg_stat_user_indexes
  ORDER BY idx_scan DESC;
  
  -- Kiểm tra slow queries
  SELECT query, calls, mean_exec_time, total_exec_time
  FROM pg_stat_statements
  ORDER BY mean_exec_time DESC
  LIMIT 10;
  ```

- [ ] **DB-051** — Backup strategy
  ```bash
  # Daily backup
  pg_dump -U medtech_user -d medtech_db -F c -f backup_$(date +%Y%m%d).dump
  
  # Restore
  pg_restore -U medtech_user -d medtech_db backup_20260910.dump
  ```

- [ ] **DB-052** — Monitoring queries
  - Kích thước database
  - Kích thước từng bảng
  - Connection pool status
  - Replication lag (nếu có replica)

---

## 🧪 Testing Checklist

- [ ] **DB-T01** — Verify PostGIS extension hoạt động (ST_Distance query)
- [ ] **DB-T02** — Verify pgvector extension hoạt động (cosine similarity query)
- [ ] **DB-T03** — Test spatial index performance (1000 clinics, nearby query < 50ms)
- [ ] **DB-T04** — Test vector index performance (100K embeddings, similarity search < 100ms)
- [ ] **DB-T05** — Test foreign key constraints (cascade delete, set null)
- [ ] **DB-T06** — Test concurrent appointment booking (no duplicate slot)
- [ ] **DB-T07** — Backup & restore test

---

## ⚠️ Lưu ý quan trọng

1. **PostGIS coordinates: (longitude, latitude)** — KHÔNG PHẢI (lat, lng)! Sai thứ tự = vị trí sai
2. **SRID 4326** — Luôn sử dụng SRID 4326 (WGS84) cho tọa độ GPS
3. **pgvector IVFFlat cần training** — Index cần đủ data để hiệu quả (≥1000 rows)
4. **JSONB vs JSON** — Luôn dùng JSONB (binary, indexable), không dùng JSON
5. **Mã hóa dữ liệu y tế** — Cân nhắc column-level encryption cho dữ liệu nhạy cảm
6. **Connection pooling** — Dùng pgBouncer cho production (Django default pool nhỏ)
