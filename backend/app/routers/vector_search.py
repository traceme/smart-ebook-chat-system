"""
Vector search and indexing API endpoints.

This module provides API endpoints for document vector indexing,
semantic search, and indexing status management.
"""

import uuid
import time
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app import models
from app.api import deps
from app.services.embeddings import EmbeddingService
from app.services.vector_storage import VectorStorageService
from app.services.reranker import BGERerankerService
from app.services.context_construction import ContextConstructionService
from app.services.search_analytics import SearchAnalyticsService, SearchEvent
from app.workers.vector_indexing import (
    index_document, 
    reindex_document,
    batch_index_documents,
    delete_document_vectors,
    get_indexing_stats
)
from app.crud.crud_document import crud_document

logger = logging.getLogger(__name__)

router = APIRouter()


# Pydantic models for request/response
class VectorIndexRequest(BaseModel):
    """Request model for document indexing."""
    chunking_config: Optional[Dict[str, Any]] = None
    embedding_config: Optional[Dict[str, Any]] = None
    storage_config: Optional[Dict[str, Any]] = None


class BatchIndexRequest(BaseModel):
    """Request model for batch document indexing."""
    document_ids: List[str]
    chunking_config: Optional[Dict[str, Any]] = None
    embedding_config: Optional[Dict[str, Any]] = None
    storage_config: Optional[Dict[str, Any]] = None


class SearchRequest(BaseModel):
    """Request model for vector search."""
    query: str
    limit: int = 10
    k_retrieval: int = 8  # Initial retrieval count for reranking
    score_threshold: Optional[float] = None
    filter_conditions: Optional[Dict[str, Any]] = None
    enable_reranking: bool = True
    rerank_top_k: Optional[int] = None  # Top k after reranking


class SearchResponse(BaseModel):
    """Response model for search results."""
    query: str
    results: List[Dict[str, Any]]
    total_results: int
    search_time_ms: float
    embedding_time_ms: float
    rerank_time_ms: Optional[float] = None
    reranking_enabled: bool = False
    context_window: Optional[str] = None


# Indexing endpoints
@router.post("/documents/{document_id}/index")
def start_document_indexing(
    *,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
    document_id: uuid.UUID,
    index_request: VectorIndexRequest = VectorIndexRequest()
):
    """Start vector indexing for a document."""
    # Get document and verify ownership
    document = crud_document.get_by_id(db, document_id, current_user.id)
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Check if document is ready for indexing
    if document.upload_status != "conversion_completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Document must be converted before indexing. Current status: {document.upload_status}"
        )
    
    # Check if already indexed
    if document.upload_status == "indexed":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Document is already indexed. Use reindex endpoint to reindex."
        )
    
    # Start indexing task
    try:
        task = index_document.delay(
            str(document_id),
            chunking_config=index_request.chunking_config,
            embedding_config=index_request.embedding_config,
            storage_config=index_request.storage_config
        )
        
        return {
            "status": "success",
            "message": "Document indexing started",
            "task_id": task.id,
            "document_id": document_id
        }
        
    except Exception as e:
        logger.error(f"Failed to start indexing for document {document_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to start document indexing"
        )


@router.post("/documents/{document_id}/reindex")
def reindex_document_endpoint(
    *,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
    document_id: uuid.UUID,
    force: bool = Query(False, description="Force reindexing even if already indexed"),
    index_request: VectorIndexRequest = VectorIndexRequest()
):
    """Reindex a document (delete existing vectors and create new ones)."""
    # Get document and verify ownership
    document = crud_document.get_by_id(db, document_id, current_user.id)
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Start reindexing task
    try:
        task = reindex_document.delay(str(document_id), force=force)
        
        return {
            "status": "success",
            "message": "Document reindexing started",
            "task_id": task.id,
            "document_id": document_id,
            "force": force
        }
        
    except Exception as e:
        logger.error(f"Failed to start reindexing for document {document_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to start document reindexing"
        )


@router.post("/batch-index")
def batch_index_documents_endpoint(
    *,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
    batch_request: BatchIndexRequest
):
    """Index multiple documents in batch."""
    # Verify all documents exist and belong to user
    document_uuids = []
    for doc_id in batch_request.document_ids:
        try:
            doc_uuid = uuid.UUID(doc_id)
            document = crud_document.get_by_id(db, doc_uuid, current_user.id)
            if not document:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Document {doc_id} not found"
                )
            
            if document.upload_status != "conversion_completed":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Document {doc_id} is not ready for indexing. Status: {document.upload_status}"
                )
            
            document_uuids.append(doc_uuid)
            
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid document ID format: {doc_id}"
            )
    
    # Start batch indexing task
    try:
        task = batch_index_documents.delay(
            batch_request.document_ids,
            chunking_config=batch_request.chunking_config,
            embedding_config=batch_request.embedding_config,
            storage_config=batch_request.storage_config
        )
        
        return {
            "status": "success",
            "message": f"Batch indexing started for {len(batch_request.document_ids)} documents",
            "task_id": task.id,
            "document_ids": batch_request.document_ids
        }
        
    except Exception as e:
        logger.error(f"Failed to start batch indexing: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to start batch indexing"
        )


@router.delete("/documents/{document_id}/vectors")
def delete_document_vectors_endpoint(
    *,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
    document_id: uuid.UUID
):
    """Delete all vectors for a document."""
    # Get document and verify ownership
    document = crud_document.get_by_id(db, document_id, current_user.id)
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Start deletion task
    try:
        task = delete_document_vectors.delay(str(document_id))
        
        return {
            "status": "success",
            "message": "Vector deletion started",
            "task_id": task.id,
            "document_id": document_id
        }
        
    except Exception as e:
        logger.error(f"Failed to start vector deletion for document {document_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to start vector deletion"
        )


# Search endpoints
@router.post("/search", response_model=SearchResponse)
async def search_documents(
    *,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
    search_request: SearchRequest
):
    """Perform semantic search across indexed documents with k=8 retrieval and BGE reranking."""
    import time
    
    start_time = time.time()
    rerank_time_ms = None
    context_window = None
    
    try:
        # Generate embedding for query
        embedding_start = time.time()
        embedding_service = EmbeddingService()
        query_embedding_result = await embedding_service.generate_embedding(search_request.query)
        embedding_time = (time.time() - embedding_start) * 1000
        
        # Search vectors with k=8 initial retrieval
        search_start = time.time()
        storage_service = VectorStorageService()
        
        # Add user filter to ensure user only sees their documents
        filter_conditions = search_request.filter_conditions or {}
        
        # Get user's document IDs to filter results
        user_documents = crud_document.get_user_documents(
            db, current_user.id, limit=10000  # Large limit to get all docs
        )
        user_doc_ids = [str(doc.id) for doc in user_documents]
        
        if user_doc_ids:
            filter_conditions["document_id"] = user_doc_ids
        else:
            # User has no documents, return empty results
            return SearchResponse(
                query=search_request.query,
                results=[],
                total_results=0,
                search_time_ms=0,
                embedding_time_ms=embedding_time,
                reranking_enabled=False
            )
        
        # Use k_retrieval for initial search (default k=8)
        initial_results = storage_service.search_similar(
            query_vector=query_embedding_result.embedding,
            limit=max(search_request.k_retrieval, search_request.limit),
            score_threshold=search_request.score_threshold,
            filter_conditions=filter_conditions
        )
        
        search_time = (time.time() - search_start) * 1000
        
        # Format initial results
        formatted_results = []
        for result in initial_results:
            formatted_result = {
                "id": result.id,
                "score": result.score,
                "text": result.text,
                "document_id": result.payload.get("document_id"),
                "document_type": result.payload.get("document_type"),
                "chunk_index": result.payload.get("chunk_index"),
                "start_char": result.payload.get("start_char"),
                "end_char": result.payload.get("end_char"),
                "metadata": {k: v for k, v in result.payload.items() 
                           if k not in ["text", "document_id", "document_type", "chunk_index", "start_char", "end_char"]}
            }
            formatted_results.append(formatted_result)
        
        # Apply BGE reranking if enabled and we have results
        final_results = formatted_results
        if search_request.enable_reranking and formatted_results:
            try:
                rerank_start = time.time()
                reranker = BGERerankerService()
                
                # Rerank the results
                rerank_results = await reranker.rerank_async(
                    query=search_request.query,
                    search_results=formatted_results,
                    top_k=search_request.rerank_top_k or search_request.limit
                )
                
                rerank_time_ms = (time.time() - rerank_start) * 1000
                
                # Convert rerank results back to formatted results
                final_results = []
                for rerank_result in rerank_results:
                    result_dict = rerank_result.metadata.copy()
                    result_dict["rerank_score"] = rerank_result.rerank_score
                    result_dict["original_index"] = rerank_result.original_index
                    final_results.append(result_dict)
                
                logger.info(f"Reranked {len(formatted_results)} -> {len(final_results)} results")
                
            except Exception as e:
                logger.error(f"Reranking failed, using original results: {e}")
                # Fall back to original results if reranking fails
                final_results = formatted_results
                search_request.enable_reranking = False
        
        # Limit final results
        final_results = final_results[:search_request.limit]
        
        # Construct context window if results available
        if final_results:
            try:
                context_service = ContextConstructionService()
                context_result = context_service.construct_context_window(
                    search_results=final_results,
                    query=search_request.query
                )
                context_window = context_result.context
                
            except Exception as e:
                logger.error(f"Context window construction failed: {e}")
                context_window = None
        
        # Track search analytics
        try:
            analytics_service = SearchAnalyticsService()
            search_event = SearchEvent(
                user_id=str(current_user.id),
                query=search_request.query,
                timestamp=datetime.now(),
                results_count=len(final_results),
                search_time_ms=search_time,
                embedding_time_ms=embedding_time,
                rerank_time_ms=rerank_time_ms,
                reranking_enabled=search_request.enable_reranking,
                top_score=max((r.get("score", r.get("rerank_score", 0)) for r in final_results), default=0.0),
                avg_score=sum(r.get("score", r.get("rerank_score", 0)) for r in final_results) / len(final_results) if final_results else 0.0,
                filters_used=search_request.filter_conditions or {},
                context_window_generated=context_window is not None
            )
            analytics_service.track_search_event(search_event)
        except Exception as e:
            logger.error(f"Failed to track search analytics: {e}")
        
        return SearchResponse(
            query=search_request.query,
            results=final_results,
            total_results=len(final_results),
            search_time_ms=search_time,
            embedding_time_ms=embedding_time,
            rerank_time_ms=rerank_time_ms,
            reranking_enabled=search_request.enable_reranking,
            context_window=context_window
        )
        
    except Exception as e:
        logger.error(f"Search failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Search operation failed"
        )


@router.post("/search/advanced")
async def advanced_search(
    *,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
    search_request: SearchRequest
):
    """Advanced search with detailed analytics and reference extraction."""
    try:
        # Perform the standard search
        search_response = await search_documents(
            db=db,
            current_user=current_user,
            search_request=search_request
        )
        
        # Extract references
        context_service = ContextConstructionService()
        references = context_service.extract_references(search_response.results)
        
        # Get reranking statistics if reranking was enabled
        rerank_stats = None
        if search_request.enable_reranking and search_response.results:
            try:
                reranker = BGERerankerService()
                # Mock rerank results for stats (we already have scores in results)
                mock_rerank_results = []
                for result in search_response.results:
                    from app.services.reranker import RerankResult
                    mock_result = RerankResult(
                        original_index=result.get("original_index", 0),
                        rerank_score=result.get("rerank_score", result.get("score", 0.0)),
                        passage=result.get("text", ""),
                        metadata=result
                    )
                    mock_rerank_results.append(mock_result)
                
                rerank_stats = reranker.get_reranking_stats(mock_rerank_results)
            except Exception as e:
                logger.error(f"Failed to get rerank stats: {e}")
                rerank_stats = None
        
        # Enhanced response
        return {
            "search_results": search_response.dict(),
            "references": references,
            "reranking_stats": rerank_stats,
            "analytics": {
                "total_processing_time_ms": (
                    search_response.search_time_ms + 
                    search_response.embedding_time_ms + 
                    (search_response.rerank_time_ms or 0)
                ),
                "unique_documents": len(references),
                "avg_relevance_score": (
                    sum(r.get("score", r.get("rerank_score", 0)) for r in search_response.results) / 
                    len(search_response.results) if search_response.results else 0
                ),
                "search_effectiveness": {
                    "top_3_avg_score": (
                        sum(r.get("score", r.get("rerank_score", 0)) for r in search_response.results[:3]) / 
                        min(3, len(search_response.results)) if search_response.results else 0
                    ),
                    "score_variance": (
                        sum((r.get("score", r.get("rerank_score", 0)) - 
                             sum(res.get("score", res.get("rerank_score", 0)) for res in search_response.results) / 
                             len(search_response.results))**2 
                            for r in search_response.results) / 
                        len(search_response.results) if len(search_response.results) > 1 else 0
                    )
                }
            }
        }
        
    except Exception as e:
        logger.error(f"Advanced search failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Advanced search operation failed"
        )


@router.get("/search/similar/{document_id}")
def get_similar_documents(
    *,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
    document_id: uuid.UUID,
    limit: int = Query(10, ge=1, le=100),
    score_threshold: Optional[float] = Query(None, ge=0.0, le=1.0)
):
    """Find documents similar to a specific document."""
    # Get document and verify ownership
    document = crud_document.get_by_id(db, document_id, current_user.id)
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    if not document.vector_indexed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document is not indexed for search"
        )
    
    try:
        # Get vectors for this document
        storage_service = VectorStorageService()
        document_vectors = storage_service.get_document_vectors(str(document_id))
        
        if not document_vectors:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No vectors found for this document"
            )
        
        # Use the first vector as the query (could be improved by averaging or other methods)
        query_vector_id = document_vectors[0].id
        
        # Search for similar vectors, excluding the source document
        filter_conditions = {}
        
        # Get user's other documents
        user_documents = crud_document.get_user_documents(
            db, current_user.id, limit=10000
        )
        user_doc_ids = [str(doc.id) for doc in user_documents if str(doc.id) != str(document_id)]
        
        if user_doc_ids:
            filter_conditions["document_id"] = user_doc_ids
        else:
            return {
                "document_id": document_id,
                "similar_documents": [],
                "total_results": 0
            }
        
        # Get the embedding from Qdrant (we'd need to modify the storage service for this)
        # For now, return empty results with message
        return {
            "document_id": document_id,
            "similar_documents": [],
            "total_results": 0,
            "message": "Similar document search requires vector retrieval feature"
        }
        
    except Exception as e:
        logger.error(f"Similar document search failed for {document_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Similar document search failed"
        )


# Status and management endpoints
@router.get("/stats")
def get_indexing_statistics(
    *,
    current_user: models.User = Depends(deps.get_current_user)
):
    """Get overall indexing statistics."""
    try:
        task = get_indexing_stats.delay()
        result = task.get(timeout=30)  # Wait up to 30 seconds for result
        
        return {
            "status": "success",
            "statistics": result
        }
        
    except Exception as e:
        logger.error(f"Failed to get indexing statistics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get indexing statistics"
        )


@router.get("/documents/{document_id}/indexing-status")
def get_document_indexing_status(
    *,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
    document_id: uuid.UUID
):
    """Get indexing status for a specific document."""
    # Get document and verify ownership
    document = crud_document.get_by_id(db, document_id, current_user.id)
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    try:
        # Get vector storage info if indexed
        vector_info = None
        if document.vector_indexed:
            storage_service = VectorStorageService()
            try:
                document_vectors = storage_service.get_document_vectors(str(document_id))
                vector_info = {
                    "vectors_count": len(document_vectors),
                    "sample_vector_ids": [v.id for v in document_vectors[:5]]
                }
            except Exception as e:
                logger.warning(f"Failed to get vector info for document {document_id}: {e}")
        
        return {
            "document_id": document_id,
            "upload_status": document.upload_status,
            "content_extracted": document.content_extracted,
            "vector_indexed": document.vector_indexed,
            "chunks_count": document.chunks_count,
            "vectors_count": document.vectors_count,
            "indexing_metadata": document.indexing_metadata,
            "error_message": document.error_message,
            "vector_storage_info": vector_info,
            "last_updated": document.updated_at.isoformat() if document.updated_at else None
        }
        
    except Exception as e:
        logger.error(f"Failed to get indexing status for document {document_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get document indexing status"
        )


@router.get("/health")
def vector_search_health():
    """Health check for vector search service."""
    try:
        # Test Qdrant connection
        storage_service = VectorStorageService()
        collection_info = storage_service.get_collection_info()
        
        return {
            "status": "healthy",
            "services": {
                "qdrant": "connected",
                "collection_info": collection_info
            },
            "timestamp": time.time()
        }
        
    except Exception as e:
        logger.error(f"Vector search health check failed: {e}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": time.time()
        }


# Analytics endpoints
@router.get("/analytics/overview")
def get_search_analytics_overview(
    *,
    current_user: models.User = Depends(deps.get_current_user),
    days_back: int = Query(7, ge=1, le=30)
):
    """Get search analytics overview."""
    try:
        analytics_service = SearchAnalyticsService()
        analytics = analytics_service.get_search_analytics(days_back=days_back)
        
        return {
            "status": "success",
            "analytics": analytics,
            "time_period_days": days_back
        }
        
    except Exception as e:
        logger.error(f"Failed to get search analytics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve search analytics"
        )


@router.get("/analytics/popular-queries")
def get_popular_queries(
    *,
    current_user: models.User = Depends(deps.get_current_user),
    limit: int = Query(10, ge=1, le=50)
):
    """Get most popular search queries."""
    try:
        analytics_service = SearchAnalyticsService()
        popular_queries = analytics_service.get_popular_queries(limit=limit)
        
        return {
            "status": "success",
            "popular_queries": popular_queries
        }
        
    except Exception as e:
        logger.error(f"Failed to get popular queries: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve popular queries"
        )


@router.get("/analytics/user-history")
def get_user_search_history(
    *,
    current_user: models.User = Depends(deps.get_current_user),
    limit: int = Query(20, ge=1, le=100)
):
    """Get search history for the current user."""
    try:
        analytics_service = SearchAnalyticsService()
        history = analytics_service.get_user_search_history(
            user_id=str(current_user.id),
            limit=limit
        )
        
        return {
            "status": "success",
            "search_history": history,
            "user_id": str(current_user.id)
        }
        
    except Exception as e:
        logger.error(f"Failed to get user search history: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve search history"
        )


@router.get("/analytics/real-time")
def get_real_time_analytics(
    *,
    current_user: models.User = Depends(deps.get_current_user)
):
    """Get real-time search analytics."""
    try:
        analytics_service = SearchAnalyticsService()
        real_time_stats = analytics_service.get_real_time_stats()
        
        return {
            "status": "success",
            "real_time_stats": real_time_stats,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to get real-time analytics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve real-time analytics"
        )


@router.post("/analytics/click")
def track_result_click(
    *,
    current_user: models.User = Depends(deps.get_current_user),
    click_data: Dict[str, Any]
):
    """Track a result click event."""
    try:
        from app.services.search_analytics import ClickEvent
        
        analytics_service = SearchAnalyticsService()
        click_event = ClickEvent(
            user_id=str(current_user.id),
            query=click_data.get("query", ""),
            document_id=click_data.get("document_id", ""),
            result_position=click_data.get("position", 0),
            relevance_score=click_data.get("score", 0.0),
            timestamp=datetime.now()
        )
        
        analytics_service.track_click_event(click_event)
        
        return {"status": "success", "message": "Click event tracked"}
        
    except Exception as e:
        logger.error(f"Failed to track click event: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to track click event"
        ) 