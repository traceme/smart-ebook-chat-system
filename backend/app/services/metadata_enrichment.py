"""
Document metadata extraction and enrichment service.

This module provides comprehensive metadata extraction from documents
and enriches it with additional analysis and processing information.
"""

import logging
import hashlib
from datetime import datetime
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass, asdict
import json

from pydantic import BaseModel

logger = logging.getLogger(__name__)


@dataclass
class DocumentMetadata:
    """Comprehensive document metadata structure."""
    
    # Basic file information
    filename: str
    original_filename: str
    file_size: int
    file_hash: str
    mime_type: str
    detected_format: str
    
    # Content analysis
    content_length: int
    character_count: int
    word_count: int
    line_count: int
    paragraph_count: Optional[int] = None
    
    # Processing information
    extraction_method: str
    extraction_timestamp: str
    preprocessing_applied: List[str] = None
    
    # Format-specific metadata
    format_metadata: Dict[str, Any] = None
    
    # Content structure analysis
    structure_analysis: Dict[str, Any] = None
    
    # Language and encoding
    detected_language: Optional[str] = None
    encoding: Optional[str] = None
    
    # Quality metrics
    quality_score: float = 0.0
    quality_warnings: List[str] = None
    
    # Document properties (title, author, etc.)
    document_properties: Dict[str, Any] = None


class MetadataEnrichmentConfig(BaseModel):
    """Configuration for metadata enrichment."""
    
    # Analysis options
    analyze_structure: bool = True
    detect_language: bool = True
    calculate_quality_score: bool = True
    extract_keywords: bool = False
    
    # Content analysis
    analyze_headings: bool = True
    analyze_tables: bool = True
    analyze_lists: bool = True
    count_paragraphs: bool = True
    
    # Performance options
    max_content_analysis: int = 50000  # Max chars to analyze for structure
    enable_caching: bool = True


class DocumentMetadataExtractor:
    """Service for extracting and enriching document metadata."""
    
    def __init__(self, config: Optional[MetadataEnrichmentConfig] = None):
        """Initialize metadata extractor."""
        self.config = config or MetadataEnrichmentConfig()
    
    def extract_metadata(
        self,
        file_content: bytes,
        extracted_text: str,
        filename: str,
        format_detection_result: Any,
        extraction_result: Any,
        preprocessing_result: Optional[Any] = None
    ) -> DocumentMetadata:
        """
        Extract comprehensive metadata from document and processing results.
        
        Args:
            file_content: Original file binary content
            extracted_text: Extracted text content
            filename: Original filename
            format_detection_result: Result from format detection
            extraction_result: Result from text extraction
            preprocessing_result: Optional preprocessing result
            
        Returns:
            DocumentMetadata with comprehensive information
        """
        try:
            logger.info(f"Extracting metadata for document: {filename}")
            
            # Basic file information
            file_hash = hashlib.sha256(file_content).hexdigest()
            file_size = len(file_content)
            
            # Content analysis
            content_analysis = self._analyze_content(extracted_text)
            
            # Structure analysis
            structure_analysis = None
            if self.config.analyze_structure:
                structure_analysis = self._analyze_structure(extracted_text)
            
            # Language detection
            detected_language = None
            if self.config.detect_language:
                detected_language = self._detect_language(extracted_text)
            
            # Quality scoring
            quality_score = 0.0
            quality_warnings = []
            if self.config.calculate_quality_score:
                quality_score, quality_warnings = self._calculate_quality_score(
                    extracted_text, format_detection_result, extraction_result
                )
            
            # Format-specific metadata
            format_metadata = self._extract_format_metadata(
                format_detection_result, extraction_result
            )
            
            # Document properties
            document_properties = self._extract_document_properties(
                extraction_result, format_detection_result
            )
            
            # Preprocessing information
            preprocessing_applied = []
            if preprocessing_result:
                preprocessing_applied = preprocessing_result.operations_applied or []
            
            # Create metadata object
            metadata = DocumentMetadata(
                filename=filename,
                original_filename=filename,
                file_size=file_size,
                file_hash=file_hash,
                mime_type=getattr(format_detection_result, 'mime_type', 'application/octet-stream'),
                detected_format=getattr(format_detection_result, 'detected_format', 'unknown'),
                content_length=len(extracted_text),
                character_count=content_analysis['character_count'],
                word_count=content_analysis['word_count'],
                line_count=content_analysis['line_count'],
                paragraph_count=content_analysis.get('paragraph_count'),
                extraction_method=getattr(extraction_result, 'extraction_method', 'unknown'),
                extraction_timestamp=datetime.utcnow().isoformat(),
                preprocessing_applied=preprocessing_applied,
                format_metadata=format_metadata,
                structure_analysis=structure_analysis,
                detected_language=detected_language,
                encoding=content_analysis.get('encoding'),
                quality_score=quality_score,
                quality_warnings=quality_warnings,
                document_properties=document_properties
            )
            
            logger.info(f"Metadata extraction completed for {filename}")
            return metadata
            
        except Exception as e:
            logger.error(f"Metadata extraction failed for {filename}: {e}")
            # Return minimal metadata on error
            return DocumentMetadata(
                filename=filename,
                original_filename=filename,
                file_size=len(file_content) if file_content else 0,
                file_hash=hashlib.sha256(file_content).hexdigest() if file_content else "",
                mime_type="application/octet-stream",
                detected_format="unknown",
                content_length=len(extracted_text),
                character_count=len(extracted_text),
                word_count=len(extracted_text.split()),
                line_count=extracted_text.count('\n') + 1,
                extraction_method="error",
                extraction_timestamp=datetime.utcnow().isoformat(),
                quality_warnings=[f"Metadata extraction failed: {e}"]
            )
    
    def _analyze_content(self, text: str) -> Dict[str, Any]:
        """Analyze content for basic metrics."""
        analysis = {
            'character_count': len(text),
            'word_count': len(text.split()),
            'line_count': text.count('\n') + 1,
            'whitespace_ratio': sum(1 for c in text if c.isspace()) / len(text) if text else 0
        }
        
        # Count paragraphs if enabled
        if self.config.count_paragraphs:
            paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]
            analysis['paragraph_count'] = len(paragraphs)
            analysis['avg_paragraph_length'] = sum(len(p) for p in paragraphs) / len(paragraphs) if paragraphs else 0
        
        # Basic encoding detection
        try:
            text.encode('utf-8')
            analysis['encoding'] = 'utf-8'
        except UnicodeEncodeError:
            analysis['encoding'] = 'unknown'
        
        return analysis
    
    def _analyze_structure(self, text: str) -> Dict[str, Any]:
        """Analyze document structure."""
        # Limit analysis to prevent performance issues
        analysis_text = text[:self.config.max_content_analysis] if len(text) > self.config.max_content_analysis else text
        
        structure = {
            'has_headings': False,
            'heading_count': 0,
            'has_lists': False,
            'list_count': 0,
            'has_tables': False,
            'table_count': 0,
            'has_code_blocks': False,
            'code_block_count': 0,
            'has_links': False,
            'link_count': 0
        }
        
        lines = analysis_text.split('\n')
        
        # Analyze headings
        if self.config.analyze_headings:
            heading_patterns = [
                r'^#{1,6}\s',  # Markdown headings
                r'^[A-Z][A-Z\s]+[A-Z]$',  # ALL CAPS headings
                r'^\d+\.\d*\s+[A-Z]',  # Numbered headings
            ]
            
            for line in lines:
                for pattern in heading_patterns:
                    import re
                    if re.match(pattern, line.strip()):
                        structure['has_headings'] = True
                        structure['heading_count'] += 1
                        break
        
        # Analyze lists
        if self.config.analyze_lists:
            list_patterns = [
                r'^\s*[-*+]\s',  # Bullet lists
                r'^\s*\d+\.\s',  # Numbered lists
            ]
            
            for line in lines:
                for pattern in list_patterns:
                    import re
                    if re.match(pattern, line.strip()):
                        structure['has_lists'] = True
                        structure['list_count'] += 1
                        break
        
        # Analyze tables
        if self.config.analyze_tables:
            for line in lines:
                if '|' in line and line.count('|') >= 2:
                    structure['has_tables'] = True
                    structure['table_count'] += 1
        
        # Analyze code blocks
        import re
        code_blocks = re.findall(r'```.*?```', analysis_text, re.DOTALL)
        if code_blocks:
            structure['has_code_blocks'] = True
            structure['code_block_count'] = len(code_blocks)
        
        # Analyze links
        links = re.findall(r'\[.*?\]\(.*?\)', analysis_text)
        if links:
            structure['has_links'] = True
            structure['link_count'] = len(links)
        
        return structure
    
    def _detect_language(self, text: str) -> Optional[str]:
        """Detect the language of the text content."""
        try:
            # Use langdetect if available
            from langdetect import detect, LangDetectException
            
            # Sample text for detection (first 1000 characters)
            sample_text = text[:1000] if len(text) > 1000 else text
            
            if len(sample_text.strip()) < 50:
                return None  # Not enough text for reliable detection
            
            detected_lang = detect(sample_text)
            return detected_lang
            
        except ImportError:
            logger.debug("langdetect not available, skipping language detection")
            return None
        except LangDetectException:
            logger.debug("Language detection failed")
            return None
        except Exception as e:
            logger.warning(f"Language detection error: {e}")
            return None
    
    def _calculate_quality_score(
        self, 
        text: str, 
        format_detection_result: Any, 
        extraction_result: Any
    ) -> tuple[float, List[str]]:
        """Calculate a quality score for the extracted content."""
        score = 0.0
        warnings = []
        
        # Base score components
        content_score = 0.0
        extraction_score = 0.0
        format_score = 0.0
        
        # Content quality (40% of total score)
        if text:
            content_length = len(text)
            word_count = len(text.split())
            
            # Length score (0-10)
            if content_length > 1000:
                content_score += 10
            elif content_length > 500:
                content_score += 7
            elif content_length > 100:
                content_score += 5
            else:
                content_score += 2
                warnings.append("Content is very short")
            
            # Word density score (0-10)
            if word_count > 0:
                avg_word_length = content_length / word_count
                if 3 <= avg_word_length <= 8:
                    content_score += 10
                elif 2 <= avg_word_length <= 10:
                    content_score += 7
                else:
                    content_score += 3
                    warnings.append("Unusual word length distribution")
            
            # Structure score (0-10)
            structure_score = 0
            if '\n' in text:
                structure_score += 3
            if '.' in text:
                structure_score += 3
            if any(char.isupper() for char in text):
                structure_score += 2
            if any(char.islower() for char in text):
                structure_score += 2
            
            content_score += structure_score
            
            # Character issues (deductions)
            replacement_chars = text.count('�')
            if replacement_chars > 0:
                content_score -= min(replacement_chars * 2, 10)
                warnings.append(f"Found {replacement_chars} replacement characters")
        
        content_score = min(max(content_score, 0), 30)  # 0-30 range
        
        # Extraction quality (30% of total score)
        if hasattr(extraction_result, 'success') and extraction_result.success:
            extraction_score += 15
            
            # Method quality bonus
            method = getattr(extraction_result, 'extraction_method', '')
            if 'fallback' not in method.lower():
                extraction_score += 10
            elif 'markitdown' in method.lower():
                extraction_score += 5
            
            # Warnings penalty
            if hasattr(extraction_result, 'warnings') and extraction_result.warnings:
                extraction_score -= len(extraction_result.warnings) * 2
                warnings.extend(extraction_result.warnings)
        else:
            warnings.append("Text extraction failed or was unsuccessful")
        
        extraction_score = min(max(extraction_score, 0), 30)  # 0-30 range
        
        # Format detection quality (30% of total score)
        if hasattr(format_detection_result, 'confidence_score'):
            confidence = format_detection_result.confidence_score
            format_score += confidence * 20  # 0-20 based on confidence
            
            if confidence < 0.5:
                warnings.append(f"Low format detection confidence: {confidence:.2f}")
        
        if hasattr(format_detection_result, 'is_valid') and format_detection_result.is_valid:
            format_score += 10
        else:
            warnings.append("Format validation failed")
        
        format_score = min(max(format_score, 0), 30)  # 0-30 range
        
        # Calculate final score (0-100)
        total_score = content_score + extraction_score + format_score
        quality_score = min(total_score / 90 * 100, 100)  # Normalize to 0-100
        
        return quality_score, warnings
    
    def _extract_format_metadata(self, format_detection_result: Any, extraction_result: Any) -> Dict[str, Any]:
        """Extract format-specific metadata."""
        metadata = {}
        
        # From format detection
        if hasattr(format_detection_result, 'additional_metadata'):
            metadata.update(format_detection_result.additional_metadata or {})
        
        # From extraction
        if hasattr(extraction_result, 'metadata'):
            metadata.update(extraction_result.metadata or {})
        
        return metadata
    
    def _extract_document_properties(self, extraction_result: Any, format_detection_result: Any) -> Dict[str, Any]:
        """Extract document properties like title, author, etc."""
        properties = {}
        
        # Try to extract from extraction metadata
        if hasattr(extraction_result, 'metadata') and extraction_result.metadata:
            metadata = extraction_result.metadata
            
            # Look for common property keys
            property_mappings = {
                'title': ['title', 'Title', 'dc:title'],
                'author': ['author', 'Author', 'creator', 'dc:creator'],
                'subject': ['subject', 'Subject', 'dc:subject'],
                'keywords': ['keywords', 'Keywords', 'dc:keywords'],
                'created': ['created', 'Created', 'creation_date', 'dc:date'],
                'modified': ['modified', 'Modified', 'modification_date'],
                'language': ['language', 'Language', 'dc:language'],
                'publisher': ['publisher', 'Publisher', 'dc:publisher']
            }
            
            for prop_name, possible_keys in property_mappings.items():
                for key in possible_keys:
                    if key in metadata:
                        properties[prop_name] = metadata[key]
                        break
        
        return properties
    
    def enrich_with_analysis(self, metadata: DocumentMetadata, analysis_results: Dict[str, Any]) -> DocumentMetadata:
        """Enrich metadata with additional analysis results."""
        # Update structure analysis
        if 'structure_analysis' in analysis_results:
            if metadata.structure_analysis:
                metadata.structure_analysis.update(analysis_results['structure_analysis'])
            else:
                metadata.structure_analysis = analysis_results['structure_analysis']
        
        # Update quality metrics
        if 'quality_updates' in analysis_results:
            quality_updates = analysis_results['quality_updates']
            if 'quality_score' in quality_updates:
                metadata.quality_score = quality_updates['quality_score']
            if 'quality_warnings' in quality_updates:
                if metadata.quality_warnings:
                    metadata.quality_warnings.extend(quality_updates['quality_warnings'])
                else:
                    metadata.quality_warnings = quality_updates['quality_warnings']
        
        # Update language detection
        if 'detected_language' in analysis_results:
            metadata.detected_language = analysis_results['detected_language']
        
        return metadata
    
    def to_json(self, metadata: DocumentMetadata) -> str:
        """Convert metadata to JSON string."""
        return json.dumps(asdict(metadata), indent=2, default=str)
    
    def from_json(self, json_str: str) -> DocumentMetadata:
        """Create DocumentMetadata from JSON string."""
        data = json.loads(json_str)
        return DocumentMetadata(**data)


# Singleton instance
metadata_extractor = DocumentMetadataExtractor() 