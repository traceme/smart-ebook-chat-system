import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, validator

# Shared properties
class DocumentBase(BaseModel):
    filename: str
    original_filename: str
    file_size: int
    file_type: str

# Properties to receive on document upload initiation
class DocumentUploadInit(BaseModel):
    filename: str
    file_size: int
    file_hash: str
    file_type: str
    
    @validator('file_type')
    def validate_file_type(cls, v):
        allowed_types = ['pdf', 'epub', 'txt', 'docx']
        if v.lower() not in allowed_types:
            raise ValueError(f'File type must be one of: {", ".join(allowed_types)}')
        return v.lower()

# Properties to receive on upload progress update
class DocumentUploadProgress(BaseModel):
    upload_progress: int
    upload_status: str
    
    @validator('upload_progress')
    def validate_progress(cls, v):
        if not 0 <= v <= 100:
            raise ValueError('Upload progress must be between 0 and 100')
        return v

# Properties to return to client
class Document(DocumentBase):
    id: uuid.UUID
    file_hash: str
    storage_path: str
    upload_status: str
    upload_progress: int
    created_at: datetime
    updated_at: datetime
    user_id: uuid.UUID
    content_extracted: bool
    vector_indexed: bool

    class Config:
        orm_mode = True

# Properties for document listing with pagination
class DocumentList(BaseModel):
    id: uuid.UUID
    filename: str
    original_filename: str
    file_size: int
    file_type: str
    upload_status: str
    upload_progress: int
    created_at: datetime
    content_extracted: bool
    vector_indexed: bool

    class Config:
        orm_mode = True

# Response for upload initiation
class DocumentUploadResponse(BaseModel):
    document_id: uuid.UUID
    upload_url: str  # Presigned URL for S3/MinIO
    chunk_size: int = 5242880  # 5MB chunks 