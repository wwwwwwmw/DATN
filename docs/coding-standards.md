# 📏 Coding Standards — Quy chuẩn Lập trình

> Áp dụng cho toàn bộ dự án MedTech AI Platform

---

## 1. Python (Backend API, AI Vision, LLM RAG)

### 1.1 Style Guide
- Tuân theo **PEP 8** — Python Enhancement Proposal 8
- Dùng **Black** formatter (line length = 88)
- Dùng **isort** để sắp xếp imports
- Dùng **flake8** hoặc **ruff** cho linting

### 1.2 Naming Conventions

| Loại | Convention | Ví dụ |
|------|-----------|-------|
| Variables, functions | `snake_case` | `patient_name`, `get_user_profile()` |
| Classes | `PascalCase` | `DoctorProfile`, `ChestXrayDataset` |
| Constants | `UPPER_SNAKE_CASE` | `MAX_UPLOAD_SIZE`, `JWT_EXPIRY` |
| Private methods | `_leading_underscore` | `_calculate_distance()` |
| Modules, packages | `snake_case` | `simulated_annealing.py` |

### 1.3 Docstrings
```python
def calculate_optimal_slots(
    patient_location: tuple[float, float],
    available_slots: list[TimeSlot],
    preferences: dict
) -> list[dict]:
    """
    Tính toán khung giờ khám tối ưu bằng Simulated Annealing.

    Args:
        patient_location: Tuple (latitude, longitude) vị trí bệnh nhân.
        available_slots: Danh sách khung giờ còn trống.
        preferences: Dict chứa khung giờ ưa thích của bệnh nhân.

    Returns:
        Danh sách khung giờ được xếp hạng theo SA score,
        mỗi phần tử chứa slot_id, score, và reasons.

    Raises:
        ValueError: Nếu không có slot nào available.
        GISError: Nếu không thể tính khoảng cách PostGIS.
    """
    pass
```

### 1.4 Type Hints
```python
# Luôn dùng type hints cho function signatures
from typing import Optional

def get_nearby_clinics(
    lat: float, 
    lng: float, 
    radius: int = 5000,
    specialization: Optional[str] = None
) -> list[dict]:
    ...
```

### 1.5 Import Order
```python
# 1. Standard library
import os
import json
from datetime import datetime

# 2. Third-party packages
import torch
import numpy as np
from fastapi import FastAPI
from django.db import models

# 3. Local/project imports
from apps.accounts.models import CustomUser
from utils.helpers import format_response
```

---

## 2. TypeScript/JavaScript (Frontend Web)

### 2.1 Style Guide
- Tuân theo **ESLint recommended** + **Prettier**
- Ưu tiên **TypeScript** over JavaScript
- Dùng **functional components** + **hooks** (không class components)

### 2.2 Naming Conventions

| Loại | Convention | Ví dụ |
|------|-----------|-------|
| Variables, functions | `camelCase` | `patientName`, `getUserProfile()` |
| Components | `PascalCase` | `ChatWindow`, `BookingForm` |
| Interfaces/Types | `PascalCase` | `IUser`, `AppointmentStatus` |
| Constants | `UPPER_SNAKE_CASE` | `API_BASE_URL`, `MAX_FILE_SIZE` |
| Files (components) | `PascalCase.tsx` | `ChatWindow.tsx` |
| Files (utils) | `camelCase.ts` | `formatDate.ts` |
| CSS classes | `kebab-case` | `.chat-window`, `.booking-form` |

### 2.3 Component Structure
```tsx
// 1. Imports
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { IAppointment } from '@/types/appointment';

// 2. Interface/Props definition
interface BookingFormProps {
  clinicId: number;
  onSubmit: (data: IAppointment) => void;
  isLoading?: boolean;
}

// 3. Component
const BookingForm: React.FC<BookingFormProps> = ({ 
  clinicId, 
  onSubmit, 
  isLoading = false 
}) => {
  // 3a. Hooks
  const { user } = useAuth();
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);

  // 3b. Effects
  useEffect(() => {
    // fetch data
  }, [clinicId]);

  // 3c. Handlers
  const handleSubmit = () => {
    if (selectedSlot) {
      onSubmit({ slotId: selectedSlot, ... });
    }
  };

  // 3d. Render
  return (
    <div className="booking-form">
      {/* JSX */}
    </div>
  );
};

// 4. Export
export default BookingForm;
```

### 2.4 TypeScript Types
```typescript
// types/appointment.ts

export type AppointmentStatus = 
  | 'PENDING' 
  | 'CONFIRMED' 
  | 'CANCELLED' 
  | 'COMPLETED' 
  | 'NO_SHOW';

export interface IAppointment {
  id: number;
  patient: IUser;
  doctor: IDoctorProfile;
  clinic: IClinic;
  date: string;           // ISO 8601
  startTime: string;      // HH:mm
  endTime: string;        // HH:mm
  status: AppointmentStatus;
  reason: string;
  notes: string;
  saScore: number;        // Simulated Annealing score
  createdAt: string;      // ISO 8601
}
```

---

## 3. SQL (Database)

### 3.1 Naming Conventions

| Loại | Convention | Ví dụ |
|------|-----------|-------|
| Tables | `snake_case` (lowercase) | `appointments_appointment` |
| Columns | `snake_case` | `patient_id`, `created_at` |
| Primary Keys | `id` | `id SERIAL PRIMARY KEY` |
| Foreign Keys | `{table}_id` | `patient_id`, `doctor_id` |
| Indexes | `idx_{table}_{column}` | `idx_clinic_location` |
| Constraints | `chk_{description}` | `chk_time_order` |

---

## 4. Git Conventions

### 4.1 Branch Naming
```
main              # Production branch
develop           # Development branch
feature/FE-020    # Feature branches (prefix with module code)
bugfix/BE-015     # Bug fix branches
hotfix/DB-003     # Hotfix branches
```

### 4.2 Commit Messages
```
[MODULE] type: Brief description

Ví dụ:
[BE] feat: Add Simulated Annealing scheduling API
[FE] fix: Fix JWT refresh token loop
[AV] refactor: Optimize DenseNet121 inference pipeline
[RAG] docs: Update system prompt for medical safety
[DB] chore: Add PostGIS spatial index for clinics

Types:
- feat:     New feature
- fix:      Bug fix
- refactor: Code refactoring
- docs:     Documentation
- test:     Tests
- chore:    Build/config changes
- perf:     Performance improvement
```

### 4.3 Module Prefixes

| Prefix | Module |
|--------|--------|
| `[FE]` | Frontend Web |
| `[BE]` | Backend API |
| `[AV]` | AI Vision |
| `[RAG]` | LLM RAG |
| `[DB]` | Database |
| `[DEP]` | Deployment |
| `[DOC]` | Documentation |

---

## 5. Quy tắc chung

### 5.1 Error Handling
```python
# Python: Dùng custom exceptions
class MedTechException(Exception):
    """Base exception cho toàn dự án"""
    pass

class AIVisionError(MedTechException):
    """Lỗi từ AI Vision service"""
    pass

class RAGError(MedTechException):
    """Lỗi từ LLM RAG service"""
    pass
```

```typescript
// TypeScript: Dùng try-catch + custom error types
try {
  const result = await xrayApi.analyze(imageFile);
} catch (error) {
  if (error instanceof AxiosError) {
    if (error.response?.status === 413) {
      toast.error('File quá lớn. Giới hạn 10MB.');
    }
  }
}
```

### 5.2 Logging
```python
# Python: Dùng structured logging
import logging

logger = logging.getLogger(__name__)

logger.info("Appointment created", extra={
    "patient_id": patient.id,
    "doctor_id": doctor.id,
    "slot_id": slot.id,
    "sa_score": score
})

logger.error("AI Vision service unavailable", extra={
    "url": AI_VISION_URL,
    "status_code": response.status_code
})
```

### 5.3 Security Rules
- **KHÔNG** hardcode API keys, passwords, secrets
- **LUÔN** validate input phía server (không tin client)
- **LUÔN** dùng parameterized queries (chống SQL injection)
- **KHÔNG** log dữ liệu nhạy cảm (mật khẩu, token, dữ liệu y tế)
- **LUÔN** dùng HTTPS cho production
- **LUÔN** sanitize file uploads (kiểm tra MIME type, kích thước)

### 5.4 Comments
```python
# Viết comment giải thích TẠI SAO, không phải CÁI GÌ

# BAD: Increment counter by 1
counter += 1

# GOOD: Retry count tracks consecutive failures for circuit breaker
retry_count += 1

# GOOD: U-Ones strategy for CheXpert uncertain labels
# gives best AUC for Atelectasis per original paper (Table 3)
if label == -1.0:
    label = 1.0
```
