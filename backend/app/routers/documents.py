import uuid
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.api import deps
from app.services.storage import storage_service
from app.workers.document_conversion import convert_document, get_conversion_status
from app.schemas.document import (
    DocumentUploadInit, 
    DocumentUploadResponse, 
    DocumentUploadProgress,
    Document,
    DocumentList
)

router = APIRouter()

@router.post("/upload/init", response_model=DocumentUploadResponse)
def initiate_upload(
    *,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
    upload_data: DocumentUploadInit,
):
    """
    Initiate document upload process.
    Checks for duplicates and generates presigned upload URL.
    """
    # Check for duplicate file (deduplication)
    existing_doc = crud.document.get_by_hash(db, upload_data.file_hash)
    if existing_doc:
        # If user already has this document, return existing one
        if existing_doc.user_id == current_user.id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="You have already uploaded this document"
            )
        else:
            # Create a reference to the existing file for this user
            storage_path = existing_doc.storage_path
    else:
        # Generate new storage path for new file
        storage_path = storage_service.generate_storage_path(
            current_user.id, 
            upload_data.filename, 
            upload_data.file_hash
        )
    
    # Create document record
    document = crud.document.create(
        db=db,
        document_data=upload_data,
        user_id=current_user.id,
        storage_path=storage_path
    )
    
    # Generate presigned upload URL
    upload_url = storage_service.generate_presigned_upload_url(storage_path)
    if not upload_url:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate upload URL"
        )
    
    return DocumentUploadResponse(
        document_id=document.id,
        upload_url=upload_url,
        chunk_size=5242880  # 5MB chunks
    )

@router.put("/upload/{document_id}/progress")
def update_upload_progress(
    *,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
    document_id: uuid.UUID,
    progress_data: DocumentUploadProgress,
):
    """Update upload progress for a document."""
    document = crud.document.get_by_id(db, document_id, current_user.id)
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    updated_document = crud.document.update_progress(
        db, document_id, progress_data
    )
    
    return {"status": "success", "document": updated_document}

@router.post("/upload/{document_id}/complete")
def complete_upload(
    *,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
    document_id: uuid.UUID,
):
    """Mark document upload as completed."""
    document = crud.document.get_by_id(db, document_id, current_user.id)
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Verify file exists in storage
    if not storage_service.check_file_exists(document.storage_path):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File not found in storage"
        )
    
    updated_document = crud.document.mark_completed(db, document_id)
    
    return {"status": "success", "document": updated_document}

@router.get("/", response_model=List[DocumentList])
def get_user_documents(
    *,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
    skip: int = 0,
    limit: int = 100,
):
    """Get all documents for the current user."""
    documents = crud.document.get_user_documents(
        db, current_user.id, skip=skip, limit=limit
    )
    return documents

@router.get("/{document_id}", response_model=Document)
def get_document(
    *,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
    document_id: uuid.UUID,
):
    """Get a specific document by ID."""
    document = crud.document.get_by_id(db, document_id, current_user.id)
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    return document

@router.get("/{document_id}/download")
def get_download_url(
    *,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
    document_id: uuid.UUID,
):
    """Get a presigned download URL for a document."""
    document = crud.document.get_by_id(db, document_id, current_user.id)
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    if document.upload_status != "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document upload not completed"
        )
    
    download_url = storage_service.generate_presigned_download_url(document.storage_path)
    if not download_url:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate download URL"
        )
    
    return {"download_url": download_url}

@router.delete("/{document_id}")
def delete_document(
    *,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
    document_id: uuid.UUID,
):
    """Delete a document."""
    document = crud.document.get_by_id(db, document_id, current_user.id)
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Delete from storage
    storage_service.delete_file(document.storage_path)
    
    # Delete from database
    success = crud.document.delete(db, document_id, current_user.id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete document"
        )
    
    return {"status": "success", "message": "Document deleted"}

@router.post("/{document_id}/convert")
def trigger_document_conversion(
    *,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
    document_id: uuid.UUID,
):
    """Trigger document conversion to Markdown using Celery worker."""
    document = crud.document.get_by_id(db, document_id, current_user.id)
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    if document.upload_status != "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document upload must be completed before conversion"
        )
    
    if document.content_extracted:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Document has already been converted"
        )
    
    # Trigger Celery task
    task = convert_document.delay(str(document_id), str(current_user.id))
    
    return {
        "status": "success",
        "message": "Document conversion started",
        "task_id": task.id,
        "document_id": document_id
    }

@router.get("/{document_id}/conversion-status")
def get_document_conversion_status(
    *,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
    document_id: uuid.UUID,
):
    """Get the conversion status of a document."""
    document = crud.document.get_by_id(db, document_id, current_user.id)
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    return {
        "document_id": document_id,
        "upload_status": document.upload_status,
        "content_extracted": document.content_extracted,
        "vector_indexed": document.vector_indexed,
        "conversion_status": _get_conversion_status_message(document.upload_status)
    }

@router.get("/{document_id}/markdown")
def get_document_markdown(
    *,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
    document_id: uuid.UUID,
):
    """Get the converted Markdown content of a document."""
    document = crud.document.get_by_id(db, document_id, current_user.id)
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    if not document.content_extracted:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document has not been converted to Markdown yet"
        )
    
    # Generate download URL for the Markdown file
    markdown_storage_path = _generate_markdown_storage_path(document.storage_path)
    download_url = storage_service.generate_presigned_download_url(markdown_storage_path)
    
    if not download_url:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate download URL for Markdown content"
        )
    
    return {
        "document_id": document_id,
        "markdown_download_url": download_url,
        "content_preview": document.content_text[:500] if document.content_text else None
    }

@router.post("/test-conversion")
def test_document_conversion(
    *,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
):
    """Create a test document and trigger conversion for testing purposes."""
    
    # Create a test text content
    test_content = """# Test Document

This is a test document for our smart eBook chat system.

## Features
- Document upload and storage
- Document conversion to Markdown
- Full-text search capabilities
- AI-powered chat interface

## Technology Stack
- FastAPI backend
- PostgreSQL database
- MinIO object storage
- Celery task queue
- MarkItDown conversion

The system converts documents like PDFs, DOCX, EPUB files into searchable Markdown format.
"""
    
    # Calculate hash and size
    import hashlib
    content_bytes = test_content.encode('utf-8')
    file_hash = hashlib.sha256(content_bytes).hexdigest()
    file_size = len(content_bytes)
    
    # Create document record
    from app.schemas.document import DocumentUploadInit
    doc_data = DocumentUploadInit(
        filename="test-conversion.txt",
        file_size=file_size,
        file_hash=file_hash,
        file_type="txt"
    )
    
    # Generate storage path
    storage_path = storage_service.generate_storage_path(
        current_user.id, 
        doc_data.filename, 
        doc_data.file_hash
    )
    
    # Create document record
    document = crud.document.create(
        db=db,
        document_data=doc_data,
        user_id=current_user.id,
        storage_path=storage_path
    )
    
    # Upload test content to MinIO
    try:
        storage_service.s3_client.put_object(
            Bucket=storage_service.bucket_name,
            Key=storage_path,
            Body=content_bytes,
            ContentType='text/plain'
        )
        
        # Mark as completed
        document.upload_status = "completed"
        document.upload_progress = 100
        db.commit()
        
        # Trigger conversion
        task = convert_document.delay(str(document.id), str(current_user.id))
        
        return {
            "status": "success",
            "message": "Test document created and conversion started",
            "document_id": document.id,
            "task_id": task.id,
            "storage_path": storage_path
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create test document: {str(e)}"
        )

@router.post("/{document_id}/convert-enhanced")
def trigger_enhanced_document_conversion(
    *,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
    document_id: uuid.UUID,
    preprocessing_config: Optional[Dict[str, Any]] = None,
):
    """Trigger enhanced document conversion with preprocessing."""
    document = crud.document.get_by_id(db, document_id, current_user.id)
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    if document.upload_status != "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document upload must be completed before conversion"
        )
    
    if document.content_extracted:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Document has already been converted"
        )
    
    # Import enhanced conversion task
    from app.workers.enhanced_document_conversion import enhanced_convert_document
    
    # Trigger enhanced Celery task
    task = enhanced_convert_document.delay(
        str(document_id), 
        str(current_user.id),
        preprocessing_config
    )
    
    return {
        "status": "success",
        "message": "Enhanced document conversion started",
        "task_id": task.id,
        "document_id": document_id,
        "preprocessing_enabled": preprocessing_config is not None
    }

@router.get("/{document_id}/format-detection")
def detect_document_format(
    *,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
    document_id: uuid.UUID,
):
    """Perform enhanced format detection on uploaded document."""
    document = crud.document.get_by_id(db, document_id, current_user.id)
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    if document.upload_status != "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document upload must be completed before format detection"
        )
    
    try:
        # Download file content
        file_content = storage_service.s3_client.get_object(
            Bucket=storage_service.bucket_name,
            Key=document.storage_path
        )['Body'].read()
        
        # Perform format detection
        from app.services.document_format_detection import format_detector
        
        detection_result = format_detector.detect_format(
            file_content=file_content,
            filename=document.original_filename,
            declared_format=document.file_type
        )
        
        return {
            "document_id": document_id,
            "detected_format": detection_result.detected_format,
            "confidence_score": detection_result.confidence_score,
            "is_valid": detection_result.is_valid,
            "mime_type": detection_result.mime_type,
            "file_size": detection_result.file_size,
            "metadata": detection_result.additional_metadata,
            "error_message": detection_result.error_message
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Format detection failed: {str(e)}"
        )

@router.post("/{document_id}/process-complete")
def start_complete_document_processing(
    *,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
    document_id: uuid.UUID,
    pipeline_config: Optional[Dict[str, Any]] = None,
):
    """Start complete document processing with status tracking."""
    document = crud.document.get_by_id(db, document_id, current_user.id)
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    if document.upload_status != "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document upload must be completed before processing"
        )
    
    # Start processing tracking
    from app.services.processing_status_tracker import processing_status_tracker
    
    processing_id = processing_status_tracker.start_processing(
        document_id=str(document_id),
        user_id=str(current_user.id),
        initial_metadata={
            'pipeline_config': pipeline_config,
            'filename': document.original_filename,
            'file_type': document.file_type
        }
    )
    
    # Start pipeline processing
    from app.workers.document_pipeline import process_document_complete
    
    task = process_document_complete.delay(
        str(document_id), 
        str(current_user.id),
        pipeline_config
    )
    
    return {
        "status": "success",
        "message": "Complete document processing started",
        "processing_id": processing_id,
        "task_id": task.id,
        "document_id": document_id
    }

def _get_conversion_status_message(upload_status: str) -> str:
    """Get human-readable conversion status message."""
    status_messages = {
        "pending": "Upload pending",
        "uploading": "File uploading",
        "completed": "Upload completed, ready for conversion",
        "converting": "Converting to Markdown",
        "conversion_completed": "Conversion completed successfully",
        "conversion_failed": "Conversion failed",
        "failed": "Upload failed"
    }
    return status_messages.get(upload_status, "Unknown status")

def _generate_markdown_storage_path(original_storage_path: str) -> str:
    """Generate storage path for the converted Markdown file."""
    base_path = original_storage_path.rsplit('.', 1)[0]
    return f"{base_path}.md" 