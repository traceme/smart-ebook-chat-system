"""
Celery worker for document vectorization and indexing.

This module provides Celery tasks for processing documents through the
chunking, embedding, and storage pipeline for vector search.
"""

import asyncio
import logging
from typing import List, Dict, Any, Optional
from celery import Task
from datetime import datetime

from app.workers.celery_app import celery_app
from app.services.storage import StorageService
from app.services.chunking import DocumentChunkingService, ChunkingConfig
from app.services.embeddings import EmbeddingService, EmbeddingConfig
from app.services.vector_storage import VectorStorageService, VectorStorageConfig
from app.crud.crud_document import crud_document
from app.api.deps import get_db

logger = logging.getLogger(__name__)


class VectorIndexingTask(Task):
    """Custom Celery task class for vector indexing with proper error handling."""
    
    def on_failure(self, exc, task_id, args, kwargs, einfo):
        """Called when task fails."""
        logger.error(f"Vector indexing task {task_id} failed: {exc}")
        
        # Update document status to failed if document_id is available
        if args and len(args) > 0:
            document_id = args[0]
            try:
                db = next(get_db())
                crud_document.update_status(
                    db=db,
                    document_id=document_id,
                    status="indexing_failed",
                    error_message=str(exc)
                )
            except Exception as e:
                logger.error(f"Failed to update document status: {e}")
        
        super().on_failure(exc, task_id, args, kwargs, einfo)
    
    def on_success(self, retval, task_id, args, kwargs):
        """Called when task succeeds."""
        logger.info(f"Vector indexing task {task_id} completed successfully")
        super().on_success(retval, task_id, args, kwargs)


@celery_app.task(
    bind=True,
    base=VectorIndexingTask,
    name="vector_indexing.index_document",
    max_retries=3,
    default_retry_delay=60,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_jitter=True
)
def index_document(
    self,
    document_id: str,
    chunking_config: Optional[Dict[str, Any]] = None,
    embedding_config: Optional[Dict[str, Any]] = None,
    storage_config: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Index a document by processing it through the vectorization pipeline.
    
    Args:
        document_id: ID of the document to index
        chunking_config: Optional configuration for chunking
        embedding_config: Optional configuration for embeddings
        storage_config: Optional configuration for vector storage
        
    Returns:
        Dictionary with indexing results and statistics
    """
    try:
        logger.info(f"Starting vector indexing for document {document_id}")
        
        # Get database session
        db = next(get_db())
        
        # Get document
        document = crud_document.get(db=db, id=document_id)
        if not document:
            raise ValueError(f"Document {document_id} not found")
        
        # Check if document is ready for indexing before changing status
        if document.upload_status != "conversion_completed":
            raise ValueError(f"Document {document_id} is not ready for indexing. Status: {document.upload_status}")
        
        # Update status to indexing
        crud_document.update_status(
            db=db,
            document_id=document_id,
            status="indexing"
        )
        
        # Initialize services with provided configurations
        chunking_service = DocumentChunkingService(
            config=ChunkingConfig(**chunking_config) if chunking_config else None
        )
        
        embedding_service = EmbeddingService(
            config=EmbeddingConfig(**embedding_config) if embedding_config else None
        )
        
        storage_service = VectorStorageService(
            config=VectorStorageConfig(**storage_config) if storage_config else None
        )
        
        # Get storage service for document content
        minio_storage = StorageService()
        
        # Get markdown content
        markdown_content = minio_storage.download_markdown(document_id)
        if not markdown_content:
            raise ValueError(f"No markdown content found for document {document_id}")
        
        # Step 1: Chunk the document
        logger.info(f"Chunking document {document_id}")
        chunks = chunking_service.chunk_markdown_document(
            markdown_content=markdown_content,
            document_id=document_id,
            additional_metadata={
                "filename": document.filename,
                "original_size": document.file_size,
                "upload_date": document.created_at.isoformat(),
                "file_type": document.file_type
            }
        )
        
        if not chunks:
            raise ValueError(f"No chunks generated for document {document_id}")
        
        logger.info(f"Generated {len(chunks)} chunks for document {document_id}")
        
        # Step 2: Generate embeddings
        logger.info(f"Generating embeddings for {len(chunks)} chunks")
        
        # Run async embedding generation in event loop
        async def generate_embeddings():
            return await embedding_service.generate_embeddings_for_chunks(chunks)
        
        embeddings_data = asyncio.run(generate_embeddings())
        
        logger.info(f"Generated embeddings for {len(embeddings_data)} chunks")
        
        # Step 3: Store vectors in Qdrant
        logger.info(f"Storing vectors in Qdrant")
        point_ids = storage_service.store_embeddings(embeddings_data)
        
        logger.info(f"Stored {len(point_ids)} vectors in Qdrant")
        
        # Step 4: Update document status and metadata
        crud_document.update_status(
            db=db,
            document_id=document_id,
            status="indexed"
        )
        
        # Update document with indexing metadata
        indexing_metadata = {
            "chunks_count": len(chunks),
            "vectors_count": len(point_ids),
            "indexed_at": datetime.utcnow().isoformat(),
            "embedding_model": embedding_service.config.model.name,
            "vector_dimensions": embedding_service.config.model.dimensions
        }
        
        crud_document.update_metadata(
            db=db,
            document_id=document_id,
            metadata=indexing_metadata
        )
        
        # Generate statistics
        chunking_stats = chunking_service.get_chunking_stats(chunks)
        embedding_results = [result for _, result in embeddings_data]
        embedding_stats = embedding_service.get_embedding_stats(embedding_results)
        storage_stats = storage_service.get_storage_stats()
        
        result = {
            "document_id": document_id,
            "status": "completed",
            "indexing_metadata": indexing_metadata,
            "chunking_stats": chunking_stats,
            "embedding_stats": embedding_stats,
            "storage_stats": storage_stats,
            "point_ids": point_ids[:10],  # Only return first 10 IDs to avoid large response
            "total_point_ids": len(point_ids)
        }
        
        logger.info(f"Vector indexing completed for document {document_id}")
        return result
        
    except Exception as e:
        logger.error(f"Vector indexing failed for document {document_id}: {str(e)}")
        
        # Update document status to failed
        try:
            db = next(get_db())
            crud_document.update_status(
                db=db,
                document_id=document_id,
                status="indexing_failed",
                error_message=str(e)
            )
        except Exception as db_error:
            logger.error(f"Failed to update document status: {db_error}")
        
        # Re-raise for Celery retry mechanism
        raise


@celery_app.task(
    bind=True,
    name="vector_indexing.reindex_document",
    max_retries=3,
    default_retry_delay=60
)
def reindex_document(
    self,
    document_id: str,
    force: bool = False
) -> Dict[str, Any]:
    """
    Reindex a document by deleting existing vectors and creating new ones.
    
    Args:
        document_id: ID of the document to reindex
        force: Whether to force reindexing even if already indexed
        
    Returns:
        Dictionary with reindexing results
    """
    try:
        logger.info(f"Starting reindexing for document {document_id}")
        
        # Get database session
        db = next(get_db())
        
        # Get document
        document = crud_document.get(db=db, id=document_id)
        if not document:
            raise ValueError(f"Document {document_id} not found")
        
        # Check if document is already indexed
        if document.upload_status == "indexed" and not force:
            logger.info(f"Document {document_id} is already indexed. Use force=True to reindex.")
            return {
                "document_id": document_id,
                "status": "skipped",
                "message": "Document already indexed"
            }
        
        # Delete existing vectors
        storage_service = VectorStorageService()
        deleted = storage_service.delete_by_document_id(document_id)
        
        if deleted:
            logger.info(f"Deleted existing vectors for document {document_id}")
        
        # Trigger new indexing
        result = index_document.apply_async(args=[document_id])
        
        return {
            "document_id": document_id,
            "status": "reindexing_started",
            "task_id": result.id,
            "existing_vectors_deleted": deleted
        }
        
    except Exception as e:
        logger.error(f"Reindexing failed for document {document_id}: {str(e)}")
        raise


@celery_app.task(
    bind=True,
    name="vector_indexing.batch_index_documents",
    max_retries=2
)
def batch_index_documents(
    self,
    document_ids: List[str],
    chunking_config: Optional[Dict[str, Any]] = None,
    embedding_config: Optional[Dict[str, Any]] = None,
    storage_config: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Index multiple documents in batch.
    
    Args:
        document_ids: List of document IDs to index
        chunking_config: Optional configuration for chunking
        embedding_config: Optional configuration for embeddings
        storage_config: Optional configuration for vector storage
        
    Returns:
        Dictionary with batch indexing results
    """
    try:
        logger.info(f"Starting batch indexing for {len(document_ids)} documents")
        
        results = []
        failed_documents = []
        
        for document_id in document_ids:
            try:
                # Submit indexing task for each document
                task_result = index_document.apply_async(
                    args=[document_id],
                    kwargs={
                        "chunking_config": chunking_config,
                        "embedding_config": embedding_config,
                        "storage_config": storage_config
                    }
                )
                
                results.append({
                    "document_id": document_id,
                    "task_id": task_result.id,
                    "status": "submitted"
                })
                
            except Exception as e:
                logger.error(f"Failed to submit indexing task for document {document_id}: {e}")
                failed_documents.append({
                    "document_id": document_id,
                    "error": str(e)
                })
        
        return {
            "total_documents": len(document_ids),
            "submitted_tasks": len(results),
            "failed_submissions": len(failed_documents),
            "results": results,
            "failed_documents": failed_documents
        }
        
    except Exception as e:
        logger.error(f"Batch indexing failed: {str(e)}")
        raise


@celery_app.task(
    bind=True,
    name="vector_indexing.delete_document_vectors",
    max_retries=2
)
def delete_document_vectors(self, document_id: str) -> Dict[str, Any]:
    """
    Delete all vectors for a document.
    
    Args:
        document_id: ID of the document to delete vectors for
        
    Returns:
        Dictionary with deletion results
    """
    try:
        logger.info(f"Deleting vectors for document {document_id}")
        
        storage_service = VectorStorageService()
        deleted = storage_service.delete_by_document_id(document_id)
        
        if deleted:
            # Update document status
            db = next(get_db())
            document = crud_document.get(db=db, id=document_id)
            if document and document.upload_status == "indexed":
                crud_document.update_status(
                    db=db,
                    document_id=document_id,
                    status="conversion_completed"  # Revert to previous status
                )
        
        return {
            "document_id": document_id,
            "vectors_deleted": deleted,
            "status": "completed"
        }
        
    except Exception as e:
        logger.error(f"Failed to delete vectors for document {document_id}: {str(e)}")
        raise


@celery_app.task(
    bind=True,
    name="vector_indexing.get_indexing_stats",
    max_retries=1
)
def get_indexing_stats(self) -> Dict[str, Any]:
    """
    Get overall indexing statistics.
    
    Returns:
        Dictionary with indexing statistics
    """
    try:
        logger.info("Getting indexing statistics")
        
        # Get database session
        db = next(get_db())
        
        # Get document counts by status
        total_documents = crud_document.count_by_status(db)
        
        # Get vector storage statistics
        storage_service = VectorStorageService()
        storage_stats = storage_service.get_storage_stats()
        
        return {
            "document_statistics": total_documents,
            "vector_storage_statistics": storage_stats,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to get indexing statistics: {str(e)}")
        raise 