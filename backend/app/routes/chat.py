from fastapi import APIRouter, Depends

from app.schemas.chat_schemas import ChatRequest
from app.security.security import get_current_user
from app.services.chat_service import answer_question, create_conversation_for_user
from app.services.chat_service import (
    answer_question,
    create_conversation_for_user,
    get_user_conversations,
    get_conversation_messages,
)

router = APIRouter(prefix="/api/chat", tags=["Chat"])
legacy_router = APIRouter(tags=["Chat legacy"])


@router.post("")
async def chat(request: ChatRequest, current_user: int = Depends(get_current_user)):
    return answer_question(
        question=request.question,
        conversation_id=request.conversation_id,
        subject=request.subject,
        user_id=current_user,
    )


@router.post("/conversation")
def create_conversation(user_id: int = Depends(get_current_user)):
    return create_conversation_for_user(user_id=user_id)


@legacy_router.post("/chat")
async def legacy_chat(request: ChatRequest, current_user: int = Depends(get_current_user)):
    return await chat(request=request, current_user=current_user)


@legacy_router.post("/create-conversation")
def legacy_create_conversation(user_id: int = Depends(get_current_user)):
    return create_conversation(user_id=user_id)

@router.get("/conversations")
def conversations(
    current_user: int = Depends(get_current_user)
):
    return get_user_conversations(
        user_id=current_user
    )


@router.get("/conversations/{conversation_id}")
def conversation_messages(
    conversation_id: int,
    current_user: int = Depends(get_current_user)
):
    return get_conversation_messages(
        conversation_id=conversation_id,
        user_id=current_user
    )