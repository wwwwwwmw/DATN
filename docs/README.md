# 🏥 Hệ Thống Y Tế Thông Minh - MedTech AI Platform

> **Đồ án tốt nghiệp** — Trường ĐH Tài Nguyên Và Môi Trường TP. Hồ Chí Minh  
> **MSSV:** 1150080125 — **SV:** Lê Trí Anh  
> **Thời gian thực hiện:** 15 tuần (24/08 – 04/12)

---

## 📋 Mục lục tài liệu

| # | Tài liệu | Mô tả |
|---|----------|-------|
| 1 | [Tổng quan kiến trúc](./architecture-overview.md) | Sơ đồ kiến trúc microservice, luồng dữ liệu tổng thể |
| 2 | [Frontend Web](./frontend-web/README.md) | React + TypeScript, giao diện bệnh nhân & bác sĩ |
| 3 | [Backend API](./backend-api/README.md) | Django REST Framework, xử lý nghiệp vụ, Simulated Annealing |
| 4 | [AI Vision](./ai-vision/README.md) | DenseNet121, phân loại bệnh lý phổi từ ảnh X-quang |
| 5 | [LLM RAG](./llm-rag/README.md) | Pipeline RAG tư vấn y tế bằng ngôn ngữ tự nhiên |
| 6 | [Database](./database/README.md) | PostgreSQL + PostGIS + pgvector |
| 7 | [Datasets](./datasets/README.md) | Hướng dẫn chuẩn bị CheXpert & NIH Chest X-rays |
| 8 | [API Specification](./api-specification.md) | Chi tiết tất cả REST API endpoints + WebSocket |
| 9 | [Kế hoạch triển khai](./deployment-plan.md) | Docker, CI/CD, môi trường staging/production |
| 10 | [Đề xuất cải tiến](./improvements.md) | Các hướng nâng cấp và mở rộng hệ thống |
| 11 | [Coding Standards](./coding-standards.md) | Quy chuẩn lập trình Python, TypeScript, SQL, Git |
| 12 | [Testing Strategy](./testing-strategy.md) | Chiến lược kiểm thử: Unit, Integration, E2E, AI |
| 13 | [Checklist tổng thể](./master-checklist.md) | Bảng kiểm tra tiến độ toàn dự án theo tuần |

---

## 🏗️ Kiến trúc Microservice tổng quan

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                         │
│                     React + TypeScript App                      │
└──────────────┬──────────────────────┬───────────────────────────┘
               │ REST API (HTTPS)     │ WebSocket (WSS)
               ▼                      ▼
┌──────────────────────────┐ ┌────────────────────────────────────┐
│      BACKEND-API         │ │       BACKEND-API (Channels)       │
│   Django REST Framework  │ │   Django Channels (WebSocket)      │
│   Port: 8000             │ │   - WebRTC Signaling               │
│   - Auth / User Mgmt     │ │   - RAG Chat Streaming             │
│   - Appointment CRUD     │ │                                    │
│   - Simulated Annealing  │ └────────────────────────────────────┘
│   - GIS Queries (PostGIS)│
└────────┬─────────────┬───┘
         │             │
         ▼             ▼
┌────────────────┐ ┌────────────────┐
│   AI-VISION    │ │   LLM-RAG      │
│   FastAPI      │ │   FastAPI      │
│   Port: 8001   │ │   Port: 8002   │
│   DenseNet121  │ │   LangChain    │
│   PyTorch      │ │   pgvector     │
└────────────────┘ └────────────────┘
         │             │
         └──────┬──────┘
                ▼
┌──────────────────────────────────────┐
│           DATABASE                   │
│   PostgreSQL 16                      │
│   + PostGIS (GIS queries)            │
│   + pgvector (Embedding storage)     │
│   Port: 5432                         │
└──────────────────────────────────────┘
```

---

## 📁 Cấu trúc thư mục dự án

```
project-root/
├── frontend-web/           # React + TypeScript (Port 3000)
├── backend-api/            # Django REST Framework (Port 8000)
├── ai-vision/              # DenseNet121 - FastAPI (Port 8001)
├── llm-rag/                # RAG Pipeline - FastAPI (Port 8002)
├── database/               # PostgreSQL schemas, migrations, seeds
├── CheXpert/               # Dataset ảnh X-quang CheXpert
│   ├── train/              # ~223,000 ảnh huấn luyện
│   ├── valid/              # ~235 ảnh validation
│   ├── train.csv           # Labels huấn luyện
│   └── valid.csv           # Labels validation
├── NIH_Chest_X_rays/       # Dataset ảnh X-quang NIH
│   ├── images_001..012/    # 12 thư mục ảnh (~112,000 ảnh)
│   ├── Data_Entry_2017.csv # Labels + metadata
│   ├── BBox_List_2017.csv  # Bounding boxes
│   ├── train_val_list.txt  # Train/Val split
│   └── test_list.txt       # Test split
├── docs/                   # Tài liệu kỹ thuật (thư mục này)
├── docker-compose.yml      # Orchestration toàn bộ services
└── .env.example            # Biến môi trường mẫu
```

---

## 🔗 Giao tiếp giữa các service

| Từ | Đến | Giao thức | Mô tả |
|----|-----|-----------|-------|
| Frontend | Backend-API | REST (HTTPS) | CRUD, Auth, Appointments |
| Frontend | Backend-API | WebSocket (WSS) | WebRTC Signaling, Chat streaming |
| Backend-API | AI-Vision | REST (HTTP internal) | Gửi ảnh X-quang, nhận kết quả phân loại |
| Backend-API | LLM-RAG | REST (HTTP internal) | Gửi triệu chứng, nhận lời khuyên y tế |
| Backend-API | Database | TCP (5432) | Truy vấn dữ liệu, GIS queries |
| LLM-RAG | Database | TCP (5432) | Vector similarity search (pgvector) |
| LLM-RAG | OpenAI API | HTTPS | Gọi LLM để sinh câu trả lời |

---

## 🚀 Quickstart (Development)

```bash
# 1. Clone repository
git clone <repo-url> && cd project-root

# 2. Copy environment variables
cp .env.example .env

# 3. Khởi động toàn bộ services bằng Docker Compose
docker-compose up -d

# 4. Truy cập ứng dụng
# Frontend:    http://localhost:3000
# Backend:     http://localhost:8000/api/
# AI Vision:   http://localhost:8001/docs
# LLM RAG:     http://localhost:8002/docs
# Database:    localhost:5432
```

---

## 📚 Tài liệu tham khảo chính

1. WHO, "Global strategy on digital health 2020-2025," 2021.
2. G. Huang et al., "Densely Connected Convolutional Networks," CVPR 2017.
3. P. Lewis et al., "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks," NeurIPS 2020.
4. P. J. Van Laarhoven & E. H. Aarts, "Simulated Annealing: Theory and Applications," Springer 1987.
5. T. Davenport & R. Kalakota, "The potential for AI in healthcare," Future Healthcare Journal, 2019.
