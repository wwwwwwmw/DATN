# 07. THONG BAO
# (notifications)

## Tong quan
He thong thong bao realtime cho nguoi dung.
Ho tro nhieu loai: lich hen, ket qua X-quang, chat, nhac nho.

---

## Chuc nang

### 7.1. Gui thong bao tu dong
He thong tu dong gui thong bao khi:

| Su kien | Nguoi nhan | Loai | Noi dung |
|---------|-----------|------|----------|
| Dat lich moi | Bac si | APPOINTMENT | "Benh nhan X dat lich kham ngay Y" |
| Xac nhan lich | Benh nhan | APPOINTMENT | "Lich hen ngay X da duoc xac nhan" |
| Huy lich | Bac si/BN | APPOINTMENT | "Lich hen ngay X da bi huy" |
| Ket qua X-quang | Benh nhan | XRAY_RESULT | "Ket qua phan tich X-quang da san sang" |
| Bac si xem X-quang | Benh nhan | XRAY_RESULT | "BS. X da xem ket qua X-quang cua ban" |
| Tin nhan chat moi | Benh nhan | CHAT | "AI da tra loi cau hoi cua ban" |
| Nhac tai kham | Benh nhan | REMINDER | "Ban co lich tai kham ngay X" |
| He thong | Tat ca | SYSTEM | Bao tri, cap nhat... |

### 7.2. Xem thong bao
- **Actor**: Nguoi dung da dang nhap
- **Hien thi**:
  - Badge so thong bao chua doc (is_read=False)
  - Danh sach thong bao moi nhat
  - Click vao -> danh dau da doc + chuyen trang tuong ung
  - VD: Click thong bao lich hen -> mo trang chi tiet lich hen

### 7.3. Danh dau da doc
- **Luong**: Click vao thong bao hoac nhan "Doc tat ca"
- **Ket qua**: is_read = True, badge giam

### 7.4. Lien ket thong bao
- **related_object_type** + **related_object_id**: lien ket den object goc
  - VD: type="appointment", id=123 -> link den /appointments/123
  - VD: type="xray_result", id=456 -> link den /xray/456

---

## Mo hinh du lieu

```
Notification
  - user (FK -> CustomUser) -- nguoi nhan
  - title: string
  - message: text
  - type: INFO | APPOINTMENT | XRAY_RESULT | CHAT | SYSTEM | REMINDER
  - is_read: bool (default False)
  - related_object_type: string (ten model lien ket)
  - related_object_id: int (ID cua object lien ket)
  - created_at
```

---

## API Endpoints

| Method | URL | Quyen | Mo ta |
|--------|-----|-------|-------|
| GET | /api/notifications/ | Auth | Danh sach thong bao |
| GET | /api/notifications/unread-count/ | Auth | So chua doc |
| PATCH | /api/notifications/{id}/read/ | Auth | Danh dau da doc |
| POST | /api/notifications/read-all/ | Auth | Doc tat ca |