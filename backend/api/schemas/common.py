from typing import Optional, Dict, Union
from pydantic import BaseModel, Field

# --- General (non-chat) API Schemas ---

class LoadModelRequest(BaseModel):
    path: str = Field(..., description="Absolute or relative path to the model directory.")

class LoadModelResponse(BaseModel):
    message: str
    path: str
    device: str

class ModelStatusResponse(BaseModel):
    loaded: bool
    path: Optional[str] = None
    device: Optional[str] = None

class ModelSettings(BaseModel):
    system_prompt: Optional[str] = None
    temperature: Optional[float] = None
    top_p: Optional[float] = None
    max_new_tokens: Optional[int] = None
    repetition_penalty: Optional[float] = None

class SettingsUpdateResponse(BaseModel):
    message: str
    updated_settings: Dict[str, Optional[Union[str, float, int]]]

class VRAMInfoResponse(BaseModel):
    status: str
    message: Optional[str] = None
    device: Optional[str] = None
    total_gb: Optional[float] = None
    reserved_gb: Optional[float] = None
    allocated_gb: Optional[float] = None
    free_in_reserved_gb: Optional[float] = None 