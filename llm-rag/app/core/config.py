"""
LLM RAG - Configuration.
Uses local / remote Ollama Qwen2.5 7B.
"""
import os
from pathlib import Path

# Load .env
try:
    from dotenv import load_dotenv
    _env = Path(__file__).resolve().parent.parent.parent / ".env"
    if _env.exists():
        load_dotenv(_env)
except ImportError:
    pass


class Settings:

    BASE_DIR = Path(__file__).resolve().parent.parent.parent

    # Database (pgvector)
    DATABASE_URL = os.environ.get(
        'DATABASE_URL',
        'postgresql://medtech_user:medtech_password_2026@localhost:5432/medtech_db'
    )

    # Embedding Model (local - sentence-transformers)
    EMBEDDING_MODEL = os.environ.get(
        'EMBEDDING_MODEL',
        'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2'
    )
    EMBEDDING_DIMENSION = 384

    # LLM Model
    LLM_MODEL = os.environ.get('LLM_MODEL', 'local')
    LLM_TEMPERATURE = float(os.environ.get('LLM_TEMPERATURE', '0.3'))
    LLM_MAX_TOKENS = int(os.environ.get('LLM_MAX_TOKENS', '600'))

    # Ollama connection (Tailscale remote or local)
    OLLAMA_URL = os.environ.get('OLLAMA_URL', 'http://100.85.178.6:11434')
    OLLAMA_MODEL = os.environ.get('OLLAMA_MODEL', 'qwen2.5:7b')

    # RAG params
    CHUNK_SIZE = int(os.environ.get('CHUNK_SIZE', '800'))
    CHUNK_OVERLAP = int(os.environ.get('CHUNK_OVERLAP', '150'))
    TOP_K = int(os.environ.get('TOP_K', '5'))
    SIMILARITY_THRESHOLD = float(os.environ.get('SIMILARITY_THRESHOLD', '0.3'))

    # Prompts
    SYSTEM_PROMPT_PATH = str(BASE_DIR / 'prompts' / 'system_prompt.txt')

    # Status
    MODELS_LOADED = False


settings = Settings()
