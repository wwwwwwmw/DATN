# 🗄️ Database — PostgreSQL + PostGIS + pgvector

> **Port:** 5432 | **Engine:** PostgreSQL 16

## Quick Start

```bash
# Docker (khuyến nghị)
docker build -t medtech-db .
docker run -d --name medtech-db -p 5432:5432 \
  -e POSTGRES_DB=medtech_db \
  -e POSTGRES_USER=medtech_user \
  -e POSTGRES_PASSWORD=your_password \
  -v pgdata:/var/lib/postgresql/data \
  medtech-db

# Hoặc cài đặt thủ công PostgreSQL, sau đó:
psql -U postgres
CREATE USER medtech_user WITH PASSWORD 'your_password';
CREATE DATABASE medtech_db OWNER medtech_user;
\c medtech_db
CREATE EXTENSION postgis;
CREATE EXTENSION vector;
```

## Tài liệu chi tiết

Xem [docs/database/README.md](../docs/database/README.md) cho checklist nghiệp vụ đầy đủ.

## Cấu trúc

```
database/
├── schemas/             # SQL schema files (run in order)
│   ├── 001_extensions.sql
│   ├── 002_accounts.sql
│   ├── 003_clinics.sql
│   ├── 004_appointments.sql
│   ├── 005_medical_records.sql
│   ├── 006_medical_documents.sql
│   └── 007_notifications.sql
├── seeds/               # Sample data (clinics, users)
├── migrations/          # Django auto-generated
├── backups/             # Backup scripts
├── scripts/             # Init, restore, performance check
└── Dockerfile
```
# DATN_DATABASE
