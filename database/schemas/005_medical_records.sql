-- =============================================
-- 005_medical_records.sql
-- Bảng hồ sơ y tế, kết quả X-quang, lịch sử chat
-- =============================================

/*
-- Hồ sơ y tế (sau mỗi lần khám)
CREATE TABLE IF NOT EXISTS medical_records_medicalrecord (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES accounts_customuser(id) ON DELETE CASCADE,
    doctor_id INTEGER NOT NULL REFERENCES accounts_doctorprofile(id) ON DELETE CASCADE,
    appointment_id INTEGER UNIQUE REFERENCES appointments_appointment(id) ON DELETE CASCADE,
    diagnosis TEXT NOT NULL DEFAULT '',
    symptoms TEXT NOT NULL DEFAULT '',
    prescription TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    follow_up_date DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_medical_record_patient ON medical_records_medicalrecord(patient_id);
CREATE INDEX idx_medical_record_doctor ON medical_records_medicalrecord(doctor_id);


-- Kết quả phân tích ảnh X-quang từ AI
CREATE TABLE IF NOT EXISTS medical_records_xrayanalysisresult (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES accounts_customuser(id) ON DELETE CASCADE,
    original_image VARCHAR(200) NOT NULL,       -- Path tới ảnh gốc
    heatmap_image VARCHAR(200) DEFAULT '',       -- Path tới Grad-CAM heatmap
    predictions JSONB NOT NULL DEFAULT '{}',     -- {"Cardiomegaly": 0.85, "Pneumonia": 0.12, ...}
    doctor_review TEXT DEFAULT '',                -- Nhận xét của bác sĩ
    doctor_agrees_with_ai BOOLEAN,               -- Bác sĩ đồng ý với AI?
    reviewed_by_id INTEGER REFERENCES accounts_doctorprofile(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_xray_patient ON medical_records_xrayanalysisresult(patient_id);
CREATE INDEX idx_xray_created ON medical_records_xrayanalysisresult(created_at DESC);


-- Phiên chat sơ vấn y tế (RAG)
CREATE TABLE IF NOT EXISTS medical_records_chatsession (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES accounts_customuser(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL DEFAULT 'Phiên tư vấn mới',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_session_patient ON medical_records_chatsession(patient_id);


-- Tin nhắn trong phiên chat
CREATE TABLE IF NOT EXISTS medical_records_chatmessage (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES medical_records_chatsession(id) ON DELETE CASCADE,
    role VARCHAR(10) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_message_session ON medical_records_chatmessage(session_id);
*/

SELECT 'medical_records schema reference loaded' AS status;
