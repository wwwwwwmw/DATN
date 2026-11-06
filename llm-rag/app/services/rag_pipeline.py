"""
RAG Pipeline — Core pipeline: query → embed → retrieve → generate.
Uses local models only.
"""
import logging
from pathlib import Path
from app.core.config import settings
from app.services.embeddings import get_embedding
from app.services.vector_store import search_similar_documents
from app.services.llm_client import generate_response

logger = logging.getLogger(__name__)


def load_system_prompt():
    """Load system prompt từ file."""
    prompt_path = Path(settings.SYSTEM_PROMPT_PATH)
    if prompt_path.exists():
        return prompt_path.read_text(encoding='utf-8')
    return "Bạn là trợ lý tư vấn y tế AI. Trả lời dựa trên tài liệu y khoa được cung cấp."


SYSTEM_PROMPT = load_system_prompt()


def rag_chat(message: str, history: list = None, patient_id: int = None) -> dict:
    """
    Full RAG pipeline:
    1. Embed query
    2. Retrieve relevant documents from pgvector
    3. Build context prompt
    4. Generate response using local LLM

    Args:
        message: User's symptom/question
        history: Conversation history [{'role': ..., 'content': ...}]
        patient_id: Optional patient ID

    Returns:
        dict with answer, sources, suggested_specialties, urgency_level
    """
    # 1. Embed user query
    query_embedding = get_embedding(message)

    # 2. Retrieve relevant documents
    relevant_docs = search_similar_documents(
        query_embedding,
        top_k=settings.TOP_K,
        threshold=settings.SIMILARITY_THRESHOLD,
    )

    # 3. Build context from retrieved documents
    context_parts = []
    sources = []
    for doc in relevant_docs:
        context_parts.append(doc['content'])
        sources.append({
            'content': doc['content'][:200] + '...' if len(doc['content']) > 200 else doc['content'],
            'source': doc.get('metadata', {}).get('source', 'Tài liệu y khoa'),
            'relevance_score': round(doc.get('similarity', 0), 4),
        })

    context = '\n\n---\n\n'.join(context_parts) if context_parts else 'Không tìm thấy tài liệu liên quan.'

    # 4. Build prompt
    prompt = _build_prompt(message, context, history)

    # 5. Generate response
    answer = generate_response(prompt)

    # 6. Analyze urgency and specialties
    urgency = _detect_urgency(message, answer)
    specialties = _suggest_specialties(message, answer)

    # 7. Ensure disclaimer
    disclaimer = '\n\n⚠️ Kết quả tư vấn chỉ mang tính chất tham khảo, KHÔNG thay thế cho việc khám bệnh trực tiếp.'
    if '⚠️' not in answer:
        answer += disclaimer

    return {
        'answer': answer,
        'sources': sources,
        'suggested_specialties': specialties,
        'urgency_level': urgency,
    }


def _build_prompt(query: str, context: str, history: list = None) -> str:
    """Build full prompt for LLM."""
    prompt = f"{SYSTEM_PROMPT}\n\n"
    prompt += f"=== TÀI LIỆU Y KHOA THAM KHẢO ===\n{context}\n\n"

    if history:
        prompt += "=== LỊCH SỬ HỘI THOẠI ===\n"
        for msg in history[-6:]:  # Last 6 messages
            role = 'Bệnh nhân' if msg['role'] == 'user' else 'Trợ lý'
            prompt += f"{role}: {msg['content']}\n"
        prompt += "\n"

    prompt += f"=== CÂU HỎI HIỆN TẠI ===\nBệnh nhân: {query}\n\nTrợ lý:"
    return prompt


def _detect_urgency(query: str, answer: str) -> str:
    """Detect urgency level from symptoms."""
    emergency_keywords = [
        'đau ngực dữ dội', 'khó thở nặng', 'mất ý thức', 'co giật',
        'chảy máu không cầm', 'sốt cao trên 40', 'ngất xỉu',
        'đau bụng dữ dội', 'tai biến', 'đột quỵ', 'nhồi máu',
    ]
    combined = (query + ' ' + answer).lower()

    for keyword in emergency_keywords:
        if keyword in combined:
            return 'critical'

    moderate_keywords = [
        'sốt cao', 'khó thở', 'đau ngực', 'ho ra máu',
        'chóng mặt', 'nôn nhiều', 'tiêu chảy nặng',
    ]
    for keyword in moderate_keywords:
        if keyword in combined:
            return 'moderate'

    return 'low'


def _suggest_specialties(query: str, answer: str) -> list:
    """Suggest medical specialties based on symptoms."""
    combined = (query + ' ' + answer).lower()

    specialties = []
    mapping = {
        'Hô hấp': ['ho', 'khó thở', 'viêm phổi', 'hen', 'phổi', 'đờm'],
        'Tim mạch': ['đau ngực', 'tim', 'huyết áp', 'nhồi máu', 'tim đập'],
        'Tiêu hóa': ['đau bụng', 'tiêu chảy', 'nôn', 'dạ dày', 'gan'],
        'Thần kinh': ['đau đầu', 'chóng mặt', 'co giật', 'tê', 'mất ngủ'],
        'Cơ xương khớp': ['đau lưng', 'đau khớp', 'gãy xương', 'viêm khớp'],
        'Da liễu': ['phát ban', 'ngứa', 'mẩn đỏ', 'da'],
        'Nhi khoa': ['trẻ em', 'trẻ nhỏ', 'sơ sinh', 'bé'],
        'Tai mũi họng': ['đau họng', 'viêm họng', 'ù tai', 'chảy mũi'],
        'Nội tổng quát': ['sốt', 'mệt mỏi', 'sụt cân'],
    }

    for specialty, keywords in mapping.items():
        if any(kw in combined for kw in keywords):
            specialties.append(specialty)

    return specialties[:3] if specialties else ['Nội tổng quát']
