# 05. PHAN TICH X-QUANG BANG AI
# (xray + ai-vision service)

## Tong quan
Benh nhan upload anh X-quang phoi -> AI (DenseNet121) phan tich tu dong
14 benh ly -> tao heatmap Grad-CAM -> bac si xem xet va danh gia.

---

## Chuc nang

### 5.1. Upload va phan tich X-quang
- **Actor**: Benh nhan (PATIENT) hoac Bac si (DOCTOR)
- **Input**: File anh X-quang (jpg, png, dicom)
- **Luong nghiep vu**:
  1. Nguoi dung upload anh X-quang qua frontend
  2. Backend API nhan file, luu vao media/xrays/originals/
  3. Backend goi AI Vision service (port 8001):
     ```
     POST http://localhost:8001/api/predict
     Body: multipart/form-data { file: <image> }
     ```
  4. AI Vision xu ly:
     a. Tien xu ly: Resize 224x224, Normalize ImageNet
     b. Forward pass qua DenseNet121
     c. Sigmoid -> 14 probabilities
     d. Grad-CAM: tao heatmap vung bat thuong
     e. Tra ve JSON:
        ```json
        {
          "predictions": {"Pneumonia": 0.89, "Cardiomegaly": 0.23, ...},
          "top_class": "Pneumonia",
          "top_probability": 0.89,
          "heatmap_url": "/heatmaps/heatmap_xxx.jpg",
          "processing_time_ms": 120.5
        }
        ```
  5. Backend luu ket qua:
     - Tao XrayAnalysisResult voi predictions JSON
     - Luu heatmap image
     - Gui thong bao cho benh nhan "Ket qua X-quang da san sang"
  6. Frontend hien thi:
     - Anh goc + heatmap chong len
     - Bang xac suat 14 benh ly (sort giam dan)
     - Canh bao: xac suat > 50% highlight do

### 5.2. Bac si xem xet ket qua AI
- **Actor**: Bac si (DOCTOR)
- **Luong**:
  1. Bac si xem ket qua AI cua benh nhan
  2. Bac si danh gia:
     - doctor_review: "Dong y voi AI, benh nhan co dau hieu viem phoi"
     - doctor_agrees_with_ai: True/False
  3. Cap nhat XrayAnalysisResult:
     - reviewed_by = bac si hien tai
     - doctor_review = nhan xet
  4. Gui thong bao cho benh nhan "Bac si da xem ket qua X-quang"

### 5.3. Xem lich su X-quang
- **Phan quyen**:
  - PATIENT: chi xem cua minh
  - DOCTOR: xem cua benh nhan minh da kham
  - ADMIN: xem tat ca
- **Hien thi**: Danh sach ket qua, anh goc, heatmap, nhan xet bac si

---

## 14 Benh ly duoc phan tich

| # | Ten (EN) | Ten (VN) | Mo ta |
|---|----------|----------|-------|
| 1 | No Finding | Khong phat hien | Binh thuong |
| 2 | Enlarged Cardiomediastinum | Phe dai trung that | Bong trung that rong |
| 3 | Cardiomegaly | Tim to | Bong tim to bat thuong |
| 4 | Lung Opacity | Mo phoi | Vung mo duc bat thuong |
| 5 | Lung Lesion | Ton thuong phoi | Khoi u hoac sang thuong |
| 6 | Edema | Phu phoi | Tich tu dich trong phoi |
| 7 | Consolidation | Dong dac phoi | Mo phoi dac lai |
| 8 | Pneumonia | Viem phoi | Nhiem trung phoi |
| 9 | Atelectasis | Xep phoi | Phoi bi xep 1 phan |
| 10 | Pneumothorax | Tran khi mang phoi | Khi lot vao khoang mang phoi |
| 11 | Pleural Effusion | Tran dich mang phoi | Dich tich tu trong mang phoi |
| 12 | Pleural Other | Bat thuong mang phoi khac | Cac bat thuong khac |
| 13 | Fracture | Gay xuong | Gay xuong suon |
| 14 | Support Devices | Thiet bi ho tro | Ong noi khi quan, catheter... |

---

## Luong du lieu

```
[Frontend]                    [Backend API]              [AI Vision :8001]
   |                              |                            |
   |-- Upload X-ray image ------->|                            |
   |                              |-- Save to media/ --------->|
   |                              |-- POST /api/predict ------>|
   |                              |                            |-- Preprocess
   |                              |                            |-- DenseNet121
   |                              |                            |-- Grad-CAM
   |                              |<-- JSON predictions -------|
   |                              |-- Save XrayAnalysisResult  |
   |<-- Show results + heatmap ---|                            |
```

---

## Feedback Loop & Tai huan luyen mo hinh (Celery + Redis)

### 5.4. Bac si dinh chinh ket qua AI
- **Actor**: Bac si (DOCTOR)
- **Luong**:
  1. Bac si xem ket qua AI, chon **doctor_agrees_with_ai = False**
  2. Bac si nhap **nhan dinh chinh** (corrected_labels):
     - VD: AI noi "Pneumonia 0.89" nhung bac si noi "Khong phai viem phoi, la Phu phoi"
     - Bac si tick cac class dung: ["Edema": 1, "Pneumonia": 0]
  3. Backend luu:
     - XrayAnalysisResult.doctor_review = nhan xet
     - XrayAnalysisResult.corrected_labels = JSON (nhan dung do bac si sua)
     - XrayAnalysisResult.doctor_agrees_with_ai = False
  4. Backend DAY TASK vao Redis queue (Celery):
     ```python
     # tasks.py
     @celery_app.task
     def queue_for_retrain(xray_result_id):
         """
         Gom anh bi sai vao thu muc retrain_queue/.
         Khi du N anh (VD: 100) hoac dinh ky (VD: moi tuan),
         chay retrain model.
         """
         result = XrayAnalysisResult.objects.get(id=xray_result_id)
         # Copy anh vao retrain_queue/
         shutil.copy(result.original_image.path, RETRAIN_DIR / f"{xray_result_id}.jpg")
         # Luu corrected_labels vao CSV
         save_correction_to_csv(xray_result_id, result.corrected_labels)
         # Check neu du data -> trigger retrain
         if count_pending_corrections() >= RETRAIN_THRESHOLD:
             trigger_retrain.delay()
     ```

### 5.5. Tai huan luyen bat dong bo (Celery Worker)
- **Trigger**: Khi co du N anh bi dinh chinh hoac Admin kich hoat thu cong
- **Luong**:
  ```
  [Bac si dinh chinh] -> [Redis Queue] -> [Celery Worker]
                                              |
                                              v
                                    [Gom anh + nhan moi]
                                              |
                                              v
                                    [Fine-tune DenseNet121]
                                    (chi train them, khong train lai tu dau)
                                              |
                                              v
                                    [Danh gia tren validation set]
                                              |
                                    Neu AUC moi > AUC cu:
                                              |
                                              v
                                    [Luu model moi -> weights/]
                                    [Gui thong bao ADMIN]
                                    [Restart AI Vision service]
  ```
- **Chu y**:
  - Fine-tune (khong full retrain): chi train 5-10 epochs tren data moi
  - So sanh AUC truoc/sau: chi deploy neu model moi tot hon
  - Luu lich su retrain: thoi gian, so anh, AUC truoc/sau
  - KHONG tu dong deploy: can ADMIN xac nhan truoc

### Kien truc Celery

```
[Backend API] --task--> [Redis (Broker)] ---> [Celery Worker]
                                                    |
                                              [AI Vision service]
                                              (fine-tune DenseNet121)
                                                    |
                                              [weights/best_densenet121.pth]
```

## Mo hinh du lieu

```
XrayAnalysisResult
  - patient (FK -> CustomUser)
  - original_image: ImageField
  - heatmap_image: ImageField (tu AI Vision)
  - predictions: JSON  -- {"Pneumonia": 0.89, "Cardiomegaly": 0.23, ...}
  - doctor_review: text (nhan xet cua bac si)
  - doctor_agrees_with_ai: bool (bac si dong y voi AI?)
  - corrected_labels: JSON (nhan dinh chinh boi bac si, nullable)
  - retrain_queued: bool (da dua vao hang doi retrain chua?)
  - reviewed_by (FK -> DoctorProfile, nullable)
  - created_at
```

---

## API Endpoints

| Method | URL | Quyen | Mo ta |
|--------|-----|-------|-------|
| POST | /api/xray/analyze/ | Auth | Upload & phan tich |
| GET | /api/xray/results/ | Auth | Danh sach ket qua |
| GET | /api/xray/results/{id}/ | Auth | Chi tiet ket qua |
| PATCH | /api/xray/results/{id}/review/ | DOCTOR | Bac si xem xet |
| POST | /api/xray/retrain/trigger/ | ADMIN | Kich hoat retrain thu cong |
| GET | /api/xray/retrain/status/ | ADMIN | Trang thai retrain |
| GET | /api/xray/corrections/ | ADMIN | Danh sach anh da dinh chinh |