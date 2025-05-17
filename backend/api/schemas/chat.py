from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, field_validator
from pydantic_core.core_schema import ValidationInfo

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    messages: Optional[List[Message]] = None
    thread_id: Optional[str] = None
    return_prompt: Optional[bool] = False
    system_prompt: Optional[str] = None
    temperature: Optional[float] = 0.7
    top_p: Optional[float] = 0.95
    max_tokens: Optional[int] = 1000
    repetition_penalty: Optional[float] = 1.0
    stop: Optional[List[str]] = None
    save_chat: Optional[bool] = False

class ChatResponse(BaseModel):
    content: str
    thread_id: Optional[str] = None

class MessageV2(BaseModel):
    role: str = Field(..., pattern="^(user|assistant|system)$")
    content: str

class ChatRequestV2(BaseModel):
    mode: str = Field(..., pattern="^(instruction|chat)$")
    message: Optional[str] = None
    messages: Optional[List[MessageV2]] = None
    thread_id: Optional[str] = None
    return_prompt: Optional[bool] = False
    system_prompt: Optional[str] = None
    temperature: Optional[float] = 0.7
    top_p: Optional[float] = 0.95
    max_tokens: Optional[int] = 1000
    repetition_penalty: Optional[float] = 1.0
    stop: Optional[List[str]] = None
    save_chat: Optional[bool] = False

    @field_validator('message', mode='before')
    @classmethod
    def check_message_in_instruction_mode(cls, v: Optional[str], info: ValidationInfo):
        if info.data.get('mode') == 'instruction' and (v is None or not str(v).strip()):
            raise ValueError("Field 'message' cannot be empty or whitespace in 'instruction' mode")
        return v

    @field_validator('messages', mode='before')
    @classmethod
    def check_messages_in_chat_mode(cls, v: Optional[List[Any]], info: ValidationInfo):
        # More tolerant validation - only check if mode is chat and messages is explicitly None
        # Allow empty list as the endpoint can handle it
        if info.data.get('mode') == 'chat' and v is None:
            # Default to empty list instead of raising an error
            return []
        return v

    # Removed check_message_not_in_chat_mode validator to be more tolerant
    
    # Removed check_messages_not_in_instruction_mode validator to be more tolerant

class ChatResponseV2(BaseModel):
    content: str
    thread_id: Optional[str] = None
    is_narrative: Optional[bool] = False
    metadata: Optional[Dict[str, Any]] = None
    raw_prompt: Optional[str] = None
    token_count: Optional[int] = None
    tokens: Optional[int] = None
    usage: Optional[Dict[str, Any]] = None