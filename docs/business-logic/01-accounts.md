# 01. QUAN LY TAI KHOAN & XAC THUC
# (accounts)

## Tong quan
He thong phan quyen 3 vai tro: PATIENT (benh nhan), DOCTOR (bac si), ADMIN (quan tri).
Xac thuc bang JWT (JSON Web Token) - khong can session phia server.

---

## Chuc nang

### 1.1. Dang ky tai khoan (co xac thuc OTP)
- **Actor**: Nguoi dung chua co tai khoan
- **Input**: email, so dien thoai, username, password, ho ten
- **Luong nghiep vu**:
  1. Nguoi dung nhap thong tin dang ky
  2. He thong kiem tra:
     - Email da ton tai? -> Bao loi "Email da duoc su dung"
     - Username da ton tai? -> Bao loi "Ten nguoi dung da ton tai"
     - So dien thoai hop le? -> Dinh dang VN: 0xxx hoac +84xxx
     - Password du manh? -> Toi thieu 8 ky tu, co chu hoa + so
  3. Gui ma OTP (6 so) qua SMS hoac Email:
     - OTP het han sau 5 phut
     - Toi da 3 lan nhap sai -> khoa 15 phut
  4. Nguoi dung nhap OTP de xac thuc
  5. Neu OTP dung:
     - Tao tai khoan voi role = PATIENT, is_verified = True
     - Tao PatientProfile lien ket voi user
     - Tra ve JWT token (access + refresh)
  6. Neu OTP sai:
     - Cho nhap lai (toi da 3 lan)
     - Sau 3 lan -> yeu cau gui lai OTP moi
- **Ket qua**: Tai khoan duoc tao va da xac thuc
- **Xu ly loi**:
  - Email trung: HTTP 400 + message
  - OTP het han: HTTP 400 "Ma xac thuc da het han, gui lai"
  - OTP sai: HTTP 400 "Ma xac thuc khong dung"

### 1.1b. Xac thuc 2 yeu to (2FA - tuy chon)
- **Luong**: Sau dang nhap thanh cong, neu user bat 2FA:
  - Gui OTP qua email/SMS
  - Nhap OTP -> moi tra ve JWT token
- **Ap dung**: Khuyen nghi cho DOCTOR va ADMIN (truy cap data nhay cam)

### 1.2. Dang nhap
- **Actor**: Nguoi dung da co tai khoan
- **Input**: email, password
- **Luong nghiep vu**:
  1. Nguoi dung nhap email + password
  2. He thong xac thuc:
     - Tim user theo email
     - So sanh password hash (bcrypt/argon2)
     - Neu sai -> HTTP 401 "Sai email hoac mat khau"
  3. Tao cap JWT token:
     - Access token: het han sau 60 phut
     - Refresh token: het han sau 7 ngay
  4. Tra ve token + thong tin user (id, email, role, ten)
- **Bao mat**:
  - Password KHONG bao gio luu plain text
  - JWT token chua: user_id, role, exp (thoi gian het han)
  - Refresh token dung de lay access token moi khi het han

### 1.3. Refresh Token
- **Luong**: Client gui refresh_token -> Server tra ve access_token moi
- **Khi nao**: Access token het han (401 Unauthorized)
- **Bao mat**: Refresh token chi dung 1 lan (rotate)

### 1.4. Dang xuat
- **Luong**: Client gui refresh_token -> Server blacklist token do
- **Ket qua**: Token khong con su dung duoc

### 1.5. Xem & Cap nhat Profile
- **Actor**: Nguoi dung da dang nhap
- **Phan quyen**:
  - PATIENT: chi xem/sua PatientProfile cua minh
  - DOCTOR: chi xem/sua DoctorProfile cua minh
  - ADMIN: xem/sua tat ca
- **Thong tin Patient**: ngay sinh, gioi tinh, nhom mau, dia chi, lien he khan cap, tien su benh
- **Thong tin Doctor**: chuyen khoa, so giay phep, so nam kinh nghiem, tieu su, phi kham

### 1.6. Tao tai khoan Bac si (Admin only)
- **Actor**: ADMIN
- **Luong**:
  1. Admin tao user voi role = DOCTOR
  2. He thong tu dong tao DoctorProfile
  3. Admin gan bac si vao phong kham (clinic)
  4. Admin thiet lap lich kham (time slots)

---

## Mo hinh du lieu

```
CustomUser
  - id, email (unique), username (unique), password (hash)
  - role: PATIENT | DOCTOR | ADMIN
  - phone, avatar, is_verified
  - created_at, updated_at

DoctorProfile (1-1 voi CustomUser)
  - specialization, license_number, experience_years
  - bio, clinic (FK -> Clinic), consultation_fee

PatientProfile (1-1 voi CustomUser)
  - date_of_birth, gender, blood_type
  - cccd_number: string (so CCCD, ma hoa AES-256, bat buoc khi kham)
  - bhyt_number: string (so the BHYT, tuy chon)
  - address, emergency_contact, medical_history

  Luu y bao mat:
  - CCCD ma hoa AES-256 khi luu DB, chi giai ma khi bac si can xem
  - Chi ADMIN va DOCTOR (dang kham benh nhan do) moi xem duoc CCCD
  - Khong hien thi day du: chi hien "***XXX" (3 so cuoi)
```

---

## API Endpoints

| Method | URL | Quyen | Mo ta |
|--------|-----|-------|-------|
| POST | /api/auth/register/ | Public | Dang ky |
| POST | /api/auth/login/ | Public | Dang nhap |
| POST | /api/auth/token/refresh/ | Public | Refresh token |
| GET | /api/auth/profile/ | Auth | Xem profile |
| PATCH | /api/auth/profile/ | Auth | Cap nhat profile |
| GET | /api/auth/doctors/ | Auth | Danh sach bac si |
| GET | /api/auth/doctors/{id}/ | Auth | Chi tiet bac si |