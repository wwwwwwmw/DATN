-- =============================================
-- 001_extensions.sql
-- Kích hoạt các PostgreSQL extensions cần thiết
-- =============================================

-- PostGIS: Xử lý dữ liệu không gian (GIS)
-- Dùng cho: tìm phòng khám lân cận, tính khoảng cách
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- pgvector: Lưu trữ và tìm kiếm vector embeddings
-- Dùng cho: RAG pipeline, similarity search tài liệu y khoa
CREATE EXTENSION IF NOT EXISTS vector;

-- UUID generation (nếu cần)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Verify extensions
SELECT extname, extversion FROM pg_extension 
WHERE extname IN ('postgis', 'vector', 'uuid-ossp');
