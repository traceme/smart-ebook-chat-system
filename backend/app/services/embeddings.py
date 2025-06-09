"""
Embedding generation service for vector indexing.

This module provides functionality to generate embeddings from text chunks
using OpenAI's text-embedding-3 model with rate limiting and caching.
"""

import asyncio
import hashlib
import time
from typing import List, Dict, Any, Optional, Tuple
from openai import AsyncOpenAI
import redis
import json
import logging
from pydantic import BaseModel

from app.core.config import settings
from app.services.chunking import DocumentChunk

logger = logging.getLogger(__name__)


class EmbeddingModel(BaseModel):
    """Embedding model configuration."""
    name: str = "text-embedding-3-small"
    dimensions: int = 1536
    max_tokens: int = 8191
    cost_per_1k_tokens: float = 0.00002  # $0.02 per 1M tokens


class EmbeddingConfig(BaseModel):
    """Configuration for embedding generation."""
    model: EmbeddingModel = EmbeddingModel()
    batch_size: int = 100  # Number of chunks to process in parallel
    max_retries: int = 3
    retry_delay: float = 1.0  # Initial retry delay in seconds
    cache_ttl: int = 86400 * 7  # Cache TTL in seconds (7 days)
    rate_limit_rpm: int = 500  # Requests per minute
    enable_caching: bool = True


class EmbeddingResult(BaseModel):
    """Result of embedding generation."""
    embedding: List[float]
    text: str
    token_count: int
    model: str
    cached: bool = False


class EmbeddingService:
    """Service for generating embeddings from text chunks."""
    
    def __init__(self, config: Optional[EmbeddingConfig] = None):
        """Initialize the embedding service.
        
        Args:
            config: Configuration for embedding behavior
        """
        self.config = config or EmbeddingConfig()
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        
        # Initialize Redis for caching if enabled
        self.redis_client = None
        if self.config.enable_caching:
            try:
                self.redis_client = redis.Redis(
                    host=settings.REDIS_HOST,
                    port=settings.REDIS_PORT,
                    db=1,  # Use different DB for embeddings cache
                    decode_responses=True
                )
                # Test connection
                self.redis_client.ping()
                logger.info("Redis connection established for embedding cache")
            except Exception as e:
                logger.warning(f"Failed to connect to Redis for caching: {e}")
                self.redis_client = None
        
        # Rate limiting
        self.request_times: List[float] = []
        self.request_lock = asyncio.Lock()
    
    def _get_cache_key(self, text: str, model: str) -> str:
        """Generate cache key for text and model.
        
        Args:
            text: Text content
            model: Model name
            
        Returns:
            Cache key
        """
        content_hash = hashlib.sha256(text.encode()).hexdigest()
        return f"embedding:{model}:{content_hash}"
    
    async def _get_cached_embedding(self, text: str, model: str) -> Optional[List[float]]:
        """Get cached embedding if available.
        
        Args:
            text: Text content
            model: Model name
            
        Returns:
            Cached embedding or None
        """
        if not self.redis_client:
            return None
        
        try:
            cache_key = self._get_cache_key(text, model)
            cached_result = self.redis_client.get(cache_key)
            if cached_result:
                return json.loads(cached_result)
        except Exception as e:
            logger.warning(f"Failed to get cached embedding: {e}")
        
        return None
    
    async def _cache_embedding(self, text: str, model: str, embedding: List[float]) -> None:
        """Cache embedding result.
        
        Args:
            text: Text content
            model: Model name
            embedding: Embedding vector
        """
        if not self.redis_client:
            return
        
        try:
            cache_key = self._get_cache_key(text, model)
            self.redis_client.setex(
                cache_key, 
                self.config.cache_ttl, 
                json.dumps(embedding)
            )
        except Exception as e:
            logger.warning(f"Failed to cache embedding: {e}")
    
    async def _apply_rate_limit(self) -> None:
        """Apply rate limiting to respect API limits."""
        async with self.request_lock:
            current_time = time.time()
            
            # Remove requests older than 1 minute
            self.request_times = [
                t for t in self.request_times 
                if current_time - t < 60
            ]
            
            # Check if we need to wait
            if len(self.request_times) >= self.config.rate_limit_rpm:
                oldest_request = min(self.request_times)
                wait_time = 60 - (current_time - oldest_request)
                if wait_time > 0:
                    logger.info(f"Rate limit reached, waiting {wait_time:.2f} seconds")
                    await asyncio.sleep(wait_time)
            
            # Record this request
            self.request_times.append(current_time)
    
    async def generate_embedding(
        self, 
        text: str, 
        model: Optional[str] = None
    ) -> EmbeddingResult:
        """Generate embedding for a single text.
        
        Args:
            text: Text to generate embedding for
            model: Model name (uses default if not specified)
            
        Returns:
            Embedding result
        """
        model = model or self.config.model.name
        
        # Check cache first
        cached_embedding = await self._get_cached_embedding(text, model)
        if cached_embedding:
            return EmbeddingResult(
                embedding=cached_embedding,
                text=text,
                token_count=len(text.split()),  # Rough estimate
                model=model,
                cached=True
            )
        
        # Apply rate limiting
        await self._apply_rate_limit()
        
        # Generate embedding with retries
        for attempt in range(self.config.max_retries):
            try:
                response = await self.client.embeddings.create(
                    input=text,
                    model=model
                )
                
                embedding = response.data[0].embedding
                token_count = response.usage.total_tokens
                
                # Cache the result
                await self._cache_embedding(text, model, embedding)
                
                return EmbeddingResult(
                    embedding=embedding,
                    text=text,
                    token_count=token_count,
                    model=model,
                    cached=False
                )
                
            except Exception as e:
                logger.warning(f"Embedding generation attempt {attempt + 1} failed: {e}")
                if attempt < self.config.max_retries - 1:
                    wait_time = self.config.retry_delay * (2 ** attempt)
                    await asyncio.sleep(wait_time)
                else:
                    raise
    
    async def generate_embeddings_batch(
        self,
        texts: List[str],
        model: Optional[str] = None
    ) -> List[EmbeddingResult]:
        """Generate embeddings for multiple texts in batches.
        
        Args:
            texts: List of texts to generate embeddings for
            model: Model name (uses default if not specified)
            
        Returns:
            List of embedding results
        """
        model = model or self.config.model.name
        results = []
        
        # Process in batches
        for i in range(0, len(texts), self.config.batch_size):
            batch = texts[i:i + self.config.batch_size]
            
            # Generate embeddings for batch concurrently
            batch_tasks = [
                self.generate_embedding(text, model) 
                for text in batch
            ]
            
            batch_results = await asyncio.gather(*batch_tasks)
            results.extend(batch_results)
            
            # Log progress
            logger.info(f"Generated embeddings for {len(results)}/{len(texts)} texts")
        
        return results
    
    async def generate_embeddings_for_chunks(
        self,
        chunks: List[DocumentChunk],
        model: Optional[str] = None
    ) -> List[Tuple[DocumentChunk, EmbeddingResult]]:
        """Generate embeddings for document chunks.
        
        Args:
            chunks: List of document chunks
            model: Model name (uses default if not specified)
            
        Returns:
            List of tuples containing (chunk, embedding_result)
        """
        texts = [chunk.text for chunk in chunks]
        embedding_results = await self.generate_embeddings_batch(texts, model)
        
        return list(zip(chunks, embedding_results))
    
    def estimate_cost(self, total_tokens: int, model: Optional[str] = None) -> float:
        """Estimate the cost of generating embeddings.
        
        Args:
            total_tokens: Total number of tokens to process
            model: Model name (uses default if not specified)
            
        Returns:
            Estimated cost in USD
        """
        model_config = self.config.model
        if model and model != model_config.name:
            # Default cost estimation for unknown models
            cost_per_1k = 0.0001
        else:
            cost_per_1k = model_config.cost_per_1k_tokens
        
        return (total_tokens / 1000) * cost_per_1k
    
    def get_embedding_stats(
        self, 
        results: List[EmbeddingResult]
    ) -> Dict[str, Any]:
        """Get statistics about embedding generation results.
        
        Args:
            results: List of embedding results
            
        Returns:
            Dictionary with embedding statistics
        """
        if not results:
            return {
                "total_embeddings": 0,
                "total_tokens": 0,
                "cached_count": 0,
                "cache_hit_rate": 0.0,
                "estimated_cost": 0.0,
                "avg_tokens_per_embedding": 0.0
            }
        
        total_tokens = sum(result.token_count for result in results)
        cached_count = sum(1 for result in results if result.cached)
        
        return {
            "total_embeddings": len(results),
            "total_tokens": total_tokens,
            "cached_count": cached_count,
            "cache_hit_rate": cached_count / len(results) * 100,
            "estimated_cost": self.estimate_cost(total_tokens),
            "avg_tokens_per_embedding": total_tokens / len(results),
            "model_used": results[0].model if results else None,
            "embedding_dimensions": len(results[0].embedding) if results else 0
        } 