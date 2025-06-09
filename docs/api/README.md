# API Reference Documentation

The Smart Ebook Chat System provides a comprehensive REST API for all platform functionality. This documentation covers authentication, endpoints, request/response formats, and examples.

## Base URL

- **Development**: `http://localhost:8000`
- **Production**: `https://api.your-domain.com`

## Authentication

### JWT Bearer Token

All API endpoints require authentication except for health checks and authentication endpoints.

```bash
Authorization: Bearer <jwt_token>
```

### Obtaining Access Token

```bash
POST /auth/token
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600,
  "refresh_token": "refresh_token_here"
}
```

### API Key Authentication (Alternative)

For server-to-server communication:

```bash
X-API-Key: your_api_key_here
```

## Core Endpoints

### Documents API

#### Upload Document

```bash
POST /api/v1/documents/upload
Content-Type: multipart/form-data
Authorization: Bearer <token>
```

**Parameters:**
- `file`: Document file (required)
- `title`: Document title (optional)
- `description`: Document description (optional)
- `tags`: Comma-separated tags (optional)

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "My Document",
  "filename": "document.pdf",
  "size": 1024000,
  "status": "uploading",
  "created_at": "2024-01-15T10:00:00Z"
}
```

#### List Documents

```bash
GET /api/v1/documents
Authorization: Bearer <token>
```

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `status`: Filter by status (uploading, processing, ready, failed)
- `search`: Search in title and content
- `tags`: Filter by tags
- `sort`: Sort field (created_at, title, size)
- `order`: Sort order (asc, desc)

**Response:**
```json
{
  "items": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "My Document",
      "filename": "document.pdf",
      "size": 1024000,
      "status": "ready",
      "tags": ["research", "ai"],
      "created_at": "2024-01-15T10:00:00Z",
      "processed_at": "2024-01-15T10:05:00Z"
    }
  ],
  "total": 100,
  "page": 1,
  "pages": 5
}
```

#### Get Document Details

```bash
GET /api/v1/documents/{document_id}
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "My Document",
  "filename": "document.pdf",
  "size": 1024000,
  "status": "ready",
  "tags": ["research", "ai"],
  "metadata": {
    "pages": 25,
    "author": "John Doe",
    "creation_date": "2024-01-01T00:00:00Z"
  },
  "processing_info": {
    "chunks_created": 42,
    "tokens_processed": 15000,
    "processing_time": 120
  },
  "created_at": "2024-01-15T10:00:00Z",
  "processed_at": "2024-01-15T10:05:00Z"
}
```

#### Delete Document

```bash
DELETE /api/v1/documents/{document_id}
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "Document deleted successfully"
}
```

### Chat API

#### Create Chat Session

```bash
POST /api/v1/chat/sessions
Content-Type: application/json
Authorization: Bearer <token>

{
  "document_ids": ["uuid1", "uuid2"],
  "title": "Chat about AI research",
  "model": "gpt-4o",
  "settings": {
    "temperature": 0.7,
    "max_tokens": 2000
  }
}
```

**Response:**
```json
{
  "id": "session_uuid",
  "title": "Chat about AI research",
  "document_ids": ["uuid1", "uuid2"],
  "model": "gpt-4o",
  "created_at": "2024-01-15T10:00:00Z"
}
```

#### Send Message

```bash
POST /api/v1/chat/sessions/{session_id}/messages
Content-Type: application/json
Authorization: Bearer <token>

{
  "content": "What are the main themes in these documents?",
  "stream": true
}
```

**Streaming Response:**
```
data: {"type": "token", "content": "Based"}
data: {"type": "token", "content": " on"}
data: {"type": "token", "content": " the"}
data: {"type": "reference", "document_id": "uuid1", "page": 15}
data: {"type": "complete", "total_tokens": 150}
```

**Non-streaming Response:**
```json
{
  "id": "message_uuid",
  "content": "Based on the documents, the main themes include...",
  "role": "assistant",
  "tokens_used": 150,
  "references": [
    {
      "document_id": "uuid1",
      "page": 15,
      "text": "relevant excerpt...",
      "confidence": 0.95
    }
  ],
  "created_at": "2024-01-15T10:00:00Z"
}
```

#### Get Chat History

```bash
GET /api/v1/chat/sessions/{session_id}/messages
Authorization: Bearer <token>
```

**Query Parameters:**
- `page`: Page number
- `limit`: Messages per page
- `since`: Get messages after timestamp

**Response:**
```json
{
  "session_id": "session_uuid",
  "messages": [
    {
      "id": "message_uuid",
      "content": "What are the main themes?",
      "role": "user",
      "created_at": "2024-01-15T10:00:00Z"
    },
    {
      "id": "message_uuid_2",
      "content": "The main themes include...",
      "role": "assistant",
      "tokens_used": 150,
      "references": [...],
      "created_at": "2024-01-15T10:00:30Z"
    }
  ],
  "total": 10,
  "page": 1
}
```

### Search API

#### Semantic Search

```bash
POST /api/v1/search/semantic
Content-Type: application/json
Authorization: Bearer <token>

{
  "query": "machine learning algorithms",
  "document_ids": ["uuid1", "uuid2"],
  "filters": {
    "tags": ["ai", "research"],
    "date_range": {
      "start": "2024-01-01",
      "end": "2024-12-31"
    }
  },
  "limit": 10,
  "threshold": 0.7
}
```

**Response:**
```json
{
  "query": "machine learning algorithms",
  "results": [
    {
      "document_id": "uuid1",
      "chunk_id": "chunk_uuid",
      "content": "Machine learning algorithms are...",
      "score": 0.95,
      "page": 15,
      "metadata": {
        "section": "Chapter 3: Algorithms",
        "author": "John Doe"
      }
    }
  ],
  "total_found": 25,
  "processing_time": 0.15
}
```

#### Hybrid Search

```bash
POST /api/v1/search/hybrid
Content-Type: application/json
Authorization: Bearer <token>

{
  "query": "deep learning neural networks",
  "keywords": ["CNN", "RNN", "transformer"],
  "semantic_weight": 0.7,
  "keyword_weight": 0.3,
  "limit": 10
}
```

### User Management API

#### Get User Profile

```bash
GET /api/v1/users/me
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "user_uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "subscription": {
    "plan": "pro",
    "status": "active",
    "expires_at": "2024-12-31T23:59:59Z"
  },
  "usage": {
    "documents_uploaded": 45,
    "storage_used": 512000000,
    "tokens_used": 75000,
    "api_calls": 1250
  },
  "limits": {
    "max_documents": 1000,
    "max_storage": 1073741824,
    "monthly_tokens": 100000,
    "monthly_api_calls": 10000
  }
}
```

#### Update User Profile

```bash
PUT /api/v1/users/me
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "Jane Doe",
  "preferences": {
    "default_model": "claude-3-sonnet",
    "theme": "dark",
    "language": "en"
  }
}
```

### Settings API

#### Get API Keys

```bash
GET /api/v1/settings/api-keys
Authorization: Bearer <token>
```

**Response:**
```json
{
  "keys": [
    {
      "provider": "openai",
      "name": "OpenAI Key",
      "masked_key": "sk-...xyz",
      "status": "active",
      "created_at": "2024-01-15T10:00:00Z"
    }
  ]
}
```

#### Update API Key

```bash
PUT /api/v1/settings/api-keys/{provider}
Content-Type: application/json
Authorization: Bearer <token>

{
  "key": "sk-new-api-key-here",
  "name": "OpenAI Production Key"
}
```

## Webhooks

### Setting Up Webhooks

```bash
POST /api/v1/webhooks
Content-Type: application/json
Authorization: Bearer <token>

{
  "url": "https://your-server.com/webhook",
  "events": ["document.processed", "chat.completed"],
  "secret": "webhook_secret"
}
```

### Webhook Events

#### Document Processed

```json
{
  "event": "document.processed",
  "timestamp": "2024-01-15T10:05:00Z",
  "data": {
    "document_id": "uuid",
    "status": "ready",
    "chunks_created": 42,
    "processing_time": 120
  }
}
```

#### Chat Completed

```json
{
  "event": "chat.completed",
  "timestamp": "2024-01-15T10:00:30Z",
  "data": {
    "session_id": "uuid",
    "message_id": "uuid",
    "tokens_used": 150
  }
}
```

## Error Handling

### Error Response Format

```json
{
  "error": {
    "code": "DOCUMENT_NOT_FOUND",
    "message": "Document with ID 'uuid' not found",
    "details": {
      "document_id": "uuid",
      "user_id": "user_uuid"
    }
  },
  "request_id": "req_uuid"
}
```

### HTTP Status Codes

- **200** - Success
- **201** - Created
- **400** - Bad Request
- **401** - Unauthorized
- **403** - Forbidden
- **404** - Not Found
- **413** - Payload Too Large
- **422** - Validation Error
- **429** - Rate Limited
- **500** - Internal Server Error
- **503** - Service Unavailable

### Common Error Codes

| Code | Description |
|------|-------------|
| `INVALID_TOKEN` | JWT token is invalid or expired |
| `QUOTA_EXCEEDED` | User has exceeded their quota |
| `DOCUMENT_NOT_FOUND` | Requested document doesn't exist |
| `PROCESSING_FAILED` | Document processing failed |
| `INVALID_FILE_TYPE` | Uploaded file type not supported |
| `FILE_TOO_LARGE` | File exceeds size limits |
| `RATE_LIMITED` | Too many requests |

## Rate Limiting

Rate limits are applied per user and endpoint:

| Endpoint | Limit | Window |
|----------|-------|--------|
| Document Upload | 10 requests | 1 minute |
| Chat Messages | 60 requests | 1 minute |
| Search | 100 requests | 1 minute |
| General API | 1000 requests | 1 hour |

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Request limit
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Reset timestamp

## SDKs and Examples

### Python SDK

```python
from smart_ebook_chat import Client

client = Client(api_key="your_api_key")

# Upload document
document = client.documents.upload("path/to/file.pdf")

# Create chat session
session = client.chat.create_session([document.id])

# Send message
response = client.chat.send_message(
    session.id, 
    "What are the main topics?"
)

print(response.content)
```

### JavaScript SDK

```javascript
import { SmartEbookChatClient } from '@smart-ebook-chat/client';

const client = new SmartEbookChatClient({
  apiKey: 'your_api_key',
  baseUrl: 'https://api.your-domain.com'
});

// Upload document
const document = await client.documents.upload(file);

// Create chat session
const session = await client.chat.createSession([document.id]);

// Send message
const response = await client.chat.sendMessage(
  session.id,
  'What are the main topics?'
);

console.log(response.content);
```

### cURL Examples

#### Upload Document
```bash
curl -X POST "http://localhost:8000/api/v1/documents/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@document.pdf" \
  -F "title=My Document"
```

#### Search Documents
```bash
curl -X POST "http://localhost:8000/api/v1/search/semantic" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "machine learning",
    "limit": 5
  }'
```

## Interactive Documentation

When running the API server, interactive documentation is available at:
- **Swagger UI**: `/docs`
- **ReDoc**: `/redoc`

These interfaces allow you to:
- Explore all endpoints
- Test API calls directly
- View request/response schemas
- Download OpenAPI specification

## Support

For API support:
- **Documentation**: This reference
- **Issues**: GitHub repository
- **Email**: api-support@your-domain.com
- **Status**: status.your-domain.com 