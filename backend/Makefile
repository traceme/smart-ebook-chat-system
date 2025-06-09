# SECS Backend Makefile
# Provides convenient commands for testing, development, and deployment

.PHONY: help install test test-unit test-integration test-e2e test-performance test-security test-all clean lint format docker-build docker-up docker-down

# Default target
help:
	@echo "SECS Backend Development Commands"
	@echo "================================="
	@echo ""
	@echo "Setup & Installation:"
	@echo "  install          Install dependencies with Poetry"
	@echo "  install-dev      Install development dependencies"
	@echo ""
	@echo "Testing Commands:"
	@echo "  test             Run unit tests (default)"
	@echo "  test-unit        Run unit tests with coverage"
	@echo "  test-integration Run integration tests"
	@echo "  test-e2e         Run end-to-end tests"
	@echo "  test-performance Run performance tests with Locust"
	@echo "  test-security    Run security tests and scans"
	@echo "  test-all         Run all test suites"
	@echo "  test-watch       Run tests in watch mode"
	@echo ""
	@echo "Code Quality:"
	@echo "  lint             Run linting with flake8 and mypy"
	@echo "  format           Format code with black and isort"
	@echo "  check            Run all code quality checks"
	@echo ""
	@echo "Docker Commands:"
	@echo "  docker-build     Build Docker images"
	@echo "  docker-up        Start services with docker-compose"
	@echo "  docker-down      Stop and remove containers"
	@echo "  docker-logs      Show service logs"
	@echo ""
	@echo "Development:"
	@echo "  dev              Start development server"
	@echo "  migrate          Run database migrations"
	@echo "  clean            Clean up temporary files and caches"

# Installation
install:
	poetry install --no-dev

install-dev:
	poetry install
	poetry run pre-commit install

# Testing Commands
test: test-unit

test-unit:
	@echo "🧪 Running Unit Tests..."
	poetry run pytest tests/unit/ -v --cov=app --cov-report=term-missing --cov-report=html:htmlcov

test-integration:
	@echo "🔗 Running Integration Tests..."
	poetry run pytest tests/integration/ -v -m integration

test-e2e:
	@echo "🌐 Running E2E Tests..."
	poetry run pytest tests/e2e/ -v -m e2e

test-performance:
	@echo "🚀 Running Performance Tests..."
	poetry run locust -f tests/performance/locustfile.py --headless --users 50 --spawn-rate 5 --run-time 2m --host http://localhost:8000 --html performance-report.html

test-security:
	@echo "🔒 Running Security Tests..."
	poetry run pytest tests/ -v -k security
	@echo "Running security scan..."
	-poetry run bandit -r app/ -f json -o security-report.json

test-all:
	@echo "🎯 Running All Tests..."
	python tests/run_tests.py --type all --generate-report

test-watch:
	@echo "👀 Running tests in watch mode..."
	poetry run pytest-watch -- tests/unit/ -v

# Code Quality
lint:
	@echo "🔍 Running linting..."
	poetry run flake8 app tests
	poetry run mypy app
	poetry run pylint app

format:
	@echo "✨ Formatting code..."
	poetry run black app tests
	poetry run isort app tests

check: format lint
	@echo "✅ Code quality checks completed"

# Docker Commands
docker-build:
	docker-compose build

docker-up:
	docker-compose up -d
	@echo "🐳 Services starting... Check status with 'make docker-logs'"

docker-down:
	docker-compose down

docker-logs:
	docker-compose logs -f

# Development
dev:
	@echo "🚀 Starting development server..."
	poetry run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

migrate:
	@echo "🗃️ Running database migrations..."
	poetry run alembic upgrade head

migrate-generate:
	@echo "🗃️ Generating new migration..."
	@read -p "Migration message: " message; \
	poetry run alembic revision --autogenerate -m "$$message"

# Database
db-reset:
	@echo "🗃️ Resetting database..."
	rm -f app.db
	poetry run alembic upgrade head

db-seed:
	@echo "🌱 Seeding database with test data..."
	poetry run python app/scripts/seed_database.py

# Utilities
clean:
	@echo "🧹 Cleaning up..."
	find . -type f -name "*.pyc" -delete
	find . -type d -name "__pycache__" -delete
	find . -type d -name "*.egg-info" -exec rm -rf {} +
	rm -rf .pytest_cache
	rm -rf htmlcov
	rm -rf .coverage
	rm -rf dist
	rm -rf build

deps-update:
	@echo "📦 Updating dependencies..."
	poetry update

deps-export:
	@echo "📋 Exporting dependencies..."
	poetry export -f requirements.txt --output requirements.txt --without-hashes

# CI/CD
ci-install:
	poetry install
	poetry run pre-commit install

ci-test:
	@echo "🤖 Running CI test suite..."
	poetry run pytest tests/unit/ tests/integration/ -v --cov=app --cov-report=xml --junitxml=test-results.xml

ci-security:
	@echo "🔒 Running CI security checks..."
	poetry run bandit -r app/ -f json -o security-report.json
	poetry run safety check

# Monitoring
health-check:
	@echo "🏥 Checking service health..."
	curl -f http://localhost:8000/health || exit 1
	curl -f http://localhost:6333/collections || exit 1
	curl -f http://localhost:9000/minio/health/live || exit 1

logs:
	@echo "📋 Showing application logs..."
	docker-compose logs -f backend

# Deployment helpers
build-prod:
	@echo "🏗️ Building production image..."
	docker build -t secs-backend:latest -f Dockerfile.prod .

deploy-staging:
	@echo "🚀 Deploying to staging..."
	# Add staging deployment commands here

deploy-prod:
	@echo "🚀 Deploying to production..."
	# Add production deployment commands here

# Documentation
docs-build:
	@echo "📚 Building documentation..."
	poetry run sphinx-build -b html docs/ docs/_build/

docs-serve:
	@echo "📖 Serving documentation..."
	poetry run python -m http.server 8080 --directory docs/_build/

# Quick development setup
setup: install-dev migrate db-seed
	@echo "🎉 Development environment ready!"
	@echo "Run 'make dev' to start the development server"

# Performance monitoring
monitor:
	@echo "📊 Starting performance monitoring..."
	docker-compose -f docker-compose.monitoring.yml up -d

# Backup
backup-db:
	@echo "💾 Creating database backup..."
	docker-compose exec postgres pg_dump -U postgres secs_db > backup_$(shell date +%Y%m%d_%H%M%S).sql

# Security
security-scan:
	@echo "🛡️ Running comprehensive security scan..."
	poetry run bandit -r app/
	poetry run safety check
	docker run --rm -v $(PWD):/app returntocorp/semgrep --config=auto /app

# Load testing with different scenarios
load-test-light:
	poetry run locust -f tests/performance/locustfile.py --headless --users 10 --spawn-rate 2 --run-time 1m --host http://localhost:8000

load-test-heavy:
	poetry run locust -f tests/performance/locustfile.py --headless --users 200 --spawn-rate 20 --run-time 5m --host http://localhost:8000

# Environment management
env-create:
	@echo "🔧 Creating .env file..."
	cp .env.example .env
	@echo "Please edit .env file with your configuration"

env-validate:
	@echo "✅ Validating environment configuration..."
	poetry run python -c "from app.core.config import settings; print('Environment configuration is valid')" 