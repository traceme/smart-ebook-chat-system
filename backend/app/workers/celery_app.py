from celery import Celery
from app.core.config import settings

# Create Celery app
celery_app = Celery(
    "document_processor",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.workers.document_conversion", "app.workers.vector_indexing"]
)

# Configure Celery
celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    # Task routes
    task_routes={
        'app.workers.document_conversion.convert_document': {'queue': 'document_conversion'},
        'app.workers.vector_indexing.index_document': {'queue': 'vector_indexing'},
        'vector_indexing.index_document': {'queue': 'vector_indexing'},
    },
    # Task retry settings
    task_annotations={
        '*': {'rate_limit': '10/s'}
    },
    # Task execution settings
    worker_prefetch_multiplier=1,
    task_acks_late=True,
    worker_max_tasks_per_child=1000,
) 