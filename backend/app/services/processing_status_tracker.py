"""
Document processing status tracking and error handling service.

This module provides comprehensive tracking of document processing stages,
error handling, recovery mechanisms, and detailed status reporting.
"""

import logging
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass, asdict
from enum import Enum
import json

from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.db.session import SessionLocal
from app import crud

logger = logging.getLogger(__name__)


class ProcessingStage(Enum):
    """Document processing stages."""
    UPLOAD_INITIATED = "upload_initiated"
    UPLOAD_COMPLETED = "upload_completed"
    FORMAT_DETECTION = "format_detection"
    TEXT_EXTRACTION = "text_extraction"
    CONTENT_PREPROCESSING = "content_preprocessing"
    METADATA_ENRICHMENT = "metadata_enrichment"
    VECTOR_INDEXING = "vector_indexing"
    PIPELINE_COMPLETED = "pipeline_completed"


class ProcessingStatus(Enum):
    """Processing status types."""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    RETRYING = "retrying"
    CANCELLED = "cancelled"
    SKIPPED = "skipped"


class ErrorSeverity(Enum):
    """Error severity levels."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class ProcessingStageInfo:
    """Information about a processing stage."""
    stage: ProcessingStage
    status: ProcessingStatus
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    duration_seconds: Optional[float] = None
    progress_percentage: float = 0.0
    error_message: Optional[str] = None
    error_severity: Optional[ErrorSeverity] = None
    retry_count: int = 0
    metadata: Dict[str, Any] = None


@dataclass
class ProcessingTracker:
    """Complete processing tracker for a document."""
    document_id: str
    user_id: str
    processing_id: str
    created_at: datetime
    updated_at: datetime
    overall_status: ProcessingStatus
    current_stage: Optional[ProcessingStage] = None
    stages: Dict[str, ProcessingStageInfo] = None
    total_duration_seconds: Optional[float] = None
    error_count: int = 0
    retry_count: int = 0
    metadata: Dict[str, Any] = None


class ProcessingStatusConfig(BaseModel):
    """Configuration for status tracking."""
    
    # Tracking options
    track_stage_progress: bool = True
    track_detailed_metadata: bool = True
    enable_performance_metrics: bool = True
    
    # Error handling
    max_retries_per_stage: int = 3
    retry_delay_seconds: int = 60
    enable_auto_recovery: bool = True
    
    # Cleanup options
    cleanup_completed_after_days: int = 30
    cleanup_failed_after_days: int = 7
    max_tracking_entries: int = 10000


class DocumentProcessingStatusTracker:
    """Service for tracking document processing status and handling errors."""
    
    def __init__(self, config: Optional[ProcessingStatusConfig] = None):
        """Initialize status tracker."""
        self.config = config or ProcessingStatusConfig()
        self._active_trackers: Dict[str, ProcessingTracker] = {}
        
    def start_processing(
        self, 
        document_id: str, 
        user_id: str,
        initial_metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Start tracking document processing.
        
        Args:
            document_id: Document UUID
            user_id: User UUID
            initial_metadata: Optional initial metadata
            
        Returns:
            Processing ID for tracking
        """
        try:
            processing_id = str(uuid.uuid4())
            
            tracker = ProcessingTracker(
                document_id=document_id,
                user_id=user_id,
                processing_id=processing_id,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
                overall_status=ProcessingStatus.PENDING,
                stages={},
                metadata=initial_metadata or {}
            )
            
            # Initialize all stages
            for stage in ProcessingStage:
                tracker.stages[stage.value] = ProcessingStageInfo(
                    stage=stage,
                    status=ProcessingStatus.PENDING,
                    metadata={}
                )
            
            self._active_trackers[processing_id] = tracker
            
            # Persist to database
            self._persist_tracker(tracker)
            
            logger.info(f"Started processing tracking for document {document_id} with processing ID {processing_id}")
            return processing_id
            
        except Exception as e:
            logger.error(f"Failed to start processing tracking: {e}")
            raise
    
    def update_stage_status(
        self,
        processing_id: str,
        stage: ProcessingStage,
        status: ProcessingStatus,
        progress_percentage: float = 0.0,
        metadata: Optional[Dict[str, Any]] = None,
        error_message: Optional[str] = None,
        error_severity: Optional[ErrorSeverity] = None
    ) -> bool:
        """
        Update the status of a processing stage.
        
        Args:
            processing_id: Processing tracker ID
            stage: Processing stage
            status: New status
            progress_percentage: Progress percentage (0-100)
            metadata: Optional stage metadata
            error_message: Error message if failed
            error_severity: Error severity if failed
            
        Returns:
            True if update successful
        """
        try:
            tracker = self._get_tracker(processing_id)
            if not tracker:
                logger.warning(f"Processing tracker {processing_id} not found")
                return False
            
            stage_info = tracker.stages.get(stage.value)
            if not stage_info:
                logger.warning(f"Stage {stage.value} not found in tracker {processing_id}")
                return False
            
            # Update stage information
            old_status = stage_info.status
            stage_info.status = status
            stage_info.progress_percentage = progress_percentage
            
            if metadata:
                stage_info.metadata.update(metadata)
            
            # Handle status transitions
            if old_status == ProcessingStatus.PENDING and status == ProcessingStatus.IN_PROGRESS:
                stage_info.started_at = datetime.utcnow()
            
            if status in [ProcessingStatus.COMPLETED, ProcessingStatus.FAILED, ProcessingStatus.CANCELLED]:
                stage_info.completed_at = datetime.utcnow()
                if stage_info.started_at:
                    stage_info.duration_seconds = (stage_info.completed_at - stage_info.started_at).total_seconds()
            
            # Handle errors
            if status == ProcessingStatus.FAILED:
                stage_info.error_message = error_message
                stage_info.error_severity = error_severity
                tracker.error_count += 1
            
            # Handle retries
            if status == ProcessingStatus.RETRYING:
                stage_info.retry_count += 1
                tracker.retry_count += 1
            
            # Update overall status and current stage
            self._update_overall_status(tracker)
            tracker.updated_at = datetime.utcnow()
            
            # Persist changes
            self._persist_tracker(tracker)
            
            logger.info(f"Updated stage {stage.value} to {status.value} for processing {processing_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to update stage status: {e}")
            return False
    
    def get_processing_status(self, processing_id: str) -> Optional[Dict[str, Any]]:
        """Get current processing status."""
        try:
            tracker = self._get_tracker(processing_id)
            if not tracker:
                return None
            
            # Calculate overall progress
            total_stages = len(ProcessingStage)
            completed_stages = sum(
                1 for stage_info in tracker.stages.values() 
                if stage_info.status == ProcessingStatus.COMPLETED
            )
            overall_progress = (completed_stages / total_stages) * 100
            
            # Get current stage info
            current_stage_info = None
            if tracker.current_stage:
                current_stage_info = tracker.stages.get(tracker.current_stage.value)
            
            # Calculate total duration
            total_duration = None
            if tracker.overall_status in [ProcessingStatus.COMPLETED, ProcessingStatus.FAILED]:
                total_duration = (tracker.updated_at - tracker.created_at).total_seconds()
            
            return {
                'processing_id': processing_id,
                'document_id': tracker.document_id,
                'overall_status': tracker.overall_status.value,
                'overall_progress': overall_progress,
                'current_stage': tracker.current_stage.value if tracker.current_stage else None,
                'current_stage_info': asdict(current_stage_info) if current_stage_info else None,
                'stages': {
                    stage_name: {
                        'status': stage_info.status.value,
                        'progress': stage_info.progress_percentage,
                        'started_at': stage_info.started_at.isoformat() if stage_info.started_at else None,
                        'completed_at': stage_info.completed_at.isoformat() if stage_info.completed_at else None,
                        'duration_seconds': stage_info.duration_seconds,
                        'error_message': stage_info.error_message,
                        'retry_count': stage_info.retry_count
                    }
                    for stage_name, stage_info in tracker.stages.items()
                },
                'created_at': tracker.created_at.isoformat(),
                'updated_at': tracker.updated_at.isoformat(),
                'total_duration_seconds': total_duration,
                'error_count': tracker.error_count,
                'retry_count': tracker.retry_count,
                'metadata': tracker.metadata
            }
            
        except Exception as e:
            logger.error(f"Failed to get processing status: {e}")
            return None
    
    def get_document_processing_status(self, document_id: str) -> Optional[Dict[str, Any]]:
        """Get processing status by document ID."""
        # Find tracker by document ID
        for tracker in self._active_trackers.values():
            if tracker.document_id == document_id:
                return self.get_processing_status(tracker.processing_id)
        
        # Try to load from database
        return self._load_document_status_from_db(document_id)
    
    def handle_processing_error(
        self,
        processing_id: str,
        stage: ProcessingStage,
        error: Exception,
        error_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Handle processing error with recovery strategies.
        
        Args:
            processing_id: Processing tracker ID
            stage: Stage where error occurred
            error: Exception that occurred
            error_context: Additional error context
            
        Returns:
            Error handling result with recovery strategy
        """
        try:
            tracker = self._get_tracker(processing_id)
            if not tracker:
                return {'action': 'error', 'message': 'Tracker not found'}
            
            stage_info = tracker.stages.get(stage.value)
            if not stage_info:
                return {'action': 'error', 'message': 'Stage not found'}
            
            # Determine error severity
            error_severity = self._determine_error_severity(error, error_context)
            
            # Log error details
            error_details = {
                'error_type': type(error).__name__,
                'error_message': str(error),
                'stage': stage.value,
                'retry_count': stage_info.retry_count,
                'context': error_context or {}
            }
            
            logger.error(f"Processing error in stage {stage.value} for {processing_id}: {error_details}")
            
            # Determine recovery strategy
            recovery_strategy = self._determine_recovery_strategy(
                stage_info, error, error_severity
            )
            
            # Execute recovery action
            if recovery_strategy['action'] == 'retry':
                self.update_stage_status(
                    processing_id,
                    stage,
                    ProcessingStatus.RETRYING,
                    metadata={'error_details': error_details},
                    error_message=str(error),
                    error_severity=error_severity
                )
                
                return {
                    'action': 'retry',
                    'delay_seconds': recovery_strategy.get('delay_seconds', self.config.retry_delay_seconds),
                    'retry_count': stage_info.retry_count + 1,
                    'max_retries': self.config.max_retries_per_stage
                }
                
            elif recovery_strategy['action'] == 'skip':
                self.update_stage_status(
                    processing_id,
                    stage,
                    ProcessingStatus.SKIPPED,
                    metadata={'error_details': error_details, 'reason': 'Skipped due to error'},
                    error_message=str(error),
                    error_severity=error_severity
                )
                
                return {
                    'action': 'skip',
                    'reason': recovery_strategy.get('reason', 'Stage skipped due to error')
                }
                
            else:  # fail
                self.update_stage_status(
                    processing_id,
                    stage,
                    ProcessingStatus.FAILED,
                    metadata={'error_details': error_details},
                    error_message=str(error),
                    error_severity=error_severity
                )
                
                return {
                    'action': 'fail',
                    'error_severity': error_severity.value,
                    'final_error': True
                }
                
        except Exception as e:
            logger.error(f"Error handling failed: {e}")
            return {'action': 'error', 'message': str(e)}
    
    def complete_processing(self, processing_id: str, final_metadata: Optional[Dict[str, Any]] = None) -> bool:
        """Mark processing as completed."""
        try:
            tracker = self._get_tracker(processing_id)
            if not tracker:
                return False
            
            tracker.overall_status = ProcessingStatus.COMPLETED
            tracker.updated_at = datetime.utcnow()
            tracker.total_duration_seconds = (tracker.updated_at - tracker.created_at).total_seconds()
            
            if final_metadata:
                tracker.metadata.update(final_metadata)
            
            self._persist_tracker(tracker)
            
            # Remove from active trackers after completion
            if processing_id in self._active_trackers:
                del self._active_trackers[processing_id]
            
            logger.info(f"Processing {processing_id} completed successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to complete processing: {e}")
            return False
    
    def cancel_processing(self, processing_id: str, reason: str = "User cancelled") -> bool:
        """Cancel ongoing processing."""
        try:
            tracker = self._get_tracker(processing_id)
            if not tracker:
                return False
            
            # Cancel current and pending stages
            for stage_info in tracker.stages.values():
                if stage_info.status in [ProcessingStatus.PENDING, ProcessingStatus.IN_PROGRESS]:
                    stage_info.status = ProcessingStatus.CANCELLED
                    stage_info.completed_at = datetime.utcnow()
                    stage_info.metadata['cancellation_reason'] = reason
            
            tracker.overall_status = ProcessingStatus.CANCELLED
            tracker.updated_at = datetime.utcnow()
            tracker.metadata['cancellation_reason'] = reason
            
            self._persist_tracker(tracker)
            
            if processing_id in self._active_trackers:
                del self._active_trackers[processing_id]
            
            logger.info(f"Processing {processing_id} cancelled: {reason}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to cancel processing: {e}")
            return False
    
    def get_processing_statistics(self, user_id: Optional[str] = None) -> Dict[str, Any]:
        """Get processing statistics."""
        try:
            # This would query database for statistics
            # For now, return statistics from active trackers
            
            trackers = list(self._active_trackers.values())
            if user_id:
                trackers = [t for t in trackers if t.user_id == user_id]
            
            total_processing = len(trackers)
            completed = sum(1 for t in trackers if t.overall_status == ProcessingStatus.COMPLETED)
            failed = sum(1 for t in trackers if t.overall_status == ProcessingStatus.FAILED)
            in_progress = sum(1 for t in trackers if t.overall_status == ProcessingStatus.IN_PROGRESS)
            
            avg_duration = None
            if completed > 0:
                completed_trackers = [t for t in trackers if t.total_duration_seconds]
                if completed_trackers:
                    avg_duration = sum(t.total_duration_seconds for t in completed_trackers) / len(completed_trackers)
            
            return {
                'total_processing_jobs': total_processing,
                'completed': completed,
                'failed': failed,
                'in_progress': in_progress,
                'success_rate': completed / total_processing if total_processing > 0 else 0,
                'average_duration_seconds': avg_duration,
                'total_errors': sum(t.error_count for t in trackers),
                'total_retries': sum(t.retry_count for t in trackers)
            }
            
        except Exception as e:
            logger.error(f"Failed to get processing statistics: {e}")
            return {}
    
    def cleanup_old_tracking_data(self) -> Dict[str, int]:
        """Clean up old tracking data based on configuration."""
        try:
            cleanup_stats = {
                'completed_cleaned': 0,
                'failed_cleaned': 0,
                'total_cleaned': 0
            }
            
            cutoff_completed = datetime.utcnow() - timedelta(days=self.config.cleanup_completed_after_days)
            cutoff_failed = datetime.utcnow() - timedelta(days=self.config.cleanup_failed_after_days)
            
            # Clean up active trackers
            to_remove = []
            for processing_id, tracker in self._active_trackers.items():
                should_cleanup = False
                
                if tracker.overall_status == ProcessingStatus.COMPLETED and tracker.updated_at < cutoff_completed:
                    should_cleanup = True
                    cleanup_stats['completed_cleaned'] += 1
                elif tracker.overall_status == ProcessingStatus.FAILED and tracker.updated_at < cutoff_failed:
                    should_cleanup = True
                    cleanup_stats['failed_cleaned'] += 1
                
                if should_cleanup:
                    to_remove.append(processing_id)
            
            for processing_id in to_remove:
                del self._active_trackers[processing_id]
                cleanup_stats['total_cleaned'] += 1
            
            # This would also clean up database records
            
            logger.info(f"Cleanup completed: {cleanup_stats}")
            return cleanup_stats
            
        except Exception as e:
            logger.error(f"Cleanup failed: {e}")
            return {}
    
    def _get_tracker(self, processing_id: str) -> Optional[ProcessingTracker]:
        """Get tracker by processing ID."""
        tracker = self._active_trackers.get(processing_id)
        if not tracker:
            # Try to load from database
            tracker = self._load_tracker_from_db(processing_id)
            if tracker:
                self._active_trackers[processing_id] = tracker
        return tracker
    
    def _update_overall_status(self, tracker: ProcessingTracker):
        """Update overall status based on stage statuses."""
        stage_statuses = [stage_info.status for stage_info in tracker.stages.values()]
        
        # Determine current stage
        for stage in ProcessingStage:
            stage_info = tracker.stages.get(stage.value)
            if stage_info and stage_info.status == ProcessingStatus.IN_PROGRESS:
                tracker.current_stage = stage
                break
        
        # Determine overall status
        if any(status == ProcessingStatus.FAILED for status in stage_statuses):
            # Check if it's a critical failure
            failed_stages = [
                stage_info for stage_info in tracker.stages.values()
                if stage_info.status == ProcessingStatus.FAILED
            ]
            critical_failures = [
                stage for stage in failed_stages
                if stage.error_severity == ErrorSeverity.CRITICAL
            ]
            
            if critical_failures:
                tracker.overall_status = ProcessingStatus.FAILED
            else:
                # Non-critical failures might allow processing to continue
                if any(status == ProcessingStatus.IN_PROGRESS for status in stage_statuses):
                    tracker.overall_status = ProcessingStatus.IN_PROGRESS
                elif all(status in [ProcessingStatus.COMPLETED, ProcessingStatus.SKIPPED, ProcessingStatus.FAILED] for status in stage_statuses):
                    tracker.overall_status = ProcessingStatus.COMPLETED  # Completed with some failures
        
        elif any(status == ProcessingStatus.IN_PROGRESS for status in stage_statuses):
            tracker.overall_status = ProcessingStatus.IN_PROGRESS
        elif any(status == ProcessingStatus.RETRYING for status in stage_statuses):
            tracker.overall_status = ProcessingStatus.RETRYING
        elif all(status in [ProcessingStatus.COMPLETED, ProcessingStatus.SKIPPED] for status in stage_statuses):
            tracker.overall_status = ProcessingStatus.COMPLETED
        else:
            tracker.overall_status = ProcessingStatus.PENDING
    
    def _determine_error_severity(self, error: Exception, context: Optional[Dict[str, Any]]) -> ErrorSeverity:
        """Determine error severity based on error type and context."""
        error_type = type(error).__name__
        error_message = str(error).lower()
        
        # Critical errors
        if any(keyword in error_message for keyword in ['memory', 'disk space', 'connection refused', 'timeout']):
            return ErrorSeverity.CRITICAL
        
        # High severity errors
        if any(keyword in error_message for keyword in ['permission denied', 'not found', 'corrupted']):
            return ErrorSeverity.HIGH
        
        # Medium severity errors
        if any(keyword in error_message for keyword in ['format', 'encoding', 'parsing']):
            return ErrorSeverity.MEDIUM
        
        # Default to low severity
        return ErrorSeverity.LOW
    
    def _determine_recovery_strategy(
        self, 
        stage_info: ProcessingStageInfo, 
        error: Exception, 
        severity: ErrorSeverity
    ) -> Dict[str, Any]:
        """Determine recovery strategy for an error."""
        
        # Check retry limits
        if stage_info.retry_count >= self.config.max_retries_per_stage:
            if severity in [ErrorSeverity.LOW, ErrorSeverity.MEDIUM]:
                return {'action': 'skip', 'reason': 'Max retries exceeded, skipping non-critical stage'}
            else:
                return {'action': 'fail', 'reason': 'Max retries exceeded for critical stage'}
        
        # Recovery strategies based on error severity
        if severity == ErrorSeverity.CRITICAL:
            return {'action': 'fail', 'reason': 'Critical error occurred'}
        
        elif severity == ErrorSeverity.HIGH:
            if stage_info.retry_count < 2:
                return {
                    'action': 'retry',
                    'delay_seconds': self.config.retry_delay_seconds * (2 ** stage_info.retry_count)
                }
            else:
                return {'action': 'fail', 'reason': 'High severity error with retries exhausted'}
        
        else:  # LOW or MEDIUM
            return {
                'action': 'retry',
                'delay_seconds': self.config.retry_delay_seconds
            }
    
    def _persist_tracker(self, tracker: ProcessingTracker):
        """Persist tracker to database."""
        try:
            db = SessionLocal()
            
            # Update document with processing status
            document = crud.document.get_by_id(db, uuid.UUID(tracker.document_id), user_id=None)
            if document:
                # Store processing info in indexing_metadata
                processing_info = {
                    'processing_id': tracker.processing_id,
                    'overall_status': tracker.overall_status.value,
                    'current_stage': tracker.current_stage.value if tracker.current_stage else None,
                    'error_count': tracker.error_count,
                    'retry_count': tracker.retry_count,
                    'updated_at': tracker.updated_at.isoformat(),
                    'stages': {
                        stage_name: {
                            'status': stage_info.status.value,
                            'progress': stage_info.progress_percentage,
                            'retry_count': stage_info.retry_count,
                            'duration_seconds': stage_info.duration_seconds
                        }
                        for stage_name, stage_info in tracker.stages.items()
                    }
                }
                
                current_metadata = document.indexing_metadata or {}
                current_metadata['processing_tracker'] = processing_info
                document.indexing_metadata = current_metadata
                
                # Update document status based on overall status
                if tracker.overall_status == ProcessingStatus.COMPLETED:
                    document.upload_status = "processing_completed"
                elif tracker.overall_status == ProcessingStatus.FAILED:
                    document.upload_status = "processing_failed"
                elif tracker.overall_status == ProcessingStatus.IN_PROGRESS:
                    document.upload_status = "processing"
                
                db.commit()
            
            db.close()
            
        except Exception as e:
            logger.error(f"Failed to persist tracker: {e}")
    
    def _load_tracker_from_db(self, processing_id: str) -> Optional[ProcessingTracker]:
        """Load tracker from database."""
        # This would implement database loading logic
        # For now, return None
        return None
    
    def _load_document_status_from_db(self, document_id: str) -> Optional[Dict[str, Any]]:
        """Load document processing status from database."""
        try:
            db = SessionLocal()
            document = crud.document.get_by_id(db, uuid.UUID(document_id), user_id=None)
            
            if document and document.indexing_metadata:
                processing_info = document.indexing_metadata.get('processing_tracker')
                if processing_info:
                    db.close()
                    return processing_info
            
            db.close()
            return None
            
        except Exception as e:
            logger.error(f"Failed to load document status from DB: {e}")
            return None


# Singleton instance
processing_status_tracker = DocumentProcessingStatusTracker() 