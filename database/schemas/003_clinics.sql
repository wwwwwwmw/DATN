-- =============================================
-- 003_clinics.sql
-- Bảng phòng khám với PostGIS PointField
-- =============================================

/*
CREATE TABLE IF NOT EXISTS clinics_clinic (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    address TEXT NOT NULL,
    location GEOMETRY(POINT, 4326) NOT NULL,  -- PostGIS Point (lng, lat)
    phone VARCHAR(15) NOT NULL DEFAULT '',
    email VARCHAR(254) DEFAULT '',
    opening_hours JSONB DEFAULT '{}',
    specializations JSONB DEFAULT '[]',
    rating DECIMAL(3, 2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    image VARCHAR(200) DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Spatial Index cho tìm kiếm phòng khám lân cận
CREATE INDEX idx_clinic_location ON clinics_clinic USING GIST (location);

-- Index cho filter
CREATE INDEX idx_clinic_active ON clinics_clinic(is_active);
CREATE INDEX idx_clinic_specializations ON clinics_clinic USING GIN (specializations);
CREATE INDEX idx_clinic_rating ON clinics_clinic(rating DESC);
*/

-- NOTE: Django GeoDjango sẽ quản lý bảng này.
SELECT 'clinics schema reference loaded' AS status;
