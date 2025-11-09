"""
Pydantic schemas for session management
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class SessionCreate(BaseModel):
    name: str
    language: str = "python"
    description: Optional[str] = None
    code: Optional[str] = None
    tags: Optional[List[str]] = []


class SessionUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    is_active: Optional[bool] = None
    tags: Optional[List[str]] = None


class SessionResponse(BaseModel):
    id: str
    name: str
    language: str
    description: Optional[str] = None
    owner_id: int
    owner_username: str
    participants: List[str]
    share_code: str
    created_at: str
    updated_at: Optional[str] = None
    last_accessed_at: Optional[str] = None
    access_count: Optional[int] = 0
    is_active: bool
    code: Optional[str] = None
    tags: Optional[List[str]] = []

    class Config:
        from_attributes = True
