import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, validator


class ChatMessage(BaseModel):
    """Individual chat message."""
    role: str  # "user" or "assistant"
    content: str
    timestamp: datetime
    metadata: Optional[Dict[str, Any]] = None


class ChatRequest(BaseModel):
    """Request to send a chat message."""
    message: str
    document_ids: Optional[List[uuid.UUID]] = None  # Specific documents to search
    conversation_id: Optional[uuid.UUID] = None  # Continue existing conversation
    search_params: Optional[Dict[str, Any]] = None  # Custom search parameters
    
    @validator('message')
    def validate_message(cls, v):
        if not v or not v.strip():
            raise ValueError('Message cannot be empty')
        if len(v) > 2000:
            raise ValueError('Message too long (max 2000 characters)')
        return v.strip()


class ChatResponse(BaseModel):
    """Response from chat system."""
    conversation_id: uuid.UUID
    message: str
    sources: List[Dict[str, Any]]  # Source documents/chunks used
    search_results_count: int
    response_time: float
    metadata: Optional[Dict[str, Any]] = None


class ConversationSummary(BaseModel):
    """Summary of a conversation."""
    id: uuid.UUID
    title: str
    created_at: datetime
    updated_at: datetime
    message_count: int
    last_message: Optional[str] = None


class ConversationDetail(BaseModel):
    """Detailed conversation with all messages."""
    id: uuid.UUID
    title: str
    created_at: datetime
    updated_at: datetime
    messages: List[ChatMessage]
    document_ids: List[uuid.UUID]  # Documents referenced in this conversation


class ConversationCreate(BaseModel):
    """Create a new conversation."""
    title: Optional[str] = None
    initial_message: Optional[str] = None


class ConversationUpdate(BaseModel):
    """Update conversation metadata."""
    title: Optional[str] = None


class ChatSettings(BaseModel):
    """User chat preferences and settings."""
    max_search_results: int = 10
    similarity_threshold: float = 0.7
    response_style: str = "detailed"  # "concise", "detailed", "technical"
    include_sources: bool = True
    auto_title_conversations: bool = True
    
    @validator('max_search_results')
    def validate_max_results(cls, v):
        if v < 1 or v > 50:
            raise ValueError('Max search results must be between 1 and 50')
        return v
    
    @validator('similarity_threshold')
    def validate_threshold(cls, v):
        if v < 0.0 or v > 1.0:
            raise ValueError('Similarity threshold must be between 0.0 and 1.0')
        return v
    
    @validator('response_style')
    def validate_style(cls, v):
        allowed_styles = ['concise', 'detailed', 'technical']
        if v not in allowed_styles:
            raise ValueError(f'Response style must be one of: {", ".join(allowed_styles)}')
        return v


class ChatAnalytics(BaseModel):
    """Chat usage analytics."""
    total_conversations: int
    total_messages: int
    avg_messages_per_conversation: float
    most_queried_documents: List[Dict[str, Any]]
    common_topics: List[str]
    response_time_stats: Dict[str, float] 