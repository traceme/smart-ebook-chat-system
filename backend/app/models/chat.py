import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, Integer, Float, Boolean, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base_class import Base


class Conversation(Base):
    __tablename__ = 'conversations'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    extra_metadata = Column(JSON, default=dict)
    
    # Relationships
    user = relationship("User")
    messages = relationship("ChatMessage", back_populates="conversation", cascade="all, delete-orphan")
    document_references = relationship("ConversationDocument", back_populates="conversation", cascade="all, delete-orphan")


class ChatMessage(Base):
    __tablename__ = 'chat_messages'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey('conversations.id'), nullable=False, index=True)
    role = Column(String(20), nullable=False)  # "user" or "assistant"
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    response_time = Column(Float, nullable=True)  # Time taken to generate response (for assistant messages)
    search_results_count = Column(Integer, nullable=True)  # Number of search results used
    extra_metadata = Column(JSON, default=dict)
    
    # Relationships
    conversation = relationship("Conversation", back_populates="messages")
    sources = relationship("MessageSource", back_populates="message", cascade="all, delete-orphan")


class MessageSource(Base):
    __tablename__ = 'message_sources'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    message_id = Column(UUID(as_uuid=True), ForeignKey('chat_messages.id'), nullable=False, index=True)
    document_id = Column(UUID(as_uuid=True), ForeignKey('documents.id'), nullable=False)
    chunk_index = Column(Integer, nullable=True)
    similarity_score = Column(Float, nullable=False)
    content_snippet = Column(Text, nullable=True)
    extra_metadata = Column(JSON, default=dict)
    
    # Relationships
    message = relationship("ChatMessage", back_populates="sources")
    document = relationship("Document")


class ConversationDocument(Base):
    __tablename__ = 'conversation_documents'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey('conversations.id'), nullable=False)
    document_id = Column(UUID(as_uuid=True), ForeignKey('documents.id'), nullable=False)
    first_referenced_at = Column(DateTime, default=datetime.utcnow)
    reference_count = Column(Integer, default=1)
    
    # Relationships
    conversation = relationship("Conversation", back_populates="document_references")
    document = relationship("Document")


class UserChatSettings(Base):
    __tablename__ = 'user_chat_settings'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False, unique=True)
    max_search_results = Column(Integer, default=10)
    similarity_threshold = Column(Float, default=0.7)
    response_style = Column(String(20), default="detailed")
    include_sources = Column(Boolean, default=True)
    auto_title_conversations = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User") 