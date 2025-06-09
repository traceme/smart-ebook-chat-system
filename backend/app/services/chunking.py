"""
Document chunking service for vector indexing.

This module provides functionality to split documents into chunks of appropriate
size for embedding generation while maintaining semantic integrity.
"""

import tiktoken
from typing import List, Dict, Any, Optional
from langchain_text_splitters import RecursiveCharacterTextSplitter, MarkdownTextSplitter
from pydantic import BaseModel


class DocumentChunk(BaseModel):
    """Document chunk model."""
    text: str
    chunk_index: int
    start_char: int
    end_char: int
    token_count: int
    metadata: Dict[str, Any]


class ChunkingConfig(BaseModel):
    """Configuration for document chunking."""
    chunk_size: int = 1500  # Target chunk size in tokens
    chunk_overlap: int = 200  # Overlap between chunks in tokens
    max_chunk_size: int = 2000  # Maximum chunk size in tokens
    min_chunk_size: int = 100  # Minimum chunk size in tokens
    encoding_model: str = "text-embedding-3-small"  # Model for token counting


class DocumentChunkingService:
    """Service for chunking documents into embedding-ready segments."""
    
    def __init__(self, config: Optional[ChunkingConfig] = None):
        """Initialize the chunking service.
        
        Args:
            config: Configuration for chunking behavior
        """
        self.config = config or ChunkingConfig()
        self.tokenizer = tiktoken.encoding_for_model("gpt-4o")  # Use GPT-4 tokenizer for consistency
        
        # Configure text splitter
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=self._estimate_char_count(self.config.chunk_size),
            chunk_overlap=self._estimate_char_count(self.config.chunk_overlap),
            separators=["\n\n", "\n", ". ", "! ", "? ", "; ", ", ", " ", ""],
            keep_separator=True,
            is_separator_regex=False,
        )
        
        # Configure markdown splitter for markdown documents
        self.markdown_splitter = MarkdownTextSplitter(
            chunk_size=self._estimate_char_count(self.config.chunk_size),
            chunk_overlap=self._estimate_char_count(self.config.chunk_overlap),
        )
    
    def _estimate_char_count(self, token_count: int) -> int:
        """Estimate character count from token count.
        
        Args:
            token_count: Number of tokens
            
        Returns:
            Estimated character count (approximately 4 chars per token)
        """
        return token_count * 4
    
    def count_tokens(self, text: str) -> int:
        """Count tokens in text using the configured tokenizer.
        
        Args:
            text: Text to count tokens for
            
        Returns:
            Number of tokens
        """
        return len(self.tokenizer.encode(text))
    
    def chunk_text(
        self, 
        text: str, 
        document_id: str,
        document_type: str = "text",
        additional_metadata: Optional[Dict[str, Any]] = None
    ) -> List[DocumentChunk]:
        """Chunk text into embedding-ready segments.
        
        Args:
            text: Text content to chunk
            document_id: ID of the source document
            document_type: Type of document (text, markdown, etc.)
            additional_metadata: Additional metadata to include with chunks
            
        Returns:
            List of document chunks
        """
        if not text.strip():
            return []
        
        # Choose splitter based on document type
        if document_type.lower() in ["markdown", "md"]:
            splitter = self.markdown_splitter
        else:
            splitter = self.text_splitter
        
        # Split text into chunks
        text_chunks = splitter.split_text(text)
        
        # Create document chunks with metadata
        chunks = []
        current_char_position = 0
        
        for i, chunk_text in enumerate(text_chunks):
            # Count tokens for this chunk
            token_count = self.count_tokens(chunk_text)
            
            # Skip chunks that are too small or too large
            if token_count < self.config.min_chunk_size:
                current_char_position += len(chunk_text)
                continue
            
            if token_count > self.config.max_chunk_size:
                # Further split large chunks
                sub_chunks = self._split_large_chunk(chunk_text, token_count)
                for j, sub_chunk in enumerate(sub_chunks):
                    sub_token_count = self.count_tokens(sub_chunk)
                    
                    # Create metadata
                    metadata = {
                        "document_id": document_id,
                        "document_type": document_type,
                        "is_sub_chunk": True,
                        "parent_chunk_index": i,
                        "sub_chunk_index": j,
                        **(additional_metadata or {})
                    }
                    
                    chunk = DocumentChunk(
                        text=sub_chunk.strip(),
                        chunk_index=len(chunks),
                        start_char=current_char_position,
                        end_char=current_char_position + len(sub_chunk),
                        token_count=sub_token_count,
                        metadata=metadata
                    )
                    chunks.append(chunk)
                    current_char_position += len(sub_chunk)
            else:
                # Create metadata
                metadata = {
                    "document_id": document_id,
                    "document_type": document_type,
                    "is_sub_chunk": False,
                    **(additional_metadata or {})
                }
                
                chunk = DocumentChunk(
                    text=chunk_text.strip(),
                    chunk_index=len(chunks),
                    start_char=current_char_position,
                    end_char=current_char_position + len(chunk_text),
                    token_count=token_count,
                    metadata=metadata
                )
                chunks.append(chunk)
                current_char_position += len(chunk_text)
        
        return chunks
    
    def _split_large_chunk(self, text: str, token_count: int) -> List[str]:
        """Split a chunk that's too large into smaller pieces.
        
        Args:
            text: Text to split
            token_count: Current token count
            
        Returns:
            List of smaller text chunks
        """
        # Calculate how many sub-chunks we need
        num_chunks = (token_count // self.config.chunk_size) + 1
        
        # Use a more aggressive splitter for large chunks
        aggressive_splitter = RecursiveCharacterTextSplitter(
            chunk_size=len(text) // num_chunks,
            chunk_overlap=self._estimate_char_count(self.config.chunk_overlap // 2),
            separators=["\n\n", "\n", ". ", "! ", "? ", "; ", ", ", " ", ""],
            keep_separator=True,
        )
        
        return aggressive_splitter.split_text(text)
    
    def chunk_markdown_document(
        self,
        markdown_content: str,
        document_id: str,
        additional_metadata: Optional[Dict[str, Any]] = None
    ) -> List[DocumentChunk]:
        """Chunk a markdown document while preserving structure.
        
        Args:
            markdown_content: Markdown content to chunk
            document_id: ID of the source document
            additional_metadata: Additional metadata to include
            
        Returns:
            List of document chunks
        """
        return self.chunk_text(
            text=markdown_content,
            document_id=document_id,
            document_type="markdown",
            additional_metadata=additional_metadata
        )
    
    def get_chunking_stats(self, chunks: List[DocumentChunk]) -> Dict[str, Any]:
        """Get statistics about the chunking results.
        
        Args:
            chunks: List of document chunks
            
        Returns:
            Dictionary with chunking statistics
        """
        if not chunks:
            return {
                "total_chunks": 0,
                "avg_token_count": 0,
                "min_token_count": 0,
                "max_token_count": 0,
                "total_characters": 0,
                "avg_character_count": 0
            }
        
        token_counts = [chunk.token_count for chunk in chunks]
        char_counts = [len(chunk.text) for chunk in chunks]
        
        return {
            "total_chunks": len(chunks),
            "avg_token_count": sum(token_counts) / len(token_counts),
            "min_token_count": min(token_counts),
            "max_token_count": max(token_counts),
            "total_characters": sum(char_counts),
            "avg_character_count": sum(char_counts) / len(char_counts),
            "chunks_within_limits": sum(
                1 for count in token_counts 
                if self.config.min_chunk_size <= count <= self.config.max_chunk_size
            ),
            "percentage_within_limits": (
                sum(
                    1 for count in token_counts 
                    if self.config.min_chunk_size <= count <= self.config.max_chunk_size
                ) / len(token_counts) * 100
            )
        } 