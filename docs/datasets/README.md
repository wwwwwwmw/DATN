# 📊 Datasets — Hướng dẫn Chuẩn bị Dữ liệu Huấn luyện

> **Datasets sử dụng:**  
> 1. CheXpert (Stanford ML Group) — `../../CheXpert/`  
> 2. NIH Chest X-rays 14 (National Institutes of Health) — `../../NIH_Chest_X_rays/`

---

## 1. CheXpert Dataset

### 1.1 Thông tin tổng quan

| Thuộc tính | Giá trị |
|------------|---------|
| **Nguồn** | Stanford ML Group |
| **Paper** | CheXpert: A Large Chest Radiograph Dataset (2019) |
| **Tổng ảnh** | ~224,316 (train + valid) |
| **Đường dẫn local** | `../../CheXpert/` |
| **Định dạng** | JPEG |
| **Kích thước gốc** | Đa dạng (cần resize về 224×224) |
| **Views** | Frontal (AP/PA) + Lateral |
| **Labels** | 14 bệnh lý (multi-label) |
| **Label encoding** | 1.0 (positive), 0.0 (negative), -1.0 (uncertain), blank (unmentioned) |

### 1.2 Cấu trúc thư mục

```
CheXpert/
├── train/
│   ├── patient00001/
│   │   └── study1/
│   │       └── view1_frontal.jpg
│   ├── patient00002/
│   │   ├── study1/
│   │   │   ├── view1_frontal.jpg
│   │   │   └── view2_lateral.jpg
│   │   └── study2/
│   │       └── view1_frontal.jpg
│   └── ...                         # ~223,415 ảnh
├── train.csv                       # Labels cho train set
├── valid/
│   └── patient64541...             # 235 ảnh validation
└── valid.csv                       # Labels cho validation set
```

### 1.3 CSV Format

```csv
Path,Sex,Age,Frontal/Lateral,AP/PA,No Finding,Enlarged Cardiomediastinum,Cardiomegaly,Lung Opacity,Lung Lesion,Edema,Consolidation,Pneumonia,Atelectasis,Pneumothorax,Pleural Effusion,Pleural Other,Fracture,Support Devices
CheXpert-v1.0-small/train/patient00001/study1/view1_frontal.jpg,Female,68,Frontal,AP,1.0,,,,,,,,,0.0,,,,1.0
```

### 1.4 Xử lý Uncertain Labels (-1.0)

Đây là **quyết định quan trọng nhất** khi dùng CheXpert:

| Chiến lược | Mô tả | Khi nào dùng |
|------------|--------|-------------|
| **U-Ones** | `-1.0` → `1.0` | Tốt cho: Atelectasis, Edema, Pleural Effusion (CheXpert paper) |
| **U-Zeros** | `-1.0` → `0.0` | Tốt cho: Cardiomegaly, Consolidation |
| **U-Ignore** | Bỏ samples có `-1.0` | Ít data hơn nhưng labels chắc chắn |
| **U-SelfTrain** | Train model → dự đoán labels uncertain → retrain | Phức tạp nhưng hiệu quả cao |
| **U-Mixed** | U-Ones cho 1 số bệnh, U-Zeros cho bệnh khác | **Khuyến nghị** (theo CheXpert paper) |

**Khuyến nghị strategy:**
```python
UNCERTAIN_POLICIES = {
    'Atelectasis': 'u_ones',           # U-Ones
    'Cardiomegaly': 'u_zeros',         # U-Zeros  
    'Consolidation': 'u_zeros',        # U-Zeros
    'Edema': 'u_ones',                 # U-Ones
    'Pleural Effusion': 'u_ones',      # U-Ones
    # Còn lại: u_zeros hoặc u_ignore
}
```

### 1.5 Thống kê phân phối (cần chạy EDA)

- [ ] **DS-001** — Đếm số ảnh mỗi class (positive / negative / uncertain / blank)
- [ ] **DS-002** — Đếm tỷ lệ Frontal vs Lateral
- [ ] **DS-003** — Phân phối tuổi bệnh nhân
- [ ] **DS-004** — Phân phối giới tính
- [ ] **DS-005** — Histogram: số bệnh đồng thời trên 1 ảnh (multi-label distribution)

---

## 2. NIH Chest X-rays 14 Dataset

### 2.1 Thông tin tổng quan

| Thuộc tính | Giá trị |
|------------|---------|
| **Nguồn** | National Institutes of Health (NIH) Clinical Center |
| **Paper** | ChestX-ray8: Hospital-scale Chest X-ray Database (2017) |
| **Tổng ảnh** | ~112,120 |
| **Đường dẫn local** | `../../NIH_Chest_X_rays/` |
| **Định dạng** | PNG |
| **Kích thước gốc** | 1024×1024 |
| **Views** | PA (Posterior-Anterior) + AP (Anterior-Posterior) |
| **Labels** | 15 bệnh lý (multi-label, pipe-separated) |
| **Bounding Boxes** | Có cho 984 ảnh (8 classes) |

### 2.2 Cấu trúc thư mục

```
NIH_Chest_X_rays/
├── images_001/                     # Batch 1 (ảnh PNG)
│   ├── 00000001_000.png
│   ├── 00000001_001.png
│   └── ...
├── images_002/                     # Batch 2
├── ...
├── images_012/                     # Batch 12
├── Data_Entry_2017.csv             # Labels + metadata (~112K rows)
├── BBox_List_2017.csv              # Bounding boxes (984 rows)
├── train_val_list.txt              # Train/Val split (filenames)
├── test_list.txt                   # Test split (filenames)
├── ARXIV_V5_CHESTXRAY.pdf          # Paper gốc
├── README_CHESTXRAY.pdf
├── FAQ_CHESTXRAY.pdf
└── LOG_CHESTXRAY.pdf
```

### 2.3 CSV Format (`Data_Entry_2017.csv`)

```csv
Image Index,Finding Labels,Follow-up #,Patient ID,Patient Age,Patient Gender,View Position,OriginalImage[Width,Height],OriginalImagePixelSpacing[x,y],
00000001_000.png,Cardiomegaly,0,1,58,M,PA,2682,2749,0.143,0.143
00000001_001.png,Cardiomegaly|Emphysema,1,1,58,M,PA,2894,2729,0.143,0.143
```

### 2.4 Danh sách 15 bệnh lý NIH

| # | Bệnh lý | Tiếng Việt | Ghi chú |
|---|---------|------------|---------|
| 1 | Atelectasis | Xẹp phổi | Chung CheXpert |
| 2 | Cardiomegaly | Tim to | Chung CheXpert |
| 3 | Consolidation | Đông đặc phổi | Chung CheXpert |
| 4 | Edema | Phù phổi | Chung CheXpert |
| 5 | Effusion | Tràn dịch màng phổi | Chung CheXpert (Pleural Effusion) |
| 6 | Emphysema | Khí phế thũng | Chỉ NIH |
| 7 | Fibrosis | Xơ phổi | Chỉ NIH |
| 8 | Hernia | Thoát vị | Chỉ NIH |
| 9 | Infiltration | Thâm nhiễm | Chỉ NIH |
| 10 | Mass | Khối u | Chỉ NIH |
| 11 | Nodule | Nốt phổi | Chỉ NIH |
| 12 | Pleural Thickening | Dày màng phổi | Chỉ NIH |
| 13 | Pneumonia | Viêm phổi | Chung CheXpert |
| 14 | Pneumothorax | Tràn khí màng phổi | Chung CheXpert |
| 15 | No Finding | Bình thường | Chung CheXpert |

### 2.5 Parse labels

```python
def parse_nih_labels(finding_labels_str: str, target_labels: list) -> list:
    """
    Parse 'Cardiomegaly|Emphysema' → binary vector
    
    Input: "Cardiomegaly|Emphysema"
    Output: [0, 1, 0, 0, 0, 1, 0, ...]  # binary vector theo target_labels
    """
    findings = set(finding_labels_str.split('|'))
    return [1 if label in findings else 0 for label in target_labels]
```

---

## 3. Gộp Datasets (Unified Dataset)

### 3.1 Chiến lược gộp

```
CheXpert (~223K ảnh)  ──┐
                        ├──► Unified Dataset (~335K ảnh)
NIH (~112K ảnh)     ──┘     - 8 bệnh lý chung
                              - Chuẩn hóa labels
                              - Chuẩn hóa paths
                              - Balanced sampling
```

### 3.2 8 Bệnh lý chung (Unified Labels)

| Index | Label chuẩn | CheXpert name | NIH name |
|-------|-------------|---------------|----------|
| 0 | No Finding | No Finding | No Finding |
| 1 | Atelectasis | Atelectasis | Atelectasis |
| 2 | Cardiomegaly | Cardiomegaly | Cardiomegaly |
| 3 | Consolidation | Consolidation | Consolidation |
| 4 | Edema | Edema | Edema |
| 5 | Pleural Effusion | Pleural Effusion | Effusion |
| 6 | Pneumonia | Pneumonia | Pneumonia |
| 7 | Pneumothorax | Pneumothorax | Pneumothorax |

### 3.3 Script gộp

- [ ] **DS-010** — Map CheXpert labels → unified labels
- [ ] **DS-011** — Map NIH labels → unified labels (rename `Effusion` → `Pleural Effusion`)
- [ ] **DS-012** — Chuẩn hóa paths (relative paths từ project root)
- [ ] **DS-013** — CheXpert: chỉ lấy ảnh **Frontal** (bỏ Lateral)
- [ ] **DS-014** — Xử lý CheXpert uncertain labels theo U-Mixed strategy
- [ ] **DS-015** — Xử lý CheXpert blank labels → 0
- [ ] **DS-016** — Tạo `merged_train.csv`, `merged_val.csv`, `merged_test.csv`
- [ ] **DS-017** — Verify: đếm ảnh per class, kiểm tra class imbalance
- [ ] **DS-018** — Tính class weights cho loss function:
  ```python
  # pos_weight[i] = N_negative[i] / N_positive[i]
  # Hoặc: pos_weight[i] = (N_total - N_positive[i]) / N_positive[i]
  ```

### 3.4 Split strategy

| Split | CheXpert | NIH | Tổng (ước tính) | Tỷ lệ |
|-------|----------|-----|-----------------|--------|
| Train | ~180K (frontal only) | ~75K | ~255K | 80% |
| Validation | 235 (official) + ~20K | ~12K | ~32K | 10% |
| Test | — | ~25K (official test_list.txt) | ~25K | 10% |

---

## 4. Checklist tiền xử lý ảnh

- [ ] **DS-020** — Resize tất cả ảnh về **224×224** pixels
- [ ] **DS-021** — Convert PNG → JPEG (tiết kiệm dung lượng nếu cần)
- [ ] **DS-022** — Convert grayscale → RGB (3 channels) nếu model cần
- [ ] **DS-023** — Normalize pixel values: ImageNet mean & std
  ```python
  mean = [0.485, 0.456, 0.406]
  std = [0.229, 0.224, 0.225]
  ```
- [ ] **DS-024** — Kiểm tra ảnh bị lỗi (corrupt, 0 bytes, unreadable)
- [ ] **DS-025** — Loại bỏ duplicate images (nếu có)
- [ ] **DS-026** — Verify patient-level split (cùng patient KHÔNG nằm ở cả train và test)

---

## 5. Data Augmentation (Training only)

| Augmentation | Probability | Parameters | Lý do |
|-------------|-------------|------------|-------|
| Horizontal Flip | 0.5 | — | X-quang đối xứng |
| Random Brightness/Contrast | 0.3 | brightness=0.2, contrast=0.2 | Đa dạng phơi sáng |
| Random Rotation | 0.3 | limit=±10° | Nhẹ, tránh méo ảnh |
| Gaussian Noise | 0.2 | var_limit=(10, 50) | Robustness |
| **KHÔNG dùng** Vertical Flip | — | — | Ảnh y khoa không lật dọc |
| **KHÔNG dùng** Color Jitter lớn | — | — | Ảnh grayscale, jitter lớn = mất thông tin |

---

## ⚠️ Lưu ý quan trọng

1. **Dataset rất lớn** — CheXpert ~11GB, NIH ~45GB → cần SSD và đủ RAM
2. **Patient-level split BẮT BUỘC** — Cùng bệnh nhân phải nằm cùng split (train/val/test)
3. **CheXpert uncertain labels ảnh hưởng lớn** — Thử nghiệm nhiều strategies
4. **NIH labels có noise** — Được gán tự động bằng NLP, không hoàn toàn chính xác
5. **Class imbalance nghiêm trọng** — "No Finding" chiếm rất lớn, diseases hiếm chỉ 1-5%
6. **Frontal vs Lateral** — Nên train riêng hoặc chỉ dùng Frontal cho simplicity
7. **BBox data (NIH)** — Có thể dùng cho localization task, không bắt buộc cho classification
