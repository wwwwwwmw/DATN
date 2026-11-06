# 🤖 LLM RAG — Tài liệu Kỹ thuật & Checklist Nghiệp vụ

> **Công nghệ:** Python 3.11+ / FastAPI / LangChain / pgvector  
> **Port:** 8002  
> **Vai trò:** Pipeline RAG tư vấn y tế bằng ngôn ngữ tự nhiên, nhúng tài liệu y khoa, truy xuất ngữ cảnh

---

## 📁 Cấu trúc thư mục đề xuất

```
llm-rag/
├── app/                        # FastAPI application
│   ├── __init__.py
│   ├── main.py                 # FastAPI entry point
│   ├── api/
│   │   ├── __init__.py
│   │   ├── routes.py           # API endpoints (chat, search)
│   │   └── schemas.py          # Pydantic models
│   ├── core/
│   │   ├── config.py           # Settings (API keys, DB, model config)
│   │   └── dependencies.py     # DI: RAG chain, vector store
│   └── services/
│       ├── __init__.py
│       ├── rag_pipeline.py     # Main RAG pipeline
│       ├── vector_store.py     # pgvector operations
│       ├── embeddings.py       # Embedding model wrapper
│       ├── llm_client.py       # LLM API client (OpenAI/local)
│       └── document_processor.py # Document chunking & processing
├── data/
│   ├── raw/                    # Tài liệu y khoa gốc
│   │   ├── medical_textbooks/  # Sách giáo khoa y khoa
│   │   ├── clinical_guidelines/ # Hướng dẫn lâm sàng
│   │   ├── drug_references/    # Tài liệu thuốc
│   │   └── symptom_databases/  # CSDL triệu chứng
│   ├── processed/              # Tài liệu đã xử lý
│   │   └── chunks/             # Văn bản đã chia nhỏ
│   └── README.md               # Hướng dẫn chuẩn bị tài liệu
├── scripts/
│   ├── ingest_documents.py     # Script nhúng tài liệu vào vector DB
│   ├── evaluate_rag.py         # Đánh giá chất lượng RAG
│   ├── test_queries.py         # Test queries mẫu
│   └── update_embeddings.py    # Cập nhật embeddings khi thêm tài liệu mới
├── prompts/
│   ├── system_prompt.txt       # System prompt cho LLM
│   ├── medical_qa.txt          # Prompt template cho Q&A y tế
│   └── disclaimer.txt          # Cảnh báo y tế
├── tests/
│   ├── test_rag_pipeline.py
│   ├── test_vector_store.py
│   ├── test_embeddings.py
│   └── test_api.py
├── Dockerfile
├── requirements.txt
└── README.md
```

---

## 🔧 Dependencies

```txt
# requirements.txt
fastapi>=0.104.0
uvicorn[standard]>=0.24.0
langchain>=0.1.0
langchain-openai>=0.0.5
langchain-community>=0.0.10
openai>=1.10.0
pgvector>=0.2.4
psycopg2-binary>=2.9
sqlalchemy>=2.0
tiktoken>=0.5.0
sentence-transformers>=2.3.0   # Local embeddings (alternative)
unstructured>=0.12.0           # Document parsing
pypdf>=4.0                     # PDF parsing
python-docx>=1.0               # DOCX parsing
pydantic>=2.5.0
pydantic-settings>=2.1.0
python-dotenv>=1.0.0
httpx>=0.27.0
```

---

## 🔄 Pipeline RAG — Luồng hoạt động chi tiết

```
┌─────────────────────────────────────────────────────────────────────┐
│                        RAG PIPELINE                                  │
│                                                                      │
│  ┌──────────┐     ┌──────────────┐     ┌────────────────────────┐   │
│  │  Query    │ ──> │  Embedding   │ ──> │  Vector Similarity     │   │
│  │  "Đau    │     │  Model       │     │  Search (pgvector)     │   │
│  │  ngực,   │     │  (OpenAI/    │     │  cosine_distance < 0.3│   │
│  │  ho..."  │     │   local)     │     │  Top-K = 5             │   │
│  └──────────┘     └──────────────┘     └──────────┬─────────────┘   │
│                                                    │                 │
│                                                    ▼                 │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                    Context Assembly                             │  │
│  │                                                                │  │
│  │  System Prompt:                                                │  │
│  │  "Bạn là trợ lý y tế AI. Dựa trên tài liệu y khoa..."       │  │
│  │                                                                │  │
│  │  Retrieved Context:                                            │  │
│  │  [Doc 1: "Đau ngực có thể do nhiều nguyên nhân..."]           │  │
│  │  [Doc 2: "Triệu chứng viêm phổi bao gồm..."]                │  │
│  │  [Doc 3: "Bệnh tim mạch cần được khám..."]                   │  │
│  │                                                                │  │
│  │  User Query: "Tôi bị đau ngực và ho kéo dài 3 ngày..."       │  │
│  │                                                                │  │
│  │  Chat History: [previous messages...]                          │  │
│  └────────────────────────────────────────┬───────────────────────┘  │
│                                           │                          │
│                                           ▼                          │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                    LLM Generation                               │  │
│  │                                                                │  │
│  │  Model: GPT-4 / GPT-3.5-turbo / Local LLM                    │  │
│  │  Temperature: 0.3 (conservative for medical)                   │  │
│  │  Max tokens: 1024                                              │  │
│  │                                                                │  │
│  │  Output: Lời khuyên y tế + nguồn trích dẫn + disclaimer       │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## ✅ Checklist Nghiệp vụ Chi tiết

### PHASE 1: Chuẩn bị Tài liệu Y khoa

- [ ] **RAG-001** — Thu thập tài liệu y khoa chuẩn
  - Nguồn đề xuất:
    - Sách giáo khoa y khoa tiếng Việt (Nội khoa, Ngoại khoa cơ bản)
    - Hướng dẫn lâm sàng Bộ Y tế
    - Dược thư Quốc gia
    - WHO clinical guidelines (bản dịch tiếng Việt nếu có)
    - Tài liệu triệu chứng học
    - Medical encyclopedias (MedlinePlus, Mayo Clinic — English)
  - Format chấp nhận: PDF, DOCX, TXT, Markdown, HTML

- [ ] **RAG-002** — Xử lý tài liệu (`document_processor.py`)
  ```python
  class DocumentProcessor:
      """
      Pipeline xử lý tài liệu:
      1. Parse tài liệu (PDF, DOCX, TXT, HTML)
      2. Làm sạch văn bản (loại bỏ header/footer, page numbers)
      3. Chia nhỏ (chunking) theo semantic boundaries
      4. Thêm metadata (nguồn, chương, trang)
      """
      
      def __init__(self, chunk_size=1000, chunk_overlap=200):
          self.chunk_size = chunk_size
          self.chunk_overlap = chunk_overlap
          self.text_splitter = RecursiveCharacterTextSplitter(
              chunk_size=chunk_size,
              chunk_overlap=chunk_overlap,
              separators=["\n\n", "\n", ". ", " ", ""]
          )
      
      def process_pdf(self, pdf_path: str) -> List[Document]:
          loader = PyPDFLoader(pdf_path)
          pages = loader.load()
          chunks = self.text_splitter.split_documents(pages)
          for chunk in chunks:
              chunk.metadata.update({
                  'source': pdf_path,
                  'type': 'medical_textbook',
                  'language': self.detect_language(chunk.page_content)
              })
          return chunks
  ```

- [ ] **RAG-003** — Chiến lược Chunking
  - **Chunk size:** 500-1000 tokens (tuỳ thử nghiệm)
  - **Chunk overlap:** 100-200 tokens (đảm bảo ngữ cảnh liên tục)
  - **Semantic chunking:** Ưu tiên split theo heading/paragraph thay vì cắt ngang câu
  - **Metadata preserved:** nguồn tài liệu, chương, trang, ngôn ngữ

---

### PHASE 2: Vector Store (pgvector)

- [ ] **RAG-010** — Cấu hình pgvector trong PostgreSQL
  ```sql
  -- Kích hoạt extension
  CREATE EXTENSION IF NOT EXISTS vector;
  
  -- Bảng lưu trữ document chunks + embeddings
  CREATE TABLE medical_documents (
      id SERIAL PRIMARY KEY,
      content TEXT NOT NULL,                           -- Nội dung văn bản chunk
      embedding vector(1536),                          -- Vector nhúng (1536 dims cho OpenAI ada-002)
      metadata JSONB DEFAULT '{}',                     -- Metadata (source, page, chapter, type)
      source_file VARCHAR(500),                        -- Đường dẫn file gốc
      chunk_index INTEGER,                             -- Thứ tự chunk trong tài liệu
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  
  -- Index cho vector similarity search
  CREATE INDEX ON medical_documents 
      USING ivfflat (embedding vector_cosine_ops) 
      WITH (lists = 100);
  
  -- Index cho metadata filtering
  CREATE INDEX ON medical_documents USING GIN (metadata);
  ```

- [ ] **RAG-011** — Vector Store service (`vector_store.py`)
  ```python
  from pgvector.sqlalchemy import Vector
  from sqlalchemy import Column, Integer, Text, DateTime
  from sqlalchemy.dialects.postgresql import JSONB
  
  class MedicalDocument(Base):
      __tablename__ = 'medical_documents'
      id = Column(Integer, primary_key=True)
      content = Column(Text, nullable=False)
      embedding = Column(Vector(1536))
      metadata_ = Column('metadata', JSONB, default={})
      source_file = Column(Text)
      chunk_index = Column(Integer)
  
  class VectorStore:
      def __init__(self, session_factory, embedding_model):
          self.session_factory = session_factory
          self.embedding_model = embedding_model
      
      async def add_documents(self, documents: List[Document]):
          """Nhúng và lưu tài liệu vào vector store"""
          embeddings = await self.embedding_model.embed_batch(
              [doc.page_content for doc in documents]
          )
          with self.session_factory() as session:
              for doc, emb in zip(documents, embeddings):
                  record = MedicalDocument(
                      content=doc.page_content,
                      embedding=emb,
                      metadata_=doc.metadata,
                      source_file=doc.metadata.get('source', ''),
                      chunk_index=doc.metadata.get('chunk_index', 0)
                  )
                  session.add(record)
              session.commit()
      
      async def similarity_search(self, query: str, k: int = 5, 
                                   threshold: float = 0.3) -> List[Document]:
          """
          Tìm kiếm tài liệu tương đồng nhất với query.
          Sử dụng cosine distance.
          """
          query_embedding = await self.embedding_model.embed(query)
          
          with self.session_factory() as session:
              results = session.query(MedicalDocument).order_by(
                  MedicalDocument.embedding.cosine_distance(query_embedding)
              ).limit(k).all()
              
              return [
                  Document(
                      page_content=r.content,
                      metadata=r.metadata_
                  )
                  for r in results
              ]
  ```

---

### PHASE 3: Embedding Model

- [ ] **RAG-020** — Embedding service (`embeddings.py`)
  ```python
  class EmbeddingService:
      """
      Wrapper cho embedding model.
      
      Lựa chọn:
      1. OpenAI text-embedding-ada-002 (1536 dims) — chất lượng cao, cần API key
      2. OpenAI text-embedding-3-small (1536 dims) — rẻ hơn, hiệu quả
      3. sentence-transformers (local) — miễn phí, chạy offline
         - all-MiniLM-L6-v2 (384 dims)
         - multilingual-e5-large (1024 dims) — hỗ trợ tiếng Việt tốt
      """
      
      def __init__(self, provider: str = "openai", model_name: str = None):
          if provider == "openai":
              self.model = OpenAIEmbeddings(
                  model=model_name or "text-embedding-3-small"
              )
          elif provider == "local":
              from sentence_transformers import SentenceTransformer
              self.model = SentenceTransformer(
                  model_name or "intfloat/multilingual-e5-large"
              )
      
      async def embed(self, text: str) -> List[float]:
          """Embed một đoạn văn bản"""
          return await self.model.aembed_query(text)
      
      async def embed_batch(self, texts: List[str]) -> List[List[float]]:
          """Embed batch văn bản (hiệu quả hơn)"""
          return await self.model.aembed_documents(texts)
  ```

- [ ] **RAG-021** — Script nhúng tài liệu (`scripts/ingest_documents.py`)
  ```python
  """
  Script chạy 1 lần (hoặc khi thêm tài liệu mới).
  
  Workflow:
  1. Scan thư mục data/raw/ tìm tất cả tài liệu
  2. Parse & chunk tài liệu
  3. Generate embeddings (batch)
  4. Lưu vào PostgreSQL (pgvector)
  5. In thống kê: số tài liệu, số chunks, thời gian xử lý
  """
  
  async def ingest_all():
      processor = DocumentProcessor(chunk_size=800, chunk_overlap=150)
      vector_store = VectorStore(...)
      
      documents = []
      for file_path in Path("data/raw").rglob("*"):
          if file_path.suffix in ['.pdf', '.docx', '.txt', '.md']:
              chunks = processor.process(str(file_path))
              documents.extend(chunks)
      
      print(f"Tổng chunks: {len(documents)}")
      await vector_store.add_documents(documents)
      print("Hoàn thành nhúng tài liệu!")
  ```

---

### PHASE 4: RAG Pipeline

- [ ] **RAG-030** — Main RAG pipeline (`rag_pipeline.py`)
  ```python
  class MedicalRAGPipeline:
      """
      Pipeline RAG cho tư vấn y tế.
      
      Flow:
      1. Nhận query (triệu chứng) từ user
      2. Embed query → vector
      3. Similarity search trong vector store → top-K relevant docs
      4. Xây dựng prompt: system + context + chat_history + query
      5. Gửi prompt cho LLM
      6. Nhận và trả response + sources
      """
      
      def __init__(self, vector_store, llm_client, embedding_service):
          self.vector_store = vector_store
          self.llm = llm_client
          self.embeddings = embedding_service
      
      async def query(self, user_query: str, chat_history: List[dict] = None) -> dict:
          # 1. Retrieve relevant documents
          relevant_docs = await self.vector_store.similarity_search(
              user_query, k=5
          )
          
          # 2. Build context
          context = "\n\n---\n\n".join([
              f"[Nguồn: {doc.metadata.get('source', 'N/A')}]\n{doc.page_content}"
              for doc in relevant_docs
          ])
          
          # 3. Build prompt
          messages = self._build_messages(user_query, context, chat_history)
          
          # 4. Call LLM
          response = await self.llm.generate(messages)
          
          # 5. Return with sources
          return {
              "answer": response,
              "sources": [
                  {
                      "content": doc.page_content[:200],
                      "source": doc.metadata.get('source', ''),
                      "relevance_score": doc.metadata.get('score', 0)
                  }
                  for doc in relevant_docs
              ],
              "disclaimer": MEDICAL_DISCLAIMER
          }
      
      def _build_messages(self, query, context, chat_history):
          messages = [
              {"role": "system", "content": SYSTEM_PROMPT},
          ]
          
          if chat_history:
              messages.extend(chat_history[-6:])  # Last 3 turns
          
          messages.append({
              "role": "user",
              "content": f"""
              Dựa trên tài liệu y khoa sau đây:
              
              {context}
              
              Câu hỏi của bệnh nhân:
              {query}
              
              Hãy đưa ra lời khuyên y tế phù hợp, có trích dẫn nguồn.
              Luôn khuyến khích bệnh nhân đi khám bác sĩ trực tiếp.
              """
          })
          
          return messages
  ```

- [ ] **RAG-031** — System Prompt (`prompts/system_prompt.txt`)
  ```
  Bạn là trợ lý tư vấn y tế AI của hệ thống MedTech.
  
  NGUYÊN TẮC:
  1. CHỈ trả lời dựa trên tài liệu y khoa được cung cấp trong context.
  2. Nếu không tìm thấy thông tin trong context, hãy nói rõ "Tôi không có đủ thông tin để trả lời câu hỏi này."
  3. KHÔNG BAO GIỜ tự chẩn đoán bệnh. Chỉ cung cấp thông tin tham khảo.
  4. LUÔN khuyến khích bệnh nhân đến cơ sở y tế khám trực tiếp.
  5. Trả lời bằng tiếng Việt, rõ ràng, dễ hiểu cho người không chuyên.
  6. Nếu triệu chứng có dấu hiệu cấp cứu (đau ngực dữ dội, khó thở nặng, mất ý thức), 
     hãy NGAY LẬP TỨC khuyên gọi 115 hoặc đến phòng cấp cứu.
  7. Trích dẫn nguồn tài liệu khi đưa ra thông tin.
  
  CẢNH BÁO QUAN TRỌNG:
  Kết quả tư vấn này chỉ mang tính chất tham khảo, KHÔNG thay thế cho việc 
  khám bệnh trực tiếp với bác sĩ chuyên khoa.
  ```

- [ ] **RAG-032** — LLM Client (`llm_client.py`)
  ```python
  class LLMClient:
      """
      Client cho LLM API.
      
      Hỗ trợ:
      1. OpenAI API (GPT-4, GPT-3.5-turbo)
      2. Local model qua API tương thích OpenAI (vLLM, Ollama, LM Studio)
      """
      
      def __init__(self, provider="openai", model="gpt-3.5-turbo", 
                   temperature=0.3, max_tokens=1024):
          self.client = AsyncOpenAI(
              api_key=settings.OPENAI_API_KEY,
              base_url=settings.LLM_BASE_URL  # Cho phép point tới local server
          )
          self.model = model
          self.temperature = temperature
          self.max_tokens = max_tokens
      
      async def generate(self, messages: List[dict]) -> str:
          response = await self.client.chat.completions.create(
              model=self.model,
              messages=messages,
              temperature=self.temperature,
              max_tokens=self.max_tokens
          )
          return response.choices[0].message.content
      
      async def stream(self, messages: List[dict]):
          """Stream tokens for real-time display"""
          response = await self.client.chat.completions.create(
              model=self.model,
              messages=messages,
              temperature=self.temperature,
              max_tokens=self.max_tokens,
              stream=True
          )
          async for chunk in response:
              if chunk.choices[0].delta.content:
                  yield chunk.choices[0].delta.content
  ```

---

### PHASE 5: FastAPI Serving

- [ ] **RAG-040** — FastAPI application
  ```python
  app = FastAPI(
      title="LLM RAG - Medical Consultation",
      version="1.0.0"
  )
  ```

- [ ] **RAG-041** — API Endpoints:
  ```
  POST   /api/chat/              # Gửi triệu chứng → nhận lời khuyên
  POST   /api/chat/stream/       # Streaming response (SSE)
  POST   /api/search/            # Tìm kiếm tài liệu y khoa (vector search only)
  GET    /api/health/            # Health check
  POST   /api/documents/ingest/  # Thêm tài liệu mới vào vector store (Admin)
  GET    /api/documents/stats/   # Thống kê vector store
  ```

- [ ] **RAG-042** — Chat endpoint
  ```python
  @router.post("/chat/")
  async def medical_chat(
      request: ChatRequest,
      rag_pipeline: MedicalRAGPipeline = Depends(get_rag_pipeline)
  ):
      """
      Input:
      {
          "query": "Tôi bị đau ngực và ho kéo dài 3 ngày, sốt nhẹ",
          "chat_history": [
              {"role": "user", "content": "..."},
              {"role": "assistant", "content": "..."}
          ]
      }
      
      Output:
      {
          "answer": "Dựa trên triệu chứng bạn mô tả...",
          "sources": [
              {
                  "content": "Đoạn trích từ tài liệu...",
                  "source": "Nội khoa cơ bản - Chương 5",
                  "relevance_score": 0.92
              }
          ],
          "disclaimer": "Kết quả chỉ mang tính tham khảo...",
          "suggested_specialties": ["Hô hấp", "Nội tổng quát"],
          "urgency_level": "moderate"
      }
      """
      result = await rag_pipeline.query(
          request.query, 
          request.chat_history
      )
      return ChatResponse(**result)
  ```

- [ ] **RAG-043** — Streaming endpoint (Server-Sent Events)
  ```python
  @router.post("/chat/stream/")
  async def medical_chat_stream(request: ChatRequest):
      """SSE streaming cho real-time token display"""
      async def event_generator():
          async for token in rag_pipeline.stream(request.query, request.chat_history):
              yield f"data: {json.dumps({'token': token})}\n\n"
          yield f"data: {json.dumps({'done': True})}\n\n"
      
      return StreamingResponse(
          event_generator(),
          media_type="text/event-stream"
      )
  ```

---

### PHASE 6: Đánh giá Chất lượng RAG

- [ ] **RAG-050** — Tạo test set đánh giá
  ```python
  # Test queries mẫu với expected answers
  test_cases = [
      {
          "query": "Triệu chứng viêm phổi là gì?",
          "expected_keywords": ["sốt", "ho", "đờm", "khó thở", "đau ngực"],
          "expected_source_type": "medical_textbook"
      },
      {
          "query": "Khi nào cần đi cấp cứu vì đau ngực?",
          "expected_keywords": ["đau dữ dội", "khó thở", "115", "cấp cứu"],
          "urgency": "high"
      },
      # ... 50+ test cases
  ]
  ```

- [ ] **RAG-051** — Metrics đánh giá RAG
  - **Retrieval metrics:**
    - Precision@K: % documents retrieved thực sự liên quan
    - Recall@K: % documents liên quan được retrieve
    - MRR (Mean Reciprocal Rank)
  - **Generation metrics:**
    - Faithfulness: Answer chỉ dựa trên context (không hallucinate)
    - Relevance: Answer trả lời đúng câu hỏi
    - Completeness: Answer đầy đủ thông tin
  - **Safety metrics:**
    - Disclaimer present: Có cảnh báo y tế trong response
    - No self-diagnosis: Không tự chẩn đoán
    - Emergency detection: Phát hiện đúng trường hợp cấp cứu

- [ ] **RAG-052** — Script đánh giá (`scripts/evaluate_rag.py`)
  ```python
  async def evaluate_rag():
      results = []
      for test in test_cases:
          response = await rag_pipeline.query(test["query"])
          
          # Check keyword presence
          keywords_found = sum(
              1 for kw in test["expected_keywords"]
              if kw in response["answer"].lower()
          )
          keyword_recall = keywords_found / len(test["expected_keywords"])
          
          # Check disclaimer
          has_disclaimer = "tham khảo" in response["answer"].lower()
          
          results.append({
              "query": test["query"],
              "keyword_recall": keyword_recall,
              "has_disclaimer": has_disclaimer,
              "sources_count": len(response["sources"]),
          })
      
      # Aggregate metrics
      avg_recall = np.mean([r["keyword_recall"] for r in results])
      disclaimer_rate = np.mean([r["has_disclaimer"] for r in results])
      
      print(f"Average Keyword Recall: {avg_recall:.2%}")
      print(f"Disclaimer Rate: {disclaimer_rate:.2%}")
  ```

---

## 🧪 Testing Checklist

- [ ] **RAG-T01** — Unit test: DocumentProcessor chunking (chunk size, overlap)
- [ ] **RAG-T02** — Unit test: Embedding service (output dimension matches vector store)
- [ ] **RAG-T03** — Unit test: Vector similarity search returns relevant results
- [ ] **RAG-T04** — Integration test: Full RAG pipeline (query → retrieve → generate)
- [ ] **RAG-T05** — Integration test: Streaming endpoint
- [ ] **RAG-T06** — Safety test: Emergency queries trigger appropriate response
- [ ] **RAG-T07** — Safety test: System never self-diagnoses
- [ ] **RAG-T08** — Performance test: Response time < 5 seconds (including LLM call)

---

## ⚠️ Lưu ý quan trọng

1. **API Key bảo mật** — OpenAI API key KHÔNG ĐƯỢC commit vào git, dùng `.env`
2. **Tài liệu y khoa phải chuẩn** — Chỉ dùng nguồn uy tín (sách giáo khoa, hướng dẫn BYT)
3. **Disclaimer BẮT BUỘC** — Mọi response phải có cảnh báo "không thay thế khám trực tiếp"
4. **Tiếng Việt embedding** — Nếu dùng local model, chọn multilingual model (e5-large)
5. **Chunk size ảnh hưởng chất lượng** — Quá nhỏ → mất ngữ cảnh, quá lớn → nhiễu
6. **Cost management** — Nếu dùng OpenAI, monitor token usage & set spending limits
7. **pgvector index cần rebuild** — Khi thêm nhiều documents mới, REINDEX để tối ưu search
8. **Fallback khi LLM down** — Trả về "Hệ thống đang bận, vui lòng thử lại sau"
