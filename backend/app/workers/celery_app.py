from celery import Celery
from celery.signals import worker_ready, worker_shutting_down, task_prerun, task_postrun, task_failure
import logging
from datetime import datetime
from app.core.config import settings

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create Celery app with enhanced configuration
celery_app = Celery(
    "document_processor",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=[
        "app.workers.document_conversion", 
        "app.workers.vector_indexing",
        "app.workers.enhanced_document_conversion",
        "app.workers.document_pipeline"
    ]
)

# Enhanced Celery configuration
celery_app.conf.update(
    # Serialization
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    result_accept_content=['json'],
    
    # Timezone
    timezone='UTC',
    enable_utc=True,
    
    # Task routing with priority queues
    task_routes={
        # Document conversion tasks
        'app.workers.document_conversion.convert_document': {
            'queue': 'document_conversion',
            'routing_key': 'document_conversion'
        },
        'app.workers.enhanced_document_conversion.enhanced_convert_document': {
            'queue': 'document_conversion_priority',
            'routing_key': 'document_conversion_priority'
        },
        
        # Vector indexing tasks
        'app.workers.vector_indexing.index_document': {
            'queue': 'vector_indexing',
            'routing_key': 'vector_indexing'
        },
        'app.workers.vector_indexing.batch_index_documents': {
            'queue': 'vector_indexing_batch',
            'routing_key': 'vector_indexing_batch'
        },
        
        # Pipeline tasks
        'app.workers.document_pipeline.*': {
            'queue': 'document_pipeline',
            'routing_key': 'document_pipeline'
        },
        
        # Maintenance tasks
        'app.workers.maintenance.*': {
            'queue': 'maintenance',
            'routing_key': 'maintenance'
        }
    },
    
    # Task retry and failure handling
    task_annotations={
        '*': {
            'rate_limit': '10/s',
            'max_retries': 3,
            'default_retry_delay': 60,
            'retry_backoff': True,
            'retry_backoff_max': 600,
            'retry_jitter': True
        },
        'app.workers.enhanced_document_conversion.enhanced_convert_document': {
            'rate_limit': '5/s',
            'max_retries': 5,
            'priority': 6
        },
        'app.workers.vector_indexing.batch_index_documents': {
            'rate_limit': '2/s',
            'max_retries': 2,
            'priority': 4
        }
    },
    
    # Worker settings
    worker_prefetch_multiplier=1,
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    worker_max_tasks_per_child=1000,
    worker_disable_rate_limits=False,
    
    # Result backend settings
    result_expires=3600,  # 1 hour
    result_backend_always_retry=True,
    result_backend_max_retries=3,
    
    # Monitoring and logging
    worker_send_task_events=True,
    task_send_sent_event=True,
    
    # Security
    task_always_eager=False,
    task_eager_propagates=True,
    task_ignore_result=False,
    
    # Performance optimizations
    worker_pool_restarts=True,
    task_compression='gzip',
    result_compression='gzip',
    
    # Queue priorities
    task_inherit_parent_priority=True,
    task_default_priority=5,
    worker_direct=True,
    
    # Beat scheduler settings (for periodic tasks)
    beat_schedule={
        'cleanup-expired-results': {
            'task': 'app.workers.maintenance.cleanup_expired_results',
            'schedule': 3600.0,  # Every hour
        },
        'health-check-workers': {
            'task': 'app.workers.maintenance.health_check',
            'schedule': 300.0,  # Every 5 minutes
        },
        'update-processing-stats': {
            'task': 'app.workers.maintenance.update_processing_stats',
            'schedule': 900.0,  # Every 15 minutes
        }
    }
)

# Worker lifecycle event handlers
@worker_ready.connect
def worker_ready_handler(sender=None, **kwargs):
    """Called when worker is ready to accept tasks."""
    logger.info(f"Worker {sender} is ready to process tasks")

@worker_shutting_down.connect  
def worker_shutting_down_handler(sender=None, **kwargs):
    """Called when worker is shutting down."""
    logger.info(f"Worker {sender} is shutting down")

@task_prerun.connect
def task_prerun_handler(sender=None, task_id=None, task=None, args=None, kwargs=None, **kwds):
    """Called before task execution."""
    logger.info(f"Starting task {task.name} [{task_id}]")

@task_postrun.connect
def task_postrun_handler(sender=None, task_id=None, task=None, args=None, kwargs=None, retval=None, state=None, **kwds):
    """Called after task execution."""
    logger.info(f"Completed task {task.name} [{task_id}] with state: {state}")

@task_failure.connect
def task_failure_handler(sender=None, task_id=None, exception=None, traceback=None, einfo=None, **kwds):
    """Called when task fails."""
    logger.error(f"Task {sender.name} [{task_id}] failed: {exception}") 