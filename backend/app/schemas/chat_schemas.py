from typing import Optional
from pydantic import BaseModel


class ChatRequest(BaseModel):
    question: str
    conversation_id: int
    subject: Optional[str] = None
