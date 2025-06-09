"""
Factory classes for generating test data.

Uses Factory Boy to create consistent test data for models.
"""

import uuid
from datetime import datetime, timedelta
from typing import Dict, Any

import factory
from factory.alchemy import SQLAlchemyModelFactory
from faker import Faker

from app.models.user import User
from app.models.document import Document

fake = Faker()


class UserFactory(SQLAlchemyModelFactory):
    """Factory for creating User instances."""
    
    class Meta:
        model = User
        sqlalchemy_session_persistence = "commit"
    
    id = factory.LazyFunction(uuid.uuid4)
    email = factory.Sequence(lambda n: f"user{n}@example.com")
    hashed_password = "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW"  # password: secret
    full_name = factory.Faker("name")
    is_active = True
    is_superuser = False
    created_at = factory.LazyFunction(datetime.utcnow)
    updated_at = factory.LazyFunction(datetime.utcnow)


class AdminUserFactory(UserFactory):
    """Factory for creating admin User instances."""
    
    email = factory.Sequence(lambda n: f"admin{n}@example.com")
    is_superuser = True


class DocumentFactory(SQLAlchemyModelFactory):
    """Factory for creating Document instances."""
    
    class Meta:
        model = Document
        sqlalchemy_session_persistence = "commit"
    
    id = factory.LazyFunction(uuid.uuid4)
    user_id = factory.SubFactory(UserFactory)
    filename = factory.Faker("file_name", extension="pdf")
    original_filename = factory.LazyAttribute(lambda obj: obj.filename)
    file_size = factory.Faker("random_int", min=1024, max=10485760)  # 1KB to 10MB
    content_type = "application/pdf"
    storage_path = factory.LazyAttribute(lambda obj: f"documents/{obj.user_id}/{obj.filename}")
    upload_status = "completed"
    metadata = factory.LazyFunction(lambda: {
        "title": fake.sentence(nb_words=4),
        "author": fake.name(),
        "page_count": fake.random_int(min=1, max=100),
        "language": "en"
    })
    indexing_metadata = factory.LazyFunction(lambda: {
        "chunk_count": fake.random_int(min=10, max=100),
        "embedding_model": "text-embedding-ada-002",
        "indexed_at": datetime.utcnow().isoformat()
    })
    created_at = factory.LazyFunction(datetime.utcnow)
    updated_at = factory.LazyFunction(datetime.utcnow)


class ProcessingDocumentFactory(DocumentFactory):
    """Factory for creating Document instances in processing state."""
    
    upload_status = "processing"
    indexing_metadata = None


class FailedDocumentFactory(DocumentFactory):
    """Factory for creating Document instances that failed processing."""
    
    upload_status = "failed"
    error_message = "Processing failed due to corrupted file"


# Mock data generators
def generate_embedding(dimensions: int = 1536) -> list[float]:
    """Generate a mock embedding vector."""
    return [fake.pyfloat(min_value=-1.0, max_value=1.0) for _ in range(dimensions)]


def generate_chat_response() -> Dict[str, Any]:
    """Generate a mock chat response."""
    return {
        "id": f"chatcmpl-{fake.uuid4()}",
        "object": "chat.completion",
        "created": int(datetime.utcnow().timestamp()),
        "model": "gpt-4",
        "choices": [{
            "index": 0,
            "message": {
                "role": "assistant",
                "content": fake.text(max_nb_chars=500)
            },
            "finish_reason": "stop"
        }],
        "usage": {
            "prompt_tokens": fake.random_int(min=10, max=100),
            "completion_tokens": fake.random_int(min=10, max=200),
            "total_tokens": fake.random_int(min=20, max=300)
        }
    }


def generate_search_results(count: int = 5) -> list[Dict[str, Any]]:
    """Generate mock search results."""
    return [
        {
            "id": str(uuid.uuid4()),
            "score": fake.pyfloat(min_value=0.7, max_value=1.0),
            "payload": {
                "text": fake.text(max_nb_chars=200),
                "document_id": str(uuid.uuid4()),
                "chunk_index": fake.random_int(min=0, max=20),
                "metadata": {
                    "page": fake.random_int(min=1, max=10),
                    "title": fake.sentence(nb_words=4)
                }
            }
        }
        for _ in range(count)
    ]


def generate_processing_status(
    document_id: str = None,
    stage: str = "text_extraction",
    status: str = "in_progress"
) -> Dict[str, Any]:
    """Generate mock processing status."""
    if not document_id:
        document_id = str(uuid.uuid4())
    
    stages = [
        "upload_completed",
        "format_detection", 
        "text_extraction",
        "content_preprocessing",
        "metadata_enrichment",
        "vector_indexing",
        "pipeline_completed"
    ]
    
    current_index = stages.index(stage)
    stage_statuses = {}
    
    for i, stage_name in enumerate(stages):
        if i < current_index:
            stage_statuses[stage_name] = {
                "status": "completed",
                "progress": 100.0,
                "started_at": fake.date_time_between(start_date="-1h", end_date="-30m").isoformat(),
                "completed_at": fake.date_time_between(start_date="-30m", end_date="-20m").isoformat(),
                "duration_seconds": fake.random_int(min=30, max=300)
            }
        elif i == current_index:
            stage_statuses[stage_name] = {
                "status": status,
                "progress": fake.pyfloat(min_value=10.0, max_value=90.0),
                "started_at": fake.date_time_between(start_date="-20m", end_date="-10m").isoformat(),
                "completed_at": None,
                "duration_seconds": None
            }
        else:
            stage_statuses[stage_name] = {
                "status": "pending",
                "progress": 0.0,
                "started_at": None,
                "completed_at": None,
                "duration_seconds": None
            }
    
    completed_stages = sum(1 for s in stage_statuses.values() if s["status"] == "completed")
    overall_progress = (completed_stages / len(stages)) * 100
    
    return {
        "processing_id": str(uuid.uuid4()),
        "document_id": document_id,
        "overall_status": status,
        "overall_progress": overall_progress,
        "current_stage": stage,
        "stages": stage_statuses,
        "created_at": fake.date_time_between(start_date="-2h", end_date="-1h").isoformat(),
        "updated_at": fake.date_time_between(start_date="-10m", end_date="now").isoformat(),
        "error_count": 0 if status != "failed" else fake.random_int(min=1, max=5),
        "retry_count": 0 if status != "retrying" else fake.random_int(min=1, max=3),
        "metadata": {
            "file_size": fake.random_int(min=1024, max=10485760),
            "file_type": "application/pdf"
        }
    }


def generate_api_key_data() -> Dict[str, Any]:
    """Generate mock API key data."""
    providers = ["openai", "anthropic", "google", "azure"]
    provider = fake.random_element(providers)
    
    key_formats = {
        "openai": "sk-" + fake.lexify(text="?" * 48),
        "anthropic": "sk-ant-" + fake.lexify(text="?" * 40),
        "google": "AIza" + fake.lexify(text="?" * 32),
        "azure": fake.lexify(text="?" * 32)
    }
    
    return {
        "id": str(uuid.uuid4()),
        "name": f"{provider.title()} API Key",
        "provider": provider,
        "key": key_formats[provider],
        "is_active": fake.boolean(chance_of_getting_true=80),
        "created_at": fake.date_time_between(start_date="-30d", end_date="now").isoformat(),
        "last_used": fake.date_time_between(start_date="-7d", end_date="now").isoformat(),
        "usage": {
            "requests": fake.random_int(min=0, max=10000),
            "cost": fake.pyfloat(min_value=0.0, max_value=500.0, right_digits=2),
            "tokens": fake.random_int(min=0, max=1000000)
        },
        "metadata": {
            "models_available": fake.random_elements(
                elements=["gpt-4", "gpt-3.5-turbo", "text-embedding-ada-002"],
                length=fake.random_int(min=1, max=3),
                unique=True
            ),
            "quota_remaining": fake.pyfloat(min_value=0.0, max_value=100.0, right_digits=1)
        }
    }


def generate_usage_statistics() -> Dict[str, Any]:
    """Generate mock usage statistics."""
    return {
        "documents": fake.random_int(min=0, max=100),
        "storage": fake.random_int(min=0, max=5000),  # MB
        "tokens": fake.random_int(min=0, max=100000),
        "searches": fake.random_int(min=0, max=1000),
        "api_calls": fake.random_int(min=0, max=10000),
        "last_updated": datetime.utcnow().isoformat(),
        "period": "monthly",
        "tier": fake.random_element(["free", "pro", "enterprise"])
    } 