-- =============================================
-- 002_accounts.sql
-- Bảng người dùng, profile bác sĩ & bệnh nhân
-- =============================================

-- Bảng User chính (Django sẽ tạo qua migration, đây là reference)
-- Django quản lý bảng này thông qua CustomUser model
-- Script này dùng để tham khảo cấu trúc

/*
CREATE TABLE IF NOT EXISTS accounts_customuser (
    id SERIAL PRIMARY KEY,
    password VARCHAR(128) NOT NULL,
    last_login TIMESTAMP WITH TIME ZONE,
    is_superuser BOOLEAN NOT NULL DEFAULT FALSE,
    username VARCHAR(150) NOT NULL UNIQUE,
    first_name VARCHAR(150) NOT NULL DEFAULT '',
    last_name VARCHAR(150) NOT NULL DEFAULT '',
    is_staff BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    date_joined TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Custom fields
    email VARCHAR(254) NOT NULL UNIQUE,
    role VARCHAR(10) NOT NULL CHECK (role IN ('PATIENT', 'DOCTOR', 'ADMIN')),
    phone VARCHAR(15) DEFAULT '',
    avatar VARCHAR(200) DEFAULT '',
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_email ON accounts_customuser(email);
CREATE INDEX idx_user_role ON accounts_customuser(role);


-- Profile Bác sĩ
CREATE TABLE IF NOT EXISTS accounts_doctorprofile (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES accounts_customuser(id) ON DELETE CASCADE,
    specialization VARCHAR(100) NOT NULL DEFAULT '',
    license_number VARCHAR(50) NOT NULL DEFAULT '',
    experience_years INTEGER NOT NULL DEFAULT 0,
    bio TEXT DEFAULT '',
    clinic_id INTEGER REFERENCES clinics_clinic(id) ON DELETE SET NULL,
    consultation_fee DECIMAL(10, 0) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_doctor_clinic ON accounts_doctorprofile(clinic_id);
CREATE INDEX idx_doctor_specialization ON accounts_doctorprofile(specialization);


-- Profile Bệnh nhân
CREATE TABLE IF NOT EXISTS accounts_patientprofile (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES accounts_customuser(id) ON DELETE CASCADE,
    date_of_birth DATE,
    gender VARCHAR(10) DEFAULT '',
    blood_type VARCHAR(5) DEFAULT '',
    address TEXT DEFAULT '',
    emergency_contact VARCHAR(15) DEFAULT '',
    medical_history TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
*/

-- NOTE: Bảng trên sẽ được Django auto-migrate.
-- File này chỉ dùng để tham khảo thiết kế.
SELECT 'accounts schema reference loaded' AS status;
