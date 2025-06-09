"""
BGE Reranker Service

This module provides reranking functionality using BGE (BAAI General Embedding) models
to improve the relevance order of search results.
"""

import logging
import time
from typing import List, Dict, Any, Tuple, Optional
from dataclasses import dataclass
from sentence_transformers import CrossEncoder
import asyncio
from concurrent.futures import ThreadPoolExecutor
import hashlib

logger = logging.getLogger(__name__)

@dataclass
class RerankerConfig:
    """Configuration for the BGE reranker."""
    model_name: str = "BAAI/bge-reranker-base"
    max_length: int = 512
    batch_size: int = 32
    device: str = "cpu"  # or "cuda" if GPU available
    cache_enabled: bool = True
    
@dataclass 
class RerankResult:
    """Result from reranking operation."""
    original_index: int
    rerank_score: float
    passage: str
    metadata: Dict[str, Any]

class BGERerankerService:
    """Service for reranking search results using BGE models."""
    
    def __init__(self, config: Optional[RerankerConfig] = None):
        """Initialize the reranker service."""
        self.config = config or RerankerConfig()
        self.model = None
        self.cache = {} if self.config.cache_enabled else None
        self.executor = ThreadPoolExecutor(max_workers=2)
        
    def _get_model(self):
        """Lazy load the reranker model."""
        if self.model is None:
            logger.info(f"Loading BGE reranker model: {self.config.model_name}")
            self.model = CrossEncoder(
                self.config.model_name,
                max_length=self.config.max_length,
                device=self.config.device
            )
            logger.info("BGE reranker model loaded successfully")
        return self.model
        
    def _get_cache_key(self, query: str, passage: str) -> str:
        """Generate cache key for query-passage pair."""
        combined = f"{query}|||{passage}"
        return hashlib.md5(combined.encode()).hexdigest()
        
    def _compute_scores(self, query: str, passages: List[str]) -> List[float]:
        """Compute reranking scores for query-passage pairs."""
        model = self._get_model()
        
        # Prepare input pairs
        pairs = [(query, passage) for passage in passages]
        
        # Check cache for existing scores
        if self.cache is not None:
            cached_scores = []
            uncached_pairs = []
            uncached_indices = []
            
            for i, (q, p) in enumerate(pairs):
                cache_key = self._get_cache_key(q, p)
                if cache_key in self.cache:
                    cached_scores.append((i, self.cache[cache_key]))
                else:
                    uncached_pairs.append((q, p))
                    uncached_indices.append(i)
            
            # Compute scores for uncached pairs
            if uncached_pairs:
                uncached_scores = model.predict(uncached_pairs)
                
                # Cache the new scores
                for (q, p), score in zip(uncached_pairs, uncached_scores):
                    cache_key = self._get_cache_key(q, p)
                    self.cache[cache_key] = float(score)
            else:
                uncached_scores = []
            
            # Combine cached and uncached scores
            all_scores = [0.0] * len(pairs)
            for i, score in cached_scores:
                all_scores[i] = score
            for i, score in zip(uncached_indices, uncached_scores):
                all_scores[i] = float(score)
                
            return all_scores
        else:
            # No caching, compute all scores
            scores = model.predict(pairs)
            return [float(score) for score in scores]
    
    async def rerank_async(
        self,
        query: str,
        search_results: List[Dict[str, Any]],
        top_k: Optional[int] = None
    ) -> List[RerankResult]:
        """
        Asynchronously rerank search results based on query relevance.
        
        Args:
            query: Search query
            search_results: List of search results with text content
            top_k: Number of top results to return (None for all)
            
        Returns:
            List of reranked results ordered by relevance score
        """
        if not search_results:
            return []
            
        start_time = time.time()
        
        # Extract passages from search results
        passages = []
        for result in search_results:
            text = result.get('text', result.get('content', ''))
            if not text:
                logger.warning(f"Empty text in search result: {result}")
                text = ""
            passages.append(text)
        
        # Compute reranking scores in thread pool
        loop = asyncio.get_event_loop()
        scores = await loop.run_in_executor(
            self.executor,
            self._compute_scores,
            query,
            passages
        )
        
        # Create rerank results
        rerank_results = []
        for i, (result, score) in enumerate(zip(search_results, scores)):
            rerank_result = RerankResult(
                original_index=i,
                rerank_score=score,
                passage=passages[i],
                metadata=result
            )
            rerank_results.append(rerank_result)
        
        # Sort by rerank score (descending)
        rerank_results.sort(key=lambda x: x.rerank_score, reverse=True)
        
        # Apply top_k limit if specified
        if top_k is not None:
            rerank_results = rerank_results[:top_k]
        
        end_time = time.time()
        logger.info(
            f"Reranked {len(search_results)} results in {(end_time - start_time):.3f}s"
        )
        
        return rerank_results
    
    def rerank(
        self,
        query: str,
        search_results: List[Dict[str, Any]],
        top_k: Optional[int] = None
    ) -> List[RerankResult]:
        """
        Synchronous wrapper for reranking.
        
        Args:
            query: Search query
            search_results: List of search results with text content
            top_k: Number of top results to return (None for all)
            
        Returns:
            List of reranked results ordered by relevance score
        """
        return asyncio.run(self.rerank_async(query, search_results, top_k))
    
    def get_reranking_stats(self, rerank_results: List[RerankResult]) -> Dict[str, Any]:
        """Get statistics about the reranking operation."""
        if not rerank_results:
            return {
                "total_results": 0,
                "avg_score": 0.0,
                "max_score": 0.0,
                "min_score": 0.0,
                "score_distribution": {}
            }
        
        scores = [result.rerank_score for result in rerank_results]
        
        # Score distribution buckets
        buckets = {"0.0-0.2": 0, "0.2-0.4": 0, "0.4-0.6": 0, "0.6-0.8": 0, "0.8-1.0": 0}
        for score in scores:
            if score < 0.2:
                buckets["0.0-0.2"] += 1
            elif score < 0.4:
                buckets["0.2-0.4"] += 1
            elif score < 0.6:
                buckets["0.4-0.6"] += 1
            elif score < 0.8:
                buckets["0.6-0.8"] += 1
            else:
                buckets["0.8-1.0"] += 1
        
        return {
            "total_results": len(rerank_results),
            "avg_score": sum(scores) / len(scores),
            "max_score": max(scores),
            "min_score": min(scores),
            "score_distribution": buckets,
            "cache_size": len(self.cache) if self.cache else 0
        }
    
    def clear_cache(self):
        """Clear the reranking cache."""
        if self.cache:
            self.cache.clear()
            logger.info("Reranker cache cleared")
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get statistics about the reranking cache."""
        if not self.cache:
            return {"cache_enabled": False}
            
        return {
            "cache_enabled": True,
            "cache_size": len(self.cache),
            "cache_keys": list(self.cache.keys())[:10]  # Show first 10 keys
        } 