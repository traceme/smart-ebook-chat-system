"""
Comprehensive document processing pipeline worker.

This module orchestrates the complete document processing workflow from
upload to indexing with proper error handling and status tracking.
"""

import uuid
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import dataclass

from celery import Task, group, chain, chord
from sqlalchemy.orm import Session

from app.workers.celery_app import celery_app
from app.db.session import SessionLocal
from app import crud
from app.services.storage import storage_service
from app.services.document_format_detection import format_detector
from app.services.text_extraction import text_extraction_service, ExtractionConfig
from app.services.content_preprocessing import content_preprocessor, PreprocessingConfig
from app.services.metadata_enrichment import metadata_extractor, MetadataEnrichmentConfig

logger = logging.getLogger(__name__)


@dataclass
class PipelineConfig:
    """Configuration for document processing pipeline."""
    
    # Processing stages to execute
    format_detection: bool = True
    text_extraction: bool = True
    content_preprocessing: bool = True
    metadata_enrichment: bool = True
    vector_indexing: bool = True
    
    # Stage-specific configurations
    extraction_config: Optional[Dict[str, Any]] = None
    preprocessing_config: Optional[Dict[str, Any]] = None
    metadata_config: Optional[Dict[str, Any]] = None
    indexing_config: Optional[Dict[str, Any]] = None
    
    # Pipeline behavior
    continue_on_failure: bool = False
    save_intermediate_results: bool = True
    parallel_processing: bool = False


class DocumentPipelineTask(Task):
    """Base task class for pipeline operations."""
    
    def on_failure(self, exc, task_id, args, kwargs, einfo):
        """Handle pipeline task failure."""
        logger.error(f"Pipeline task {self.name} [{task_id}] failed: {exc}")
        
        # Update document status if document_id is available
        document_id = self._extract_document_id(args, kwargs)
        if document_id:
            self._update_document_status(
                document_id, 
                "pipeline_failed", 
                f"Pipeline failed at {self.name}: {exc}"
            )
    
    def _extract_document_id(self, args, kwargs):
        """Extract document ID from task arguments."""
        if args and len(args) > 0:
            return args[0]
        return kwargs.get('document_id')
    
    def _update_document_status(self, document_id: str, status: str, error_message: str = None):
        """Update document status in database."""
        db = SessionLocal()
        try:
            document = crud.document.get_by_id(db, uuid.UUID(document_id), user_id=None)
            if document:
                document.upload_status = status
                if error_message:
                    document.error_message = error_message
                db.commit()
        except Exception as e:
            logger.error(f"Failed to update document status: {e}")
        finally:
            db.close()


@celery_app.task(
    bind=True,
    base=DocumentPipelineTask,
    name="document_pipeline.process_complete",
    max_retries=2
)
def process_document_complete(
    self,
    document_id: str,
    user_id: str,
    pipeline_config: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Execute complete document processing pipeline.
    
    Args:
        document_id: Document UUID
        user_id: User UUID  
        pipeline_config: Pipeline configuration
        
    Returns:
        Pipeline execution results
    """
    logger.info(f"Starting complete document processing pipeline for {document_id}")
    
    try:
        config = PipelineConfig(**pipeline_config) if pipeline_config else PipelineConfig()
        
        # Initialize pipeline tracking
        pipeline_metadata = {
            'pipeline_id': str(uuid.uuid4()),
            'document_id': document_id,
            'user_id': user_id,
            'started_at': datetime.utcnow().isoformat(),
            'stages_completed': [],
            'stages_failed': [],
            'config': pipeline_config or {}
        }
        
        db = SessionLocal()
        document = crud.document.get_by_id(db, uuid.UUID(document_id), uuid.UUID(user_id))
        if not document:
            raise ValueError(f"Document {document_id} not found")
        
        # Update status to processing
        document.upload_status = "pipeline_processing"
        document.indexing_metadata = pipeline_metadata
        db.commit()
        db.close()
        
        # Execute pipeline stages
        results = {}
        
        # Stage 1: Format Detection
        if config.format_detection:
            logger.info(f"Pipeline stage 1: Format detection for {document_id}")
            detection_result = execute_format_detection.delay(document_id).get()
            results['format_detection'] = detection_result
            pipeline_metadata['stages_completed'].append('format_detection')
            
            if not detection_result.get('success') and not config.continue_on_failure:
                raise Exception(f"Format detection failed: {detection_result.get('error')}")
        
        # Stage 2: Text Extraction  
        if config.text_extraction:
            logger.info(f"Pipeline stage 2: Text extraction for {document_id}")
            extraction_result = execute_text_extraction.delay(
                document_id, 
                config.extraction_config
            ).get()
            results['text_extraction'] = extraction_result
            pipeline_metadata['stages_completed'].append('text_extraction')
            
            if not extraction_result.get('success') and not config.continue_on_failure:
                raise Exception(f"Text extraction failed: {extraction_result.get('error')}")
        
        # Stage 3: Content Preprocessing
        if config.content_preprocessing:
            logger.info(f"Pipeline stage 3: Content preprocessing for {document_id}")
            preprocessing_result = execute_content_preprocessing.delay(
                document_id,
                config.preprocessing_config
            ).get()
            results['content_preprocessing'] = preprocessing_result
            pipeline_metadata['stages_completed'].append('content_preprocessing')
            
            if not preprocessing_result.get('success') and not config.continue_on_failure:
                raise Exception(f"Content preprocessing failed: {preprocessing_result.get('error')}")
        
        # Stage 4: Metadata Enrichment
        if config.metadata_enrichment:
            logger.info(f"Pipeline stage 4: Metadata enrichment for {document_id}")
            metadata_result = execute_metadata_enrichment.delay(
                document_id,
                config.metadata_config
            ).get()
            results['metadata_enrichment'] = metadata_result
            pipeline_metadata['stages_completed'].append('metadata_enrichment')
        
        # Stage 5: Vector Indexing
        if config.vector_indexing:
            logger.info(f"Pipeline stage 5: Vector indexing for {document_id}")
            from app.workers.vector_indexing import index_document
            indexing_result = index_document.delay(
                document_id,
                config.indexing_config
            ).get()
            results['vector_indexing'] = indexing_result
            pipeline_metadata['stages_completed'].append('vector_indexing')
        
        # Update final status
        pipeline_metadata.update({
            'completed_at': datetime.utcnow().isoformat(),
            'success': True,
            'total_stages': len(pipeline_metadata['stages_completed']),
            'processing_time_seconds': (
                datetime.utcnow() - datetime.fromisoformat(pipeline_metadata['started_at'])
            ).total_seconds()
        })
        
        # Update document with final status
        db = SessionLocal()
        document = crud.document.get_by_id(db, uuid.UUID(document_id), uuid.UUID(user_id))
        if document:
            document.upload_status = "pipeline_completed"
            document.indexing_metadata = pipeline_metadata
            db.commit()
        db.close()
        
        logger.info(f"Complete pipeline processing finished for {document_id}")
        
        return {
            'status': 'success',
            'document_id': document_id,
            'pipeline_metadata': pipeline_metadata,
            'stage_results': results
        }
        
    except Exception as exc:
        logger.error(f"Complete pipeline processing failed for {document_id}: {exc}")
        
        # Update error status
        pipeline_metadata.update({
            'failed_at': datetime.utcnow().isoformat(),
            'success': False,
            'error_message': str(exc)
        })
        
        db = SessionLocal()
        try:
            document = crud.document.get_by_id(db, uuid.UUID(document_id), uuid.UUID(user_id))
            if document:
                document.upload_status = "pipeline_failed"
                document.error_message = str(exc)
                document.indexing_metadata = pipeline_metadata
                db.commit()
        finally:
            db.close()
        
        raise exc


@celery_app.task(bind=True, base=DocumentPipelineTask, name="document_pipeline.format_detection")
def execute_format_detection(self, document_id: str) -> Dict[str, Any]:
    """Execute format detection stage."""
    try:
        db = SessionLocal()
        document = crud.document.get_by_id(db, uuid.UUID(document_id), user_id=None)
        if not document:
            raise ValueError(f"Document {document_id} not found")
        
        # Download file content
        file_content = storage_service.s3_client.get_object(
            Bucket=storage_service.bucket_name,
            Key=document.storage_path
        )['Body'].read()
        
        # Perform format detection
        detection_result = format_detector.detect_format(
            file_content=file_content,
            filename=document.original_filename,
            declared_format=document.file_type
        )
        
        db.close()
        
        return {
            'success': True,
            'detected_format': detection_result.detected_format,
            'confidence_score': detection_result.confidence_score,
            'is_valid': detection_result.is_valid,
            'metadata': detection_result.additional_metadata
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }


@celery_app.task(bind=True, base=DocumentPipelineTask, name="document_pipeline.text_extraction")
def execute_text_extraction(self, document_id: str, extraction_config: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Execute text extraction stage."""
    try:
        db = SessionLocal()
        document = crud.document.get_by_id(db, uuid.UUID(document_id), user_id=None)
        if not document:
            raise ValueError(f"Document {document_id} not found")
        
        # Download file content
        file_content = storage_service.s3_client.get_object(
            Bucket=storage_service.bucket_name,
            Key=document.storage_path
        )['Body'].read()
        
        # Configure extraction
        config = ExtractionConfig(**extraction_config) if extraction_config else ExtractionConfig()
        text_extraction_service.config = config
        
        # Extract text
        extraction_result = text_extraction_service.extract_text(
            file_content=file_content,
            filename=document.original_filename,
            document_format=document.file_type
        )
        
        # Store extracted text
        if extraction_result.success:
            # Store as markdown
            markdown_storage_path = document.storage_path.rsplit('.', 1)[0] + '.md'
            storage_service.s3_client.put_object(
                Bucket=storage_service.bucket_name,
                Key=markdown_storage_path,
                Body=extraction_result.extracted_text.encode('utf-8'),
                ContentType='text/markdown'
            )
            
            # Update document
            document.content_text = extraction_result.extracted_text[:10000]
            document.content_extracted = True
            db.commit()
        
        db.close()
        
        return {
            'success': extraction_result.success,
            'extraction_method': extraction_result.extraction_method,
            'content_length': len(extraction_result.extracted_text),
            'metadata': extraction_result.metadata,
            'warnings': extraction_result.warnings,
            'error': extraction_result.error_message
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }


@celery_app.task(bind=True, base=DocumentPipelineTask, name="document_pipeline.content_preprocessing")
def execute_content_preprocessing(self, document_id: str, preprocessing_config: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Execute content preprocessing stage."""
    try:
        db = SessionLocal()
        document = crud.document.get_by_id(db, uuid.UUID(document_id), user_id=None)
        if not document:
            raise ValueError(f"Document {document_id} not found")
        
        # Get extracted text
        markdown_storage_path = document.storage_path.rsplit('.', 1)[0] + '.md'
        text_content = storage_service.s3_client.get_object(
            Bucket=storage_service.bucket_name,
            Key=markdown_storage_path
        )['Body'].read().decode('utf-8')
        
        # Configure preprocessing
        config = PreprocessingConfig(**preprocessing_config) if preprocessing_config else PreprocessingConfig()
        content_preprocessor.config = config
        
        # Preprocess content
        preprocessing_result = content_preprocessor.preprocess_content(
            content=text_content,
            document_format=document.file_type,
            filename=document.original_filename
        )
        
        # Store preprocessed content
        storage_service.s3_client.put_object(
            Bucket=storage_service.bucket_name,
            Key=markdown_storage_path,
            Body=preprocessing_result.cleaned_text.encode('utf-8'),
            ContentType='text/markdown'
        )
        
        # Update document
        document.content_text = preprocessing_result.cleaned_text[:10000]
        db.commit()
        db.close()
        
        return {
            'success': True,
            'original_length': preprocessing_result.original_length,
            'processed_length': preprocessing_result.processed_length,
            'operations_applied': preprocessing_result.operations_applied,
            'metadata': preprocessing_result.metadata,
            'warnings': preprocessing_result.warnings
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }


@celery_app.task(bind=True, base=DocumentPipelineTask, name="document_pipeline.metadata_enrichment")
def execute_metadata_enrichment(self, document_id: str, metadata_config: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Execute metadata enrichment stage."""
    try:
        db = SessionLocal()
        document = crud.document.get_by_id(db, uuid.UUID(document_id), user_id=None)
        if not document:
            raise ValueError(f"Document {document_id} not found")
        
        # Get file and text content
        file_content = storage_service.s3_client.get_object(
            Bucket=storage_service.bucket_name,
            Key=document.storage_path
        )['Body'].read()
        
        markdown_storage_path = document.storage_path.rsplit('.', 1)[0] + '.md'
        text_content = storage_service.s3_client.get_object(
            Bucket=storage_service.bucket_name,
            Key=markdown_storage_path
        )['Body'].read().decode('utf-8')
        
        # Configure metadata extraction
        config = MetadataEnrichmentConfig(**metadata_config) if metadata_config else MetadataEnrichmentConfig()
        metadata_extractor.config = config
        
        # Create mock results for metadata extraction
        class MockFormatResult:
            def __init__(self):
                self.detected_format = document.file_type
                self.mime_type = 'application/octet-stream'
                self.confidence_score = 1.0
                self.is_valid = True
                self.additional_metadata = {}
        
        class MockExtractionResult:
            def __init__(self):
                self.success = True
                self.extraction_method = 'pipeline'
                self.metadata = {}
                self.warnings = []
        
        # Extract metadata
        enriched_metadata = metadata_extractor.extract_metadata(
            file_content=file_content,
            extracted_text=text_content,
            filename=document.original_filename,
            format_detection_result=MockFormatResult(),
            extraction_result=MockExtractionResult()
        )
        
        # Update document metadata
        current_metadata = document.indexing_metadata or {}
        current_metadata['enriched_metadata'] = metadata_extractor.to_json(enriched_metadata)
        document.indexing_metadata = current_metadata
        db.commit()
        db.close()
        
        return {
            'success': True,
            'metadata': {
                'quality_score': enriched_metadata.quality_score,
                'detected_language': enriched_metadata.detected_language,
                'content_length': enriched_metadata.content_length,
                'word_count': enriched_metadata.word_count,
                'structure_analysis': enriched_metadata.structure_analysis
            }
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }


# Batch processing tasks
@celery_app.task(bind=True, name="document_pipeline.batch_process")
def batch_process_documents(
    self,
    document_ids: List[str],
    user_id: str,
    pipeline_config: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """Process multiple documents in batch."""
    try:
        logger.info(f"Starting batch processing for {len(document_ids)} documents")
        
        # Create pipeline tasks for all documents
        pipeline_tasks = []
        for doc_id in document_ids:
            task = process_document_complete.s(doc_id, user_id, pipeline_config)
            pipeline_tasks.append(task)
        
        # Execute in parallel using Celery group
        job = group(pipeline_tasks)
        result = job.apply_async()
        
        # Wait for all tasks to complete
        results = result.get()
        
        # Compile batch results
        successful = sum(1 for r in results if r.get('status') == 'success')
        failed = len(results) - successful
        
        return {
            'batch_id': str(uuid.uuid4()),
            'total_documents': len(document_ids),
            'successful': successful,
            'failed': failed,
            'success_rate': successful / len(document_ids) if document_ids else 0,
            'results': results
        }
        
    except Exception as e:
        logger.error(f"Batch processing failed: {e}")
        return {
            'batch_id': str(uuid.uuid4()),
            'total_documents': len(document_ids),
            'successful': 0,
            'failed': len(document_ids),
            'error': str(e)
        } 