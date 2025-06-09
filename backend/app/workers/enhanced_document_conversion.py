"""
Enhanced document conversion worker with advanced format detection and preprocessing.
"""

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
from app.services.document_format_detection import format_detector
from app.services.content_preprocessing import content_preprocessor, PreprocessingConfig
from app.core.config import settings

logger = logging.getLogger(__name__)


class EnhancedDocumentConversionTask(Task):
    """Enhanced document conversion task with detailed error handling."""
    
    def on_failure(self, exc, task_id, args, kwargs, einfo):
        """Handle task failure with detailed logging."""
        logger.error(f"Enhanced document conversion task {task_id} failed: {exc}")
        
        document_id = args[0] if args else kwargs.get('document_id')
        if document_id:
            db = SessionLocal()
            try:
                document = crud.document.get_by_id(db, document_id, user_id=None)
                if document:
                    error_details = {
                        'error_type': type(exc).__name__,
                        'error_message': str(exc),
                        'task_id': task_id,
                        'failed_at': datetime.utcnow().isoformat()
                    }
                    
                    document.upload_status = "conversion_failed"
                    document.content_extracted = False
                    document.error_message = str(exc)
                    document.indexing_metadata = error_details
                    db.commit()
            except Exception as e:
                logger.error(f"Failed to update document status: {e}")
            finally:
                db.close()


@celery_app.task(
    bind=True, 
    base=EnhancedDocumentConversionTask, 
    max_retries=3, 
    default_retry_delay=60,
    name="enhanced_conversion.convert_document"
)
def enhanced_convert_document(
    self, 
    document_id: str, 
    user_id: str,
    preprocessing_config: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Enhanced document conversion with format detection and preprocessing.
    """
    logger.info(f"Starting enhanced document conversion for document {document_id}")
    
    db = SessionLocal()
    conversion_metadata = {
        'conversion_started_at': datetime.utcnow().isoformat(),
        'conversion_type': 'enhanced',
        'preprocessing_enabled': preprocessing_config is not None
    }
    
    try:
        # Step 1: Get and validate document
        document = crud.document.get_by_id(db, uuid.UUID(document_id), uuid.UUID(user_id))
        if not document:
            raise ValueError(f"Document {document_id} not found")
        
        if document.upload_status != "completed":
            raise ValueError(f"Document upload not completed. Status: {document.upload_status}")
        
        # Update status
        document.upload_status = "converting"
        document.indexing_metadata = conversion_metadata
        db.commit()
        
        # Step 2: Download file
        logger.info(f"Downloading file: {document.storage_path}")
        file_content = storage_service.s3_client.get_object(
            Bucket=storage_service.bucket_name,
            Key=document.storage_path
        )['Body'].read()
        
        if not file_content:
            raise ValueError("Failed to download file content")
        
        # Step 3: Enhanced format detection
        logger.info("Performing enhanced format detection")
        format_result = format_detector.detect_format(
            file_content=file_content,
            filename=document.original_filename,
            declared_format=document.file_type
        )
        
        conversion_metadata['format_detection'] = {
            'detected_format': format_result.detected_format,
            'confidence_score': format_result.confidence_score,
            'is_valid': format_result.is_valid,
            'mime_type': format_result.mime_type,
            'metadata': format_result.additional_metadata
        }
        
        if not format_result.is_valid:
            raise ValueError(f"Invalid file format: {format_result.error_message}")
        
        # Step 4: Convert to Markdown
        logger.info(f"Converting {format_result.detected_format} to Markdown")
        md = MarkItDown()
        file_stream = BytesIO(file_content)
        file_stream.name = document.original_filename
        
        result = md.convert_stream(file_stream)
        if not result or not hasattr(result, 'text_content'):
            raise ValueError("MarkItDown conversion failed")
        
        markdown_content = result.text_content
        
        conversion_metadata['markdown_conversion'] = {
            'original_size': len(file_content),
            'markdown_size': len(markdown_content),
            'conversion_ratio': len(markdown_content) / len(file_content)
        }
        
        # Step 5: Content preprocessing (if enabled)
        if preprocessing_config:
            logger.info("Applying content preprocessing")
            
            config = PreprocessingConfig(**preprocessing_config)
            preprocessing_result = content_preprocessor.preprocess_content(
                content=markdown_content,
                document_format=format_result.detected_format,
                filename=document.original_filename
            )
            
            markdown_content = preprocessing_result.cleaned_text
            
            conversion_metadata['preprocessing'] = {
                'original_length': preprocessing_result.original_length,
                'processed_length': preprocessing_result.processed_length,
                'operations_applied': preprocessing_result.operations_applied,
                'warnings': preprocessing_result.warnings,
                'metadata': preprocessing_result.metadata
            }
        
        # Step 6: Store converted content
        markdown_storage_path = document.storage_path.rsplit('.', 1)[0] + '.md'
        
        storage_service.s3_client.put_object(
            Bucket=storage_service.bucket_name,
            Key=markdown_storage_path,
            Body=markdown_content.encode('utf-8'),
            ContentType='text/markdown'
        )
        
        # Step 7: Update document record
        conversion_metadata.update({
            'conversion_completed_at': datetime.utcnow().isoformat(),
            'markdown_storage_path': markdown_storage_path,
            'final_content_length': len(markdown_content)
        })
        
        document.upload_status = "conversion_completed"
        document.content_extracted = True
        document.content_text = markdown_content[:10000]
        document.indexing_metadata = conversion_metadata
        
        # Update format if different
        if format_result.detected_format != document.file_type:
            document.file_type = format_result.detected_format
        
        db.commit()
        
        logger.info(f"Enhanced conversion completed for document {document_id}")
        
        return {
            "status": "success",
            "document_id": document_id,
            "conversion_metadata": conversion_metadata,
            "content_preview": markdown_content[:500] + "..." if len(markdown_content) > 500 else markdown_content
        }
        
    except Exception as exc:
        logger.error(f"Enhanced conversion failed for document {document_id}: {exc}")
        
        # Update document status with error
        try:
            if 'document' in locals():
                conversion_metadata.update({
                    'conversion_failed_at': datetime.utcnow().isoformat(),
                    'error_type': type(exc).__name__,
                    'error_message': str(exc)
                })
                
                document.upload_status = "conversion_failed"
                document.content_extracted = False
                document.error_message = str(exc)
                document.indexing_metadata = conversion_metadata
                db.commit()
        except Exception as e:
            logger.error(f"Failed to update document status: {e}")
        
        # Retry logic
        if self.request.retries < self.max_retries:
            logger.info(f"Retrying conversion for document {document_id}")
            raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))
        
        raise exc
        
    finally:
        db.close() 