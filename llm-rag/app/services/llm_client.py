"""
LLM Client — Local LLM response generation.
Uses transformers pipeline (no API key needed).
Falls back to template-based response if model is too large.
"""
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

_pipeline = None
_use_template = True  # Start with template, upgrade to model when available


def _load_pipeline():
    """Try to load a local LLM pipeline."""
    global _pipeline, _use_template

    ollama_url = settings.OLLAMA_URL

    try:
        # Try Ollama (local hoặc remote qua Tailscale)
        import httpx
        response = httpx.get(f'{ollama_url}/api/tags', timeout=5.0)
        if response.status_code == 200:
            models = response.json().get('models', [])
            if models:
                # Ưu tiên model từ config, fallback sang model đầu tiên có sẵn
                model_names = [m['name'] for m in models]
                chosen = settings.OLLAMA_MODEL if settings.OLLAMA_MODEL in model_names else model_names[0]
                logger.info(f"Using Ollama at {ollama_url} with model: {chosen}")
                logger.info(f"Available models: {model_names}")
                settings.OLLAMA_MODEL = chosen  # Cập nhật model thực tế
                _use_template = False
                settings.MODELS_LOADED = True
                return 'ollama'
    except Exception as e:
        logger.warning(f"Ollama not reachable at {ollama_url}: {e}")

    # Fallback: template-based response
    logger.info("Using template-based response (no Ollama connection)")
    _use_template = True
    settings.MODELS_LOADED = True
    return 'template'


def generate_response(prompt: str) -> str:
    """
    Generate response from LLM.
    
    Priority:
    1. Ollama (local hoặc remote qua Tailscale)
    2. Template-based response (always works, no model needed)
    """
    global _pipeline, _use_template

    if _pipeline is None:
        _pipeline = _load_pipeline()

    if _pipeline == 'ollama' and not _use_template:
        return _generate_ollama(prompt)

    return _generate_template(prompt)


def _generate_ollama(prompt: str) -> str:
    """Generate using Ollama server (local hoặc remote)."""
    try:
        import httpx

        ollama_url = settings.OLLAMA_URL

        with httpx.Client(timeout=120.0) as client:
            response = client.post(f'{ollama_url}/api/generate', json={
                'model': settings.OLLAMA_MODEL,
                'prompt': prompt,
                'stream': False,
                'options': {
                    'temperature': settings.LLM_TEMPERATURE,
                    'num_predict': settings.LLM_MAX_TOKENS,
                }
            })

        if response.status_code == 200:
            return response.json().get('response', '')

    except Exception as e:
        logger.error(f"Ollama error at {settings.OLLAMA_URL}: {e}")

    return _generate_template(prompt)


def _generate_template(prompt: str) -> str:
    """
    Template-based response generator.
    Phân tích prompt để trích xuất context và tạo response có cấu trúc.
    Không cần model LLM — luôn hoạt động.
    """
    # Extract context documents from prompt
    context_section = ''
    if '=== TÀI LIỆU Y KHOA THAM KHẢO ===' in prompt:
        parts = prompt.split('=== TÀI LIỆU Y KHOA THAM KHẢO ===')
        if len(parts) > 1:
            context_end = parts[1].split('===')[0].strip()
            context_section = context_end

    # Extract user query
    user_query = ''
    if 'Bệnh nhân:' in prompt:
        user_query = prompt.split('Bệnh nhân:')[-1].split('Trợ lý:')[0].strip()

    # Build structured response
    response_parts = []

    response_parts.append(f"Cảm ơn bạn đã chia sẻ triệu chứng. Dưới đây là thông tin tham khảo:\n")

    if context_section and context_section != 'Không tìm thấy tài liệu liên quan.':
        response_parts.append("**📋 Thông tin từ tài liệu y khoa:**\n")

        # Parse each context chunk
        chunks = context_section.split('---')
        for i, chunk in enumerate(chunks[:3]):
            chunk = chunk.strip()
            if chunk:
                # Lấy 2-3 câu đầu
                sentences = chunk.split('.')
                summary = '. '.join(sentences[:3]).strip()
                if summary:
                    response_parts.append(f"{i+1}. {summary}.\n")

    response_parts.append("\n**💡 Khuyến nghị:**")
    response_parts.append("- Đến cơ sở y tế để được khám và chẩn đoán trực tiếp bởi bác sĩ chuyên khoa.")
    response_parts.append("- Nếu triệu chứng nặng (khó thở, đau ngực dữ dội), gọi 115 ngay.")
    response_parts.append("")
    response_parts.append("⚠️ Kết quả tư vấn chỉ mang tính chất tham khảo, KHÔNG thay thế cho việc khám bệnh trực tiếp.")

    return '\n'.join(response_parts)
