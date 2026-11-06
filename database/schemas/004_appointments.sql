-- =============================================
-- 004_appointments.sql
-- Bảng lịch hẹn, khung giờ
-- =============================================

/*
-- Khung giờ khám
CREATE TABLE IF NOT EXISTS appointments_timeslot (
    id SERIAL PRIMARY KEY,
    doctor_id INTEGER NOT NULL REFERENCES accounts_doctorprofile(id) ON DELETE CASCADE,
    clinic_id INTEGER NOT NULL REFERENCES clinics_clinic(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    max_patients INTEGER NOT NULL DEFAULT 1,
    current_patients INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT chk_time_order CHECK (end_time > start_time),
    CONSTRAINT chk_max_patients CHECK (max_patients > 0),
    CONSTRAINT chk_current_patients CHECK (current_patients >= 0 AND current_patients <= max_patients)
);

CREATE INDEX idx_timeslot_doctor_date ON appointments_timeslot(doctor_id, date);
CREATE INDEX idx_timeslot_clinic_date ON appointments_timeslot(clinic_id, date);
CREATE INDEX idx_timeslot_available ON appointments_timeslot(is_available, date);


-- Lịch hẹn
CREATE TABLE IF NOT EXISTS appointments_appointment (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES accounts_customuser(id) ON DELETE CASCADE,
    doctor_id INTEGER NOT NULL REFERENCES accounts_doctorprofile(id) ON DELETE CASCADE,
    clinic_id INTEGER NOT NULL REFERENCES clinics_clinic(id) ON DELETE CASCADE,
    time_slot_id INTEGER NOT NULL REFERENCES appointments_timeslot(id) ON DELETE CASCADE,
    status VARCHAR(15) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW')),
    reason TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    sa_score DOUBLE PRECISION DEFAULT 0,  -- Score từ Simulated Annealing
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Mỗi bệnh nhân chỉ đặt 1 lần cho mỗi slot
    CONSTRAINT uq_patient_slot UNIQUE (patient_id, time_slot_id)
);

CREATE INDEX idx_appointment_patient ON appointments_appointment(patient_id);
CREATE INDEX idx_appointment_doctor ON appointments_appointment(doctor_id);
CREATE INDEX idx_appointment_status ON appointments_appointment(status);
CREATE INDEX idx_appointment_created ON appointments_appointment(created_at DESC);
*/

SELECT 'appointments schema reference loaded' AS status;
