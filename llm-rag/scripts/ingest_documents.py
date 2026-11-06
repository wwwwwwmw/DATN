"""
Ingest Documents — Nhúng tài liệu y khoa vào pgvector.
Đọc seed data từ database, tạo embeddings, lưu lại.

Usage:
    python scripts/ingest_documents.py
"""
import sys
import logging
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services.embeddings import get_embedding, get_embeddings_batch
from app.services.vector_store import get_connection
from app.core.config import settings

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)


def ingest_existing_documents():
    """
    Đọc documents đã INSERT (từ init_all.sql) nhưng chưa có embedding,
    tạo embedding và cập nhật lại.
    """
    logger.info("Connecting to database...")
    conn = get_connection()
    cur = conn.cursor()

    # Lấy documents chưa có embedding
    cur.execute("""
        SELECT id, content FROM medical_documents 
        WHERE embedding IS NULL
        ORDER BY id
    """)
    rows = cur.fetchall()

    if not rows:
        logger.info("All documents already have embeddings. Nothing to do.")
        cur.close()
        conn.close()
        return

    logger.info(f"Found {len(rows)} documents without embeddings.")

    # Batch embed
    contents = [row[1] for row in rows]
    ids = [row[0] for row in rows]

    logger.info(f"Generating embeddings for {len(contents)} documents...")
    embeddings = get_embeddings_batch(contents)

    # Update each document
    for doc_id, embedding in zip(ids, embeddings):
        embedding_str = '[' + ','.join(str(x) for x in embedding) + ']'
        cur.execute("""
            UPDATE medical_documents 
            SET embedding = %s::vector, updated_at = NOW()
            WHERE id = %s
        """, (embedding_str, doc_id))

    conn.commit()
    cur.close()
    conn.close()

    logger.info(f"✅ Updated {len(ids)} documents with embeddings!")


if __name__ == '__main__':
    logger.info("=== MedTech Document Ingestion ===")
    logger.info(f"Embedding model: {settings.EMBEDDING_MODEL}")
    logger.info(f"Database: {settings.DATABASE_URL.split('@')[1] if '@' in settings.DATABASE_URL else settings.DATABASE_URL}")

    ingest_existing_documents()
    logger.info("Done!")
