# 04. HO SO Y TE & BENH AN (ICD-10 + Audit Trail)
# (medical_records)

## Tong quan
Luu tru ho so y te sau moi lan kham. Tuan thu chuan y te:
- Ma benh **ICD-10** quoc te (thay vi free-text)
- **Audit Trail**: moi thay doi deu duoc ghi lai, khong xoa/sua am tham

---

## Chuc nang

### 4.1. Tao ho so y te (sau kham)
- **Actor**: Bac si (DOCTOR)
- **Dieu kien**: Appointment.status = COMPLETED
- **Input**:
  - diagnosis_text: "Viem phoi cap do vi khuan" (mo ta tu do)
  - icd10_codes: ["J18.9", "R50.9"] (ma ICD-10 bat buoc)
  - symptoms: "Ho, sot 39 do, kho tho"
  - prescription: JSON
    ```json
    [
      {"drug": "Amoxicillin", "dose": "500mg", "frequency": "3 lan/ngay", "days": 7},
      {"drug": "Paracetamol", "dose": "500mg", "frequency": "khi sot > 38.5", "days": 3}
    ]
    ```
  - notes: "Tai kham sau 7 ngay. Chup X-quang kiem tra."
  - follow_up_date: 2026-10-10
- **Luong nghiep vu**:
  1. Bac si hoan thanh kham (COMPLETED hoac ket thuc video call)
  2. He thong goi y tao ho so y te
  3. Bac si nhap thong tin:
     a. Chon ma ICD-10 (autocomplete tu bang ma):
        - Nhap "J18" -> goi y: J18.0 Viem phoi thuy, J18.9 Viem phoi khong dac hieu
        - Nhap "viem phoi" -> tim kiem bang ten tieng Viet
        - Co the chon NHIEU ma (1 benh nhan co the co nhieu benh)
     b. Nhap trieu chung, ke don, ghi chu
     c. Dat ngay tai kham (neu can)
  4. He thong:
     - Tao MedicalRecord voi version = 1
     - Lien ket voi Appointment (1-1)
     - Lien ket voi XrayAnalysisResult (neu co)
     - Gui thong bao cho benh nhan "Ho so y te da duoc cap nhat"
     - Neu co follow_up_date -> tao Notification REMINDER truoc 1 ngay

### 4.2. ICD-10 - Ma benh quoc te

```
=== ICD-10 la gi? ===
International Classification of Diseases, phien ban 10.
Chuan quoc te do WHO ban hanh de ma hoa benh, trieu chung.
Viet Nam ap dung ICD-10 trong y te cong.

=== Vi du ma ICD-10 ===
| Ma      | Ten (EN)            | Ten (VN)                  |
|---------|---------------------|---------------------------|
| J18.9   | Pneumonia, unspec   | Viem phoi khong dac hieu  |
| I10     | Essential HTN       | Tang huyet ap vo can      |
| E11.9   | Type 2 DM, unspec   | Dai thao duong type 2     |
| J45.9   | Asthma, unspec      | Hen suyen                 |
| K21.0   | GERD with esophagitis | Trao nguoc da day thuc quan |
| M54.5   | Low back pain       | Dau lung duoi              |
| R50.9   | Fever, unspec       | Sot khong ro nguyen nhan  |

=== Loi ich ===
- Thong ke benh chinh xac (bao nhieu benh nhan bi J18.9?)
- Lien thong du lieu giua cac benh vien
- AI phan tich xu huong dich benh
- Bao hiem y te (BHYT) thanh toan theo ma ICD
```

### 4.3. Xem ho so y te
- **Phan quyen**:
  - PATIENT: chi xem ho so cua MINH
  - DOCTOR: xem ho so cua benh nhan MA MINH DA KHAM
  - ADMIN: xem tat ca
- **Hien thi**:
  - Danh sach ho so theo thoi gian (moi nhat truoc)
  - Chi tiet: chan doan (ICD-10 + text), trieu chung, don thuoc, ghi chu
  - Lien ket: lich hen, ket qua X-quang (neu co)
  - Lich su chinh sua (Audit Trail)

### 4.4. Lich su kham benh (Timeline)
- **Actor**: Benh nhan (PATIENT) hoac Bac si (DOCTOR)
- **Hien thi**: Timeline tat ca lan kham:
  - Ngay kham, bac si, phong kham
  - Ma ICD-10 + chan doan
  - Don thuoc, ghi chu
  - Ket qua X-quang AI (neu co)
  - Linh ket video call (neu kham tu xa)

---

## Audit Trail (Lich su chinh sua)

### Tai sao can Audit Trail?
```
Du lieu y te la du lieu nhay cam nhat.
Khi ho so da luu, KHONG DUOC PHEP:
  - Xoa ho so
  - Sua am tham (khong de lai dau vet)

Moi thay doi PHAI ghi lai:
  - AI sua? (user_id)
  - Sua CAI GI? (field_name, old_value, new_value)
  - Sua KHI NAO? (timestamp)
  - LY DO sua? (reason)
```

### Luong Audit Trail
- **Khi bac si cap nhat ho so** (PATCH):
  1. He thong KHONG ghi de truc tiep
  2. Tao ban ghi MedicalRecordAudit:
     ```
     {
       record_id: 123,
       version: 2,
       changed_by: "BS. Nguyen Van A",
       changed_at: "2026-10-05 14:30:00",
       changes: [
         {"field": "diagnosis_text", "old": "Viem phoi cap", "new": "Viem phoi man tinh"},
         {"field": "icd10_codes", "old": ["J18.9"], "new": ["J18.9", "J44.1"]}
       ],
       reason: "Bo sung chan doan COPD sau ket qua xet nghiem"
     }
     ```
  3. Cap nhat MedicalRecord.version += 1
  4. Ghi log

### Quy tac
- Ho so KHONG BAO GIO bi xoa (soft-delete neu can)
- Moi PATCH tao 1 Audit record
- Admin co the xem toan bo lich su chinh sua
- Export duoc audit log (PDF/CSV) cho thanh tra y te

---

## Mo hinh du lieu

```
MedicalRecord
  - patient (FK -> CustomUser)
  - doctor (FK -> DoctorProfile)
  - appointment (1-1 -> Appointment, nullable)
  - xray_result (FK -> XrayAnalysisResult, nullable)
  - diagnosis_text: text (mo ta tu do)
  - icd10_codes: JSON (danh sach ma ICD-10, bat buoc)
  - symptoms: text
  - prescription: JSON (don thuoc co cau truc)
  - notes: text
  - follow_up_date: date (nullable)
  - version: int (phien ban hien tai, bat dau tu 1)
  - is_deleted: bool (soft-delete, default False)
  - created_at, updated_at

MedicalRecordAudit (Audit Trail)
  - record (FK -> MedicalRecord)
  - version: int (so phien ban)
  - changed_by (FK -> CustomUser)
  - changed_at: datetime
  - changes: JSON (danh sach {field, old, new})
  - reason: text (ly do chinh sua)

ICD10Code (Bang ma benh)
  - code: string (unique, VD: "J18.9")
  - name_en: string ("Pneumonia, unspecified")
  - name_vi: string ("Viem phoi khong dac hieu")
  - category: string ("J00-J99: Benh he ho hap")
  - is_active: bool
```

---

## API Endpoints

| Method | URL | Quyen | Mo ta |
|--------|-----|-------|-------|
| POST | /api/medical-records/ | DOCTOR | Tao ho so (version 1) |
| GET | /api/medical-records/ | Auth | Danh sach ho so |
| GET | /api/medical-records/{id}/ | Auth | Chi tiet ho so |
| PATCH | /api/medical-records/{id}/ | DOCTOR | Cap nhat (tao audit) |
| GET | /api/medical-records/{id}/history/ | Auth | Lich su chinh sua |
| GET | /api/icd10/?q=viem+phoi | Auth | Tim kiem ma ICD-10 |
| GET | /api/medical-records/timeline/ | PATIENT | Timeline kham benh |