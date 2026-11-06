"""
Vector Store — pgvector operations.
Insert, search, and manage document embeddings.
"""
import logging
import psycopg2
import psycopg2.extras
from app.core.config import settings

logger = logging.getLogger(__name__)


def get_connection():
    """Get PostgreSQL connection."""
    return psycopg2.connect(settings.DATABASE_URL)


def search_similar_documents(query_embedding: list, top_k: int = 5, threshold: float = 0.3) -> list:
    """
    Cosine similarity search in pgvector.

    Args:
        query_embedding: Query vector [384 dims]
        top_k: Number of results
        threshold: Minimum similarity score

    Returns:
        list of dicts: [{content, metadata, similarity}, ...]
    """
    try:
        conn = get_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        # pgvector cosine distance: <=> (lower = more similar)
        # similarity = 1 - distance
        embedding_str = '[' + ','.join(str(x) for x in query_embedding) + ']'

        cur.execute("""
            SELECT
                content,
                metadata,
                source_file,
                1 - (embedding <=> %s::vector) AS similarity
            FROM medical_documents
            WHERE embedding IS NOT NULL
            ORDER BY embedding <=> %s::vector
            LIMIT %s
        """, (embedding_str, embedding_str, top_k))

        results = cur.fetchall()
        cur.close()
        conn.close()

        # Filter by threshold
        filtered = [
            {
                'content': r['content'],
                'metadata': r['metadata'] if r['metadata'] else {},
                'source_file': r['source_file'],
                'similarity': float(r['similarity']),
            }
            for r in results
            if float(r['similarity']) >= threshold
        ]

        return filtered

    except Exception as e:
        logger.error(f"Vector search error: {e}")
        return []


def insert_document(content: str, embedding: list, metadata: dict = None, source_file: str = '', chunk_index: int = 0):
    """Insert a single document with embedding into pgvector."""
    try:
        conn = get_connection()
        cur = conn.cursor()

        embedding_str = '[' + ','.join(str(x) for x in embedding) + ']'

        cur.execute("""
            INSERT INTO medical_documents (content, embedding, metadata, source_file, chunk_index)
            VALUES (%s, %s::vector, %s, %s, %s)
            RETURNING id
        """, (content, embedding_str, psycopg2.extras.Json(metadata or {}), source_file, chunk_index))

        doc_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()

        return doc_id

    except Exception as e:
        logger.error(f"Insert document error: {e}")
        return None


def insert_documents_batch(documents: list):
    """
    Batch insert documents.
    documents: [{'content': str, 'embedding': list, 'metadata': dict, 'source_file': str, 'chunk_index': int}]
    """
    try:
        conn = get_connection()
        cur = conn.cursor()

        for doc in documents:
            embedding_str = '[' + ','.join(str(x) for x in doc['embedding']) + ']'
            cur.execute("""
                INSERT INTO medical_documents (content, embedding, metadata, source_file, chunk_index)
                VALUES (%s, %s::vector, %s, %s, %s)
            """, (
                doc['content'],
                embedding_str,
                psycopg2.extras.Json(doc.get('metadata', {})),
                doc.get('source_file', ''),
                doc.get('chunk_index', 0),
            ))

        conn.commit()
        cur.close()
        conn.close()

        logger.info(f"Inserted {len(documents)} documents")
        return True

    except Exception as e:
        logger.error(f"Batch insert error: {e}")
        return False


def get_document_count() -> int:
    """Get total document count."""
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM medical_documents WHERE embedding IS NOT NULL")
        count = cur.fetchone()[0]
        cur.close()
        conn.close()
        return count
    except Exception:
        return 0
