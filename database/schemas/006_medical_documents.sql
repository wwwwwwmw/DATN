-- =============================================
-- 006_medical_documents.sql
-- Bảng vector store cho RAG pipeline (pgvector)
-- =============================================
-- BẢNG NÀY ĐƯỢC QUẢN LÝ BỞI LLM-RAG SERVICE, KHÔNG QUA DJANGO

CREATE TABLE IF NOT EXISTS medical_documents (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,                              -- Nội dung văn bản chunk
    embedding vector(1536),                             -- Vector nhúng (1536 dims cho OpenAI ada-002/3-small)
    metadata JSONB DEFAULT '{}',                        -- {"source": "...", "chapter": "...", "page": "...", "type": "..."}
    source_file VARCHAR(500) DEFAULT '',                -- Đường dẫn file gốc
    chunk_index INTEGER DEFAULT 0,                      -- Thứ tự chunk trong tài liệu
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- IVFFlat index cho approximate nearest neighbor search
-- Lưu ý: lists = sqrt(total_rows) là rule of thumb
-- Với 10,000 documents: lists = 100
-- Với 100,000 documents: lists = 316
-- REINDEX khi data tăng đáng kể
CREATE INDEX IF NOT EXISTS idx_medical_doc_embedding 
    ON medical_documents 
    USING ivfflat (embedding vector_cosine_ops) 
    WITH (lists = 100);

-- Index cho metadata filtering
CREATE INDEX IF NOT EXISTS idx_medical_doc_metadata 
    ON medical_documents 
    USING GIN (metadata);

-- Index cho source file lookup
CREATE INDEX IF NOT EXISTS idx_medical_doc_source 
    ON medical_documents (source_file);

-- =============================================
-- Ví dụ queries
-- =============================================

-- Insert document (thường làm qua Python script)
-- INSERT INTO medical_documents (content, embedding, metadata, source_file, chunk_index)
-- VALUES (
--     'Viêm phổi là tình trạng nhiễm trùng...',
--     '[0.123, -0.456, ...]'::vector,
--     '{"source": "Nội khoa cơ bản", "chapter": "5", "type": "textbook"}',
--     'noikha_coban.pdf',
--     42
-- );

-- Similarity search (cosine distance)
-- SELECT id, content, metadata,
--     1 - (embedding <=> query_vector) AS similarity_score
-- FROM medical_documents
-- ORDER BY embedding <=> query_vector
-- LIMIT 5;

-- Filtered search (chỉ tìm trong clinical guidelines)
-- SELECT id, content, metadata
-- FROM medical_documents
-- WHERE metadata->>'type' = 'clinical_guideline'
-- ORDER BY embedding <=> query_vector
-- LIMIT 5;
