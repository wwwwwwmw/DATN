# 08. KHAM BENH TU XA (Video Call - WebRTC)
# (chat + django channels + webrtc)

## Tong quan
Bac si va benh nhan co the kham benh tu xa qua video call.
Su dung WebRTC (peer-to-peer) ket hop Django Channels (WebSocket signaling).

---

## Chuc nang

### 8.1. Luong kham tu xa (end-to-end)

```
1. Lich hen CONFIRMED, den gio kham
       |
2. Bac si nhan "Bat dau kham tu xa"
       |
3. He thong tao Room (room_id = appointment_id)
       |-- Gui thong bao cho benh nhan: "Bac si da san sang, tham gia ngay"
       |
4. Benh nhan nhan "Tham gia phong kham"
       |
5. WebRTC Signaling (qua WebSocket):
       |-- Bac si gui Offer (SDP)
       |-- Benh nhan gui Answer (SDP)
       |-- Trao doi ICE Candidates
       |-- Ket noi peer-to-peer thanh cong
       |
6. Video Call dang dien ra
       |-- Bac si co the: ghi chu, xem ho so, ke don
       |-- Benh nhan co the: chia se man hinh, gui anh
       |
7. Bac si nhan "Ket thuc cuoc kham"
       |
8. He thong:
       |-- Dong phong, ngat ket noi WebRTC
       |-- Appointment.status = COMPLETED
       |-- Goi y tao Ho so y te
       |-- Luu thoi gian cuoc goi (thoi luong)
```

### 8.2. Phong cho (Waiting Room)
- **Luong**:
  1. Bac si tao phong -> trang thai phong: WAITING
  2. Benh nhan vao -> trang thai: READY
  3. Bac si chap nhan -> trang thai: IN_CALL
  4. Ket thuc -> trang thai: ENDED
- **Ly do can phong cho**:
  - Bac si co the dang kham benh nhan truoc
  - Nhieu benh nhan cung gio -> vao phong cho theo thu tu
  - Dam bao chi co 1 benh nhan trong phong tai 1 thoi diem

### 8.3. WebRTC Signaling (qua Django Channels)

```
=== WebRTC la gi? ===
- Cong nghe cho phep 2 trinh duyet ket noi TRUC TIEP (peer-to-peer)
- Video/audio di thang tu may A -> may B, KHONG qua server
- Server chi lam nhiem vu "gioi thieu" 2 ben (Signaling)

=== Signaling Flow ===

[Bac si Browser]        [Django Channels WS]        [Benh nhan Browser]
      |                         |                           |
      |-- ws://server/ws/call/{room_id}/ ----connect------->|
      |                         |<--- ws://server/ws/call/{room_id}/
      |                         |                           |
      |-- {"type": "offer",     |                           |
      |    "sdp": "..."}  ---->|--- forward offer -------->|
      |                         |                           |
      |                         |<--- {"type": "answer",   |
      |<--- forward answer ----|      "sdp": "..."}        |
      |                         |                           |
      |-- {"type": "ice",      |                           |
      |    "candidate":"..."} ->|--- forward ice --------->|
      |                         |<--- {"type": "ice",...}   |
      |<--- forward ice --------|                           |
      |                         |                           |
      |========== P2P Video/Audio Connected ===============|
```

### 8.4. TURN/STUN Server
- **STUN**: Giup browser biet IP public cua minh (mien phi, Google cung cap)
  - stun:stun.l.google.com:19302
- **TURN**: Relay server khi P2P khong ket noi duoc (NAT/Firewall)
  - Can tu host hoac dung dich vu (coturn, Twilio)
  - Chi dung khi STUN that bai (~10% truong hop)

### 8.5. Chia se man hinh & Gui anh trong cuoc goi
- **Chia se man hinh**: dung getDisplayMedia API
- **Gui anh X-quang**: gui qua WebRTC DataChannel hoac upload API

---

## Trang thai phong kham

```
WAITING ----benh nhan vao----> READY ----bac si chap nhan----> IN_CALL
                                                                  |
                                                     ket thuc---->ENDED
```

---

## Bao mat

- Chi bac si co lich hen moi tao duoc phong
- Chi benh nhan co lich hen moi vao duoc phong
- Room_id = appointment_id (khong doan duoc)
- Video/audio ma hoa end-to-end (WebRTC default: DTLS-SRTP)
- Phong tu dong dong sau 60 phut (timeout)
- Khong luu video tren server (chi peer-to-peer)

---

## Mo hinh du lieu

```
VideoCallRoom (moi hoac them vao Appointment)
  - appointment (1-1 -> Appointment)
  - room_status: WAITING | READY | IN_CALL | ENDED
  - started_at: datetime (nullable)
  - ended_at: datetime (nullable)
  - duration_minutes: int (tinh tu started - ended)
  - created_by: FK -> CustomUser (bac si)

Hoac don gian: them vao Appointment:
  - call_room_status: WAITING | READY | IN_CALL | ENDED | null
  - call_started_at, call_ended_at, call_duration
```

---

## Cong nghe

| Thanh phan | Cong nghe | Muc dich |
|------------|-----------|----------|
| Signaling | Django Channels (WebSocket) | Trao doi SDP/ICE |
| Video/Audio | WebRTC (built-in browser) | Peer-to-peer call |
| STUN | Google STUN (mien phi) | NAT traversal |
| TURN | coturn (tu host) | Relay khi P2P fail |
| State | Redis (Channel Layer) | Luu trang thai phong |

---

## API & WebSocket Endpoints

| Type | URL | Quyen | Mo ta |
|------|-----|-------|-------|
| POST | /api/appointments/{id}/start-call/ | DOCTOR | Tao phong kham tu xa |
| WS | ws://server/ws/call/{room_id}/ | Auth | WebSocket signaling |
| GET | /api/appointments/{id}/call-status/ | Auth | Trang thai phong |
| POST | /api/appointments/{id}/end-call/ | DOCTOR | Ket thuc cuoc goi |