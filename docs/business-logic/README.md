# TAI LIEU NGHIEP VU - MedTech AI Platform

## Muc luc

| STT | File | Module | Mo ta |
|-----|------|--------|-------|
| 01 | [01-accounts.md](01-accounts.md) | accounts | Dang ky (OTP), dang nhap JWT, CCCD/BHYT, phan quyen |
| 02 | [02-appointments.md](02-appointments.md) | appointments | Dat lich THONG MINH (Simulated Annealing), state machine |
| 03 | [03-clinics.md](03-clinics.md) | clinics | Phong kham, tim kiem GIS (PostGIS), ban do |
| 04 | [04-medical-records.md](04-medical-records.md) | medical_records | Ho so y te (ICD-10), Audit Trail, don thuoc |
| 05 | [05-xray-analysis.md](05-xray-analysis.md) | xray + ai-vision | Phan tich X-quang AI, bac si dinh chinh, Celery retrain |
| 06 | [06-chat-rag.md](06-chat-rag.md) | chat + llm-rag | Chat tu van AI, phan loai chuyen khoa, RAG pipeline |
| 07 | [07-notifications.md](07-notifications.md) | notifications | Thong bao tu dong, realtime |
| 08 | [08-video-call.md](08-video-call.md) | video call | Kham tu xa WebRTC, phong cho, Django Channels |
| 09 | [09-i18n.md](09-i18n.md) | i18n | Da ngon ngu (Tieng Viet + English), react-i18next |

## 3 Vai tro nguoi dung

| Vai tro | Mo ta | Quyen |
|---------|-------|-------|
| PATIENT | Benh nhan | Dang ky (OTP), dat lich, upload X-quang, chat AI, video call, xem ho so |
| DOCTOR | Bac si | Xac nhan lich, kham tu xa, tao ho so (ICD-10), dinh chinh AI, quan ly BN |
| ADMIN | Quan tri | Quan ly phong kham, bac si, nguoi dung, trigger retrain, xem audit log |

## Luong nghiep vu tong quat

```
[Benh nhan]                                     [He thong]
    |                                               |
    |-- 1. Dang ky (OTP xac thuc) ----------------->|
    |-- 2. Mo ta trieu chung (Chat AI) ------------>|
    |                                               |-- LLM phan tich trieu chung
    |                                               |-- Goi y chuyen khoa (Tim mach 85%)
    |                                               |-- Danh gia do khan cap
    |                                               |
    |-- 3. Dat lich kham (Simulated Annealing) ---->|
    |                                               |-- PostGIS: tinh khoang cach
    |                                               |-- SA: toi uu 3 tieu chi
    |                                               |-- Goi y top 3-5 bac si/gio
    |<-- Goi y lich toi uu -------------------------|
    |-- Chon lich --------------------------------->|-- Thong bao Bac si
    |                                               |
    |                            [Bac si]           |
    |                                |-- Xac nhan ->|-- Thong bao BN
    |                                               |
    |== 4a. KHAM TRUC TIEP ========================|
    |   Den phong kham -> kham -> hoan thanh        |
    |                                               |
    |== 4b. KHAM TU XA (WebRTC) ===================|
    |   Bac si mo phong -> BN tham gia -> Video Call|
    |   -> Ket thuc -> COMPLETED                    |
    |                                               |
    |-- 5. Bac si tao ho so y te (ICD-10) -------->|
    |                                               |-- Audit Trail (version 1)
    |                                               |
    |-- 6. Upload X-quang (tuy chon) -------------->|
    |                                               |-- AI: DenseNet121 -> 14 benh
    |                                               |-- Grad-CAM heatmap
    |<-- Ket qua AI --------------------------------|
    |                                |              |
    |                                |-- Xem xet --|
    |                                |-- Dong y?    |
    |                                |   - Yes: OK  |
    |                                |   - No: Dinh chinh nhan
    |                                |              |-- Celery: queue retrain
    |                                               |
    |-- 7. Chat tu van AI (tuy chon) -------------->|
    |                                               |-- RAG: Embedding -> pgvector
    |                                               |-- LLM tra loi + tai lieu
    |                                               |-- Goi y chuyen khoa
    |<-- Tra loi + goi y ----------------------------|
```

## Diem noi bat ve cong nghe

| Tinh nang | Cong nghe | Giai thich |
|-----------|-----------|------------|
| Dat lich thong minh | Simulated Annealing | Toi uu 3 tieu chi: khan cap, workload, khoang cach |
| Tim phong kham | PostGIS (ST_DWithin) | Tim kiem GIS trong ban kinh, spatial index |
| Phan tich X-quang | DenseNet121 + Grad-CAM | 14 benh ly, heatmap vung bat thuong |
| Retrain tu dong | Celery + Redis | Bac si dinh chinh -> queue -> fine-tune model |
| Chat tu van | RAG (pgvector + Ollama) | Tim tai lieu y khoa + LLM tra loi |
| Phan loai chuyen khoa | NLP + Knowledge Base | Tu trieu chung -> goi y chuyen khoa |
| Kham tu xa | WebRTC + Django Channels | Video call P2P, phong cho |
| Ma benh chuan | ICD-10 | Thong ke, lien thong, BHYT |
| Bao mat ho so | Audit Trail | Moi thay doi deu ghi lai (ai, gi, khi nao) |
| Xac thuc | OTP + JWT + 2FA | Bao ve du lieu nhay cam (PHI) |