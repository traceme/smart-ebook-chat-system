# SECS Backend Testing Framework

This document provides a comprehensive guide to the testing framework for the Smart eBook Chat System (SECS) backend.

## 📋 Table of Contents

- [Overview](#overview)
- [Test Types](#test-types)
- [Quick Start](#quick-start)
- [Running Tests](#running-tests)
- [Test Structure](#test-structure)
- [Writing Tests](#writing-tests)
- [CI/CD Integration](#cicd-integration)
- [Performance Testing](#performance-testing)
- [Coverage Reports](#coverage-reports)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

The SECS testing framework provides comprehensive testing capabilities including:

- **Unit Tests**: Fast, isolated tests for individual components
- **Integration Tests**: Tests for API endpoints and service interactions
- **End-to-End Tests**: Complete workflow testing
- **Performance Tests**: Load testing with Locust
- **Security Tests**: Security vulnerability scanning

## 🧪 Test Types

### Unit Tests (`tests/unit/`)
- Test individual functions and classes in isolation
- Use mocked dependencies
- Fast execution (< 1 second per test)
- High code coverage target (>80%)

### Integration Tests (`tests/integration/`)
- Test API endpoints with real database
- Test service interactions
- Use test containers for dependencies
- Verify complete request/response cycles

### End-to-End Tests (`tests/e2e/`)
- Test complete user workflows
- Use Playwright for browser automation
- Test cross-service interactions
- Validate critical user journeys

### Performance Tests (`tests/performance/`)
- Load testing with Locust
- Stress testing for scalability
- Performance regression detection
- Concurrent user simulation

## 🚀 Quick Start

### Prerequisites

1. **Python 3.12+** with Poetry installed
2. **Docker and Docker Compose** for services
3. **Services running** (PostgreSQL, Redis, Qdrant, MinIO)

### Installation

```bash
# Install dependencies
poetry install

# Install pre-commit hooks (optional)
poetry run pre-commit install

# Start services
docker-compose up -d
```

### Running Your First Test

```bash
# Run unit tests
make test-unit

# Or with poetry directly
poetry run pytest tests/unit/ -v
```

## 🏃‍♂️ Running Tests

### Using Make Commands

```bash
# Unit tests with coverage
make test-unit

# Integration tests
make test-integration

# All tests
make test-all

# Performance tests
make test-performance

# Security tests
make test-security
```

### Using Poetry/Pytest Directly

```bash
# Unit tests
poetry run pytest tests/unit/ -v --cov=app

# Integration tests
poetry run pytest tests/integration/ -v -m integration

# Specific test file
poetry run pytest tests/unit/test_security.py -v

# Run tests with specific marker
poetry run pytest -m "not slow" -v

# Run tests in parallel
poetry run pytest -n auto tests/unit/
```

### Using the Test Runner

```bash
# Run specific test type
python tests/run_tests.py --type unit
python tests/run_tests.py --type integration
python tests/run_tests.py --type performance

# Run all tests with report
python tests/run_tests.py --type all --generate-report
```

## 📁 Test Structure

```
tests/
├── conftest.py              # Pytest configuration and fixtures
├── run_tests.py             # Test runner script
├── README.md               # This documentation
├── unit/                   # Unit tests
│   ├── __init__.py
│   ├── test_security.py    # Security function tests
│   ├── test_crud.py        # Database operation tests
│   └── test_services.py    # Service layer tests
├── integration/            # Integration tests
│   ├── __init__.py
│   ├── test_auth_api.py    # Authentication API tests
│   ├── test_document_api.py # Document management API tests
│   └── test_search_api.py  # Search API tests
├── e2e/                    # End-to-end tests
│   ├── __init__.py
│   └── test_user_workflows.py
├── performance/            # Performance tests
│   ├── __init__.py
│   └── locustfile.py       # Locust performance tests
├── fixtures/               # Test data and fixtures
│   ├── __init__.py
│   └── sample_documents/
└── utils/                  # Test utilities
    ├── __init__.py
    ├── factories.py        # Data factories
    ├── helpers.py          # Test helpers
    └── assertions.py       # Custom assertions
```

## ✍️ Writing Tests

### Unit Test Example

```python
import pytest
from app.core.security import create_access_token, verify_token

class TestJWTSecurity:
    def test_create_and_verify_token(self):
        """Test JWT token creation and verification."""
        data = {"sub": "user123", "email": "test@example.com"}
        token = create_access_token(data=data)
        
        payload = verify_token(token)
        assert payload is not None
        assert payload.get("sub") == "user123"
        assert payload.get("email") == "test@example.com"
    
    def test_invalid_token_returns_none(self):
        """Test that invalid tokens return None."""
        invalid_token = "invalid.jwt.token"
        payload = verify_token(invalid_token)
        assert payload is None
```

### Integration Test Example

```python
import pytest
from fastapi.testclient import TestClient

@pytest.mark.integration
class TestDocumentAPI:
    def test_upload_document(self, client: TestClient, auth_headers: dict):
        """Test document upload endpoint."""
        files = {
            "file": ("test.pdf", b"PDF content", "application/pdf")
        }
        
        response = client.post(
            "/documents/upload",
            headers=auth_headers,
            files=files
        )
        
        assert response.status_code == 201
        data = response.json()
        assert "id" in data
        assert data["filename"] == "test.pdf"
```

### Performance Test Example

```python
from locust import HttpUser, task, between

class DocumentUser(HttpUser):
    wait_time = between(1, 3)
    
    def on_start(self):
        # Login and get auth token
        response = self.client.post("/auth/login", data={
            "username": "test@example.com",
            "password": "password"
        })
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    @task(3)
    def list_documents(self):
        self.client.get("/documents/", headers=self.headers)
    
    @task(1)
    def upload_document(self):
        files = {"file": ("test.txt", "content", "text/plain")}
        self.client.post("/documents/upload", 
                        headers=self.headers, files=files)
```

## 🔧 Test Configuration

### Pytest Configuration

Configure pytest in `pyproject.toml`:

```toml
[tool.pytest.ini_options]
testpaths = ["tests"]
python_files = ["test_*.py", "*_test.py"]
addopts = [
    "--strict-markers",
    "--cov=app",
    "--cov-report=term-missing",
    "--cov-report=html:htmlcov",
    "-v"
]
asyncio_mode = "auto"
markers = [
    "unit: Unit tests",
    "integration: Integration tests",
    "e2e: End-to-end tests",
    "performance: Performance tests",
    "slow: Slow-running tests",
]
```

### Environment Variables for Testing

Create `.env.test` for test-specific configuration:

```env
DATABASE_URL=sqlite:///./test.db
TESTING=true
SECRET_KEY=test-secret-key
REDIS_URL=redis://localhost:6379
QDRANT_URL=http://localhost:6333
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
```

## 🚀 CI/CD Integration

### GitHub Actions

The project includes a comprehensive CI/CD pipeline (`.github/workflows/ci.yml`) that:

1. **Test Matrix**: Tests against Python 3.12 and 3.13
2. **Service Dependencies**: Runs PostgreSQL, Redis, Qdrant, MinIO
3. **Multiple Test Types**: Unit, integration, security tests
4. **Coverage Reports**: Uploads to Codecov
5. **Performance Testing**: On main branch pushes
6. **Security Scanning**: Bandit and Safety checks
7. **Docker Build**: Validates container builds

### Running in CI

```yaml
- name: Run tests
  run: |
    poetry run pytest tests/unit/ tests/integration/ \
      --cov=app \
      --cov-report=xml \
      --junitxml=test-results.xml
```

## 📊 Performance Testing

### Locust Configuration

Performance tests simulate realistic user behavior:

```python
# Basic user simulation
class SECSUser(HttpUser):
    wait_time = between(1, 3)
    
    @task(5)  # 5x more likely than other tasks
    def search_documents(self):
        # Simulate document search
        pass
    
    @task(1)
    def upload_document(self):
        # Simulate document upload
        pass
```

### Running Performance Tests

```bash
# Quick performance test
make load-test-light

# Heavy load test
make load-test-heavy

# Custom performance test
poetry run locust -f tests/performance/locustfile.py \
  --headless \
  --users 100 \
  --spawn-rate 10 \
  --run-time 5m \
  --host http://localhost:8000
```

### Performance Metrics

Monitor these key metrics:
- **Response Times**: Average and 95th percentile
- **Requests per Second**: Throughput capacity
- **Error Rate**: Percentage of failed requests
- **Resource Usage**: CPU, memory, database connections

## 📈 Coverage Reports

### Generating Coverage

```bash
# Generate HTML coverage report
poetry run pytest --cov=app --cov-report=html

# Generate XML coverage (for CI)
poetry run pytest --cov=app --cov-report=xml

# View coverage in terminal
poetry run pytest --cov=app --cov-report=term-missing
```

### Coverage Targets

- **Unit Tests**: >90% line coverage
- **Integration Tests**: >80% API endpoint coverage
- **Overall**: >85% combined coverage

### Viewing Reports

```bash
# Open HTML coverage report
open htmlcov/index.html

# Or serve it locally
python -m http.server 8080 -d htmlcov
```

## 🐛 Troubleshooting

### Common Issues

#### 1. Services Not Running
```bash
# Check service status
docker-compose ps

# Start services
docker-compose up -d

# Check service logs
docker-compose logs backend
```

#### 2. Database Connection Issues
```bash
# Reset test database
make db-reset

# Check database connection
poetry run python -c "from app.db.session import engine; print(engine.url)"
```

#### 3. Import Errors
```bash
# Install in development mode
poetry install

# Check Python path
poetry run python -c "import sys; print(sys.path)"
```

#### 4. Slow Tests
```bash
# Run only fast tests
poetry run pytest -m "not slow"

# Profile slow tests
poetry run pytest --durations=10
```

### Debugging Tests

#### Enable Debug Mode
```python
import pytest
import logging

# In conftest.py or test file
logging.basicConfig(level=logging.DEBUG)

# Use pdb for debugging
import pdb; pdb.set_trace()
```

#### Verbose Output
```bash
# Maximum verbosity
poetry run pytest -vvv --tb=long

# Show print statements
poetry run pytest -s

# Show warnings
poetry run pytest --disable-warnings
```

## 🎯 Best Practices

### Test Organization
1. **One test class per component**
2. **Descriptive test names** that explain behavior
3. **Arrange-Act-Assert** pattern
4. **Independent tests** that can run in any order

### Test Data
1. **Use factories** for generating test data
2. **Isolate test data** between tests
3. **Mock external services** in unit tests
4. **Use realistic data** in integration tests

### Performance
1. **Keep unit tests fast** (<100ms each)
2. **Use pytest-xdist** for parallel execution
3. **Mark slow tests** appropriately
4. **Profile and optimize** slow tests

### Maintenance
1. **Update tests** when code changes
2. **Remove obsolete tests** regularly
3. **Keep test dependencies** up to date
4. **Monitor test performance** over time

## 📚 Additional Resources

- [Pytest Documentation](https://docs.pytest.org/)
- [FastAPI Testing](https://fastapi.tiangolo.com/tutorial/testing/)
- [Locust Documentation](https://docs.locust.io/)
- [Factory Boy](https://factoryboy.readthedocs.io/)
- [Coverage.py](https://coverage.readthedocs.io/)

## 🤝 Contributing

When adding new tests:

1. **Follow naming conventions**: `test_*.py` files, `test_*` functions
2. **Add appropriate markers**: `@pytest.mark.integration`, etc.
3. **Update documentation** if adding new test types
4. **Ensure tests pass** in CI before merging
5. **Maintain coverage** above target thresholds

---

For questions or issues with the testing framework, please check the [troubleshooting section](#troubleshooting) or create an issue in the project repository. 