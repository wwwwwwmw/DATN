-- =============================================
-- seed_clinics.sql
-- Dữ liệu mẫu phòng khám TP.HCM (tọa độ thực)
-- =============================================
-- Lưu ý: ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
-- longitude trước, latitude sau!

INSERT INTO clinics_clinic (name, address, location, phone, opening_hours, specializations, rating, is_active) VALUES

-- Quận 1
('Bệnh viện Đại học Y Dược TP.HCM', 
 '215 Hồng Bàng, Phường 11, Quận 5, TP.HCM',
 ST_SetSRID(ST_MakePoint(106.6583, 10.7588), 4326),
 '028-3855-4269',
 '{"mon": "07:00-17:00", "tue": "07:00-17:00", "wed": "07:00-17:00", "thu": "07:00-17:00", "fri": "07:00-17:00", "sat": "07:00-12:00", "sun": "closed"}',
 '["Đa khoa", "Tim mạch", "Hô hấp", "Nội tiết", "Thần kinh"]',
 4.5, TRUE),

-- Quận 5
('Bệnh viện Chợ Rẫy', 
 '201B Nguyễn Chí Thanh, Phường 12, Quận 5, TP.HCM',
 ST_SetSRID(ST_MakePoint(106.6527, 10.7565), 4326),
 '028-3855-4137',
 '{"mon": "06:30-16:30", "tue": "06:30-16:30", "wed": "06:30-16:30", "thu": "06:30-16:30", "fri": "06:30-16:30", "sat": "06:30-11:30", "sun": "closed"}',
 '["Đa khoa", "Cấp cứu", "Phẫu thuật", "Ung bướu", "Hô hấp"]',
 4.3, TRUE),

-- Quận 10
('Bệnh viện Nhân Dân 115', 
 '527 Sư Vạn Hạnh, Phường 12, Quận 10, TP.HCM',
 ST_SetSRID(ST_MakePoint(106.6669, 10.7730), 4326),
 '028-3865-4249',
 '{"mon": "07:00-16:00", "tue": "07:00-16:00", "wed": "07:00-16:00", "thu": "07:00-16:00", "fri": "07:00-16:00", "sat": "07:00-11:00", "sun": "closed"}',
 '["Đa khoa", "Cấp cứu", "Tim mạch", "Thần kinh"]',
 4.2, TRUE),

-- Quận 5
('Bệnh viện Phạm Ngọc Thạch', 
 '120 Hùng Vương, Phường 12, Quận 5, TP.HCM',
 ST_SetSRID(ST_MakePoint(106.6530, 10.7555), 4326),
 '028-3857-5930',
 '{"mon": "07:30-16:30", "tue": "07:30-16:30", "wed": "07:30-16:30", "thu": "07:30-16:30", "fri": "07:30-16:30", "sat": "07:30-11:30", "sun": "closed"}',
 '["Hô hấp", "Phổi", "Lao"]',
 4.1, TRUE),

-- Quận 3
('Bệnh viện Nhân dân Gia Định', 
 '1 Nơ Trang Long, Phường 7, Quận Bình Thạnh, TP.HCM',
 ST_SetSRID(ST_MakePoint(106.6937, 10.8019), 4326),
 '028-3841-1503',
 '{"mon": "07:00-16:30", "tue": "07:00-16:30", "wed": "07:00-16:30", "thu": "07:00-16:30", "fri": "07:00-16:30", "sat": "07:00-11:00", "sun": "closed"}',
 '["Đa khoa", "Ngoại tổng quát", "Nội tổng quát"]',
 4.0, TRUE),

-- Quận 1
('Phòng khám Đa khoa Quốc tế', 
 '95 Thích Quảng Đức, Phường 4, Quận Phú Nhuận, TP.HCM',
 ST_SetSRID(ST_MakePoint(106.6847, 10.7992), 4326),
 '028-3997-1199',
 '{"mon": "08:00-20:00", "tue": "08:00-20:00", "wed": "08:00-20:00", "thu": "08:00-20:00", "fri": "08:00-20:00", "sat": "08:00-17:00", "sun": "08:00-12:00"}',
 '["Đa khoa", "Nhi khoa", "Da liễu", "Tai mũi họng"]',
 4.4, TRUE),

-- Quận Tân Bình
('Bệnh viện Thống Nhất', 
 '1 Lý Thường Kiệt, Phường 7, Quận Tân Bình, TP.HCM',
 ST_SetSRID(ST_MakePoint(106.6525, 10.7924), 4326),
 '028-3864-5766',
 '{"mon": "06:30-16:30", "tue": "06:30-16:30", "wed": "06:30-16:30", "thu": "06:30-16:30", "fri": "06:30-16:30", "sat": "06:30-11:00", "sun": "closed"}',
 '["Đa khoa", "Tim mạch", "Nội tiết", "Cơ xương khớp"]',
 4.2, TRUE),

-- Quận 7
('Bệnh viện FV', 
 '6 Nguyễn Lương Bằng, Phường Tân Phú, Quận 7, TP.HCM',
 ST_SetSRID(ST_MakePoint(106.7194, 10.7297), 4326),
 '028-5411-3333',
 '{"mon": "07:00-21:00", "tue": "07:00-21:00", "wed": "07:00-21:00", "thu": "07:00-21:00", "fri": "07:00-21:00", "sat": "07:00-17:00", "sun": "07:00-12:00"}',
 '["Đa khoa", "Quốc tế", "Ung bướu", "Sản phụ khoa"]',
 4.6, TRUE),

-- Quận 2 (TP Thủ Đức)
('Phòng khám Đa khoa Quận 2', 
 '130 Nguyễn Duy Trinh, Phường Bình Trưng Tây, TP Thủ Đức, TP.HCM',
 ST_SetSRID(ST_MakePoint(106.7600, 10.7833), 4326),
 '028-3740-1234',
 '{"mon": "07:30-17:00", "tue": "07:30-17:00", "wed": "07:30-17:00", "thu": "07:30-17:00", "fri": "07:30-17:00", "sat": "07:30-11:30", "sun": "closed"}',
 '["Đa khoa", "Nội tổng quát"]',
 3.8, TRUE),

-- Quận Gò Vấp
('Bệnh viện Quận Gò Vấp', 
 '59 Lê Lợi, Phường 4, Quận Gò Vấp, TP.HCM',
 ST_SetSRID(ST_MakePoint(106.6470, 10.8335), 4326),
 '028-3894-8567',
 '{"mon": "07:00-16:00", "tue": "07:00-16:00", "wed": "07:00-16:00", "thu": "07:00-16:00", "fri": "07:00-16:00", "sat": "07:00-11:00", "sun": "closed"}',
 '["Đa khoa", "Nhi khoa", "Sản khoa"]',
 3.9, TRUE);
