"""
LLM RAG API Routes.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.services.rag_pipeline import rag_chat
from app.services.vector_store import get_document_count

router = APIRouter()


class ChatRequest(BaseModel):
    message: str
    history: list = []
    patient_id: Optional[int] = None


class ChatResponse(BaseModel):
    answer: str
    sources: list
    suggested_specialties: list
    urgency_level: str


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    POST /api/chat — Gửi triệu chứng, nhận tư vấn y tế.
    """
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Vui lòng nhập triệu chứng hoặc câu hỏi.")

    try:
        result = rag_chat(
            message=request.message,
            history=request.history,
            patient_id=request.patient_id,
        )
        return ChatResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"RAG pipeline error: {str(e)}")


@router.get("/stats")
async def stats():
    """Thống kê vector store."""
    return {
        "total_documents": get_document_count(),
    }
