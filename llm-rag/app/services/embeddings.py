"""
Embeddings Service — Local sentence-transformers model.
No API key required.
"""
import logging
import numpy as np

logger = logging.getLogger(__name__)

_model = None


def get_embedding_model():
    """Lazy load embedding model."""
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer
        from app.core.config import settings
        logger.info(f"Loading embedding model: {settings.EMBEDDING_MODEL}")
        _model = SentenceTransformer(settings.EMBEDDING_MODEL)
        logger.info("Embedding model loaded!")
    return _model


def get_embedding(text: str) -> list:
    """
    Get embedding vector for a text string.
    Uses local sentence-transformers model.
    """
    model = get_embedding_model()
    embedding = model.encode(text, normalize_embeddings=True)
    return embedding.tolist()


def get_embeddings_batch(texts: list) -> list:
    """Get embeddings for multiple texts (batch processing)."""
    model = get_embedding_model()
    embeddings = model.encode(texts, normalize_embeddings=True, batch_size=32, show_progress_bar=True)
    return embeddings.tolist()
