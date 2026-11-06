"""
LLM RAG Service - FastAPI Application
Local LLM Pipeline (no third-party API keys needed)
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse

from app.core.config import settings
from app.api.routes import router as api_router

app = FastAPI(
    title="MedTech LLM RAG",
    description="Medical Consultation RAG Pipeline with local LLM",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")


@app.get("/", response_class=HTMLResponse)
def root():
    """Landing page - xac nhan LLM RAG Service dang chay."""
    ollama_url = settings.OLLAMA_URL
    ollama_model = settings.OLLAMA_MODEL
    embedding = settings.EMBEDDING_MODEL.split('/')[-1]

    return f"""<!DOCTYPE html>
    <html lang="vi"><head><meta charset="UTF-8"><title>MedTech LLM RAG</title>
    <style>
    *{{margin:0;padding:0;box-sizing:border-box}}
    body{{min-height:100vh;display:flex;align-items:center;justify-content:center;
      background:#0b0f1a;font-family:'Segoe UI',system-ui,sans-serif;color:#e0e6f0}}
    .card{{text-align:center;background:rgba(255,255,255,0.04);
      border:1px solid rgba(255,255,255,0.08);border-radius:16px;
      padding:48px 56px;backdrop-filter:blur(12px);max-width:520px}}
    .pulse{{display:inline-block;width:12px;height:12px;background:#22c55e;
      border-radius:50%;margin-right:8px;animation:pulse 2s infinite}}
    @keyframes pulse{{0%,100%{{box-shadow:0 0 0 0 rgba(34,197,94,0.5)}}
      50%{{box-shadow:0 0 0 10px rgba(34,197,94,0)}}}}
    h1{{font-size:28px;margin-bottom:12px;
      background:linear-gradient(135deg,#f59e0b,#f97316);
      -webkit-background-clip:text;-webkit-text-fill-color:transparent}}
    .status{{font-size:18px;color:#22c55e;margin-bottom:24px}}
    .info{{color:#8892a8;font-size:14px;line-height:2.2;text-align:left}}
    .info strong{{color:#cbd5e1}}
    a{{color:#60a5fa;text-decoration:none}}a:hover{{text-decoration:underline}}
    .tag{{display:inline-block;padding:3px 10px;border-radius:6px;font-size:12px;
      background:rgba(99,102,241,0.15);color:#a5b4fc;margin-left:6px}}
    </style></head><body>
    <div class="card">
        <h1>MedTech LLM RAG Service</h1>
        <div class="status"><span class="pulse"></span> Service dang hoat dong</div>
        <div class="info">
            <strong>Embedding:</strong> {embedding} <span class="tag">384 dim</span><br>
            <strong>LLM Backend:</strong> Ollama <span class="tag">{ollama_model}</span><br>
            <strong>Ollama URL:</strong> {ollama_url}<br>
            <strong>RAG:</strong> Top-{settings.TOP_K} chunks, threshold {settings.SIMILARITY_THRESHOLD}<br>
            <br>
            <strong>API Endpoints:</strong><br>
            &nbsp;&nbsp; <a href="/api/chat">/api/chat</a> - Chat so van y khoa<br>
            &nbsp;&nbsp; <a href="/api/search">/api/search</a> - Tim kiem tai lieu<br>
            &nbsp;&nbsp; <a href="/health">/health</a> - Health check<br>
            &nbsp;&nbsp; <a href="/docs">/docs</a> - Swagger API docs<br>
        </div>
    </div></body></html>"""


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "llm-rag",
        "models_loaded": settings.MODELS_LOADED,
        "embedding_model": settings.EMBEDDING_MODEL,
        "llm_backend": "ollama",
        "ollama_url": settings.OLLAMA_URL,
    }