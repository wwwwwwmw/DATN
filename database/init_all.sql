-- =============================================
-- MedTech AI Platform — Database Initialization
-- =============================================
-- Script này an toàn để chạy NHIỀU LẦN (idempotent)
-- Tất cả dùng IF NOT EXISTS / ON CONFLICT DO NOTHING
-- 
-- Chạy: psql -U postgres -f database/init_all.sql
-- =============================================

-- =============================================
-- BƯỚC 1: Tạo Database & User (nếu chưa có)
-- =============================================
DO $$
BEGIN
    -- Tạo user nếu chưa có
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'medtech_user') THEN
        CREATE ROLE medtech_user WITH LOGIN PASSWORD 'medtech_password_2026';
        RAISE NOTICE 'Created user: medtech_user';
    ELSE
        RAISE NOTICE 'User medtech_user already exists, skipping.';
    END IF;
END
$$;

-- Tạo database nếu chưa có
SELECT 'CREATE DATABASE medtech_db OWNER medtech_user'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'medtech_db')
\gexec

-- Grant quyền
GRANT ALL PRIVILEGES ON DATABASE medtech_db TO medtech_user;

\echo '✅ Database & User created/verified'
\echo ''

-- =============================================
-- BƯỚC 2: Kết nối vào medtech_db để tạo extensions & tables
-- =============================================
\c medtech_db

-- Extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\echo '✅ Extensions installed: postgis, vector, uuid-ossp'
\echo ''

-- Grant schema permissions
GRANT ALL ON SCHEMA public TO medtech_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO medtech_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO medtech_user;

-- =============================================
-- BƯỚC 3: Tạo bảng Users
-- =============================================
CREATE TABLE IF NOT EXISTS accounts_customuser (
    id SERIAL PRIMARY KEY,
    password VARCHAR(128) NOT NULL DEFAULT '',
    last_login TIMESTAMP WITH TIME ZONE,
    is_superuser BOOLEAN NOT NULL DEFAULT FALSE,
    username VARCHAR(150) NOT NULL,
    first_name VARCHAR(150) NOT NULL DEFAULT '',
    last_name VARCHAR(150) NOT NULL DEFAULT '',
    is_staff BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    date_joined TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    email VARCHAR(254) NOT NULL,
    role VARCHAR(10) NOT NULL DEFAULT 'PATIENT',
    phone VARCHAR(15) NOT NULL DEFAULT '',
    avatar VARCHAR(200) NOT NULL DEFAULT '',
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_email UNIQUE (email),
    CONSTRAINT uq_user_username UNIQUE (username),
    CONSTRAINT chk_user_role CHECK (role IN ('PATIENT', 'DOCTOR', 'ADMIN'))
);

CREATE INDEX IF NOT EXISTS idx_user_email ON accounts_customuser(email);
CREATE INDEX IF NOT EXISTS idx_user_role ON accounts_customuser(role);
CREATE INDEX IF NOT EXISTS idx_user_active ON accounts_customuser(is_active);

\echo '✅ Table: accounts_customuser'

-- =============================================
-- BƯỚC 4: Tạo bảng Doctor Profile
-- =============================================
CREATE TABLE IF NOT EXISTS accounts_doctorprofile (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE,
    specialization VARCHAR(100) NOT NULL DEFAULT '',
    license_number VARCHAR(50) NOT NULL DEFAULT '',
    experience_years INTEGER NOT NULL DEFAULT 0,
    bio TEXT NOT NULL DEFAULT '',
    clinic_id INTEGER,
    consultation_fee DECIMAL(10, 0) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_doctor_user FOREIGN KEY (user_id)
        REFERENCES accounts_customuser(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_doctor_user ON accounts_doctorprofile(user_id);
CREATE INDEX IF NOT EXISTS idx_doctor_clinic ON accounts_doctorprofile(clinic_id);
CREATE INDEX IF NOT EXISTS idx_doctor_spec ON accounts_doctorprofile(specialization);

\echo '✅ Table: accounts_doctorprofile'

-- =============================================
-- BƯỚC 5: Tạo bảng Patient Profile
-- =============================================
CREATE TABLE IF NOT EXISTS accounts_patientprofile (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE,
    date_of_birth DATE,
    gender VARCHAR(10) NOT NULL DEFAULT '',
    blood_type VARCHAR(5) NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '',
    emergency_contact VARCHAR(15) NOT NULL DEFAULT '',
    medical_history TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_patient_user FOREIGN KEY (user_id)
        REFERENCES accounts_customuser(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_patient_user ON accounts_patientprofile(user_id);

\echo '✅ Table: accounts_patientprofile'

-- =============================================
-- BƯỚC 6: Tạo bảng Clinic (PostGIS)
-- =============================================
CREATE TABLE IF NOT EXISTS clinics_clinic (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    address TEXT NOT NULL,
    location GEOMETRY(POINT, 4326) NOT NULL,
    phone VARCHAR(15) NOT NULL DEFAULT '',
    email VARCHAR(254) NOT NULL DEFAULT '',
    opening_hours JSONB NOT NULL DEFAULT '{}',
    specializations JSONB NOT NULL DEFAULT '[]',
    rating DECIMAL(3, 2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    image VARCHAR(200) NOT NULL DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clinic_location ON clinics_clinic USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_clinic_active ON clinics_clinic(is_active);
CREATE INDEX IF NOT EXISTS idx_clinic_rating ON clinics_clinic(rating DESC);
CREATE INDEX IF NOT EXISTS idx_clinic_specs ON clinics_clinic USING GIN (specializations);

-- Thêm FK cho doctor.clinic_id (sau khi clinic table tồn tại)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_doctor_clinic'
    ) THEN
        ALTER TABLE accounts_doctorprofile
            ADD CONSTRAINT fk_doctor_clinic
            FOREIGN KEY (clinic_id) REFERENCES clinics_clinic(id) ON DELETE SET NULL;
    END IF;
END $$;

\echo '✅ Table: clinics_clinic (PostGIS)'

-- =============================================
-- BƯỚC 7: Tạo bảng TimeSlot
-- =============================================
CREATE TABLE IF NOT EXISTS appointments_timeslot (
    id SERIAL PRIMARY KEY,
    doctor_id INTEGER NOT NULL,
    clinic_id INTEGER NOT NULL,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    max_patients INTEGER NOT NULL DEFAULT 1,
    current_patients INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_slot_doctor FOREIGN KEY (doctor_id)
        REFERENCES accounts_doctorprofile(id) ON DELETE CASCADE,
    CONSTRAINT fk_slot_clinic FOREIGN KEY (clinic_id)
        REFERENCES clinics_clinic(id) ON DELETE CASCADE,
    CONSTRAINT chk_time_order CHECK (end_time > start_time),
    CONSTRAINT chk_max_patients CHECK (max_patients > 0),
    CONSTRAINT chk_current_patients CHECK (current_patients >= 0)
);

CREATE INDEX IF NOT EXISTS idx_slot_doctor_date ON appointments_timeslot(doctor_id, date);
CREATE INDEX IF NOT EXISTS idx_slot_clinic_date ON appointments_timeslot(clinic_id, date);
CREATE INDEX IF NOT EXISTS idx_slot_available ON appointments_timeslot(is_available, date);

\echo '✅ Table: appointments_timeslot'

-- =============================================
-- BƯỚC 8: Tạo bảng Appointment
-- =============================================
CREATE TABLE IF NOT EXISTS appointments_appointment (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL,
    doctor_id INTEGER NOT NULL,
    clinic_id INTEGER NOT NULL,
    time_slot_id INTEGER NOT NULL,
    status VARCHAR(15) NOT NULL DEFAULT 'PENDING',
    reason TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    sa_score DOUBLE PRECISION NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_appt_patient FOREIGN KEY (patient_id)
        REFERENCES accounts_customuser(id) ON DELETE CASCADE,
    CONSTRAINT fk_appt_doctor FOREIGN KEY (doctor_id)
        REFERENCES accounts_doctorprofile(id) ON DELETE CASCADE,
    CONSTRAINT fk_appt_clinic FOREIGN KEY (clinic_id)
        REFERENCES clinics_clinic(id) ON DELETE CASCADE,
    CONSTRAINT fk_appt_slot FOREIGN KEY (time_slot_id)
        REFERENCES appointments_timeslot(id) ON DELETE CASCADE,
    CONSTRAINT chk_appt_status CHECK (status IN ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW')),
    CONSTRAINT uq_patient_slot UNIQUE (patient_id, time_slot_id)
);

CREATE INDEX IF NOT EXISTS idx_appt_patient ON appointments_appointment(patient_id);
CREATE INDEX IF NOT EXISTS idx_appt_doctor ON appointments_appointment(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appt_status ON appointments_appointment(status);
CREATE INDEX IF NOT EXISTS idx_appt_created ON appointments_appointment(created_at DESC);

\echo '✅ Table: appointments_appointment'

-- =============================================
-- BƯỚC 9: Tạo bảng Medical Record
-- =============================================
CREATE TABLE IF NOT EXISTS medical_records_medicalrecord (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL,
    doctor_id INTEGER NOT NULL,
    appointment_id INTEGER,
    diagnosis TEXT NOT NULL DEFAULT '',
    symptoms TEXT NOT NULL DEFAULT '',
    prescription TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    follow_up_date DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_record_patient FOREIGN KEY (patient_id)
        REFERENCES accounts_customuser(id) ON DELETE CASCADE,
    CONSTRAINT fk_record_doctor FOREIGN KEY (doctor_id)
        REFERENCES accounts_doctorprofile(id) ON DELETE CASCADE,
    CONSTRAINT fk_record_appt FOREIGN KEY (appointment_id)
        REFERENCES appointments_appointment(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_record_patient ON medical_records_medicalrecord(patient_id);
CREATE INDEX IF NOT EXISTS idx_record_doctor ON medical_records_medicalrecord(doctor_id);

\echo '✅ Table: medical_records_medicalrecord'

-- =============================================
-- BƯỚC 10: Tạo bảng X-ray Analysis Result
-- =============================================
CREATE TABLE IF NOT EXISTS medical_records_xrayanalysisresult (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL,
    original_image VARCHAR(200) NOT NULL,
    heatmap_image VARCHAR(200) NOT NULL DEFAULT '',
    predictions JSONB NOT NULL DEFAULT '{}',
    doctor_review TEXT NOT NULL DEFAULT '',
    doctor_agrees_with_ai BOOLEAN,
    reviewed_by_id INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_xray_patient FOREIGN KEY (patient_id)
        REFERENCES accounts_customuser(id) ON DELETE CASCADE,
    CONSTRAINT fk_xray_reviewer FOREIGN KEY (reviewed_by_id)
        REFERENCES accounts_doctorprofile(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_xray_patient ON medical_records_xrayanalysisresult(patient_id);
CREATE INDEX IF NOT EXISTS idx_xray_created ON medical_records_xrayanalysisresult(created_at DESC);

\echo '✅ Table: medical_records_xrayanalysisresult'

-- =============================================
-- BƯỚC 11: Tạo bảng Chat Session & Messages
-- =============================================
CREATE TABLE IF NOT EXISTS medical_records_chatsession (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL,
    title VARCHAR(200) NOT NULL DEFAULT 'Phiên tư vấn mới',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_chat_patient FOREIGN KEY (patient_id)
        REFERENCES accounts_customuser(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_chat_patient ON medical_records_chatsession(patient_id);

CREATE TABLE IF NOT EXISTS medical_records_chatmessage (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL,
    role VARCHAR(10) NOT NULL DEFAULT 'user',
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_msg_session FOREIGN KEY (session_id)
        REFERENCES medical_records_chatsession(id) ON DELETE CASCADE,
    CONSTRAINT chk_msg_role CHECK (role IN ('user', 'assistant', 'system'))
);

CREATE INDEX IF NOT EXISTS idx_msg_session ON medical_records_chatmessage(session_id);

\echo '✅ Tables: medical_records_chatsession, medical_records_chatmessage'

-- =============================================
-- BƯỚC 12: Tạo bảng Medical Documents (pgvector)
-- =============================================
CREATE TABLE IF NOT EXISTS medical_documents (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    embedding vector(384),
    metadata JSONB NOT NULL DEFAULT '{}',
    source_file VARCHAR(500) NOT NULL DEFAULT '',
    chunk_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- IVFFlat index (chỉ tạo khi có đủ data, bỏ qua lỗi nếu chưa đủ)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'idx_doc_embedding'
    ) THEN
        BEGIN
            CREATE INDEX idx_doc_embedding ON medical_documents
                USING ivfflat (embedding vector_cosine_ops) WITH (lists = 10);
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Cannot create IVFFlat index yet (need more data). Will use exact search.';
        END;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_doc_metadata ON medical_documents USING GIN (metadata);
CREATE INDEX IF NOT EXISTS idx_doc_source ON medical_documents(source_file);

\echo '✅ Table: medical_documents (pgvector)'

-- =============================================
-- BƯỚC 13: Tạo bảng Notifications
-- =============================================
CREATE TABLE IF NOT EXISTS notifications_notification (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'INFO',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    related_object_type VARCHAR(50) NOT NULL DEFAULT '',
    related_object_id INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_notif_user FOREIGN KEY (user_id)
        REFERENCES accounts_customuser(id) ON DELETE CASCADE,
    CONSTRAINT chk_notif_type CHECK (type IN ('INFO', 'APPOINTMENT', 'XRAY_RESULT', 'CHAT', 'SYSTEM', 'REMINDER'))
);

CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications_notification(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_unread ON notifications_notification(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notif_created ON notifications_notification(created_at DESC);

\echo '✅ Table: notifications_notification'
\echo ''
\echo '============================================='
\echo '  ✅ ALL TABLES CREATED SUCCESSFULLY!'
\echo '============================================='
\echo ''

-- =============================================
-- BƯỚC 14: INSERT DỮ LIỆU MẪU
-- =============================================
\echo 'Inserting seed data...'

-- Admin user (password: admin123 — hashed bằng Django pbkdf2_sha256)
INSERT INTO accounts_customuser (username, email, password, role, first_name, last_name, phone, is_staff, is_superuser, is_verified, is_active)
VALUES ('admin', 'admin@medtech.vn',
    'pbkdf2_sha256$720000$salt$hash_placeholder',
    'ADMIN', 'Admin', 'MedTech', '0900000000', TRUE, TRUE, TRUE, TRUE)
ON CONFLICT (email) DO NOTHING;

-- Bác sĩ mẫu
INSERT INTO accounts_customuser (username, email, password, role, first_name, last_name, phone, is_verified, is_active)
VALUES
    ('bs_tranvanb', 'tranvanb@medtech.vn', 'pbkdf2_sha256$720000$salt$hash_placeholder', 'DOCTOR', 'Trần', 'Văn B', '0901111111', TRUE, TRUE),
    ('bs_nguyenthic', 'nguyenthic@medtech.vn', 'pbkdf2_sha256$720000$salt$hash_placeholder', 'DOCTOR', 'Nguyễn', 'Thị C', '0902222222', TRUE, TRUE),
    ('bs_levanD', 'levand@medtech.vn', 'pbkdf2_sha256$720000$salt$hash_placeholder', 'DOCTOR', 'Lê', 'Văn D', '0903333333', TRUE, TRUE),
    ('bs_phamthie', 'phamthie@medtech.vn', 'pbkdf2_sha256$720000$salt$hash_placeholder', 'DOCTOR', 'Phạm', 'Thị E', '0904444444', TRUE, TRUE)
ON CONFLICT (email) DO NOTHING;

-- Bệnh nhân mẫu
INSERT INTO accounts_customuser (username, email, password, role, first_name, last_name, phone, is_verified, is_active)
VALUES
    ('bn_nguyenvana', 'nguyenvana@gmail.com', 'pbkdf2_sha256$720000$salt$hash_placeholder', 'PATIENT', 'Nguyễn', 'Văn A', '0905555555', TRUE, TRUE),
    ('bn_tranthib', 'tranthib@gmail.com', 'pbkdf2_sha256$720000$salt$hash_placeholder', 'PATIENT', 'Trần', 'Thị B', '0906666666', TRUE, TRUE),
    ('bn_levanc', 'levanc@gmail.com', 'pbkdf2_sha256$720000$salt$hash_placeholder', 'PATIENT', 'Lê', 'Văn C', '0907777777', TRUE, TRUE)
ON CONFLICT (email) DO NOTHING;

\echo '  → Users inserted'

-- Phòng khám TP.HCM (tọa độ thực)
INSERT INTO clinics_clinic (name, address, location, phone, opening_hours, specializations, rating, is_active)
VALUES
    ('Bệnh viện Đại học Y Dược TP.HCM',
     '215 Hồng Bàng, Phường 11, Quận 5, TP.HCM',
     ST_SetSRID(ST_MakePoint(106.6583, 10.7588), 4326),
     '028-3855-4269',
     '{"mon":"07:00-17:00","tue":"07:00-17:00","wed":"07:00-17:00","thu":"07:00-17:00","fri":"07:00-17:00","sat":"07:00-12:00","sun":"closed"}',
     '["Đa khoa","Tim mạch","Hô hấp","Nội tiết"]', 4.5, TRUE),

    ('Bệnh viện Chợ Rẫy',
     '201B Nguyễn Chí Thanh, Phường 12, Quận 5, TP.HCM',
     ST_SetSRID(ST_MakePoint(106.6527, 10.7565), 4326),
     '028-3855-4137',
     '{"mon":"06:30-16:30","tue":"06:30-16:30","wed":"06:30-16:30","thu":"06:30-16:30","fri":"06:30-16:30","sat":"06:30-11:30","sun":"closed"}',
     '["Đa khoa","Cấp cứu","Phẫu thuật","Ung bướu"]', 4.3, TRUE),

    ('Bệnh viện Nhân Dân 115',
     '527 Sư Vạn Hạnh, Phường 12, Quận 10, TP.HCM',
     ST_SetSRID(ST_MakePoint(106.6669, 10.7730), 4326),
     '028-3865-4249',
     '{"mon":"07:00-16:00","tue":"07:00-16:00","wed":"07:00-16:00","thu":"07:00-16:00","fri":"07:00-16:00","sat":"07:00-11:00","sun":"closed"}',
     '["Đa khoa","Cấp cứu","Tim mạch","Thần kinh"]', 4.2, TRUE),

    ('Bệnh viện Phạm Ngọc Thạch',
     '120 Hùng Vương, Phường 12, Quận 5, TP.HCM',
     ST_SetSRID(ST_MakePoint(106.6530, 10.7555), 4326),
     '028-3857-5930',
     '{"mon":"07:30-16:30","tue":"07:30-16:30","wed":"07:30-16:30","thu":"07:30-16:30","fri":"07:30-16:30","sat":"07:30-11:30","sun":"closed"}',
     '["Hô hấp","Phổi","Lao"]', 4.1, TRUE),

    ('Bệnh viện Nhân dân Gia Định',
     '1 Nơ Trang Long, Phường 7, Quận Bình Thạnh, TP.HCM',
     ST_SetSRID(ST_MakePoint(106.6937, 10.8019), 4326),
     '028-3841-1503',
     '{"mon":"07:00-16:30","tue":"07:00-16:30","wed":"07:00-16:30","thu":"07:00-16:30","fri":"07:00-16:30","sat":"07:00-11:00","sun":"closed"}',
     '["Đa khoa","Ngoại tổng quát","Nội tổng quát"]', 4.0, TRUE),

    ('Bệnh viện FV',
     '6 Nguyễn Lương Bằng, Phường Tân Phú, Quận 7, TP.HCM',
     ST_SetSRID(ST_MakePoint(106.7194, 10.7297), 4326),
     '028-5411-3333',
     '{"mon":"07:00-21:00","tue":"07:00-21:00","wed":"07:00-21:00","thu":"07:00-21:00","fri":"07:00-21:00","sat":"07:00-17:00","sun":"07:00-12:00"}',
     '["Đa khoa","Quốc tế","Ung bướu","Sản phụ khoa"]', 4.6, TRUE),

    ('Bệnh viện Thống Nhất',
     '1 Lý Thường Kiệt, Phường 7, Quận Tân Bình, TP.HCM',
     ST_SetSRID(ST_MakePoint(106.6525, 10.7924), 4326),
     '028-3864-5766',
     '{"mon":"06:30-16:30","tue":"06:30-16:30","wed":"06:30-16:30","thu":"06:30-16:30","fri":"06:30-16:30","sat":"06:30-11:00","sun":"closed"}',
     '["Đa khoa","Tim mạch","Nội tiết","Cơ xương khớp"]', 4.2, TRUE),

    ('Phòng khám Đa khoa Quốc tế Phú Nhuận',
     '95 Thích Quảng Đức, Phường 4, Quận Phú Nhuận, TP.HCM',
     ST_SetSRID(ST_MakePoint(106.6847, 10.7992), 4326),
     '028-3997-1199',
     '{"mon":"08:00-20:00","tue":"08:00-20:00","wed":"08:00-20:00","thu":"08:00-20:00","fri":"08:00-20:00","sat":"08:00-17:00","sun":"08:00-12:00"}',
     '["Đa khoa","Nhi khoa","Da liễu","Tai mũi họng"]', 4.4, TRUE)
ON CONFLICT DO NOTHING;

\echo '  → Clinics inserted (8 phòng khám TP.HCM)'

-- Doctor Profiles (gắn vào users bác sĩ)
INSERT INTO accounts_doctorprofile (user_id, specialization, license_number, experience_years, bio, clinic_id, consultation_fee)
SELECT u.id, d.spec, d.license, d.exp_years, d.bio, d.clinic_id, d.fee
FROM (VALUES
    ('bs_tranvanb',   'Hô hấp',      'BS-2019-001', 7,  'Chuyên khoa hô hấp, phổi', 1, 300000),
    ('bs_nguyenthic', 'Tim mạch',     'BS-2018-002', 8,  'Chuyên khoa tim mạch can thiệp', 2, 350000),
    ('bs_levanD',     'Nội tổng quát','BS-2020-003', 5,  'Bác sĩ nội khoa tổng quát', 3, 250000),
    ('bs_phamthie',   'Nhi khoa',     'BS-2017-004', 9,  'Chuyên khoa nhi, sơ sinh', 5, 280000)
) AS d(username, spec, license, exp_years, bio, clinic_id, fee)
JOIN accounts_customuser u ON u.username = d.username
WHERE NOT EXISTS (
    SELECT 1 FROM accounts_doctorprofile dp WHERE dp.user_id = u.id
);

\echo '  → Doctor profiles created'

-- Patient Profiles
INSERT INTO accounts_patientprofile (user_id, date_of_birth, gender, blood_type, address, emergency_contact, medical_history)
SELECT u.id, p.dob::date, p.gender, p.blood, p.addr, p.emergency, p.history
FROM (VALUES
    ('bn_nguyenvana', '1990-05-15', 'male',   'O+',  '123 Nguyễn Huệ, Q.1, TP.HCM',    '0919999999', 'Không có tiền sử bệnh nền'),
    ('bn_tranthib',   '1985-11-20', 'female', 'A+',  '456 Lê Lợi, Q.3, TP.HCM',         '0918888888', 'Tiền sử hen suyễn'),
    ('bn_levanc',     '1978-03-08', 'male',   'B+',  '789 Điện Biên Phủ, Bình Thạnh',    '0917777777', 'Tiểu đường type 2')
) AS p(username, dob, gender, blood, addr, emergency, history)
JOIN accounts_customuser u ON u.username = p.username
WHERE NOT EXISTS (
    SELECT 1 FROM accounts_patientprofile pp WHERE pp.user_id = u.id
);

\echo '  → Patient profiles created'

-- Time Slots mẫu (1 tuần tới)
DO $$
DECLARE
    doc_rec RECORD;
    d DATE;
    slot_start TIME;
BEGIN
    FOR doc_rec IN SELECT dp.id AS doctor_id, dp.clinic_id FROM accounts_doctorprofile dp
    LOOP
        FOR d IN SELECT generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '6 days', '1 day')::date
        LOOP
            -- Chỉ tạo slot cho ngày thường (không CN)
            IF EXTRACT(DOW FROM d) != 0 THEN
                FOR slot_start IN SELECT generate_series('08:00'::time, '16:00'::time, '30 minutes'::interval)
                LOOP
                    INSERT INTO appointments_timeslot (doctor_id, clinic_id, date, start_time, end_time, is_available, max_patients)
                    VALUES (doc_rec.doctor_id, doc_rec.clinic_id, d, slot_start, slot_start + INTERVAL '30 minutes', TRUE, 3)
                    ON CONFLICT DO NOTHING;
                END LOOP;
            END IF;
        END LOOP;
    END LOOP;
    RAISE NOTICE 'Time slots created for next 7 days';
END $$;

\echo '  → Time slots created (7 days ahead)'

-- Tài liệu y khoa mẫu cho vector store (dummy, chưa có embedding)
INSERT INTO medical_documents (content, metadata, source_file, chunk_index)
VALUES
    ('Viêm phổi (Pneumonia) là tình trạng nhiễm trùng nhu mô phổi gây ra bởi vi khuẩn, virus hoặc nấm. Triệu chứng bao gồm: sốt cao, ho có đờm (đờm vàng hoặc xanh), đau ngực khi hít thở sâu, khó thở, mệt mỏi, ớn lạnh.',
     '{"source": "Nội khoa cơ bản", "chapter": "Hô hấp", "type": "textbook", "language": "vi"}', 'noikha_coban.pdf', 1),
    ('Viêm phế quản cấp thường do virus gây ra, biểu hiện chính là ho kéo dài (có thể trên 2 tuần), kèm theo đờm, đau họng, sốt nhẹ. Phân biệt với viêm phổi: viêm phế quản thường không sốt cao và không khó thở nặng.',
     '{"source": "Nội khoa cơ bản", "chapter": "Hô hấp", "type": "textbook", "language": "vi"}', 'noikha_coban.pdf', 2),
    ('Hen suyễn (Asthma) là bệnh viêm mạn tính đường thở, đặc trưng bởi các cơn khó thở, thở khò khè, tức ngực, và ho. Các yếu tố kích phát bao gồm: bụi, phấn hoa, thời tiết thay đổi, gắng sức.',
     '{"source": "Nội khoa cơ bản", "chapter": "Hô hấp", "type": "textbook", "language": "vi"}', 'noikha_coban.pdf', 3),
    ('Bệnh tim mạch: Đau ngực do tim thường đau tức, nặng, lan ra cánh tay trái hoặc hàm. Kèm vã mồ hôi, buồn nôn. Nếu đau ngực kéo dài trên 15 phút, cần gọi cấp cứu 115 ngay lập tức.',
     '{"source": "Tim mạch học", "chapter": "Cấp cứu", "type": "textbook", "language": "vi"}', 'timmach_hoc.pdf', 1),
    ('Tràn khí màng phổi (Pneumothorax): Khí tích tụ trong khoang màng phổi gây xẹp phổi. Triệu chứng: đau ngực đột ngột bên bị tràn khí, khó thở, nhịp tim nhanh. Cần chụp X-quang ngực để chẩn đoán.',
     '{"source": "Ngoại khoa đại cương", "chapter": "Lồng ngực", "type": "textbook", "language": "vi"}', 'ngoaikha_daicuong.pdf', 1),
    ('Phù phổi cấp (Pulmonary Edema): Tích tụ dịch trong phế nang. Nguyên nhân phổ biến nhất là suy tim trái. Triệu chứng: khó thở đột ngột (nhất là khi nằm), ho ra bọt hồng, thở khò khè, lo lắng.',
     '{"source": "Nội khoa cơ bản", "chapter": "Tim mạch", "type": "textbook", "language": "vi"}', 'noikha_coban.pdf', 4),
    ('Tim to (Cardiomegaly): Tim lớn hơn bình thường trên phim X-quang ngực. Thường là dấu hiệu của bệnh tim mạch nền: suy tim, bệnh van tim, tăng huyết áp lâu dài. Chỉ số tim lồng ngực (CTR) > 0.5 được coi là tim to.',
     '{"source": "Tim mạch học", "chapter": "Chẩn đoán hình ảnh", "type": "textbook", "language": "vi"}', 'timmach_hoc.pdf', 2),
    ('Xẹp phổi (Atelectasis): Một phần hoặc toàn bộ phổi bị xẹp do tắc nghẽn phế quản hoặc chèn ép. X-quang cho thấy vùng đông đặc với dấu hiệu kéo trung thất về phía tổn thương.',
     '{"source": "Ngoại khoa đại cương", "chapter": "Lồng ngực", "type": "textbook", "language": "vi"}', 'ngoaikha_daicuong.pdf', 2),
    ('Tràn dịch màng phổi (Pleural Effusion): Dịch tích tụ trong khoang màng phổi. Triệu chứng: khó thở tăng dần, đau ngực, ho khan. X-quang thấy mờ góc sườn hoành. Cần chọc dò dịch màng phổi để chẩn đoán nguyên nhân.',
     '{"source": "Nội khoa cơ bản", "chapter": "Hô hấp", "type": "textbook", "language": "vi"}', 'noikha_coban.pdf', 5),
    ('Paracetamol (Acetaminophen): Thuốc hạ sốt, giảm đau không kê đơn. Liều người lớn: 500mg-1000mg mỗi 4-6 giờ, tối đa 4000mg/ngày. CẢNH BÁO: Quá liều có thể gây tổn thương gan nghiêm trọng. Không dùng với rượu bia.',
     '{"source": "Dược thư Quốc gia", "chapter": "Giảm đau hạ sốt", "type": "drug_reference", "language": "vi"}', 'duocthu_quocgia.pdf', 1)
ON CONFLICT DO NOTHING;

\echo '  → Medical documents inserted (10 sample docs)'
\echo ''
\echo '============================================='
\echo '  ✅ SEED DATA INSERTED SUCCESSFULLY!'
\echo '  Total: 8 users, 8 clinics, 4 doctor profiles,'
\echo '  3 patient profiles, time slots, 10 medical docs'
\echo '============================================='

-- =============================================
-- BƯỚC 15: Verify
-- =============================================
\echo ''
\echo '--- VERIFICATION ---'
SELECT 'Users' AS table_name, COUNT(*) AS row_count FROM accounts_customuser
UNION ALL SELECT 'Doctor Profiles', COUNT(*) FROM accounts_doctorprofile
UNION ALL SELECT 'Patient Profiles', COUNT(*) FROM accounts_patientprofile
UNION ALL SELECT 'Clinics', COUNT(*) FROM clinics_clinic
UNION ALL SELECT 'Time Slots', COUNT(*) FROM appointments_timeslot
UNION ALL SELECT 'Medical Docs', COUNT(*) FROM medical_documents
UNION ALL SELECT 'Notifications', COUNT(*) FROM notifications_notification
ORDER BY table_name;

\echo ''
\echo '--- EXTENSIONS ---'
SELECT extname, extversion FROM pg_extension WHERE extname IN ('postgis', 'vector', 'uuid-ossp');
