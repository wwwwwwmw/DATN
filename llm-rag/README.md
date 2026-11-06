# 🤖 LLM RAG — Medical Consultation Pipeline

> **Port:** 8002 | **Framework:** FastAPI + LangChain + pgvector

## Quick Start

```bash
# Tạo virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows

# Cài đặt dependencies
pip install -r requirements.txt

# Nhúng tài liệu y khoa vào vector store
python scripts/ingest_documents.py

# Chạy API server
uvicorn app.main:app --host 0.0.0.0 --port 8002 --reload

# Test queries mẫu
python scripts/test_queries.py
```

## Tài liệu chi tiết

Xem [docs/llm-rag/README.md](../docs/llm-rag/README.md) cho checklist nghiệp vụ đầy đủ.

## Cấu trúc

```
llm-rag/
├── app/                 # FastAPI application
│   ├── api/             # API routes & schemas
│   ├── core/            # Config & dependencies
│   └── services/        # RAG pipeline, vector store, LLM client
├── data/
│   ├── raw/             # Tài liệu y khoa gốc (PDF, DOCX)
│   └── processed/       # Đã chunked & cleaned
├── prompts/             # System prompts & templates
├── scripts/             # Ingest, evaluate, test scripts
└── tests/
```

## Biến môi trường

```env
DATABASE_URL=postgresql://medtech_user:password@localhost:5432/medtech_db
OPENAI_API_KEY=sk-...
EMBEDDING_MODEL=text-embedding-3-small
LLM_MODEL=gpt-3.5-turbo
LLM_TEMPERATURE=0.3
CHUNK_SIZE=800
CHUNK_OVERLAP=150
TOP_K=5
```
# DATN_LLM_RAG
