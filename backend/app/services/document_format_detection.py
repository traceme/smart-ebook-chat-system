"""
Advanced document format detection and validation service.

This module provides robust file format detection, MIME type validation,
and content integrity checks for uploaded documents.
"""

import io
import mimetypes
import hashlib
import logging
from typing import Dict, List, Optional, Tuple, Any
from pathlib import Path
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class FormatDetectionResult:
    """Result of document format detection."""
    detected_format: str
    mime_type: str
    is_valid: bool
    confidence_score: float
    file_size: int
    error_message: Optional[str] = None
    additional_metadata: Dict[str, Any] = None


class SupportedFormats:
    """Supported document formats and their properties."""
    
    FORMATS = {
        'pdf': {
            'extensions': ['.pdf'],
            'mime_types': ['application/pdf'],
            'magic_signatures': [b'%PDF'],
            'max_size_mb': 100,
            'description': 'Portable Document Format'
        },
        'docx': {
            'extensions': ['.docx'],
            'mime_types': [
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            ],
            'magic_signatures': [b'PK\x03\x04'],
            'max_size_mb': 50,
            'description': 'Microsoft Word Document'
        },
        'epub': {
            'extensions': ['.epub'],
            'mime_types': ['application/epub+zip'],
            'magic_signatures': [b'PK\x03\x04'],
            'max_size_mb': 200,
            'description': 'Electronic Publication'
        },
        'txt': {
            'extensions': ['.txt'],
            'mime_types': ['text/plain'],
            'magic_signatures': [],
            'max_size_mb': 10,
            'description': 'Plain Text Document'
        },
        'md': {
            'extensions': ['.md', '.markdown'],
            'mime_types': ['text/markdown', 'text/x-markdown'],
            'magic_signatures': [],
            'max_size_mb': 10,
            'description': 'Markdown Document'
        },
        'rtf': {
            'extensions': ['.rtf'],
            'mime_types': ['application/rtf', 'text/rtf'],
            'magic_signatures': [b'{\\rtf1'],
            'max_size_mb': 25,
            'description': 'Rich Text Format'
        }
    }
    
    @classmethod
    def get_format_by_extension(cls, extension: str) -> Optional[str]:
        """Get format by file extension."""
        extension = extension.lower()
        for format_name, format_info in cls.FORMATS.items():
            if extension in format_info['extensions']:
                return format_name
        return None
    
    @classmethod
    def is_supported(cls, format_name: str) -> bool:
        """Check if format is supported."""
        return format_name.lower() in cls.FORMATS


class DocumentFormatDetector:
    """Advanced document format detection service."""
    
    def __init__(self):
        """Initialize format detector."""
        self.formats = SupportedFormats()
    
    def detect_format(
        self, 
        file_content: bytes, 
        filename: str,
        declared_format: Optional[str] = None
    ) -> FormatDetectionResult:
        """
        Detect document format using multiple methods.
        
        Args:
            file_content: Binary content of the file
            filename: Original filename
            declared_format: Format declared by client
            
        Returns:
            FormatDetectionResult with detection results
        """
        try:
            if not file_content:
                return FormatDetectionResult(
                    detected_format="unknown",
                    mime_type="application/octet-stream",
                    is_valid=False,
                    confidence_score=0.0,
                    file_size=0,
                    error_message="Empty file content"
                )
            
            file_size = len(file_content)
            
            # Extension-based detection
            file_path = Path(filename)
            extension = file_path.suffix.lower()
            extension_format = self.formats.get_format_by_extension(extension)
            
            # MIME type detection
            mime_type = self._detect_mime_type(file_content, filename)
            mime_format = self._get_format_by_mime_type(mime_type)
            
            # Magic signature detection
            signature_format = self._detect_by_signature(file_content)
            
            # Content analysis
            content_format = self._analyze_content_structure(file_content, extension)
            
            # Determine final format with confidence scoring
            detection_results = {
                'extension': extension_format,
                'mime': mime_format,
                'signature': signature_format,
                'content': content_format,
                'declared': declared_format
            }
            
            final_format, confidence = self._determine_final_format(detection_results)
            
            # Validate format
            is_valid = self._validate_format(final_format, file_content, file_size)
            
            # Extract metadata
            metadata = self._extract_metadata(file_content, final_format, filename)
            
            return FormatDetectionResult(
                detected_format=final_format,
                mime_type=mime_type,
                is_valid=is_valid,
                confidence_score=confidence,
                file_size=file_size,
                additional_metadata=metadata
            )
            
        except Exception as e:
            logger.error(f"Format detection failed: {e}")
            return FormatDetectionResult(
                detected_format="unknown",
                mime_type="application/octet-stream",
                is_valid=False,
                confidence_score=0.0,
                file_size=len(file_content) if file_content else 0,
                error_message=str(e)
            )
    
    def _detect_mime_type(self, file_content: bytes, filename: str) -> str:
        """Detect MIME type."""
        try:
            # Try basic signature detection
            if file_content.startswith(b'%PDF'):
                return 'application/pdf'
            elif file_content.startswith(b'PK\x03\x04'):
                return 'application/zip'
            elif file_content.startswith(b'{\\rtf1'):
                return 'application/rtf'
            
            # Fallback to mimetypes module
            mime_type, _ = mimetypes.guess_type(filename)
            return mime_type or 'application/octet-stream'
            
        except Exception:
            return 'application/octet-stream'
    
    def _get_format_by_mime_type(self, mime_type: str) -> Optional[str]:
        """Get format by MIME type."""
        for format_name, format_info in self.formats.FORMATS.items():
            if mime_type in format_info['mime_types']:
                return format_name
        return None
    
    def _detect_by_signature(self, file_content: bytes) -> Optional[str]:
        """Detect format by magic signatures."""
        for format_name, format_info in self.formats.FORMATS.items():
            for signature in format_info['magic_signatures']:
                if file_content.startswith(signature):
                    return format_name
        return None
    
    def _analyze_content_structure(self, file_content: bytes, extension: str) -> Optional[str]:
        """Analyze content structure for format hints."""
        try:
            # For text-based formats
            if extension in ['.txt', '.md', '.markdown']:
                try:
                    text_content = file_content.decode('utf-8')
                    # Check for Markdown patterns
                    if any(pattern in text_content for pattern in ['# ', '## ', '**', '__', '[', '](', '```']):
                        return 'md'
                    else:
                        return 'txt'
                except UnicodeDecodeError:
                    pass
            
            # For ZIP-based formats (DOCX, EPUB)
            if file_content.startswith(b'PK\x03\x04'):
                return self._analyze_zip_structure(file_content)
            
        except Exception as e:
            logger.debug(f"Content structure analysis failed: {e}")
        
        return None
    
    def _analyze_zip_structure(self, file_content: bytes) -> Optional[str]:
        """Analyze ZIP file structure."""
        try:
            import zipfile
            
            with zipfile.ZipFile(io.BytesIO(file_content), 'r') as zip_file:
                file_list = zip_file.namelist()
                
                # EPUB indicators
                if 'META-INF/container.xml' in file_list:
                    return 'epub'
                
                # DOCX indicators
                if any(name.startswith('word/') for name in file_list):
                    return 'docx'
                        
        except Exception:
            pass
        
        return None
    
    def _determine_final_format(self, detection_results: Dict[str, Optional[str]]) -> Tuple[str, float]:
        """Determine final format with confidence scoring."""
        format_votes = {}
        total_methods = 0
        
        for method, detected_format in detection_results.items():
            if detected_format and self.formats.is_supported(detected_format):
                format_votes[detected_format] = format_votes.get(detected_format, 0) + 1
            total_methods += 1
        
        if not format_votes:
            return "unknown", 0.0
        
        # Get format with most votes
        best_format = max(format_votes.keys(), key=lambda x: format_votes[x])
        confidence = format_votes[best_format] / total_methods
        
        # Boost confidence if multiple strong indicators agree
        if format_votes[best_format] >= 3:
            confidence = min(confidence + 0.2, 1.0)
        
        return best_format, confidence
    
    def _validate_format(self, format_name: str, file_content: bytes, file_size: int) -> bool:
        """Validate detected format."""
        if not self.formats.is_supported(format_name):
            return False
        
        format_info = self.formats.FORMATS[format_name]
        
        # Check file size limits
        max_size_bytes = format_info['max_size_mb'] * 1024 * 1024
        if file_size > max_size_bytes:
            return False
        
        # Format-specific validation
        if format_name == 'pdf':
            return file_content.startswith(b'%PDF') and b'%%EOF' in file_content[-1024:]
        elif format_name in ['docx', 'epub']:
            try:
                import zipfile
                with zipfile.ZipFile(io.BytesIO(file_content), 'r') as zip_file:
                    zip_file.namelist()
                return True
            except:
                return False
        elif format_name in ['txt', 'md']:
            try:
                file_content.decode('utf-8')
                return True
            except UnicodeDecodeError:
                return False
        
        return True
    
    def _extract_metadata(self, file_content: bytes, format_name: str, filename: str) -> Dict[str, Any]:
        """Extract additional metadata."""
        metadata = {
            'filename': filename,
            'file_size': len(file_content),
            'format': format_name,
            'content_hash': hashlib.sha256(file_content).hexdigest()
        }
        
        # Format-specific metadata
        if format_name == 'pdf':
            # Basic PDF version detection
            if file_content.startswith(b'%PDF-'):
                version_line = file_content[:20].decode('ascii', errors='ignore')
                if '%PDF-' in version_line:
                    version = version_line.split('%PDF-')[1].split('\n')[0].strip()
                    metadata['pdf_version'] = version
        
        elif format_name in ['txt', 'md']:
            try:
                text_content = file_content.decode('utf-8', errors='ignore')
                metadata['character_count'] = len(text_content)
                metadata['line_count'] = text_content.count('\n') + 1
                metadata['word_count'] = len(text_content.split())
            except:
                pass
        
        return metadata


# Singleton instance
format_detector = DocumentFormatDetector() 