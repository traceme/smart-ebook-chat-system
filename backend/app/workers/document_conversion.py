import uuid
import logging
from datetime import datetime
from typing import Optional, Dict, Any
from io import BytesIO

from celery import Task
from markitdown import MarkItDown
from sqlalchemy.orm import Session

from app.workers.celery_app import celery_app
from app.db.session import SessionLocal
from app import crud
from app.services.storage import storage_service
from app.core.config import settings

# Set up logging
logger = logging.getLogger(__name__)

class DocumentConversionTask(Task):
    """Custom task class for document conversion with error handling"""
    
    def on_failure(self, exc, task_id, args, kwargs, einfo):
        """Handle task failure"""
        logger.error(f"Document conversion task {task_id} failed: {exc}")
        
        # Update document status to failed
        document_id = args[0] if args else kwargs.get('document_id')
        if document_id:
            db = SessionLocal()
            try:
                document = crud.document.get_by_id(db, document_id, user_id=None)
                if document:
                    # Update status to failed
                    document.upload_status = "conversion_failed"
                    document.content_extracted = False
                    db.commit()
            except Exception as e:
                logger.error(f"Failed to update document status: {e}")
            finally:
                db.close()

@celery_app.task(bind=True, base=DocumentConversionTask, max_retries=3, default_retry_delay=60)
def convert_document(self, document_id: str, user_id: str) -> Dict[str, Any]:
    """
    Convert a document to Markdown using MarkItDown.
    
    Args:
        document_id: The UUID of the document to convert
        user_id: The UUID of the user who owns the document
        
    Returns:
        Dictionary with conversion results
    """
    logger.info(f"Starting document conversion for document {document_id}")
    
    db = SessionLocal()
    try:
        # Get document from database
        document = crud.document.get_by_id(db, uuid.UUID(document_id), uuid.UUID(user_id))
        if not document:
            raise ValueError(f"Document {document_id} not found for user {user_id}")
        
        # Check if document upload is completed
        if document.upload_status != "completed":
            raise ValueError(f"Document {document_id} upload not completed. Status: {document.upload_status}")
        
        # Update status to converting
        document.upload_status = "converting"
        db.commit()
        
        # Download file from storage
        logger.info(f"Downloading file from storage: {document.storage_path}")
        file_content = _download_file_from_storage(document.storage_path)
        if not file_content:
            raise ValueError(f"Failed to download file from storage: {document.storage_path}")
        
        # Convert to Markdown using MarkItDown
        logger.info(f"Converting {document.file_type} file to Markdown")
        markdown_content = _convert_to_markdown(file_content, document.original_filename)
        
        if not markdown_content:
            raise ValueError("Failed to convert document to Markdown")
        
        # Store converted content
        markdown_storage_path = _generate_markdown_storage_path(document.storage_path)
        success = _store_markdown_content(markdown_content, markdown_storage_path)
        
        if not success:
            raise ValueError("Failed to store converted Markdown content")
        
        # Update document record
        document.upload_status = "conversion_completed"
        document.content_extracted = True
        document.content_text = markdown_content[:10000]  # Store first 10k chars for quick access
        db.commit()
        
        logger.info(f"Document conversion completed for document {document_id}")
        
        return {
            "status": "success",
            "document_id": document_id,
            "markdown_storage_path": markdown_storage_path,
            "content_length": len(markdown_content),
            "conversion_time": datetime.utcnow().isoformat()
        }
        
    except Exception as exc:
        logger.error(f"Document conversion failed for document {document_id}: {exc}")
        
        # Update document status to failed
        try:
            if 'document' in locals():
                document.upload_status = "conversion_failed"
                document.content_extracted = False
                db.commit()
        except Exception as e:
            logger.error(f"Failed to update document status after conversion failure: {e}")
        
        # Retry logic
        if self.request.retries < self.max_retries:
            logger.info(f"Retrying document conversion for document {document_id}. Retry {self.request.retries + 1}/{self.max_retries}")
            raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))
        
        raise exc
        
    finally:
        db.close()

def _download_file_from_storage(storage_path: str) -> Optional[bytes]:
    """Download file content from MinIO/S3 storage"""
    try:
        # Get file object from MinIO
        response = storage_service.s3_client.get_object(
            Bucket=storage_service.bucket_name,
            Key=storage_path
        )
        return response['Body'].read()
    except Exception as e:
        logger.error(f"Failed to download file from storage: {e}")
        return None

def _convert_to_markdown(file_content: bytes, filename: str) -> Optional[str]:
    """Convert file content to Markdown using MarkItDown"""
    try:
        # Initialize MarkItDown
        md = MarkItDown()
        
        # Create BytesIO object from file content
        file_stream = BytesIO(file_content)
        file_stream.name = filename  # Set filename for format detection
        
        # Convert to Markdown
        result = md.convert_stream(file_stream)
        
        if result and hasattr(result, 'text_content'):
            return result.text_content
        
        logger.error("MarkItDown conversion returned empty result")
        return None
        
    except Exception as e:
        logger.error(f"Failed to convert document to Markdown: {e}")
        return None

def _generate_markdown_storage_path(original_storage_path: str) -> str:
    """Generate storage path for the converted Markdown file"""
    # Replace file extension with .md
    base_path = original_storage_path.rsplit('.', 1)[0]
    return f"{base_path}.md"

def _store_markdown_content(content: str, storage_path: str) -> bool:
    """Store Markdown content to MinIO/S3 storage"""
    try:
        # Upload to MinIO
        storage_service.s3_client.put_object(
            Bucket=storage_service.bucket_name,
            Key=storage_path,
            Body=content.encode('utf-8'),
            ContentType='text/markdown'
        )
        logger.info(f"Markdown content stored at: {storage_path}")
        return True
    except Exception as e:
        logger.error(f"Failed to store Markdown content: {e}")
        return False

@celery_app.task
def get_conversion_status(document_id: str, user_id: str) -> Dict[str, Any]:
    """Get the conversion status of a document"""
    db = SessionLocal()
    try:
        document = crud.document.get_by_id(db, uuid.UUID(document_id), uuid.UUID(user_id))
        if not document:
            return {"status": "not_found"}
        
        return {
            "status": document.upload_status,
            "content_extracted": document.content_extracted,
            "vector_indexed": document.vector_indexed
        }
    finally:
        db.close() 