# 06. CHAT TU VAN Y KHOA (RAG)
# (chat + llm-rag service)

## Tong quan
Benh nhan chat voi AI de duoc tu van y khoa so bo.
AI su dung RAG (Retrieval-Augmented Generation) de tra loi dua tren
tai lieu y khoa da duoc nhung vao vector database.

---

## Chuc nang

### 6.1. Bat dau phien tu van
- **Actor**: Benh nhan (PATIENT)
- **Luong nghiep vu**:
  1. Benh nhan nhan "Chat tu van moi"
  2. He thong tao ChatSession:
     - patient = nguoi dung hien tai
     - title = "Phien tu van moi" (tu dong doi khi co noi dung)
  3. Hien thi giao dien chat

### 6.2. Gui cau hoi & nhan tra loi
- **Actor**: Benh nhan (PATIENT)
- **Input**: Cau hoi y khoa (text)
- **Luong nghiep vu**:
  1. Benh nhan nhap cau hoi: "Toi bi dau nguc va kho tho, co phai bi benh tim?"
  2. Backend luu ChatMessage(role=USER, content=cau_hoi)
  3. Backend goi LLM RAG service (port 8002):
     ```
     POST http://localhost:8002/api/chat
     Body: {
       "query": "Toi bi dau nguc va kho tho, co phai bi benh tim?",
       "session_id": "xxx",
       "history": [...]
     }
     ```
  4. LLM RAG xu ly (Pipeline RAG):
     a. **Embedding**: Chuyen cau hoi thanh vector 384 chieu
        (dung model: paraphrase-multilingual-MiniLM-L12-v2)
     b. **Retrieval**: Tim top-K tai lieu lien quan trong pgvector
        ```sql
        SELECT content, 1 - (embedding <=> query_vector) AS similarity
        FROM medical_documents
        WHERE 1 - (embedding <=> query_vector) > 0.3
        ORDER BY similarity DESC
        LIMIT 5;
        ```
     c. **Augmented Prompt**: Ghep tai lieu + cau hoi thanh prompt
        ```
        [System]: Ban la tro ly y te AI. Tra loi dua tren tai lieu:
        [Context]: {tai_lieu_1}... {tai_lieu_2}...
        [User]: {cau_hoi}
        ```
     d. **Generation**: Goi LLM (Ollama/local) de tao cau tra loi
     e. Tra ve:
        ```json
        {
          "answer": "Dau nguc va kho tho co the do nhieu nguyen nhan...",
          "sources": ["Tai lieu 1", "Tai lieu 2"],
          "confidence": 0.85
        }
        ```
  5. Backend luu ChatMessage(role=ASSISTANT, content=answer)
  6. Frontend hien thi tra loi + tai lieu tham khao

### 6.3. Phan loai chuyen khoa tu dong
- **Actor**: He thong (tu dong khi benh nhan chat)
- **Luong**:
  1. Khi benh nhan mo ta trieu chung trong chat, AI khong chi tra loi
     ma con DU DOAN chuyen khoa phu hop:
  2. Pipeline phan loai:
     a. Trich xuat trieu chung tu tin nhan benh nhan (NLP)
     b. So sanh voi co so tri thuc chuyen khoa:
        ```
        Tim mach: dau nguc, kho tho, tim dap nhanh, huyet ap cao
        Ho hap: ho, kho tho, dau hong, sot, tho kho
        Tieu hoa: dau bung, buon non, tieu chay, tao bon
        Than kinh: dau dau, chong mat, te tay chan, mat ngu
        Co xuong khop: dau lung, dau khop, cung co, sung khop
        Da lieu: phat ban, ngua, noi man, rung toc
        Mat: mo mat, dau mat, mat do, nhin kem
        Tai Mui Hong: dau tai, nghet mui, dau hong, mat tieng
        Noi tiet: met moi, tang/giam can bat thuong, khat nuoc
        Than - Tiet nieu: tieu buot, tieu ra mau, dau lung duoi
        ```
     c. Tinh diem tuong dong voi tung chuyen khoa
     d. Tra ve top 2-3 chuyen khoa phu hop + do tin cay
  3. Hien thi cho benh nhan:
     ```
     AI: Dua tren trieu chung cua ban, toi khuyen ban nen kham:
     1. Tim mach (85% phu hop) - dau nguc, kho tho
     2. Ho hap (62% phu hop) - kho tho, ho
     [Dat lich kham Tim mach ngay] -- button lien ket sang dat lich
     ```
  4. Khi benh nhan nhan "Dat lich" -> chuyen sang module Dat lich (02)
     voi chuyen khoa da chon san -> SA chi goi y bac si dung chuyen khoa

- **Ket noi voi Simulated Annealing**:
  - Chat RAG -> goi y chuyen khoa + do khan cap
  - Dat lich SA -> nhan chuyen khoa + urgency tu chat
  - => Toan bo luong lien mach: Chat -> Goi y -> Dat lich toi uu

### 6.4. Lich su chat
- **Actor**: Benh nhan (PATIENT)
- **Hien thi**:
  - Danh sach cac phien chat (moi nhat truoc)
  - Xem lai noi dung chat cu
  - Tiep tuc chat tu phien cu

---

## Pipeline RAG (Retrieval-Augmented Generation)

```
[Cau hoi] --> [Embedding Model] --> [Vector 384D]
                                        |
                                        v
                    [pgvector: Tim tai lieu tuong tu]
                                        |
                                        v
              [Top 5 tai lieu] + [Cau hoi] + [System Prompt]
                                        |
                                        v
                          [LLM (Ollama/qwen2.5)]
                                        |
                                        v
                              [Cau tra loi]
```

### Thuat toan

**Cosine Similarity** (do tuong dong vector):
- Tinh goc giua 2 vector trong khong gian 384 chieu
- Gia tri tu -1 (nguoc chieu) den 1 (cung huong)
- Nguong: > 0.3 moi coi la lien quan

**pgvector Operator <=>**: Cosine distance = 1 - cosine_similarity
- Index: IVFFlat hoac HNSW de tim kiem nhanh
- HNSW (Hierarchical Navigable Small World): tot nhat cho recall cao

**Chunking** (chia tai lieu):
- Moi tai lieu chia thanh cac doan 800 tokens
- Chong lap 150 tokens giua cac doan
- Dam bao thong tin khong bi cat ngang cau

---

## Canh bao an toan

```
QUAN TRONG: AI chi ho tro tu van so bo.
Moi cau tra loi phai kem disclaimer:
"Day la thong tin tham khao, KHONG thay the tu van cua bac si.
Neu co trieu chung nghiem trong, vui long den co so y te gan nhat."
```

---

## Mo hinh du lieu

```
ChatSession
  - patient (FK -> CustomUser)
  - title: string
  - created_at, updated_at

ChatMessage
  - session (FK -> ChatSession)
  - role: USER | ASSISTANT | SYSTEM
  - content: text
  - created_at

medical_documents (trong pgvector):
  - id, title, content, category
  - embedding: vector(384)
  - created_at
```

---

## API Endpoints

| Method | URL | Quyen | Mo ta |
|--------|-----|-------|-------|
| POST | /api/chat/sessions/ | PATIENT | Tao phien chat moi |
| GET | /api/chat/sessions/ | PATIENT | Danh sach phien chat |
| POST | /api/chat/sessions/{id}/messages/ | PATIENT | Gui tin nhan |
| GET | /api/chat/sessions/{id}/messages/ | PATIENT | Lich su tin nhan |