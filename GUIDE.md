# HUONG DAN SETUP & KHOI CHAY - MedTech AI Platform

> Tai lieu huong dan day du cach cai dat moi truong, khoi tao database va chay tung service.
> Cap nhat lan cuoi: 2026-09-27

---

## Muc luc

1. [Tong quan kien truc](#1-tong-quan-kien-truc)
2. [Yeu cau he thong](#2-yeu-cau-he-thong)
3. [Cai dat phan mem can thiet](#3-cai-dat-phan-mem-can-thiet)
4. [Thu tu khoi chay](#4-thu-tu-khoi-chay)
5. [BUOC 1 - Database](#buoc-1--database-postgresql)
6. [BUOC 2 - Backend API](#buoc-2--backend-api-django)
7. [BUOC 3 - AI Vision](#buoc-3--ai-vision-service-fastapi--pytorch)
8. [BUOC 4 - LLM RAG](#buoc-4--llm-rag-service-fastapi)
9. [BUOC 5 - Frontend](#buoc-5--frontend-web-react--vite)
10. [Kiem tra toan bo](#5-kiem-tra-toan-bo-he-thong)
11. [Tai khoan mau](#6-tai-khoan-mau--du-lieu-test)
12. [Xu ly loi](#7-xu-ly-loi-thuong-gap)
13. [Quick Reference](#tom-tat-lenh-chay-quick-reference)
14. [Cau truc thu muc](#cau-truc-thu-muc-du-an)

---

## 1. Tong quan kien truc

```
+------------------+     +------------------+     +------------------+
|   Frontend Web   |     |   Backend API    |     |    Database      |
|   (React+Vite)   |<--->|   (Django DRF)   |<--->|  (PostgreSQL +   |
|   Port: 5173     |     |   Port: 8000     |     |  PostGIS+pgvector|
+------------------+     +------------------+     +------------------+
                               |       |
                    +----------+       +----------+
                    |                              |
          +---------+--------+          +----------+---------+
          |  AI Vision       |          |  LLM RAG           |
          |  (FastAPI+PyTorch)|          |  (FastAPI+Ollama)  |
          |  Port: 8001      |          |  Port: 8002        |
          +------------------+          +--------------------+
```

### Cac service:

| Service | Cong nghe | Port | Chuc nang |
|---------|-----------|------|-----------|
| Frontend Web | React, Vite, TypeScript | 5173 | Giao dien nguoi dung |
| Backend API | Django, DRF, Channels | 8000 | Xu ly nghiep vu, API |
| AI Vision | FastAPI, PyTorch, DenseNet121 | 8001 | Phan tich X-quang |
| LLM RAG | FastAPI, Sentence-Transformers | 8002 | Chat so van y khoa |
| Database | PostgreSQL + PostGIS + pgvector | 5432 | Luu tru du lieu |
| Redis | Redis Server | 6379 | WebSocket, cache |

### Luong du lieu:

1. **Benh nhan** truy cap Frontend (port 5173)
2. Frontend goi API den Backend (port 8000)
3. Backend goi AI Vision (port 8001) khi can phan tich X-quang
4. Backend goi LLM RAG (port 8002) khi benh nhan chat so van
5. Tat ca du lieu luu vao PostgreSQL (port 5432)

---

## 2. Yeu cau he thong

### Bat buoc

| Phan mem | Version | Download |
|----------|---------|----------|
| Python | >= 3.10 | https://www.python.org/downloads/ |
| Node.js | >= 18 | https://nodejs.org/ |
| PostgreSQL | >= 15 | https://www.postgresql.org/download/ |
| Git | >= 2.0 | https://git-scm.com/ |

### Khuyen nghi (khong bat buoc)

| Phan mem | Muc dich | Download |
|----------|----------|----------|
| Redis | WebSocket, cache (co the bo qua) | https://github.com/microsoftarchive/redis/releases |
| Ollama | LLM chat (co the chay remote) | https://ollama.ai/ |

> **Luu y ve Redis**: Neu khong cai Redis, he thong van chay nhung WebSocket (Video Call, Notification real-time) se khong hoat dong.

> **Luu y ve Ollama**: Co the chay tren may khac va ket noi qua mang (Tailscale, LAN). Neu khong co Ollama, chat se dung template fallback.

### Kiem tra nhanh moi truong

```cmd
python --version
node --version
npm --version
git --version
psql --version
python -m pip --version
```

---

## 3. Cai dat phan mem can thiet

### 3.1. PostGIS (Extension cho PostgreSQL)

1. Mo **Stack Builder** (di kem khi cai PostgreSQL)
2. Chon PostgreSQL server cua ban
3. Tim va cai **PostGIS Bundle** trong muc "Spatial Extensions"
4. Restart PostgreSQL service sau khi cai

> Neu khong tim thay Stack Builder, tai PostGIS tai: https://postgis.net/install/

### 3.2. pgvector (Extension cho vector search)

1. Tai pgvector tu: https://github.com/pgvector/pgvector/releases
2. Chon file `.zip` phu hop voi version PostgreSQL cua ban
3. Giai nen va copy cac file vao thu muc PostgreSQL:
   - `vector.dll` -> `C:\Program Files\PostgreSQL\17\lib\`
   - `vector.control` -> `C:\Program Files\PostgreSQL\17\share\extension\`
   - `vector--*.sql` -> `C:\Program Files\PostgreSQL\17\share\extension\`
4. Restart PostgreSQL service

### 3.3. GDAL (cho GeoDjango)

> **KHONG CAN CAI RIENG**: Neu da cai PostGIS (Buoc 3.1), GDAL da co san trong:
> `C:\Program Files\PostgreSQL\17\bin\libgdal-35.dll`
> Code da duoc cau hinh tu dong dung GDAL tu PostgreSQL. KHONG CAN cai OSGeo4W.

Chi can dam bao `C:\Program Files\PostgreSQL\17\bin` co trong PATH (thuong tu co khi cai PostgreSQL).

Neu gap loi `Could not find GDAL library` khi chay:
1. Kiem tra file `libgdal-35.dll` co trong `C:\Program Files\PostgreSQL\17\bin\`
2. Kiem tra `manage.py` da co dong set PATH den PostgreSQL bin
3. Kiem tra `config/settings/base.py` da co `GDAL_LIBRARY_PATH`

### 3.4. Redis (tuy chon)

- Tai: https://github.com/microsoftarchive/redis/releases
- Cai MSI version, Redis se chay nhu Windows Service
- Kiem tra: Mo `services.msc` > tim "Redis" > Status = Running
- Neu khong thay trong PATH, kiem tra qua services.msc

### 3.5. Xac nhan PostGIS & pgvector da cai

```cmd
psql -U postgres -h localhost -c "SELECT name, default_version FROM pg_available_extensions WHERE name IN ('postgis', 'vector', 'uuid-ossp');"
```

Ket qua mong doi:
```
   name    | default_version
-----------+-----------------
 postgis   | 3.5.2
 uuid-ossp | 1.1
 vector    | 0.8.0
```

---
## 3.6. Cau hinh Environment (.env)

Moi service doc cau hinh tu file `.env`. Du an da co san `.env.example` lam mau.

**Khi cai tren may moi**, chi can copy `.env.example` thanh `.env` roi sua lai:

```cmd
REM Thu muc goc (database config chung)
copy .env.example .env

REM Backend API
copy backend-api\.env.example backend-api\.env

REM AI Vision
copy ai-vision\.env.example ai-vision\.env

REM LLM RAG
copy llm-rag\.env.example llm-rag\.env
```

> **Luu y:** File `.env` chua mat khau va secret key, KHONG push len git.
> File `.env.example` la mau (khong chua gia tri nhat cam), CO push len git.

| File | Vi tri | Noi dung chinh |
|------|--------|----------------|
| `.env.example` | Goc du an | Database connection chung |
| `backend-api/.env` | Backend | Django secret key, DB, CORS, Redis, AI URLs |
| `ai-vision/.env` | AI Vision | Model path, confidence threshold, device (cpu/auto) |
| `llm-rag/.env` | LLM RAG | Database, Ollama URL/model, RAG params |

---

## 4. Thu tu khoi chay

```
BUOC 1: Database         <-- Chay 1 lan duy nhat (tao DB, bang, du lieu mau)
   |
BUOC 2: Backend API      <-- Terminal 1 (Django, port 8000)
   |
BUOC 3: AI Vision        <-- Terminal 2 (FastAPI, port 8001)
   |
BUOC 4: LLM RAG          <-- Terminal 3 (FastAPI, port 8002)
   |
BUOC 5: Frontend Web     <-- Terminal 4 (Vite, port 5173)
```

**Moi service chay o 1 cua so CMD/Terminal rieng biet** (tong cong can 4 terminal cho Backend, AI Vision, LLM RAG, Frontend).

---

## BUOC 1 -- Database (PostgreSQL)

### 1.1. Khoi tao database, bang & du lieu mau

```cmd
cd database
.\setup.bat
```

> **PowerShell**: Phai dung `.\setup.bat` (co dau `.\`). Neu go `setup.bat` khong co `.\` se bao loi "not recognized".

Script tu dong:
- Tao user `medtech_user` (password: `medtech_password_2026`)
- Tao database `medtech_db`
- Cai extensions: `postgis`, `vector`, `uuid-ossp`
- Tao 12 bang (users, doctors, patients, clinics, appointments, medical records, chat, notifications, ...)
- Tao indexes va constraints
- Insert du lieu mau: 8 users, 8 phong kham TP.HCM, time slots, 10 tai lieu y khoa

### 1.2. Kiem tra ket qua

```cmd
psql -U medtech_user -d medtech_db -h localhost
REM Nhap password: medtech_password_2026
```

Sau khi vao psql:
```sql
-- Kiem tra cac bang
\dt

-- Dem so luong phong kham
SELECT COUNT(*) FROM clinics;

-- Kiem tra extensions
SELECT extname FROM pg_extension;
```

Go `\q` de thoat psql.

### 1.3. Neu can them bang/du lieu moi sau nay

```cmd
cd database
.\migrate.bat
```
> Script dung `IF NOT EXISTS` nen an toan chay nhieu lan -- chi them cai moi, khong xoa cai cu.

### 1.4. Neu can reset toan bo

```cmd
cd database
.\reset.bat
REM Go YES de xac nhan
```

### Thong tin ket noi Database

| Thong so | Gia tri |
|----------|---------|
| Host | localhost |
| Port | 5432 |
| Database | medtech_db |
| User | medtech_user |
| Password | medtech_password_2026 |
| Admin | postgres / 123456 |

---

## BUOC 2 -- Backend API (Django)

> **Mo Terminal moi (Terminal 1)**

### 2.1. Tao virtual environment & cai dependencies

```cmd
cd backend-api

REM Tao virtual environment
python -m venv venv

REM Kich hoat venv (Windows CMD)
venv\Scripts\activate

REM Neu dung PowerShell:
REM venv\Scripts\Activate.ps1

REM Cai dependencies
python -m pip install -r requirements.txt
```

### 2.2. Django migrations

```cmd
REM Tao migration files tu models
python manage.py makemigrations

REM Ap dung migrations vao database
REM Vi init_all.sql da tao bang roi, dung --fake de danh dau da apply
python manage.py migrate --fake

REM Neu ban CHUA chay setup.bat (Buoc 1), dung migrate thuong:
REM python manage.py migrate
```

> **Quan trong**: Neu da chay `setup.bat` (Buoc 1) tao bang SQL truoc, PHAI dung `migrate --fake`.
> Neu chua chay Buoc 1 (chi dung Django quan ly DB), dung `migrate` thuong.

### 2.3. Tao superuser (admin)

```cmd
python manage.py createsuperuser
```
Nhap email, username, password theo huong dan. Superuser se tu dong duoc gan role ADMIN.

### 2.4. Khoi chay Backend

```cmd
REM Chay development server
python manage.py runserver 0.0.0.0:8000
```

**Ket qua mong doi:**
```
Watching for file changes with StatReloader
Starting development server at http://0.0.0.0:8000/
```

### 2.5. Kiem tra Backend dang chay

Mo browser: **http://localhost:8000**
Se hien thi trang "MedTech AI Platform - Backend API dang hoat dong".

Hoac dung CMD:
```cmd
curl http://localhost:8000/api/health/
```

**Ket qua:** `{"status": "ok", "service": "backend-api", "version": "1.0.0"}`

### 2.6. Truy cap Admin Panel

Mo browser: **http://localhost:8000/admin/**
Nhap thong tin superuser da tao.

---
## BUOC 3 -- AI Vision Service (FastAPI + PyTorch)

> **Mo Terminal moi (Terminal 2)**

### 3.1. Tao virtual environment & cai dependencies

```cmd
cd ai-vision

python -m venv venv
venv\Scripts\activate

REM Neu dung PowerShell:
REM venv\Scripts\Activate.ps1
```

### 3.2. Cai PyTorch (CHON 1 TRONG 3)

```cmd
REM Neu co GPU NVIDIA (dong RTX 20xx/30xx/40xx):
python -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cu124

REM Neu KHONG co GPU (chay CPU):
REM RTX 20xx-40xx:
python -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cu124
REM RTX 50xx (Blackwell):
REM python -m pip install --pre torch torchvision --index-url https://download.pytorch.org/whl/nightly/cu128
REM CPU only:
REM python -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
```

> **GHI CHU - GPU dong RTX 50xx (Blackwell) nhu RTX 5060, 5070, 5080, 5090:**
> PyTorch stable (2.6.x) CHUA ho tro GPU Blackwell (CUDA sm_120).
> Neu ban co RTX 50xx, PHAI cai PyTorch Nightly voi CUDA 12.8:
> ```cmd
> python -m pip install --pre torch torchvision --index-url https://download.pytorch.org/whl/nightly/cu128
> ```
> Dau hieu loi: Warning "CUDA capability sm_120 is not compatible" + RuntimeError "no kernel image".
> Kiem tra GPU hoat dong: `python -c "import torch; print(torch.cuda.is_available(), torch.cuda.get_device_name(0))"`

### 3.3. Cai dependencies con lai

```cmd
python -m pip install -r requirements.txt

REM (Tuy chon) Cai scikit-learn de co day du metrics danh gia:
python -m pip install scikit-learn
```

### 3.4. Khoi chay AI Vision

```cmd
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

**Ket qua mong doi:**
```
INFO:     Uvicorn running on http://0.0.0.0:8001
INFO:     Application startup complete.
INFO:     Loading DenseNet121 model...
```

### 3.5. Kiem tra

Mo browser: **http://localhost:8001** -- trang landing page.
Mo browser: **http://localhost:8001/dashboard** -- Training Dashboard.
Mo browser: **http://localhost:8001/docs** -- Swagger API docs.

Hoac dung CMD:
```cmd
curl http://localhost:8001/health
```

**Ket qua:** `{"status": "ok", "service": "ai-vision", "model_loaded": true}`

> Lan dau khoi dong se tai model DenseNet121 (~30MB). Cac lan sau se nhanh hon.

---

### 3.6. Huan luyen Model - Quy trinh 7 buoc

> Du an su dung 2 bo du lieu X-quang nguc:
> - **CheXpert** (Stanford, ~223K anh) -- BO CHINH
> - **NIH Chest X-rays** (NIH, ~112K anh) -- BO PHU (tang cuong du lieu)
>
> Du lieu dat o: `CheXpert/` va `NIH_Chest_X_rays/` cung cap voi thu muc du an.

#### CACH 1: Dung Web Dashboard (khuyen nghi)

1. Khoi chay AI Vision service (Buoc 3.4)
2. Mo browser: **http://localhost:8001/dashboard**
3. Cau hinh:
   - CheXpert Directory: `../CheXpert`
   - NIH Directory: `../NIH_Chest_X_rays` (de trong neu khong dung)
   - Epochs, Batch Size, Learning Rate...
4. Nhan **"Bat dau Train"**
5. Xem bieu do loss/AUC realtime, ket qua evaluation khi hoan tat

Dashboard hien thi:
- Tien trinh training (epoch, loss, AUC)
- Bieu do Loss theo Epoch (Train vs Validation)
- Bieu do AUC-ROC theo Epoch
- Bieu do Learning Rate
- Bang danh gia 14 benh ly (AUC, Sensitivity, Specificity, F1)
- Bieu do so sanh Sensitivity vs Specificity
- Confusion Matrix (TP, FP, TN, FN)
- Phan bo class trong dataset

#### CACH 2: Dung Command Line

```cmd
cd ai-vision
venv\Scripts\activate

REM === Chi dung CheXpert (nhanh hon) ===
python -m app.training.pipeline --chexpert-dir ../CheXpert --epochs 20 --batch-size 32

REM === CheXpert (chinh) + NIH (phu) ===
python -m app.training.pipeline --chexpert-dir ../CheXpert --nih-dir ../NIH_Chest_X_rays --epochs 20

REM === Cau hinh nang cao ===
python -m app.training.pipeline ^
    --chexpert-dir ../CheXpert ^
    --nih-dir ../NIH_Chest_X_rays ^
    --epochs 30 ^
    --batch-size 16 ^
    --lr 0.0001 ^
    --patience 7 ^
    --policy ones

REM === Resume tu checkpoint ===
python -m app.training.pipeline --chexpert-dir ../CheXpert --resume weights/latest_densenet121.pth
```

#### 7 buoc cua Pipeline

| Buoc | Ten | Mo ta | Thuat toan |
|------|-----|-------|------------|
| 1 | Tien xu ly & Tang cuong | Resize 224x224, Normalize ImageNet, RandomCrop/Flip/Rotation/ColorJitter | Torchvision Transforms |
| 2 | Phan chia du lieu | CheXpert: 70% train + 15% val + 15% test. NIH: them vao train | Random Split (seed=42) |
| 3 | Thiet lap model | DenseNet121 pretrained ImageNet, thay classifier 1000->14 classes | Transfer Learning, Dropout(0.5) |
| 4 | Huan luyen | Forward -> Loss -> Backpropagation -> Update weights | Adam optimizer, BCEWithLogitsLoss, Early Stopping |
| 5 | Danh gia | AUC-ROC, Sensitivity, Specificity, F1, Confusion Matrix | Youden's J Statistic (nguong toi uu) |
| 6 | Tinh chinh | Ghi log hyperparameters, so sanh giua cac lan train | Grid search thu cong |
| 7 | Luu tru & Trien khai | Save .pth -> FastAPI tu dong load khi restart | PyTorch checkpoint |

#### Chi tiet cac thuat toan

**DenseNet121 (Densely Connected Convolutional Network)**:
- 121 layers, ~8 trieu tham so
- Moi layer nhan input tu TAT CA cac layers truoc do (dense connections)
- Giam hieu ung vanishing gradient, tang kha nang tai su dung features
- Pre-trained tren ImageNet (1.2 trieu anh) -> Transfer Learning sang X-quang

**BCEWithLogitsLoss (Binary Cross-Entropy with Logits)**:
- Loss function cho multi-label classification
- 1 anh co the co NHIEU benh cung luc (khac voi CrossEntropy chi cho 1 label)
- Ket hop Sigmoid + BCE trong 1 buoc (stable hon ve so hoc)

**Adam Optimizer (Adaptive Moment Estimation)**:
- Tu dong dieu chinh learning rate cho tung tham so
- Ket hop Momentum (theo doi huong di) + RMSProp (theo doi do lon gradient)
- Hoi tu nhanh hon SGD thong thuong
- Default: lr=1e-4, weight_decay=1e-5 (L2 regularization)

**Early Stopping**:
- Dung train khi val_loss khong giam sau N epochs (patience=7)
- Tranh overfitting: model chi hoc tot tren train, kem tren data moi
- Tu dong luu model tot nhat (best val_loss)

**U-Ones Policy (xu ly label -1 trong CheXpert)**:
- CheXpert co label -1 = "nghi ngo" (uncertain)
- U-Ones: coi -1 la positive (1) -- khuyen nghi boi Stanford
- Ly do: bac si ghi "nghi ngo" thuong la khi co dau hieu benh

**Youden's J Statistic (tim nguong toi uu)**:
- J = Sensitivity + Specificity - 1
- Thu tat ca nguong tu 0.05 -> 0.95, chon nguong co J cao nhat
- Can bang giua bat dung benh va khong bao dong nham

#### Hyperparameters co the dieu chinh

| Tham so | Mac dinh | Goi y dieu chinh |
|---------|----------|-----------------|
| --epochs | 20 | Tang 30-50 neu chua hoi tu |
| --batch-size | 32 | Giam 8-16 neu het RAM/VRAM |
| --lr | 1e-4 | Thu 1e-3 (nhanh) hoac 5e-5 (cham) |
| --patience | 7 | Tang 10 neu muon train lau hon |
| --policy | ones | Thu "zeros" de so sanh |
| --image-size | 224 | Thu 320 neu co du RAM |

#### Ket qua luu o dau

| File | Noi dung |
|------|----------|
| `weights/best_densenet121.pth` | Model tot nhat (dung cho inference) |
| `weights/latest_densenet121.pth` | Model moi nhat (dung cho resume) |
| `outputs/training_results/training_state.json` | Trang thai realtime (cho dashboard) |
| `outputs/training_results/training_history.json` | Loss, AUC qua cac epochs |
| `outputs/training_results/evaluation_results.json` | Metrics danh gia chi tiet |
| `outputs/training_results/hyperparameters.json` | Tham so da dung |

### 3.7. Su dung model da train tren may khac

Copy file `ai-vision/weights/best_densenet121.pth` sang may moi.
Dat vao thu muc `ai-vision/weights/`. Service se tu dong load khi khoi dong.
Khong can GPU de chay inference (CPU du).

---

## BUOC 4 -- LLM RAG Service (FastAPI)

> **Mo Terminal moi (Terminal 3)**

### 4.1. Tao virtual environment & cai dependencies

```cmd
cd llm-rag

python -m venv venv
venv\Scripts\activate

REM Neu dung PowerShell:
REM venv\Scripts\Activate.ps1

REM Cai dependencies
python -m pip install -r requirements.txt
```

> Lan dau chay se tai model `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` (~500MB).

### 4.2. Nhung tai lieu y khoa vao vector store

```cmd
REM Nhung tai lieu da co san trong database (tu init_all.sql)
python scripts/ingest_documents.py

REM Hoac chi dinh thu muc tai lieu khac:
python scripts/ingest_documents.py --docs-dir ./data/medical_docs
```

> Script se doc cac file `.txt`, `.md`, `.pdf` va tao vector embeddings de phuc vu tim kiem ngu nghia (RAG).

### 4.3. Khoi chay LLM RAG

```cmd
python -m uvicorn app.main:app --host 0.0.0.0 --port 8002 --reload
```

**Ket qua mong doi:**
```
INFO:     Uvicorn running on http://0.0.0.0:8002
INFO:     Application startup complete.
INFO:     Embedding model loaded successfully.
```

### 4.4. Kiem tra

Mo browser: **http://localhost:8002** -- trang landing page (hien thi cau hinh Embedding, Ollama, RAG).
Mo browser: **http://localhost:8002/docs** -- Swagger API docs.

Hoac dung CMD:
```cmd
curl http://localhost:8002/health
```

**Ket qua:** `{"status": "ok", "service": "llm-rag", "embedding_model": "...", "llm_backend": "ollama"}`

### 4.5. Ket noi Ollama (tuy chon -- khuyen nghi)

Ollama cung cap LLM de chat thong minh hon. Neu khong co, he thong dung template fallback.

**Cach 1: Ollama tren may nay (localhost)**
```cmd
REM Tai va cai Ollama: https://ollama.ai/
REM Tai model:
ollama pull qwen2.5:7b
```

Trong file `.env`:
```
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:7b
```

**Cach 2: Ollama tren may khac (remote qua Tailscale/LAN)**
```
OLLAMA_URL=http://100.85.178.6:11434
OLLAMA_MODEL=qwen2.5:7b
```

---
## BUOC 5 -- Frontend Web (React + Vite)

> **Mo Terminal moi (Terminal 4)**

### 5.1. Cai dependencies

```cmd
cd frontend-web
npm install
```

### 5.2. Cau hinh API URL (tuy chon)

Tao file `.env` trong `frontend-web/`:
```
VITE_API_URL=http://localhost:8000/api
VITE_WS_URL=ws://localhost:8000/ws
VITE_MAP_TILE_URL=https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
```

### 5.3. Khoi chay Frontend

```cmd
npm run dev
```

**Ket qua mong doi:**
```
  VITE v5.x.x  ready in xxx ms

  -> Local:   http://localhost:5173/
  -> Network: http://xxx.xxx.xxx.xxx:5173/
```

### 5.4. Mo trinh duyet

Truy cap: **http://localhost:5173**

---

## 5. Kiem tra toan bo he thong

### Checklist cac services dang chay

| Service | URL | Kiem tra |
|---------|-----|---------|
| Backend API | http://localhost:8000 | Hien trang "Backend API dang hoat dong" |
| Backend Health | http://localhost:8000/api/health/ | `{"status": "ok"}` |
| Django Admin | http://localhost:8000/admin/ | Trang login admin |
| AI Vision | http://localhost:8001 | Trang landing page |
| AI Dashboard | http://localhost:8001/dashboard | Training Dashboard |
| AI Health | http://localhost:8001/health | `{"status": "ok"}` |
| LLM RAG | http://localhost:8002 | Trang landing page |
| LLM Health | http://localhost:8002/health | `{"status": "ok"}` |
| Frontend | http://localhost:5173 | Giao dien React |

### Test nhanh tung chuc nang

| Chuc nang | Cach test |
|-----------|-----------|
| Dang ky tai khoan | Frontend > Trang dang ky |
| Dang nhap | Frontend > Trang dang nhap |
| Chat so van | Frontend > Chat (can LLM RAG chay) |
| Upload X-quang | Frontend > Upload anh (can AI Vision chay) |
| Train AI model | http://localhost:8001/dashboard > Bat dau Train |
| Tim phong kham | Frontend > Ban do (can PostGIS) |
| Dat lich hen | Frontend > Dat lich |
| Video Call | Frontend > Goi video (can Redis) |

### Test API bang CMD

```cmd
REM Health check Backend
curl http://localhost:8000/api/health/

REM Health check AI Vision
curl http://localhost:8001/health

REM Health check LLM RAG
curl http://localhost:8002/health

REM Dang ky tai khoan
curl -X POST http://localhost:8000/api/auth/register/ -H "Content-Type: application/json" -d "{\"email\":\"test@test.com\",\"username\":\"testuser\",\"password\":\"Test1234!\"}"

REM Dang nhap
curl -X POST http://localhost:8000/api/auth/login/ -H "Content-Type: application/json" -d "{\"email\":\"test@test.com\",\"password\":\"Test1234!\"}"
```

---

## 6. Tai khoan mau & du lieu test

### Tai khoan (tao boi init_all.sql)

| Email | Username | Password | Role |
|-------|----------|----------|------|
| admin@medtech.vn | admin | admin123 | ADMIN |
| bs.nguyen@medtech.vn | bs_nguyen | doctor123 | DOCTOR |
| bs.tran@medtech.vn | bs_tran | doctor123 | DOCTOR |
| bs.le@medtech.vn | bs_le | doctor123 | DOCTOR |
| bn.anh@gmail.com | bn_anh | patient123 | PATIENT |
| bn.binh@gmail.com | bn_binh | patient123 | PATIENT |
| bn.cuong@gmail.com | bn_cuong | patient123 | PATIENT |
| bn.dung@gmail.com | bn_dung | patient123 | PATIENT |

### Phong kham mau (8 benh vien TP.HCM)

| Ten | Dia chi |
|-----|---------|
| BV Cho Ray | 201B Nguyen Chi Thanh, Q.5 |
| BV Nhan Dan 115 | 527 Su Van Hanh, Q.10 |
| BV Dai Hoc Y Duoc | 215 Hong Bang, Q.5 |
| BV Binh Dan | 371 Dien Bien Phu, Q.Binh Thanh |
| BV Nhi Dong 1 | 341 Su Van Hanh, Q.10 |
| BV Tu Du | 284 Cong Quynh, Q.1 |
| BV Ung Buou | 3 No Trang Long, Q.Binh Thanh |
| BV FV | 6 Nguyen Luong Bang, Q.7 |

### Tai lieu y khoa mau (10 documents)
Du lieu mau gom 10 tai lieu y khoa co ban ve cac benh thuong gap, trieu chung va phuong phap dieu tri. Duoc nhung vao vector store de phuc vu chat RAG.

---

## 7. Xu ly loi thuong gap

### `psql: FATAL: password authentication failed`
- Kiem tra password cua user postgres (mac dinh: `123456`)
- Hoac doi password: `ALTER USER postgres PASSWORD '123456';`

### `Could not find GDAL library`
- GDAL da co san trong PostgreSQL bin (khong can cai rieng)
- Kiem tra `manage.py` va `config/settings/base.py` da co cau hinh GDAL
- Dam bao `C:\Program Files\PostgreSQL\17\bin` co trong PATH

### `ModuleNotFoundError: No module named 'torch'`
- Chua cai PyTorch. Chay lenh o Buoc 3.2 (chon CPU hoac GPU)

### `CUDA capability sm_120 is not compatible` hoac `no kernel image`
- GPU RTX 50xx (Blackwell) khong tuong thich voi PyTorch stable
- Fix: cai PyTorch Nightly: `python -m pip install --pre torch torchvision --index-url https://download.pytorch.org/whl/nightly/cu128`

### `CUDA out of memory` khi train
- Giam batch-size: `--batch-size 16` hoac `--batch-size 8`
- Hoac dung CPU: `set DEVICE=cpu` truoc khi chay

### `Error: Cannot find module 'react-leaflet'`
- Chay `npm install` lai trong thu muc `frontend-web/`

### `connection refused` khi goi API tu Frontend
- Kiem tra Backend dang chay o port 8000
- Kiem tra CORS settings trong `config/settings/base.py`

### `extension "postgis" is not available`
- Chua cai PostGIS. Xem Buoc 3.1

### `extension "vector" is not available`
- Chua cai pgvector. Xem Buoc 3.2

### `CORS error` tren browser
- Kiem tra `DJANGO_ALLOWED_HOSTS` trong `.env`
- Kiem tra `CORS_ALLOWED_ORIGINS` trong settings

### `AI service temporarily unavailable` (khi upload X-quang)
- Kiem tra AI Vision dang chay o port 8001
- Kiem tra `AI_VISION_URL` trong `.env`

### `Cannot connect to AI service` (khi chat)
- Kiem tra LLM RAG dang chay o port 8002
- Kiem tra `LLM_RAG_URL` trong `.env`

### PowerShell khong cho chay script `.ps1`
```cmd
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### `InconsistentMigrationHistory` khi chay migrate
- Do da chay `setup.bat` tao bang truoc khi migrate
- Fix: `python manage.py migrate --fake`
- Hoac reset: xoa bang `django_migrations` roi chay lai

---
## Tom tat lenh chay (Quick Reference)

```cmd
REM == BUOC 1: Database (chay 1 lan duy nhat) ==
cd database
.\setup.bat
cd ..

REM == BUOC 2: Backend API (Terminal 1) ==
cd backend-api
python -m venv venv
venv\Scripts\activate
python -m pip install -r requirements.txt
python manage.py makemigrations
python manage.py migrate --fake
python manage.py createsuperuser
python manage.py runserver 0.0.0.0:8000

REM == BUOC 3: AI Vision (Terminal 2) ==
cd ai-vision
python -m venv venv
venv\Scripts\activate
REM RTX 20xx-40xx:
python -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cu124
REM RTX 50xx (Blackwell):
REM python -m pip install --pre torch torchvision --index-url https://download.pytorch.org/whl/nightly/cu128
REM CPU only:
REM python -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
python -m pip install -r requirements.txt
python -m pip install scikit-learn
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
REM Dashboard: http://localhost:8001/dashboard
REM Training:  python -m app.training.pipeline --chexpert-dir ../CheXpert --epochs 20

REM == BUOC 4: LLM RAG (Terminal 3) ==
cd llm-rag
python -m venv venv
venv\Scripts\activate
python -m pip install -r requirements.txt
python scripts/ingest_documents.py
python -m uvicorn app.main:app --host 0.0.0.0 --port 8002 --reload

REM == BUOC 5: Frontend (Terminal 4) ==
cd frontend-web
npm install
npm run dev
```

---

## Cau truc thu muc du an

```
medtech-ai-platform/
|
|-- GUIDE.md                    <-- FILE NAY
|-- .env.example                <-- Mau cau hinh environment
|
|-- database/                   <-- SQL scripts
|   |-- init_all.sql            <-- Tao DB + bang + du lieu mau
|   |-- setup.bat               <-- Chay init_all.sql (Windows)
|   |-- migrate.bat             <-- Them bang/du lieu moi
|   |-- reset.bat               <-- Xoa va tao lai toan bo
|   +-- SETUP.md                <-- Huong dan database
|
|-- backend-api/                <-- Django Backend (Port 8000)
|   |-- config/
|   |   +-- settings/
|   |       |-- base.py         <-- Settings chinh
|   |       +-- __init__.py
|   |-- apps/
|   |   |-- accounts/           <-- User, Doctor, Patient
|   |   |-- clinics/            <-- Phong kham, GIS
|   |   |-- appointments/       <-- Dat lich hen
|   |   |-- medical_records/    <-- Ho so benh an
|   |   |-- chat/               <-- WebSocket chat
|   |   |-- xray/               <-- Proxy den AI Vision
|   |   +-- notifications/      <-- Thong bao
|   |-- manage.py
|   +-- requirements.txt
|
|-- ai-vision/                  <-- AI Vision Service (Port 8001)
|   |-- app/
|   |   |-- main.py
|   |   |-- api/
|   |   |   |-- routes.py       <-- Prediction API
|   |   |   +-- training_routes.py <-- Training API (cho dashboard)
|   |   |-- services/
|   |   |   |-- prediction.py   <-- Inference pipeline
|   |   |   +-- gradcam.py      <-- Grad-CAM heatmap
|   |   |-- training/           <-- Training Pipeline (7 buoc)
|   |   |   |-- pipeline.py     <-- Main pipeline (CLI + API)
|   |   |   |-- datasets/       <-- CheXpert + NIH loaders
|   |   |   +-- evaluation/     <-- Medical metrics (AUC, Sens, Spec)
|   |   +-- core/config.py
|   |-- model/
|   |   +-- densenet121.py      <-- DenseNet121 architecture
|   |-- templates/
|   |   +-- dashboard.html      <-- Training Dashboard UI
|   |-- weights/                <-- Model weights (.pth)
|   |-- outputs/training_results/ <-- Ket qua training
|   +-- requirements.txt
|
|-- CheXpert/                   <-- Dataset chinh (223K X-ray images)
|   |-- train.csv
|   |-- valid.csv
|   +-- train/patientXXXXX/...
|
|-- NIH_Chest_X_rays/           <-- Dataset phu (112K X-ray images)
|   |-- Data_Entry_2017.csv
|   |-- train_val_list.txt
|   |-- test_list.txt
|   +-- images_001-012/
|
|-- llm-rag/                    <-- LLM RAG Service (Port 8002)
|   |-- app/
|   |   |-- main.py
|   |   |-- services/
|   |   |   |-- llm_client.py   <-- Ket noi Ollama
|   |   |   +-- rag_engine.py   <-- Vector search
|   |   +-- core/
|   |       +-- config.py       <-- Cau hinh Ollama URL/Model
|   |-- data/
|   |   +-- medical_docs/       <-- Tai lieu y khoa
|   +-- requirements.txt
|
+-- frontend-web/               <-- React Frontend (Port 5173)
    |-- src/
    |   |-- components/
    |   |-- pages/
    |   +-- services/
    |-- package.json
    +-- vite.config.ts
```

---

> **Lien he ho tro**: Neu gap loi khong giai quyet duoc, lien he team dev hoac tao issue tren repository.