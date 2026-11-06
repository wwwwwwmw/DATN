# MedTech AI - UI Design Reference

## Danh sach man hinh (Figma Export)

| # | Thu muc | Man hinh | Mo ta |
|---|---------|----------|-------|
| 00 | 00-design-system/ | Design System | Color palette, typography, components, spacing |
| 01 | 01-doctor-dashboard/ | Bang dieu khien Bac si | Dashboard chinh: lich kham, yeu cau dat lich, AI can duyet |
| 02 | 02-clinic-map-gis/ | Ban do Phong kham GIS | Ban do OpenStreetMap, tim benh vien gan nhat |
| 03 | 03-chat-ai-clinical/ | Chat Tu van AI (RAG) | Chat phan loai trieu chung, goi y chuyen khoa |
| 04 | 04-settings-security/ | Cai dat & Bao mat | CCCD/BHYT, chu ky so SmartCA, ma QR dinh danh |
| 05 | 05-patient-portal/ | Cong thong tin Benh nhan | Dashboard BN: dich vu nhanh, lich hen, lich su kham |
| 06 | 06-medical-records-icd10/ | Ho so Benh an & ICD-10 | Chi tiet benh an, timeline, don thuoc, audit trail |
| 07 | 07-telehealth-webrtc/ | Kham benh tu xa WebRTC | Video call P2P, vitals realtime, so kham benh |
| 08 | 08-xray-ai-gradcam/ | Phan tich X-quang AI | Upload DICOM, Grad-CAM heatmap, 14 benh ly |
| 09 | 09-smart-booking-sa/ | Dat lich kham thong minh SA | SA fitness score, goi y bac si, luoi khung gio |

## Design System

### Phong cach: Clinical Precision
- Tone: Chuyen nghiep, y te, dang tin cay
- Desktop-first, data-dense, borders thay vi shadows

### Bang mau chinh

| Token | Hex | Dung cho |
|-------|-----|----------|
| Primary (Sapphire Navy) | #0F52BA | Navigation, buttons, links |
| Secondary (Deep Teal) | #0D9488 | Telehealth, video states |
| Emergency (Clinical Red) | #D9381E | Risk >50%, cap cuu, allergen |
| Neutral (Deep Slate) | #1E293B | Text chinh, headers |
| Canvas | #F4F7F9 | Background chinh |
| Card Surface | #FFFFFF | Cards, tables |
| Border | #E2E8F0 | Vien cards, dividers |

### Semantic Colors (Triage)

| Trang thai | Text | Background | Border |
|------------|------|------------|--------|
| Emergency | #D9381E | #FEE2E2 | #FCA5A5 |
| Normal | #16A34A | #DCFCE7 | #86EFAC |
| Warning | #D97706 | #FEF3C7 | #FCD34D |
| Neutral | #475569 | #F1F5F9 | #CBD5E1 |

### Typography
- Font: Inter (Google Fonts)
- Tabular numbers: font-feature-settings: "tnum" 1, "cv05" 1
- Medical codes (ICD-10): Monospace font
- Labels: Uppercase, tracking 0.04em

### Layout
- Sidebar: 240-280px fixed
- Main content: 8-column flexible
- Right panel: 320-380px contextual
- Desktop >=1200px: Full 3-column
- Tablet 768-1199px: Collapsible drawers
- Mobile <768px: Single-column stacked

### Components
- Buttons: 36px height, radius 4px, border 1px solid
- Cards: White bg, border #E2E8F0, radius 8px
- Badges/Pills: radius 9999px, 22px height
- Tables: Header #F8FAFC, row hover #F8FAFC
- Inputs: 36px height, radius 4px

## Ghi chu khi code
1. Desktop-first: Design cho bac si dung PC
2. Data-dense: Hien thi nhieu thong tin cung luc
3. Border-based: Dung border thay shadow
4. Sidebar: Co dinh ben trai, 2 nhom (Nghiep vu + He thong)
5. i18n: Can ho tro 2 ngon ngu (Tieng Viet + English)
6. Code HTML: Moi folder co code.html tu Figma de tham khao CSS