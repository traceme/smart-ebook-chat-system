import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text, Boolean, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base_class import Base

class Document(Base):
    __tablename__ = "documents"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    filename = Column(String, nullable=False)
    original_filename = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)
    file_hash = Column(String(64), unique=True, index=True, nullable=False)  # SHA-256
    file_type = Column(String, nullable=False)  # pdf, epub, txt, docx
    storage_path = Column(String, nullable=False)  # S3/MinIO path
    upload_status = Column(String, default="pending")  # pending, uploading, completed, failed, converting, conversion_completed, conversion_failed, indexing, indexed, indexing_failed
    upload_progress = Column(Integer, default=0)  # 0-100
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Foreign key to user
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Relationship
    user = relationship("User", back_populates="documents")
    
    # Content extraction and indexing status
    content_extracted = Column(Boolean, default=False)
    content_text = Column(Text, nullable=True)  # Extracted text content
    vector_indexed = Column(Boolean, default=False)  # Whether document is indexed for search
    
    # Indexing metadata
    indexing_metadata = Column(JSON, nullable=True)  # Store indexing stats and metadata
    error_message = Column(Text, nullable=True)  # Store error messages from failed operations
    
    # Vector search related fields
    chunks_count = Column(Integer, nullable=True)  # Number of chunks generated
    vectors_count = Column(Integer, nullable=True)  # Number of vectors stored 