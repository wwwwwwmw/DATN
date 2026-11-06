# 🤖 LLM RAG — Hướng dẫn Chạy

## Yêu cầu
- Python 3.11+
- PostgreSQL với pgvector extension (đã tạo database)
- ~500MB disk cho embedding model
- (Optional) Ollama cho local LLM

## Quick Start

```cmd
REM 1. Tạo virtual environment
cd llm-rag
python -m venv venv
venv\Scripts\activate

REM 2. Cài dependencies
pip install -r requirements.txt

REM 3. Khởi tạo database (nếu chưa chạy)
cd ..\database
setup.bat
cd ..\llm-rag

REM 4. Nhúng tài liệu vào vector store
python scripts/ingest_documents.py

REM 5. Chạy API server
uvicorn app.main:app --host 0.0.0.0 --port 8002 --reload
```

## Cách hoạt động

### Không cần API key bên thứ 3!

- **Embedding model**: `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` (local, tải tự động)
- **LLM**: Template-based response (mặc định) hoặc Ollama (nếu có)

### Nâng cấp LLM (optional)

Để có response chất lượng hơn, cài Ollama:

```cmd
REM 1. Tải Ollama: https://ollama.com/download
REM 2. Cài model
ollama pull llama3.2
REM 3. Service tự detect và dùng Ollama
```

## Test

```cmd
REM Health check
curl http://localhost:8002/health

REM Chat
curl -X POST http://localhost:8002/api/chat ^
  -H "Content-Type: application/json" ^
  -d "{\"message\": \"Toi bi ho keo dai 3 ngay kem theo sot nhe\"}"

REM Stats
curl http://localhost:8002/api/stats
```

## Endpoints

| Method | URL | Mô tả |
|--------|-----|-------|
| POST | /api/chat | Gửi triệu chứng → nhận tư vấn |
| GET | /api/stats | Thống kê vector store |
| GET | /health | Health check |
