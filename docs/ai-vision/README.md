# 🧠 AI Vision — Tài liệu Kỹ thuật & Checklist Nghiệp vụ

> **Công nghệ:** Python 3.11+ / PyTorch / FastAPI  
> **Port:** 8001  
> **Vai trò:** Huấn luyện và serving mô hình DenseNet121 phân loại bệnh lý phổi từ ảnh X-quang

---

## 📁 Cấu trúc thư mục đề xuất

```
ai-vision/
├── app/                        # FastAPI application
│   ├── __init__.py
│   ├── main.py                 # FastAPI entry point
│   ├── api/
│   │   ├── __init__.py
│   │   ├── routes.py           # API endpoints
│   │   └── schemas.py          # Pydantic request/response models
│   ├── core/
│   │   ├── config.py           # Settings (model path, thresholds)
│   │   └── dependencies.py     # Dependency injection (model loading)
│   └── services/
│       ├── __init__.py
│       ├── prediction.py       # Inference pipeline
│       └── gradcam.py          # Grad-CAM heatmap generation
├── model/
│   ├── __init__.py
│   ├── densenet121.py          # Kiến trúc mạng (custom DenseNet121)
│   ├── losses.py               # Loss functions (BCE with label smoothing)
│   └── metrics.py              # AUC-ROC, F1, Precision, Recall
├── data/
│   ├── __init__.py
│   ├── dataset.py              # PyTorch Dataset classes
│   ├── transforms.py           # Data augmentation & preprocessing
│   ├── dataloader.py           # DataLoader factory
│   └── label_mapping.py        # Mapping bệnh lý → index
├── training/
│   ├── train.py                # Script huấn luyện chính
│   ├── evaluate.py             # Script đánh giá model
│   ├── config.yaml             # Hyperparameters config
│   └── utils/
│       ├── early_stopping.py   # Early stopping callback
│       ├── lr_scheduler.py     # Learning rate scheduling
│       └── checkpoint.py       # Model checkpoint management
├── notebooks/                  # Jupyter notebooks cho EDA
│   ├── 01_data_exploration.ipynb
│   ├── 02_class_distribution.ipynb
│   └── 03_training_visualization.ipynb
├── weights/                    # Trained model weights
│   └── .gitkeep                # Placeholder (weights không push lên git)
├── scripts/
│   ├── download_data.py        # Script tải dataset
│   ├── preprocess_chexpert.py  # Tiền xử lý CheXpert
│   ├── preprocess_nih.py       # Tiền xử lý NIH Chest X-rays
│   └── merge_datasets.py       # Gộp 2 datasets
├── tests/
│   ├── test_model.py
│   ├── test_prediction.py
│   └── test_api.py
├── Dockerfile
├── requirements.txt
└── README.md
```

---

## 📊 Phân tích Datasets

### CheXpert Dataset (đã có tại `../../CheXpert/`)

| Thông tin | Giá trị |
|-----------|---------|
| Tổng ảnh train | ~223,415 |
| Tổng ảnh valid | 235 |
| Số bệnh lý | 14 classes |
| Định dạng ảnh | JPEG (frontal + lateral) |
| Label đặc biệt | `1.0` (positive), `0.0` (negative), `-1.0` (uncertain), blank (unmentioned) |
| File CSV | `train.csv`, `valid.csv` |

**14 Bệnh lý CheXpert:**
1. No Finding
2. Enlarged Cardiomediastinum
3. Cardiomegaly
4. Lung Opacity
5. Lung Lesion
6. Edema
7. Consolidation
8. Pneumonia
9. Atelectasis
10. Pneumothorax
11. Pleural Effusion
12. Pleural Other
13. Fracture
14. Support Devices

### NIH Chest X-rays Dataset (đã có tại `../../NIH_Chest_X_rays/`)

| Thông tin | Giá trị |
|-----------|---------|
| Tổng ảnh | ~112,120 |
| Số bệnh lý | 15 classes (bao gồm "No Finding") |
| Định dạng ảnh | PNG |
| Label format | Multi-label, pipe-separated (`"Cardiomegaly\|Effusion"`) |
| File metadata | `Data_Entry_2017.csv` |
| Bounding boxes | `BBox_List_2017.csv` (cho 984 ảnh) |
| Train/Val split | `train_val_list.txt`, `test_list.txt` |

**15 Bệnh lý NIH:**
1. Atelectasis
2. Cardiomegaly
3. Consolidation
4. Edema
5. Effusion
6. Emphysema
7. Fibrosis
8. Hernia
9. Infiltration
10. Mass
11. No Finding
12. Nodule
13. Pleural Thickening
14. Pneumonia
15. Pneumothorax

### Bệnh lý chung giữa 2 datasets (sẽ dùng cho unified model)

| # | Bệnh lý | CheXpert | NIH |
|---|---------|----------|-----|
| 1 | Atelectasis | ✅ | ✅ |
| 2 | Cardiomegaly | ✅ | ✅ |
| 3 | Consolidation | ✅ | ✅ |
| 4 | Edema | ✅ | ✅ |
| 5 | Pleural Effusion | ✅ | ✅ (Effusion) |
| 6 | Pneumonia | ✅ | ✅ |
| 7 | Pneumothorax | ✅ | ✅ |
| 8 | No Finding | ✅ | ✅ |

---

## 🔧 Dependencies

```txt
# requirements.txt
torch>=2.1.0
torchvision>=0.16.0
fastapi>=0.104.0
uvicorn[standard]>=0.24.0
python-multipart>=0.0.6
Pillow>=10.0.0
numpy>=1.26.0
pandas>=2.1.0
scikit-learn>=1.3.0
matplotlib>=3.8.0
seaborn>=0.13.0
pyyaml>=6.0
tqdm>=4.66.0
opencv-python>=4.8.0
pydicom>=2.4.0            # Đọc file DICOM
albumentations>=1.3.0     # Data augmentation nâng cao
tensorboard>=2.15.0       # Training visualization
```

---

## ✅ Checklist Nghiệp vụ Chi tiết

### PHASE 1: Tiền xử lý Dữ liệu (Data Preprocessing)

- [ ] **AV-001** — Script `preprocess_chexpert.py`
  - Đọc `train.csv` và `valid.csv`
  - Xử lý uncertain labels (`-1.0`):
    - **U-Ones:** Coi `-1.0` là `1.0` (positive) — phù hợp cho Atelectasis, Edema, Pleural Effusion
    - **U-Zeros:** Coi `-1.0` là `0.0` (negative)
    - **U-Ignore:** Loại bỏ sample có `-1.0`
    - **U-MultiClass:** Coi uncertainty là class riêng (3 classes: 0, 1, uncertain)
  - Xử lý blank labels (unmentioned): coi là `0.0`
  - Lọc chỉ lấy ảnh **Frontal** (bỏ Lateral) nếu cần
  - Verify đường dẫn ảnh tồn tại
  - Output: cleaned CSV with binary labels

- [ ] **AV-002** — Script `preprocess_nih.py`
  - Đọc `Data_Entry_2017.csv`
  - Parse multi-label string: `"Cardiomegaly|Effusion"` → binary vector
  - Map tên bệnh NIH → tên chuẩn hóa (vd: `Effusion` → `Pleural Effusion`)
  - Split train/val/test dựa trên `train_val_list.txt` và `test_list.txt`
  - Verify đường dẫn ảnh (12 thư mục `images_001` → `images_012`)
  - Output: cleaned CSV with binary labels

- [ ] **AV-003** — Script `merge_datasets.py`
  - Gộp CheXpert + NIH thành unified dataset
  - Chỉ lấy **8 bệnh lý chung** (xem bảng trên)
  - Chuẩn hóa đường dẫn ảnh
  - Balanced sampling nếu class imbalance nghiêm trọng
  - Output: `merged_train.csv`, `merged_val.csv`, `merged_test.csv`

- [ ] **AV-004** — Data augmentation pipeline (`transforms.py`)
  ```python
  train_transforms = A.Compose([
      A.Resize(224, 224),
      A.HorizontalFlip(p=0.5),
      A.RandomBrightnessContrast(p=0.3),
      A.ShiftScaleRotate(shift_limit=0.05, scale_limit=0.1, rotate_limit=10, p=0.3),
      A.GaussNoise(var_limit=(10, 50), p=0.2),
      A.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
      ToTensorV2(),
  ])
  
  val_transforms = A.Compose([
      A.Resize(224, 224),
      A.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
      ToTensorV2(),
  ])
  ```

- [ ] **AV-005** — PyTorch Dataset class (`dataset.py`)
  ```python
  class ChestXrayDataset(Dataset):
      def __init__(self, csv_path, image_root, transform=None, target_labels=None):
          self.df = pd.read_csv(csv_path)
          self.image_root = image_root
          self.transform = transform
          self.target_labels = target_labels or COMMON_LABELS
      
      def __getitem__(self, idx):
          row = self.df.iloc[idx]
          image = Image.open(os.path.join(self.image_root, row['Path'])).convert('RGB')
          
          if self.transform:
              image = self.transform(image=np.array(image))['image']
          
          labels = torch.tensor([row[l] for l in self.target_labels], dtype=torch.float32)
          return image, labels
  ```

- [ ] **AV-006** — Phân tích phân phối dữ liệu (EDA)
  - Đếm số ảnh mỗi class
  - Tính tỷ lệ positive/negative cho mỗi bệnh
  - Vẽ biểu đồ phân phối
  - Xác định class imbalance → quyết định class weights

---

### PHASE 2: Xây dựng Mô hình DenseNet121

- [ ] **AV-010** — Kiến trúc DenseNet121 (`densenet121.py`)
  ```python
  import torch.nn as nn
  import torchvision.models as models
  
  class ChestXrayDenseNet(nn.Module):
      """
      DenseNet121 tinh chỉnh cho multi-label classification.
      
      Kiến trúc:
      1. Backbone: DenseNet121 pretrained trên ImageNet
      2. Bỏ classifier layer gốc (1000 classes)
      3. Thêm:
         - Global Average Pooling
         - Dropout(0.5)
         - Linear(1024 → num_classes)
         - Sigmoid activation (multi-label)
      """
      def __init__(self, num_classes=14, pretrained=True, dropout=0.5):
          super().__init__()
          self.backbone = models.densenet121(
              weights='IMAGENET1K_V1' if pretrained else None
          )
          num_features = self.backbone.classifier.in_features  # 1024
          self.backbone.classifier = nn.Identity()
          
          self.classifier = nn.Sequential(
              nn.Dropout(dropout),
              nn.Linear(num_features, num_classes),
          )
      
      def forward(self, x):
          features = self.backbone(x)
          return torch.sigmoid(self.classifier(features))
  ```

- [ ] **AV-011** — Loss Function (`losses.py`)
  ```python
  class WeightedBCELoss(nn.Module):
      """
      Binary Cross-Entropy với class weights để xử lý imbalanced data.
      
      Công thức:
      L = -Σ [w_pos * y * log(ŷ) + w_neg * (1-y) * log(1-ŷ)]
      
      w_pos = N_total / (2 * N_positive)  # Tăng weight cho positive samples
      w_neg = N_total / (2 * N_negative)  # Weight cho negative samples
      """
      def __init__(self, pos_weights=None):
          super().__init__()
          self.pos_weights = pos_weights
      
      def forward(self, predictions, targets):
          if self.pos_weights is not None:
              loss = nn.functional.binary_cross_entropy(
                  predictions, targets, 
                  weight=self.pos_weights.to(predictions.device),
                  reduction='mean'
              )
          else:
              loss = nn.functional.binary_cross_entropy(predictions, targets)
          return loss
  ```

- [ ] **AV-012** — Metrics (`metrics.py`)
  ```python
  from sklearn.metrics import roc_auc_score, f1_score, precision_score, recall_score
  
  def compute_metrics(predictions, targets, threshold=0.5):
      """
      Tính toán các chỉ số đánh giá cho multi-label classification.
      
      Returns:
          - AUC-ROC (per class & mean)
          - F1-Score (per class & mean)
          - Precision (per class & mean)
          - Recall / Sensitivity (per class & mean)
          - Specificity (per class & mean)
      """
      binary_preds = (predictions > threshold).astype(int)
      
      auc_per_class = {}
      for i, label in enumerate(LABELS):
          try:
              auc_per_class[label] = roc_auc_score(targets[:, i], predictions[:, i])
          except ValueError:
              auc_per_class[label] = float('nan')
      
      return {
          'auc_per_class': auc_per_class,
          'mean_auc': np.nanmean(list(auc_per_class.values())),
          'f1_macro': f1_score(targets, binary_preds, average='macro'),
          'precision_macro': precision_score(targets, binary_preds, average='macro'),
          'recall_macro': recall_score(targets, binary_preds, average='macro'),
      }
  ```

---

### PHASE 3: Huấn luyện (Training)

- [ ] **AV-020** — Config file (`training/config.yaml`)
  ```yaml
  model:
    architecture: densenet121
    num_classes: 14
    pretrained: true
    dropout: 0.5
  
  training:
    epochs: 50
    batch_size: 32
    learning_rate: 0.0001
    weight_decay: 0.00001
    optimizer: adam
    scheduler: cosine_annealing
    early_stopping_patience: 10
    
  data:
    image_size: 224
    num_workers: 4
    pin_memory: true
    uncertain_strategy: "u_ones"  # u_ones | u_zeros | u_ignore
    
  augmentation:
    horizontal_flip: true
    brightness_contrast: true
    rotation: 10
    gaussian_noise: true
  ```

- [ ] **AV-021** — Script `train.py`
  - Load config từ `config.yaml`
  - Khởi tạo model, optimizer, scheduler, loss function
  - Training loop:
    ```
    for epoch in range(epochs):
        model.train()
        for batch in train_loader:
            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()
        
        # Validation
        model.eval()
        val_metrics = evaluate(model, val_loader)
        
        # Early stopping check
        # Save best model checkpoint
        # Log to TensorBoard
    ```
  - Lưu best model weights, training logs
  - TensorBoard logging: loss curves, AUC curves, learning rate

- [ ] **AV-022** — Script `evaluate.py`
  - Load trained model từ checkpoint
  - Chạy inference trên test set
  - In bảng metrics: AUC-ROC, F1, Precision, Recall cho từng bệnh
  - Vẽ ROC curves cho từng class
  - Vẽ Confusion Matrix
  - Xuất kết quả ra file JSON/CSV

- [ ] **AV-023** — Learning Rate Scheduling
  ```python
  # Cosine Annealing with Warm Restarts
  scheduler = torch.optim.lr_scheduler.CosineAnnealingWarmRestarts(
      optimizer, T_0=10, T_mult=2, eta_min=1e-7
  )
  ```

- [ ] **AV-024** — Early Stopping
  ```python
  class EarlyStopping:
      def __init__(self, patience=10, min_delta=0.001):
          self.patience = patience
          self.min_delta = min_delta
          self.counter = 0
          self.best_score = None
      
      def __call__(self, val_score):
          if self.best_score is None or val_score > self.best_score + self.min_delta:
              self.best_score = val_score
              self.counter = 0
              return False  # Don't stop
          self.counter += 1
          return self.counter >= self.patience  # Stop if patience exceeded
  ```

- [ ] **AV-025** — Mixed Precision Training (FP16)
  ```python
  from torch.cuda.amp import autocast, GradScaler
  scaler = GradScaler()
  
  with autocast():
      outputs = model(images)
      loss = criterion(outputs, labels)
  
  scaler.scale(loss).backward()
  scaler.step(optimizer)
  scaler.update()
  ```

---

### PHASE 4: Grad-CAM Heatmap

- [ ] **AV-030** — Grad-CAM implementation (`gradcam.py`)
  ```python
  class GradCAM:
      """
      Gradient-weighted Class Activation Mapping.
      
      Mục đích: Highlight vùng trên ảnh X-quang mà model 
      chú ý nhiều nhất khi đưa ra dự đoán.
      
      Cách hoạt động:
      1. Forward pass → lấy feature maps từ conv layer cuối
      2. Backward pass → lấy gradients
      3. Global Average Pooling gradients → weights
      4. Weighted sum of feature maps → heatmap
      5. ReLU → chỉ giữ positive activations
      6. Resize → kích thước ảnh gốc
      7. Overlay lên ảnh gốc
      """
      def __init__(self, model, target_layer):
          self.model = model
          self.target_layer = target_layer
          self.gradients = None
          self.activations = None
          self._register_hooks()
      
      def _register_hooks(self):
          def forward_hook(module, input, output):
              self.activations = output.detach()
          
          def backward_hook(module, grad_input, grad_output):
              self.gradients = grad_output[0].detach()
          
          self.target_layer.register_forward_hook(forward_hook)
          self.target_layer.register_full_backward_hook(backward_hook)
      
      def generate(self, input_image, target_class):
          output = self.model(input_image)
          self.model.zero_grad()
          output[0, target_class].backward()
          
          weights = torch.mean(self.gradients, dim=[2, 3])
          cam = torch.sum(weights[:, :, None, None] * self.activations, dim=1)
          cam = torch.relu(cam)
          cam = cam / (cam.max() + 1e-8)
          
          return cam.cpu().numpy()
  ```

- [ ] **AV-031** — Overlay heatmap lên ảnh gốc
  ```python
  def overlay_heatmap(image, heatmap, alpha=0.4, colormap=cv2.COLORMAP_JET):
      heatmap_resized = cv2.resize(heatmap, (image.shape[1], image.shape[0]))
      heatmap_colored = cv2.applyColorMap(
          np.uint8(255 * heatmap_resized), colormap
      )
      overlaid = cv2.addWeighted(image, 1 - alpha, heatmap_colored, alpha, 0)
      return overlaid
  ```

---

### PHASE 5: FastAPI Serving

- [ ] **AV-040** — FastAPI application (`app/main.py`)
  ```python
  from fastapi import FastAPI
  from contextlib import asynccontextmanager
  
  @asynccontextmanager
  async def lifespan(app: FastAPI):
      # Load model on startup
      app.state.model = load_model("weights/best_densenet121.pth")
      app.state.gradcam = GradCAM(app.state.model, target_layer=...)
      yield
      # Cleanup on shutdown
  
  app = FastAPI(
      title="AI Vision - Chest X-ray Analysis",
      version="1.0.0",
      lifespan=lifespan
  )
  ```

- [ ] **AV-041** — API Endpoints:
  ```
  POST   /api/predict/          # Upload ảnh → nhận predictions + heatmap
  GET    /api/health/           # Health check
  GET    /api/model-info/       # Thông tin model (version, metrics)
  POST   /api/batch-predict/    # Batch inference (nhiều ảnh)
  ```

- [ ] **AV-042** — Prediction endpoint
  ```python
  @router.post("/predict/")
  async def predict_xray(
      image: UploadFile = File(...),
      model = Depends(get_model)
  ):
      """
      Input: Ảnh X-quang (JPEG/PNG/DICOM)
      Output:
      {
          "predictions": {
              "Atelectasis": 0.72,
              "Cardiomegaly": 0.15,
              "Pneumonia": 0.89,
              ...
          },
          "top_findings": ["Pneumonia", "Atelectasis"],
          "heatmaps": {
              "Pneumonia": "base64_encoded_heatmap_image",
              "Atelectasis": "base64_encoded_heatmap_image"
          },
          "processing_time_ms": 245
      }
      """
      image_bytes = await image.read()
      preprocessed = preprocess_image(image_bytes)
      predictions = model(preprocessed)
      heatmaps = generate_heatmaps(model, preprocessed, top_classes)
      return PredictionResponse(...)
  ```

- [ ] **AV-043** — Request/Response schemas (`schemas.py`)
  ```python
  class PredictionResponse(BaseModel):
      predictions: Dict[str, float]      # {disease_name: probability}
      top_findings: List[str]            # Bệnh có probability > threshold
      heatmaps: Dict[str, str]           # {disease_name: base64_heatmap}
      processing_time_ms: float
      model_version: str
  
  class ModelInfoResponse(BaseModel):
      architecture: str                  # "DenseNet121"
      num_classes: int
      input_size: str                    # "224x224"
      trained_on: List[str]              # ["CheXpert", "NIH"]
      mean_auc: float
      version: str
  ```

---

## 🧪 Testing Checklist

- [ ] **AV-T01** — Unit test: model forward pass (input shape → output shape)
- [ ] **AV-T02** — Unit test: preprocessing pipeline (image → tensor shape)
- [ ] **AV-T03** — Unit test: Grad-CAM output shape matches input image
- [ ] **AV-T04** — Integration test: FastAPI endpoint `/predict/` với sample image
- [ ] **AV-T05** — Integration test: batch prediction
- [ ] **AV-T06** — Performance test: inference time < 500ms per image (GPU)
- [ ] **AV-T07** — Accuracy test: AUC-ROC > 0.80 trên CheXpert validation set

---

## 📈 Mục tiêu Đánh giá (Benchmarks)

| Metric | Mục tiêu tối thiểu | Mục tiêu lý tưởng | Paper gốc (CheXpert) |
|--------|--------------------|--------------------|---------------------|
| Mean AUC-ROC | > 0.80 | > 0.88 | 0.89 |
| Cardiomegaly AUC | > 0.85 | > 0.92 | 0.925 |
| Edema AUC | > 0.85 | > 0.91 | 0.914 |
| Pleural Effusion AUC | > 0.88 | > 0.94 | 0.937 |
| Pneumonia AUC | > 0.70 | > 0.80 | — |
| Pneumothorax AUC | > 0.85 | > 0.90 | — |
| Inference Time | < 500ms | < 200ms | — |

---

## ⚠️ Lưu ý quan trọng

1. **CheXpert uncertain labels (-1.0)** là quyết định quan trọng — U-Ones thường cho kết quả tốt nhất cho 5 bệnh competition
2. **Class imbalance nghiêm trọng** — Một số bệnh chỉ chiếm 1-2% → cần class weights hoặc oversampling
3. **Model weights KHÔNG push lên git** — File `.pth` rất nặng, dùng Git LFS hoặc cloud storage
4. **GPU bắt buộc cho training** — DenseNet121 trên ~335K ảnh cần GPU ≥ 8GB VRAM
5. **DICOM support** — Nếu bệnh viện gửi file DICOM, cần thêm `pydicom` để convert
6. **Grad-CAM chỉ cho class có probability > threshold** — Không generate heatmap cho tất cả 14 classes
