# Hướng dẫn chuẩn bị tài liệu y khoa cho RAG

## Yêu cầu tài liệu

Tài liệu y khoa được sử dụng làm knowledge base cho hệ thống RAG. 
Chất lượng tài liệu ảnh hưởng TRỰC TIẾP tới chất lượng tư vấn.

### Nguồn tài liệu chấp nhận

1. **Sách giáo khoa y khoa** (ưu tiên)
   - Nội khoa cơ bản
   - Triệu chứng học nội khoa
   - Ngoại khoa đại cương
   - Dược lý học cơ bản

2. **Hướng dẫn lâm sàng**
   - Hướng dẫn chẩn đoán và điều trị Bộ Y tế
   - WHO clinical guidelines
   - Phác đồ điều trị bệnh viện

3. **Dược thư**
   - Dược thư Quốc gia Việt Nam
   - Tài liệu thuốc (thành phần, liều dùng, chống chỉ định)

4. **Tài liệu triệu chứng**
   - MedlinePlus (NIH)
   - Mayo Clinic resources
   - WebMD (cẩn thận, cần verify)

### Format chấp nhận

| Format | Extension | Ghi chú |
|--------|----------|---------|
| PDF | `.pdf` | Phổ biến nhất |
| Word | `.docx` | Cần cài `python-docx` |
| Text | `.txt` | Đơn giản nhất |
| Markdown | `.md` | Dễ parse |
| HTML | `.html` | Cần strip tags |

### Cấu trúc thư mục

```
data/raw/
├── medical_textbooks/
│   ├── noikha_coban.pdf
│   ├── trieuchunghoc.pdf
│   └── ngoaikhoa_daicuong.pdf
├── clinical_guidelines/
│   ├── huongdan_chandoan_BYT_2023.pdf
│   └── phacdo_viempho.pdf
├── drug_references/
│   ├── duocthu_quocgia.pdf
│   └── bang_tuongtac_thuoc.pdf
└── symptom_databases/
    ├── trieuchung_hoihap.txt
    └── trieuchung_timmach.txt
```

### Lưu ý quan trọng

1. **BẢN QUYỀN:** Đảm bảo quyền sử dụng tài liệu cho mục đích nghiên cứu/giáo dục
2. **CHẤT LƯỢNG:** Chỉ dùng nguồn uy tín, có kiểm chứng y khoa
3. **CẬP NHẬT:** Ưu tiên tài liệu mới nhất (trong 5 năm gần đây)
4. **NGÔN NGỮ:** Ưu tiên tiếng Việt, có thể bổ sung tiếng Anh
5. **KHÔNG sử dụng:** Bài viết blog, tài liệu không rõ nguồn gốc, thông tin quảng cáo thuốc
