# 02. DAT LICH KHAM BENH (Tich hop Simulated Annealing)
# (appointments)

## Tong quan
He thong dat lich kham THONG MINH: thay vi benh nhan tu chon khung gio,
AI se GOI Y 3-5 khung gio/bac si toi uu nhat dua tren 3 tieu chi:
1. Do khan cap cua trieu chung
2. Hieu suat bac si (workload)
3. Khoang cach dia ly (PostGIS)

Su dung thuat toan **Simulated Annealing (SA)** de toi uu hoa.

---

## Chuc nang

### 2.1. Luong dat lich (2 Pha)

#### PHA 1: Thu thap du lieu dau vao
- **Actor**: Benh nhan (PATIENT)
- **Luong**:
  1. Benh nhan chon "Dat lich kham"
  2. He thong yeu cau nhap:
     a. **Trieu chung** (text): "Dau nguc, kho tho, sot 3 ngay"
     b. **Vi tri hien tai** (GPS tu browser hoac nhap tay)
     c. **Chuyen khoa mong muon** (tuy chon): Noi khoa, Tim mach, ...
     d. **Khoang thoi gian** (tuy chon): Tuan nay, 3 ngay toi, ...
  3. He thong xu ly:
     a. Goi LLM RAG de phan tich trieu chung:
        - Danh gia do khan cap: CAP_CUU (1.0) | KHAN_CAP (0.8) | BINH_THUONG (0.3)
        - Goi y chuyen khoa: "Tim mach", "Ho hap"
     b. Goi PostGIS de tinh khoang cach den cac phong kham:
        ```sql
        SELECT id, name, ST_Distance(location, ST_SetSRID(ST_MakePoint(lng, lat), 4326))
        AS distance_m FROM clinics_clinic WHERE is_active = TRUE;
        ```
     c. Truy van danh sach TimeSlot trong + thong tin bac si

#### PHA 2: Simulated Annealing goi y lich toi uu
- **Input**:
  - urgency_score: do khan cap (tu LLM)
  - distance_scores: khoang cach den tung phong kham (tu PostGIS)
  - doctor_workloads: so benh nhan hien tai cua tung bac si
  - available_slots: danh sach khung gio trong
- **Thuat toan Simulated Annealing**:
  ```
  === SIMULATED ANNEALING (Mo phong lui nhiet) ===

  Y tuong: Mo phong qua trinh lam nguoi cham cua kim loai.
  Ban dau (nhiet do cao): chap nhan ca giai phap xau -> kham pha rong.
  Sau do (nhiet do giam): chi chap nhan giai phap tot hon -> hoi tu.

  Ham muc tieu (fitness) cho moi cap (bac_si, khung_gio):
    score = w1 * urgency_match      -- Bac si phu hop voi do khan cap
          + w2 * doctor_efficiency   -- Bac si it benh nhan hon duoc uu tien
          + w3 * distance_score      -- Phong kham gan hon duoc uu tien
          + w4 * time_preference     -- Gio phu hop voi benh nhan

  Trong so mac dinh:
    w1 = 0.35 (do khan cap quan trong nhat)
    w2 = 0.25 (phan bo deu benh nhan)
    w3 = 0.25 (khoang cach)
    w4 = 0.15 (thoi gian)

  Thuat toan:
    1. Khoi tao: chon ngau nhien 1 slot
    2. Lap (100 vong):
       a. Tao giai phap lan can (chon slot khac ngau nhien)
       b. Tinh delta = score_moi - score_cu
       c. Neu delta > 0: chap nhan (tot hon)
       d. Neu delta < 0: chap nhan voi xac suat exp(delta / T)
       e. Giam nhiet do: T = T * 0.95 (cooling rate)
    3. Giu lai top 5 giai phap tot nhat

  Ket qua: Top 3-5 goi y sap xep theo SA score giam dan.
  ```
- **Output cho benh nhan**:
  ```
  Goi y #1 (SA score: 0.92):
    BS. Nguyen Van A - Tim mach
    BV Cho Ray - 1.2km
    Ngay 05/10 - 09:00-09:30
    "Phu hop nhat: chuyen khoa dung + gan + it benh nhan"

  Goi y #2 (SA score: 0.85):
    BS. Tran Thi B - Noi khoa
    BV Nhan Dan 115 - 3.5km
    Ngay 05/10 - 10:00-10:30

  Goi y #3 (SA score: 0.78):
    ...

  [Xem tat ca lich trong] -- Neu khong thich goi y
  ```

### 2.2. Dat lich tu goi y
- **Luong**:
  1. Benh nhan chon 1 trong cac goi y (hoac xem tat ca lich trong)
  2. He thong KIEM TRA (tat ca phai thoa man):
     a. TimeSlot co ton tai va is_available = True?
     b. TimeSlot chua day (current_patients < max_patients)?
     c. Benh nhan chua co lich hen CUNG time_slot nay?
        (unique_together: patient + time_slot)
     d. Benh nhan chua co lich PENDING/CONFIRMED voi cung bac si trong cung ngay?
     e. TimeSlot khong phai ngay trong qua khu?
  3. Neu tat ca OK:
     - Tao Appointment(status=PENDING, sa_score=score_cua_slot)
     - Tang current_patients cua TimeSlot len 1
     - Neu current_patients == max_patients -> set is_available = False
     - Gui thong bao cho bac si (Notification type=APPOINTMENT)
     - Neu urgency = CAP_CUU: tu dong CONFIRMED + thong bao khan
  4. Neu KHONG OK:
     - Tra ve loi cu the (slot da day, da dat roi, ...)

### 2.3. Bac si xac nhan / tu choi lich hen
- **Actor**: Bac si (DOCTOR)
- **Luong**:
  1. Bac si xem danh sach lich hen PENDING (sap xep theo urgency giam dan)
  2. Hien thi: trieu chung cua benh nhan, do khan cap, SA score
  3. Chon xac nhan (CONFIRMED) hoac tu choi (CANCELLED)
  4. Neu xac nhan:
     - Appointment.status = CONFIRMED
     - Gui thong bao cho benh nhan "Lich hen da duoc xac nhan"
  5. Neu tu choi:
     - Appointment.status = CANCELLED
     - Giam current_patients cua TimeSlot di 1
     - Neu truoc do is_available = False -> set lai True
     - Gui thong bao cho benh nhan kem ly do tu choi
     - He thong GOI Y lich thay the (chay lai SA)

### 2.4. Benh nhan huy lich hen
- **Actor**: Benh nhan (PATIENT)
- **Dieu kien**: Chi huy duoc lich PENDING hoac CONFIRMED
- **Luong**:
  1. Benh nhan chon lich hen va nhan "Huy"
  2. He thong kiem tra:
     - Trang thai phai la PENDING hoac CONFIRMED
     - Phai huy truoc gio hen it nhat 2 gio
  3. Cap nhat:
     - Appointment.status = CANCELLED
     - Giam current_patients cua TimeSlot di 1
     - Gui thong bao cho bac si

### 2.5. Hoan thanh lich kham
- **Actor**: Bac si (DOCTOR)
- **Luong**: Sau khi kham xong (truc tiep hoac video call):
  - Appointment.status = COMPLETED
  - He thong goi y tao Ho so y te (MedicalRecord)
  - Gui thong bao cho benh nhan

### 2.6. Danh dau vang mat (No-Show)
- **Actor**: Bac si (DOCTOR) hoac He thong (tu dong sau 30 phut)
- **Luong**:
  - Appointment.status = NO_SHOW
  - Ghi nhan. Nhieu lan no-show -> canh bao khi dat lich lan sau

---

## Chong xung dot & Race Condition

```
Tinh huong: 2 benh nhan dat cung 1 slot chi con 1 cho

Giai phap: Database Transaction + SELECT FOR UPDATE

BEGIN TRANSACTION;
  SELECT * FROM appointments_timeslot
    WHERE id = {slot_id} FOR UPDATE;  -- Lock row

  IF current_patients < max_patients:
    INSERT INTO appointments_appointment (...);
    UPDATE appointments_timeslot SET current_patients = current_patients + 1;
    IF current_patients >= max_patients:
      UPDATE appointments_timeslot SET is_available = FALSE;
  ELSE:
    RAISE "Slot da day";
COMMIT;
```

---

## Trang thai lich hen (State Machine)

```
PENDING ----xac nhan----> CONFIRMED ----kham xong----> COMPLETED
   |                         |              ^
   |                         |              |
   |                         +-- video call--+  (xem muc 08)
   |                         |
   +----huy-------> CANCELLED <----huy--------+
                                               |
CONFIRMED ----vang mat----> NO_SHOW

* Cap cuu: PENDING -> CONFIRMED (tu dong)
```

Chuyen trang thai hop le:
- PENDING -> CONFIRMED (bac si xac nhan / tu dong neu cap cuu)
- PENDING -> CANCELLED (benh nhan huy / bac si tu choi)
- CONFIRMED -> COMPLETED (bac si danh dau xong, sau kham hoac video call)
- CONFIRMED -> CANCELLED (benh nhan huy truoc 2 gio)
- CONFIRMED -> NO_SHOW (vang mat sau 30 phut)

---

## Mo hinh du lieu

```
TimeSlot
  - doctor (FK -> DoctorProfile)
  - clinic (FK -> Clinic)
  - date, start_time, end_time
  - is_available (bool), max_patients, current_patients
  - unique_together: [doctor, date, start_time]

Appointment
  - patient (FK -> CustomUser)
  - doctor (FK -> DoctorProfile)
  - clinic (FK -> Clinic)
  - time_slot (FK -> TimeSlot)
  - status: PENDING | CONFIRMED | CANCELLED | COMPLETED | NO_SHOW
  - reason: text (trieu chung nhap boi benh nhan)
  - notes: text
  - sa_score: float (diem Simulated Annealing)
  - urgency: BINH_THUONG | KHAN_CAP | CAP_CUU
  - unique_together: [patient, time_slot]
```

---

## API Endpoints

| Method | URL | Quyen | Mo ta |
|--------|-----|-------|-------|
| POST | /api/appointments/suggest/ | PATIENT | Pha 1+2: nhap trieu chung -> SA goi y |
| POST | /api/appointments/ | PATIENT | Dat lich (tu goi y hoac chon thu cong) |
| GET | /api/appointments/timeslots/?doctor={id} | Auth | Xem tat ca slot trong |
| GET | /api/appointments/ | Auth | Danh sach lich hen cua minh |
| GET | /api/appointments/{id}/ | Auth | Chi tiet lich hen |
| PATCH | /api/appointments/{id}/confirm/ | DOCTOR | Xac nhan |
| PATCH | /api/appointments/{id}/cancel/ | Auth | Huy lich |
| PATCH | /api/appointments/{id}/complete/ | DOCTOR | Hoan thanh |
| PATCH | /api/appointments/{id}/no-show/ | DOCTOR | Danh dau vang mat |