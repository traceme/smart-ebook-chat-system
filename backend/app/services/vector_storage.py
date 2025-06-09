"""
Vector storage service using Qdrant for document embeddings.

This module provides functionality to store, retrieve, and search embeddings
in Qdrant vector database with proper collection management.
"""

import uuid
import logging
from typing import List, Dict, Any, Optional, Tuple, Union
from qdrant_client import QdrantClient
from qdrant_client.models import (
    VectorParams, Distance, PointStruct, Filter, FieldCondition, 
    MatchValue, SearchParams, CollectionInfo
)
from pydantic import BaseModel

from app.core.config import settings
from app.services.chunking import DocumentChunk
from app.services.embeddings import EmbeddingResult

logger = logging.getLogger(__name__)


class VectorPoint(BaseModel):
    """Vector point for storage in Qdrant."""
    id: str
    vector: List[float]
    payload: Dict[str, Any]


class SearchResult(BaseModel):
    """Search result from vector similarity search."""
    id: str
    score: float
    payload: Dict[str, Any]
    text: str


class VectorStorageConfig(BaseModel):
    """Configuration for vector storage."""
    collection_name: str = "document_embeddings"
    vector_size: int = 1536  # text-embedding-3-small dimensions
    distance_metric: Distance = Distance.COSINE
    index_type: str = "HNSW"  # Hierarchical Navigable Small World
    m: int = 16  # Number of connections in HNSW
    ef_construct: int = 100  # Size of the dynamic candidate list
    full_scan_threshold: int = 20000  # Use full scan for collections smaller than this


class VectorStorageService:
    """Service for storing and retrieving vectors in Qdrant."""
    
    def __init__(self, config: Optional[VectorStorageConfig] = None):
        """Initialize the vector storage service.
        
        Args:
            config: Configuration for vector storage
        """
        self.config = config or VectorStorageConfig()
        self.client = QdrantClient(url=settings.QDRANT_URL)
        
        # Initialize collection if it doesn't exist
        self._ensure_collection_exists()
    
    def _ensure_collection_exists(self) -> None:
        """Ensure the collection exists in Qdrant."""
        try:
            # Check if collection exists
            collections = self.client.get_collections()
            collection_names = [col.name for col in collections.collections]
            
            if self.config.collection_name not in collection_names:
                logger.info(f"Creating collection: {self.config.collection_name}")
                
                # Create collection with proper configuration
                self.client.create_collection(
                    collection_name=self.config.collection_name,
                    vectors_config=VectorParams(
                        size=self.config.vector_size,
                        distance=self.config.distance_metric,
                        hnsw_config={
                            "m": self.config.m,
                            "ef_construct": self.config.ef_construct,
                            "full_scan_threshold": self.config.full_scan_threshold
                        }
                    )
                )
                logger.info(f"Collection {self.config.collection_name} created successfully")
            else:
                logger.info(f"Collection {self.config.collection_name} already exists")
                
        except Exception as e:
            logger.error(f"Failed to ensure collection exists: {e}")
            raise
    
    def get_collection_info(self) -> Dict[str, Any]:
        """Get information about the collection.
        
        Returns:
            Dictionary with collection information
        """
        try:
            info = self.client.get_collection(self.config.collection_name)
            return {
                "name": self.config.collection_name,
                "points_count": info.points_count,
                "segments_count": info.segments_count,
                "vector_size": info.config.params.vectors.size,
                "distance_metric": info.config.params.vectors.distance.value,
                "status": info.status.value,
                "optimizer_status": "ok",  # Simplified - just report as ok if collection exists
                "indexed_vectors_count": info.indexed_vectors_count if hasattr(info, 'indexed_vectors_count') else 0
            }
        except Exception as e:
            logger.error(f"Failed to get collection info: {e}")
            raise
    
    def store_embeddings(
        self,
        embeddings_data: List[Tuple[DocumentChunk, EmbeddingResult]]
    ) -> List[str]:
        """Store embeddings in Qdrant.
        
        Args:
            embeddings_data: List of tuples containing (chunk, embedding_result)
            
        Returns:
            List of point IDs that were stored
        """
        if not embeddings_data:
            return []
        
        try:
            points = []
            point_ids = []
            
            for chunk, embedding_result in embeddings_data:
                # Generate unique point ID
                point_id = str(uuid.uuid4())
                point_ids.append(point_id)
                
                # Prepare payload with metadata
                payload = {
                    "text": chunk.text,
                    "document_id": chunk.metadata["document_id"],
                    "document_type": chunk.metadata.get("document_type", "unknown"),
                    "chunk_index": chunk.chunk_index,
                    "start_char": chunk.start_char,
                    "end_char": chunk.end_char,
                    "token_count": chunk.token_count,
                    "embedding_model": embedding_result.model,
                    "embedding_token_count": embedding_result.token_count,
                    "cached": embedding_result.cached,
                    **{k: v for k, v in chunk.metadata.items() if k not in ["document_id", "document_type"]}
                }
                
                # Create point
                point = PointStruct(
                    id=point_id,
                    vector=embedding_result.embedding,
                    payload=payload
                )
                points.append(point)
            
            # Store points in batch
            operation_info = self.client.upsert(
                collection_name=self.config.collection_name,
                points=points
            )
            
            logger.info(f"Stored {len(points)} embeddings successfully. Operation ID: {operation_info.operation_id}")
            return point_ids
            
        except Exception as e:
            logger.error(f"Failed to store embeddings: {e}")
            raise
    
    def search_similar(
        self,
        query_vector: List[float],
        limit: int = 10,
        score_threshold: Optional[float] = None,
        filter_conditions: Optional[Dict[str, Any]] = None
    ) -> List[SearchResult]:
        """Search for similar vectors.
        
        Args:
            query_vector: Query vector to search for
            limit: Maximum number of results to return
            score_threshold: Minimum similarity score threshold
            filter_conditions: Optional filter conditions
            
        Returns:
            List of search results
        """
        try:
            # Build filter if conditions provided
            search_filter = None
            if filter_conditions:
                conditions = []
                for key, value in filter_conditions.items():
                    if isinstance(value, list):
                        # Handle multiple values (OR condition)
                        for v in value:
                            conditions.append(
                                FieldCondition(key=key, match=MatchValue(value=v))
                            )
                    else:
                        conditions.append(
                            FieldCondition(key=key, match=MatchValue(value=value))
                        )
                
                if conditions:
                    search_filter = Filter(should=conditions) if len(conditions) > 1 else Filter(must=[conditions[0]])
            
            # Perform search
            search_results = self.client.search(
                collection_name=self.config.collection_name,
                query_vector=query_vector,
                limit=limit,
                score_threshold=score_threshold,
                query_filter=search_filter,
                with_payload=True,
                with_vectors=False  # Don't return vectors to save bandwidth
            )
            
            # Convert to SearchResult objects
            results = []
            for result in search_results:
                search_result = SearchResult(
                    id=str(result.id),
                    score=result.score,
                    payload=result.payload,
                    text=result.payload.get("text", "")
                )
                results.append(search_result)
            
            logger.info(f"Found {len(results)} similar vectors")
            return results
            
        except Exception as e:
            logger.error(f"Failed to search similar vectors: {e}")
            raise
    
    def delete_by_document_id(self, document_id: str) -> bool:
        """Delete all vectors for a specific document.
        
        Args:
            document_id: ID of the document to delete vectors for
            
        Returns:
            True if deletion was successful
        """
        try:
            # Delete points by filter
            operation_info = self.client.delete(
                collection_name=self.config.collection_name,
                points_selector=Filter(
                    must=[
                        FieldCondition(
                            key="document_id",
                            match=MatchValue(value=document_id)
                        )
                    ]
                )
            )
            
            logger.info(f"Deleted vectors for document {document_id}. Operation ID: {operation_info.operation_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete vectors for document {document_id}: {e}")
            return False
    
    def delete_by_point_ids(self, point_ids: List[str]) -> bool:
        """Delete specific points by their IDs.
        
        Args:
            point_ids: List of point IDs to delete
            
        Returns:
            True if deletion was successful
        """
        try:
            operation_info = self.client.delete(
                collection_name=self.config.collection_name,
                points_selector=point_ids
            )
            
            logger.info(f"Deleted {len(point_ids)} points. Operation ID: {operation_info.operation_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete points: {e}")
            return False
    
    def get_document_vectors(self, document_id: str) -> List[SearchResult]:
        """Get all vectors for a specific document.
        
        Args:
            document_id: ID of the document
            
        Returns:
            List of vectors for the document
        """
        try:
            # Search with very high limit and filter by document_id
            results = self.client.scroll(
                collection_name=self.config.collection_name,
                scroll_filter=Filter(
                    must=[
                        FieldCondition(
                            key="document_id",
                            match=MatchValue(value=document_id)
                        )
                    ]
                ),
                limit=10000,  # Large limit to get all chunks
                with_payload=True,
                with_vectors=False
            )
            
            search_results = []
            for point in results[0]:  # results is a tuple (points, next_page_offset)
                search_result = SearchResult(
                    id=str(point.id),
                    score=1.0,  # Not applicable for scroll
                    payload=point.payload,
                    text=point.payload.get("text", "")
                )
                search_results.append(search_result)
            
            logger.info(f"Found {len(search_results)} vectors for document {document_id}")
            return search_results
            
        except Exception as e:
            logger.error(f"Failed to get vectors for document {document_id}: {e}")
            raise
    
    def update_document_metadata(
        self, 
        document_id: str, 
        metadata_updates: Dict[str, Any]
    ) -> bool:
        """Update metadata for all vectors of a document.
        
        Args:
            document_id: ID of the document
            metadata_updates: Dictionary of metadata updates
            
        Returns:
            True if update was successful
        """
        try:
            # Get all points for the document
            points = self.get_document_vectors(document_id)
            
            if not points:
                logger.warning(f"No vectors found for document {document_id}")
                return False
            
            # Update each point
            for point in points:
                updated_payload = {**point.payload, **metadata_updates}
                
                self.client.set_payload(
                    collection_name=self.config.collection_name,
                    points=[point.id],
                    payload=updated_payload
                )
            
            logger.info(f"Updated metadata for {len(points)} vectors of document {document_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to update metadata for document {document_id}: {e}")
            return False
    
    def get_storage_stats(self) -> Dict[str, Any]:
        """Get storage statistics.
        
        Returns:
            Dictionary with storage statistics
        """
        try:
            collection_info = self.get_collection_info()
            
            # Get some sample points to analyze payload structure
            sample_points = self.client.scroll(
                collection_name=self.config.collection_name,
                limit=100,
                with_payload=True,
                with_vectors=False
            )[0]
            
            # Analyze document types and models
            document_types = set()
            embedding_models = set()
            
            for point in sample_points:
                payload = point.payload
                document_types.add(payload.get("document_type", "unknown"))
                embedding_models.add(payload.get("embedding_model", "unknown"))
            
            return {
                **collection_info,
                "sample_size": len(sample_points),
                "document_types": list(document_types),
                "embedding_models": list(embedding_models),
                "collection_size_mb": collection_info["points_count"] * self.config.vector_size * 4 / (1024 * 1024)  # Rough estimate
            }
            
        except Exception as e:
            logger.error(f"Failed to get storage stats: {e}")
            raise 