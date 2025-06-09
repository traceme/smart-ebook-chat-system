# Smart Ebook Chat System

> AI-powered document processing and intelligent chat system for ebooks and documents

[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-green.svg)](https://fastapi.tiangolo.com)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Security](https://img.shields.io/badge/Security-OWASP%20Top%2010-red.svg)](docs/SECURITY.md)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](backend/Dockerfile)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-Ready-blue.svg)](backend/k8s/)

## 🚀 Overview

The Smart Ebook Chat System is a cutting-edge application that transforms how you interact with documents and ebooks. Upload your documents, and chat with them using AI-powered natural language processing. The system processes various document formats, creates vector embeddings for semantic search, and provides intelligent responses based on your document content.

### ✨ Key Features

- **📚 Multi-format Support**: PDF, DOCX, EPUB, TXT, and more
- **🤖 AI-Powered Chat**: Intelligent conversations with your documents
- **🔍 Semantic Search**: Advanced vector-based search capabilities
- **🔒 Enterprise Security**: OWASP Top 10 compliance, encryption, RBAC
- **⚡ High Performance**: Scalable architecture with caching and optimization
- **🎨 Modern UI**: Responsive web interface built with Gatsby
- **📊 Analytics**: Comprehensive monitoring and usage analytics
- **🔄 Real-time Processing**: Background document processing with live updates
- **🌐 Multi-tenant**: Support for multiple users and organizations
- **📱 API-First**: Complete REST API with OpenAPI documentation

## 🏗️ Architecture

```mermaid
graph TB
    subgraph "Frontend Layer"
        UI[React/Gatsby UI]
        API_CLIENT[API Client]
    end
    
    subgraph "API Gateway"
        NGINX[Nginx Load Balancer]
        AUTH[Authentication]
        RATE[Rate Limiting]
    end
    
    subgraph "Application Layer"
        BACKEND[FastAPI Backend]
        WORKER[Celery Workers]
        SCHEDULER[Celery Beat]
    end
    
    subgraph "AI & Processing"
        LLM[LLM Providers]
        VECTOR[Vector Search]
        CONVERT[Document Conversion]
    end
    
    subgraph "Data Layer"
        POSTGRES[(PostgreSQL)]
        QDRANT[(Qdrant Vector DB)]
        MINIO[(MinIO Storage)]
        REDIS[(Redis Cache)]
    end
    
    subgraph "Monitoring"
        PROMETHEUS[Prometheus]
        GRAFANA[Grafana]
        LOGS[Centralized Logging]
    end
    
    UI --> API_CLIENT
    API_CLIENT --> NGINX
    NGINX --> AUTH
    AUTH --> RATE
    RATE --> BACKEND
    
    BACKEND --> WORKER
    BACKEND --> POSTGRES
    BACKEND --> REDIS
    
    WORKER --> LLM
    WORKER --> VECTOR
    WORKER --> CONVERT
    WORKER --> QDRANT
    WORKER --> MINIO
    
    BACKEND --> PROMETHEUS
    PROMETHEUS --> GRAFANA
```

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose
- Python 3.11+ (for local development)
- Node.js 18+ (for frontend development)
- Git

### Option 1: Docker Compose (Recommended)

```bash
# Clone the repository
git clone https://github.com/your-org/smart-ebook-chat-system.git
cd smart-ebook-chat-system

# Start the development environment
cd backend
docker-compose -f docker-compose.dev.yml up -d

# Wait for services to be ready (30-60 seconds)
docker-compose logs -f backend
```

### Option 2: Local Development

```bash
# Backend setup
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
alembic upgrade head

# Start the backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# In a new terminal, start Celery worker
celery -A app.workers.celery_app worker --loglevel=info

# Frontend setup (in another terminal)
cd frontend
npm install
npm run develop
```

### 🌐 Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **MinIO Console**: http://localhost:9001 (admin/password)
- **Qdrant Dashboard**: http://localhost:6333/dashboard

## 📖 Documentation

### 📚 User Guides
- [Getting Started Guide](docs/user-guide/getting-started.md) - Your first steps with the system
- [Document Upload Guide](docs/user-guide/document-upload.md) - How to upload and manage documents
- [Chat Interface Guide](docs/user-guide/chat-interface.md) - Using the AI chat features
- [Search and Discovery](docs/user-guide/search-discovery.md) - Finding information in your documents
- [User Account Management](docs/user-guide/account-management.md) - Managing your profile and settings
- [Troubleshooting Guide](docs/user-guide/troubleshooting.md) - Common issues and solutions
- [FAQ](docs/user-guide/faq.md) - Frequently asked questions

### 👨‍💻 Developer Documentation
- [API Reference](docs/api/README.md) - Complete REST API documentation
- [Architecture Overview](docs/developer/architecture.md) - System design and components
- [Setup Development Environment](docs/developer/development-setup.md) - Local development guide
- [Contributing Guidelines](docs/developer/contributing.md) - How to contribute to the project
- [Code Style Guide](docs/developer/code-style.md) - Coding standards and conventions
- [Testing Guide](docs/developer/testing.md) - Writing and running tests
- [Plugin Development](docs/developer/plugin-development.md) - Creating custom plugins
- [Security Best Practices](docs/developer/security.md) - Security guidelines for developers

### 🛠️ Operations Documentation
- [Deployment Guide](docs/operations/deployment.md) - Production deployment instructions
- [Configuration Reference](docs/operations/configuration.md) - All configuration options
- [Monitoring Setup](docs/operations/monitoring.md) - Setting up monitoring and alerts
- [Backup and Recovery](docs/operations/backup-recovery.md) - Data protection procedures
- [Performance Tuning](docs/operations/performance-tuning.md) - Optimization guidelines
- [Incident Response](docs/operations/incident-response.md) - Emergency procedures
- [Scaling Guide](docs/operations/scaling.md) - Horizontal and vertical scaling
- [Security Operations](docs/operations/security-operations.md) - Security monitoring and response

### 🔧 Technical Documentation
- [Database Schema](docs/technical/database-schema.md) - Database design and relationships
- [API Design Patterns](docs/technical/api-patterns.md) - API architecture and conventions
- [Vector Search Implementation](docs/technical/vector-search.md) - Semantic search details
- [Document Processing Pipeline](docs/technical/document-processing.md) - How documents are processed
- [LLM Integration](docs/technical/llm-integration.md) - AI provider integrations
- [Caching Strategy](docs/technical/caching.md) - Performance optimization through caching

## 🔧 Configuration

### Environment Variables

The system uses environment variables for configuration. See the complete reference in [Configuration Guide](docs/operations/configuration.md).

**Essential Variables:**

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/smart_ebook_chat

# Redis
REDIS_URL=redis://localhost:6379/0

# MinIO
MINIO_URL=http://localhost:9000
MINIO_ACCESS_KEY=your_access_key
MINIO_SECRET_KEY=your_secret_key

# Qdrant
QDRANT_URL=http://localhost:6333

# AI Providers (configure at least one)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_API_KEY=...

# Security
JWT_SECRET_KEY=your-super-secret-jwt-key
ENCRYPTION_KEY=your-encryption-key
```

### Feature Flags

```bash
# LLM Features
LLM_PROVIDER_ENABLED=true
LLM_DEFAULT_PROVIDER=openai
LLM_FALLBACK_ENABLED=true

# Security Features
SECURITY_HEADERS_ENABLED=true
RATE_LIMITING_ENABLED=true
AUDIT_LOGGING_ENABLED=true

# Performance Features
CACHING_ENABLED=true
VECTOR_SEARCH_ENABLED=true
BACKGROUND_PROCESSING_ENABLED=true
```

## 🧪 Testing

### Running Tests

```bash
# Backend tests
cd backend
pytest tests/ -v --cov=app

# Frontend tests
cd frontend
npm test

# Integration tests
pytest tests/integration/ -v

# End-to-end tests
pytest tests/e2e/ -v

# Security tests
bandit -r app/
safety check
```

### Test Coverage

- **Unit Tests**: 95%+ coverage
- **Integration Tests**: API and database interactions
- **End-to-End Tests**: Complete user workflows
- **Security Tests**: Vulnerability scanning and security validation
- **Performance Tests**: Load testing and benchmarking

## 🚀 Deployment

### Production Deployment Options

1. **Docker Compose** (Recommended for small to medium deployments)
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

2. **Kubernetes** (Recommended for large-scale deployments)
   ```bash
   kubectl apply -k k8s/overlays/production/
   ```

3. **Cloud Platforms**
   - AWS ECS/EKS
   - Google Cloud Run/GKE
   - Azure Container Instances/AKS

See the [Deployment Guide](docs/operations/deployment.md) for detailed instructions.

### Infrastructure Requirements

**Minimum Production Setup:**
- **CPU**: 4 cores
- **Memory**: 16GB RAM
- **Storage**: 100GB SSD
- **Network**: 1Gbps

**Recommended Production Setup:**
- **CPU**: 8+ cores
- **Memory**: 32GB+ RAM
- **Storage**: 500GB+ SSD
- **Network**: 10Gbps
- **Database**: Separate PostgreSQL cluster
- **Cache**: Redis cluster
- **Load Balancer**: Nginx or cloud LB

## 🔒 Security

The Smart Ebook Chat System implements enterprise-grade security:

- **🛡️ OWASP Top 10 Compliance**: Protection against all major web vulnerabilities
- **🔐 End-to-End Encryption**: AES-256 encryption for sensitive data
- **👤 Role-Based Access Control**: Granular permissions system
- **🚦 Rate Limiting**: Advanced rate limiting with sliding windows
- **📊 Audit Logging**: Comprehensive security event logging
- **🔍 Vulnerability Scanning**: Automated dependency and code scanning
- **🌐 Network Security**: IP restrictions, security headers, CSRF protection
- **🔑 Secure Authentication**: JWT with enhanced security claims

See [Security Documentation](docs/SECURITY.md) for complete details.

## 📊 Monitoring and Analytics

### Built-in Monitoring

- **Application Metrics**: Response times, error rates, throughput
- **Business Metrics**: Document uploads, chat sessions, user activity
- **Security Metrics**: Authentication attempts, blocked requests, vulnerabilities
- **Performance Metrics**: Database performance, cache hit rates, queue lengths

### Monitoring Stack

- **Prometheus**: Metrics collection and alerting
- **Grafana**: Visualization and dashboards
- **Structured Logging**: JSON logs with correlation IDs
- **Health Checks**: Application and dependency health monitoring

## 🤝 Contributing

We welcome contributions! Please read our [Contributing Guidelines](docs/developer/contributing.md) for details on:

- Code of Conduct
- Development workflow
- Pull request process
- Issue reporting
- Community guidelines

### Development Process

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Getting Help

- **Documentation**: Check the [docs/](docs/) directory
- **Issues**: [GitHub Issues](https://github.com/your-org/smart-ebook-chat-system/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/smart-ebook-chat-system/discussions)
- **Security**: [Security Policy](docs/SECURITY.md#reporting-vulnerabilities)

### Community

- **Discord**: [Join our Discord server](https://discord.gg/smart-ebook-chat)
- **Slack**: [Developer Slack workspace](https://smart-ebook-chat.slack.com)
- **Twitter**: [@SmartEbookChat](https://twitter.com/SmartEbookChat)

### Professional Support

For enterprise support, consulting, or custom development:
- Email: enterprise@smartebookchat.com
- Website: https://smartebookchat.com/enterprise

## 🗺️ Roadmap

### Current Version (v1.0)
- ✅ Document upload and processing
- ✅ AI-powered chat interface
- ✅ Vector-based semantic search
- ✅ Multi-format document support
- ✅ Enterprise security features
- ✅ Monitoring and analytics

### Upcoming Features (v1.1)
- 🚧 Mobile application
- 🚧 Advanced document analytics
- 🚧 Custom AI model training
- 🚧 Multi-language support
- 🚧 Document collaboration features

### Future Releases
- 📅 Voice interface integration
- 📅 Advanced visualization tools
- 📅 Workflow automation
- 📅 Third-party integrations
- 📅 Enterprise SSO

## 🙏 Acknowledgments

- **FastAPI** - Modern, fast web framework
- **Qdrant** - Vector database for semantic search
- **OpenAI/Anthropic** - AI model providers
- **Docker** - Containerization platform
- **Kubernetes** - Container orchestration
- **All contributors** - Thank you for your contributions!

---

**Made with ❤️ by the Smart Ebook Chat Team**

For more information, visit our [documentation](docs/) or [website](https://smartebookchat.com).
