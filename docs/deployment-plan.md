# 🚀 Kế hoạch Triển khai (Deployment Plan)

> **Mục tiêu:** Triển khai toàn bộ hệ thống microservice bằng Docker Compose

---

## 1. Docker Compose — Cấu hình tổng thể

```yaml
# docker-compose.yml
version: '3.9'

services:
  # =============================================
  # DATABASE
  # =============================================
  database:
    build: ./database
    container_name: medtech-db
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: medtech_db
      POSTGRES_USER: medtech_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/schemas:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U medtech_user -d medtech_db"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - medtech-network

  # =============================================
  # REDIS (Channel Layer + Cache)
  # =============================================
  redis:
    image: redis:7-alpine
    container_name: medtech-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
    networks:
      - medtech-network

  # =============================================
  # BACKEND API (Django)
  # =============================================
  backend-api:
    build: ./backend-api
    container_name: medtech-backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgis://medtech_user:${DB_PASSWORD}@database:5432/medtech_db
      - REDIS_URL=redis://redis:6379/0
      - AI_VISION_URL=http://ai-vision:8001
      - LLM_RAG_URL=http://llm-rag:8002
      - SECRET_KEY=${DJANGO_SECRET_KEY}
      - DEBUG=False
    depends_on:
      database:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - media_data:/app/media
    networks:
      - medtech-network

  # =============================================
  # AI VISION (FastAPI + PyTorch)
  # =============================================
  ai-vision:
    build: ./ai-vision
    container_name: medtech-ai-vision
    ports:
      - "8001:8001"
    environment:
      - MODEL_PATH=/app/weights/best_densenet121.pth
      - DEVICE=cuda  # hoặc 'cpu'
    volumes:
      - ./ai-vision/weights:/app/weights:ro
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
    networks:
      - medtech-network

  # =============================================
  # LLM RAG (FastAPI + LangChain)
  # =============================================
  llm-rag:
    build: ./llm-rag
    container_name: medtech-llm-rag
    ports:
      - "8002:8002"
    environment:
      - DATABASE_URL=postgresql://medtech_user:${DB_PASSWORD}@database:5432/medtech_db
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - EMBEDDING_MODEL=text-embedding-3-small
      - LLM_MODEL=gpt-3.5-turbo
    depends_on:
      database:
        condition: service_healthy
    networks:
      - medtech-network

  # =============================================
  # FRONTEND WEB (React + Vite)
  # =============================================
  frontend-web:
    build: ./frontend-web
    container_name: medtech-frontend
    ports:
      - "3000:3000"
    environment:
      - VITE_API_URL=http://localhost:8000/api
      - VITE_WS_URL=ws://localhost:8000/ws
    depends_on:
      - backend-api
    networks:
      - medtech-network

  # =============================================
  # NGINX (Reverse Proxy) — Production
  # =============================================
  nginx:
    image: nginx:alpine
    container_name: medtech-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    depends_on:
      - frontend-web
      - backend-api
    networks:
      - medtech-network

volumes:
  postgres_data:
  redis_data:
  media_data:

networks:
  medtech-network:
    driver: bridge
```

---

## 2. Biến môi trường (`.env.example`)

```env
# Database
DB_PASSWORD=your_secure_database_password

# Django
DJANGO_SECRET_KEY=your-django-secret-key-here
DJANGO_DEBUG=False
ALLOWED_HOSTS=localhost,127.0.0.1,yourdomain.com

# OpenAI
OPENAI_API_KEY=sk-...your-openai-api-key

# AI Vision
AI_VISION_DEVICE=cpu    # 'cuda' nếu có GPU

# Frontend
VITE_API_URL=http://localhost:8000/api
VITE_WS_URL=ws://localhost:8000/ws
```

---

## 3. Dockerfile cho từng service

### 3.1 Backend API

```dockerfile
# backend-api/Dockerfile
FROM python:3.11-slim

# Install GDAL & PostGIS dependencies (cho GeoDjango)
RUN apt-get update && apt-get install -y \
    gdal-bin libgdal-dev libgeos-dev libproj-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements/production.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
RUN python manage.py collectstatic --noinput

EXPOSE 8000
CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "config.asgi:application"]
```

### 3.2 AI Vision

```dockerfile
# ai-vision/Dockerfile
FROM python:3.11-slim

# Install OpenCV dependencies
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8001
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "2"]
```

### 3.3 LLM RAG

```dockerfile
# llm-rag/Dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8002
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8002", "--workers", "2"]
```

### 3.4 Frontend Web

```dockerfile
# frontend-web/Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
```

---

## 4. Checklist Triển khai

### Development

- [ ] **DEP-001** — Docker Desktop cài đặt và chạy
- [ ] **DEP-002** — Copy `.env.example` → `.env` và điền giá trị
- [ ] **DEP-003** — `docker-compose up -d database redis` — Chạy DB trước
- [ ] **DEP-004** — `docker-compose exec backend-api python manage.py migrate` — Chạy migrations
- [ ] **DEP-005** — `docker-compose exec backend-api python manage.py createsuperuser` — Tạo admin
- [ ] **DEP-006** — Load seed data
- [ ] **DEP-007** — `docker-compose up -d` — Khởi động tất cả services
- [ ] **DEP-008** — Verify: Frontend http://localhost:3000, Backend http://localhost:8000/api/

### Production

- [ ] **DEP-010** — Cấu hình SSL/TLS certificates
- [ ] **DEP-011** — Cấu hình NGINX reverse proxy
- [ ] **DEP-012** — Cấu hình firewall (chỉ mở port 80, 443)
- [ ] **DEP-013** — Setup backup cron cho database
- [ ] **DEP-014** — Setup monitoring (health check endpoints)
- [ ] **DEP-015** — Configure log rotation
- [ ] **DEP-016** — Load testing (Locust/k6)

---

## 5. Health Check Endpoints

| Service | URL | Expected |
|---------|-----|----------|
| Backend API | `GET /api/health/` | `{"status": "ok", "db": "connected"}` |
| AI Vision | `GET /api/health/` | `{"status": "ok", "model": "loaded"}` |
| LLM RAG | `GET /api/health/` | `{"status": "ok", "vector_store": "connected"}` |
| Database | `pg_isready` | Exit code 0 |
| Redis | `redis-cli ping` | PONG |
