"""
Context Window Construction Service

This module handles the construction of context windows from search results
for LLM processing, including context length management and source preservation.
"""

import logging
import re
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
import tiktoken

logger = logging.getLogger(__name__)

@dataclass
class ContextConfig:
    """Configuration for context window construction."""
    max_tokens: int = 4000  # Maximum tokens for context window
    model_name: str = "gpt-3.5-turbo"  # Model for token counting
    include_metadata: bool = True
    include_source_refs: bool = True
    chunk_separator: str = "\n\n---\n\n"
    reference_format: str = "[Source: {document_id}, Page: {page}, Chunk: {chunk_index}]"
    preserve_order: bool = True  # Preserve reranked order
    truncation_strategy: str = "balanced"  # "balanced", "top_only", "summary"

@dataclass
class ContextChunk:
    """Represents a chunk of context with metadata."""
    text: str
    source_reference: str
    tokens: int
    relevance_score: float
    metadata: Dict[str, Any]

@dataclass
class ContextWindow:
    """Constructed context window for LLM processing."""
    context: str
    total_tokens: int
    chunks_included: int
    chunks_truncated: int
    source_references: List[str]
    metadata: Dict[str, Any]

class ContextConstructionService:
    """Service for constructing context windows from search results."""
    
    def __init__(self, config: Optional[ContextConfig] = None):
        """Initialize the context construction service."""
        self.config = config or ContextConfig()
        self.tokenizer = tiktoken.encoding_for_model(self.config.model_name)
        
    def _count_tokens(self, text: str) -> int:
        """Count tokens in text using the tokenizer."""
        try:
            return len(self.tokenizer.encode(text))
        except Exception as e:
            logger.warning(f"Token counting failed, using estimate: {e}")
            return len(text) // 4  # Rough estimate
    
    def _extract_page_reference(self, metadata: Dict[str, Any]) -> str:
        """Extract page reference from metadata."""
        # Try to extract page information from various metadata fields
        page_info = []
        
        if "page_number" in metadata:
            page_info.append(f"p.{metadata['page_number']}")
        elif "page" in metadata:
            page_info.append(f"p.{metadata['page']}")
        elif "start_page" in metadata and "end_page" in metadata:
            if metadata["start_page"] == metadata["end_page"]:
                page_info.append(f"p.{metadata['start_page']}")
            else:
                page_info.append(f"pp.{metadata['start_page']}-{metadata['end_page']}")
        
        # Add section information if available
        if "section" in metadata:
            page_info.append(f"sec.{metadata['section']}")
        elif "chapter" in metadata:
            page_info.append(f"ch.{metadata['chapter']}")
            
        return ", ".join(page_info) if page_info else "unknown"
    
    def _format_source_reference(self, metadata: Dict[str, Any]) -> str:
        """Format source reference from metadata."""
        doc_id = metadata.get("document_id", "unknown")
        page_ref = self._extract_page_reference(metadata)
        chunk_idx = metadata.get("chunk_index", "unknown")
        
        # Try to get document title if available
        doc_title = metadata.get("document_title", metadata.get("title", ""))
        if doc_title:
            doc_ref = f"{doc_title} ({doc_id[:8]}...)"
        else:
            doc_ref = f"Doc {doc_id[:8]}..."
        
        return f"[Source: {doc_ref}, {page_ref}, Chunk: {chunk_idx}]"
    
    def _prepare_chunks(self, search_results: List[Dict[str, Any]]) -> List[ContextChunk]:
        """Prepare context chunks from search results."""
        chunks = []
        
        for result in search_results:
            text = result.get("text", "")
            if not text.strip():
                continue
                
            # Format source reference
            source_ref = ""
            if self.config.include_source_refs:
                source_ref = self._format_source_reference(result)
            
            # Prepare chunk text
            chunk_text = text.strip()
            if source_ref:
                chunk_text = f"{chunk_text}\n{source_ref}"
            
            # Count tokens
            tokens = self._count_tokens(chunk_text)
            
            chunk = ContextChunk(
                text=chunk_text,
                source_reference=source_ref,
                tokens=tokens,
                relevance_score=result.get("score", result.get("rerank_score", 0.0)),
                metadata=result
            )
            chunks.append(chunk)
        
        return chunks
    
    def _truncate_balanced(self, chunks: List[ContextChunk], available_tokens: int) -> Tuple[List[ContextChunk], int]:
        """Truncate chunks using balanced strategy."""
        if not chunks:
            return [], 0
            
        included_chunks = []
        used_tokens = 0
        truncated_count = 0
        
        # First pass: include complete chunks that fit
        for chunk in chunks:
            if used_tokens + chunk.tokens <= available_tokens:
                included_chunks.append(chunk)
                used_tokens += chunk.tokens
                if len(included_chunks) > 0:
                    used_tokens += len(self.config.chunk_separator)
            else:
                truncated_count += 1
        
        # Second pass: try to include partial content from next chunk if space available
        if included_chunks and truncated_count > 0 and chunks[len(included_chunks):]:
            remaining_tokens = available_tokens - used_tokens
            next_chunk = chunks[len(included_chunks)]
            
            if remaining_tokens > 100:  # Only if we have reasonable space
                # Try to include partial text
                words = next_chunk.text.split()
                partial_text = ""
                partial_tokens = 0
                
                for word in words:
                    test_text = partial_text + " " + word if partial_text else word
                    test_tokens = self._count_tokens(test_text)
                    
                    if partial_tokens + test_tokens <= remaining_tokens - 10:  # Leave some buffer
                        partial_text = test_text
                        partial_tokens = test_tokens
                    else:
                        break
                
                if partial_text and len(partial_text) > 50:  # Only if we got meaningful content
                    partial_chunk = ContextChunk(
                        text=partial_text + "...",
                        source_reference=next_chunk.source_reference,
                        tokens=partial_tokens,
                        relevance_score=next_chunk.relevance_score,
                        metadata=next_chunk.metadata
                    )
                    included_chunks.append(partial_chunk)
                    used_tokens += partial_tokens
        
        return included_chunks, truncated_count
    
    def _truncate_top_only(self, chunks: List[ContextChunk], available_tokens: int) -> Tuple[List[ContextChunk], int]:
        """Truncate chunks using top-only strategy."""
        included_chunks = []
        used_tokens = 0
        
        for chunk in chunks:
            if used_tokens + chunk.tokens <= available_tokens:
                included_chunks.append(chunk)
                used_tokens += chunk.tokens
                if len(included_chunks) > 1:
                    used_tokens += len(self.config.chunk_separator)
            else:
                break
        
        truncated_count = len(chunks) - len(included_chunks)
        return included_chunks, truncated_count
    
    def construct_context_window(
        self,
        search_results: List[Dict[str, Any]],
        query: Optional[str] = None
    ) -> ContextWindow:
        """
        Construct a context window from search results.
        
        Args:
            search_results: List of search results (preferably reranked)
            query: Original search query for context
            
        Returns:
            Constructed context window
        """
        if not search_results:
            return ContextWindow(
                context="",
                total_tokens=0,
                chunks_included=0,
                chunks_truncated=0,
                source_references=[],
                metadata={"query": query}
            )
        
        # Prepare chunks
        chunks = self._prepare_chunks(search_results)
        
        # Calculate available tokens (reserve some for query and formatting)
        reserved_tokens = 200 if query else 100
        available_tokens = self.config.max_tokens - reserved_tokens
        
        # Apply truncation strategy
        if self.config.truncation_strategy == "balanced":
            included_chunks, truncated_count = self._truncate_balanced(chunks, available_tokens)
        elif self.config.truncation_strategy == "top_only":
            included_chunks, truncated_count = self._truncate_top_only(chunks, available_tokens)
        else:
            # Default to top_only
            included_chunks, truncated_count = self._truncate_top_only(chunks, available_tokens)
        
        # Construct final context
        context_parts = []
        
        if query:
            context_parts.append(f"Query: {query}\n")
        
        context_parts.append("Relevant Information:")
        
        chunk_texts = [chunk.text for chunk in included_chunks]
        context_content = self.config.chunk_separator.join(chunk_texts)
        context_parts.append(context_content)
        
        final_context = "\n".join(context_parts)
        
        # Collect source references
        source_refs = [chunk.source_reference for chunk in included_chunks if chunk.source_reference]
        
        # Final token count
        total_tokens = self._count_tokens(final_context)
        
        # Metadata
        metadata = {
            "query": query,
            "truncation_strategy": self.config.truncation_strategy,
            "total_input_chunks": len(chunks),
            "avg_relevance_score": sum(chunk.relevance_score for chunk in included_chunks) / len(included_chunks) if included_chunks else 0.0,
            "unique_documents": len(set(chunk.metadata.get("document_id") for chunk in included_chunks))
        }
        
        return ContextWindow(
            context=final_context,
            total_tokens=total_tokens,
            chunks_included=len(included_chunks),
            chunks_truncated=truncated_count,
            source_references=source_refs,
            metadata=metadata
        )
    
    def extract_references(self, search_results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Extract and format references from search results."""
        references = []
        seen_docs = set()
        
        for result in search_results:
            doc_id = result.get("document_id")
            if not doc_id or doc_id in seen_docs:
                continue
                
            seen_docs.add(doc_id)
            
            reference = {
                "document_id": doc_id,
                "document_title": result.get("document_title", result.get("title", "Unknown Document")),
                "page_reference": self._extract_page_reference(result),
                "relevance_score": result.get("score", result.get("rerank_score", 0.0)),
                "chunk_count": 1  # Count chunks from this document
            }
            
            # Count additional chunks from same document
            for other_result in search_results:
                if (other_result.get("document_id") == doc_id and 
                    other_result != result):
                    reference["chunk_count"] += 1
            
            references.append(reference)
        
        # Sort by relevance score
        references.sort(key=lambda x: x["relevance_score"], reverse=True)
        
        return references 