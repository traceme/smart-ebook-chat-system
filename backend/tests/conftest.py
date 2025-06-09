"""
Pytest configuration and fixtures for the SECS test suite.

This module provides:
- Database fixtures for testing
- Authentication fixtures
- Mock services and clients
- Test utilities and helpers
"""

import asyncio
import os
import pytest
import uuid
from datetime import datetime, timedelta
from typing import AsyncGenerator, Generator, Dict, Any
from unittest.mock import AsyncMock, Mock

import httpx
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.db.database import get_db
from app.db.base import Base
from app.core.config import settings
from app.models.user import User
from app.models.document import Document
from app.crud import user as crud_user
from app.core.security import create_access_token
from app.services.llm_providers.openai_provider import OpenAIProvider


# Test database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def db_session():
    """Create a test database session."""
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client(db_session):
    """Create a test client with dependency override."""
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
async def async_client(db_session):
    """Create an async test client."""
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    async with httpx.AsyncClient(app=app, base_url="http://test") as client:
        yield client
    app.dependency_overrides.clear()


@pytest.fixture
def test_user(db_session) -> User:
    """Create a test user."""
    user_data = {
        "email": "test@example.com",
        "hashed_password": "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW",  # password: secret
        "full_name": "Test User",
        "is_active": True,
    }
    user = crud_user.create_user(db_session, **user_data)
    db_session.commit()
    return user


@pytest.fixture
def admin_user(db_session) -> User:
    """Create an admin test user."""
    user_data = {
        "email": "admin@example.com",
        "hashed_password": "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW",  # password: secret
        "full_name": "Admin User",
        "is_active": True,
        "is_superuser": True,
    }
    user = crud_user.create_user(db_session, **user_data)
    db_session.commit()
    return user


@pytest.fixture
def user_token(test_user: User) -> str:
    """Create a JWT token for test user."""
    token_data = {"sub": str(test_user.id)}
    return create_access_token(data=token_data)


@pytest.fixture
def admin_token(admin_user: User) -> str:
    """Create a JWT token for admin user."""
    token_data = {"sub": str(admin_user.id)}
    return create_access_token(data=token_data)


@pytest.fixture
def auth_headers(user_token: str) -> Dict[str, str]:
    """Create authorization headers with user token."""
    return {"Authorization": f"Bearer {user_token}"}


@pytest.fixture
def admin_headers(admin_token: str) -> Dict[str, str]:
    """Create authorization headers with admin token."""
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture
def sample_document(db_session, test_user: User) -> Document:
    """Create a sample document for testing."""
    document = Document(
        id=uuid.uuid4(),
        user_id=test_user.id,
        filename="test_document.pdf",
        original_filename="test_document.pdf",
        file_size=1024,
        content_type="application/pdf",
        storage_path="test/path/test_document.pdf",
        upload_status="completed",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db_session.add(document)
    db_session.commit()
    db_session.refresh(document)
    return document


@pytest.fixture
def mock_openai_client():
    """Mock OpenAI client for testing."""
    mock_client = AsyncMock()
    
    # Mock embeddings response
    mock_client.embeddings.create.return_value = Mock(
        data=[Mock(embedding=[0.1, 0.2, 0.3] * 512)]  # 1536-dimensional embedding
    )
    
    # Mock chat completion response
    mock_client.chat.completions.create.return_value = Mock(
        choices=[Mock(
            message=Mock(content="This is a test response"),
            finish_reason="stop"
        )],
        usage=Mock(
            prompt_tokens=10,
            completion_tokens=5,
            total_tokens=15
        )
    )
    
    return mock_client


@pytest.fixture
def mock_qdrant_client():
    """Mock Qdrant client for testing."""
    mock_client = AsyncMock()
    
    # Mock search response
    mock_client.search.return_value = [
        Mock(
            id=str(uuid.uuid4()),
            score=0.9,
            payload={"text": "Sample text", "document_id": str(uuid.uuid4())}
        )
    ]
    
    # Mock upsert response
    mock_client.upsert.return_value = Mock(operation_id=12345, status="completed")
    
    return mock_client


@pytest.fixture
def mock_celery_task():
    """Mock Celery task for testing."""
    mock_task = Mock()
    mock_task.delay.return_value = Mock(id="test-task-id")
    mock_task.apply_async.return_value = Mock(id="test-task-id")
    return mock_task


@pytest.fixture
def mock_minio_client():
    """Mock MinIO client for testing."""
    mock_client = Mock()
    
    # Mock upload response
    mock_client.put_object.return_value = Mock(etag="test-etag")
    
    # Mock presigned URL
    mock_client.presigned_put_object.return_value = "https://test-presigned-url.com"
    mock_client.presigned_get_object.return_value = "https://test-download-url.com"
    
    # Mock file operations
    mock_client.stat_object.return_value = Mock(size=1024, etag="test-etag")
    
    return mock_client


@pytest.fixture
def sample_file_content() -> bytes:
    """Sample file content for upload tests."""
    return b"This is a test file content for document upload testing."


@pytest.fixture
def sample_multipart_file():
    """Sample multipart file for upload tests."""
    from io import BytesIO
    from fastapi import UploadFile
    
    content = b"This is a test PDF file content."
    file_obj = BytesIO(content)
    return UploadFile(
        file=file_obj,
        filename="test.pdf",
        headers={"content-type": "application/pdf"},
        size=len(content)
    )


@pytest.fixture
def test_processing_status():
    """Sample processing status data."""
    return {
        "processing_id": str(uuid.uuid4()),
        "document_id": str(uuid.uuid4()),
        "overall_status": "in_progress",
        "current_stage": "text_extraction",
        "overall_progress": 45.0,
        "stages": {
            "upload_completed": {"status": "completed", "progress": 100.0},
            "format_detection": {"status": "completed", "progress": 100.0},
            "text_extraction": {"status": "in_progress", "progress": 45.0},
            "vector_indexing": {"status": "pending", "progress": 0.0},
        },
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
    }


@pytest.fixture(autouse=True)
def cleanup_test_files():
    """Clean up test files after each test."""
    yield
    # Clean up any test files created during tests
    test_files = ["test.db", "test.db-shm", "test.db-wal"]
    for file in test_files:
        if os.path.exists(file):
            os.remove(file)


# Test environment settings
@pytest.fixture(autouse=True)
def test_settings():
    """Override settings for testing."""
    original_settings = settings.dict()
    
    # Override with test-specific settings
    test_overrides = {
        "DATABASE_URL": SQLALCHEMY_DATABASE_URL,
        "TESTING": True,
        "SECRET_KEY": "test-secret-key",
        "ACCESS_TOKEN_EXPIRE_MINUTES": 30,
        "MINIO_ENDPOINT": "localhost:9000",
        "MINIO_ACCESS_KEY": "test-access-key",
        "MINIO_SECRET_KEY": "test-secret-key",
        "QDRANT_URL": "http://localhost:6333",
        "REDIS_URL": "redis://localhost:6379",
    }
    
    for key, value in test_overrides.items():
        setattr(settings, key, value)
    
    yield settings
    
    # Restore original settings
    for key, value in original_settings.items():
        setattr(settings, key, value)


# Performance testing fixtures
@pytest.fixture
def performance_test_data():
    """Generate test data for performance tests."""
    return {
        "users": [
            {
                "email": f"user{i}@example.com",
                "password": "password123",
                "full_name": f"Test User {i}"
            }
            for i in range(100)
        ],
        "documents": [
            {
                "filename": f"document_{i}.pdf",
                "content": f"This is test document {i} content" * 100,
                "file_size": 1024 * (i + 1)
            }
            for i in range(50)
        ]
    }


# Async test helpers
@pytest.fixture
async def async_session_maker():
    """Create async session maker for async tests."""
    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
    
    engine = create_async_engine(
        "sqlite+aiosqlite:///./test_async.db",
        echo=False,
    )
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    
    yield async_session
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    
    await engine.dispose()


# Custom pytest markers for test organization
def pytest_configure(config):
    """Configure pytest with custom markers."""
    config.addinivalue_line(
        "markers", "integration: mark test as integration test"
    )
    config.addinivalue_line(
        "markers", "e2e: mark test as end-to-end test"
    )
    config.addinivalue_line(
        "markers", "performance: mark test as performance test"
    )
    config.addinivalue_line(
        "markers", "slow: mark test as slow-running"
    ) 