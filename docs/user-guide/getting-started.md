# Getting Started Guide

Welcome to the Smart Ebook Chat System! This guide will help you get up and running quickly with our intelligent document chat platform.

## What is Smart Ebook Chat System?

The Smart Ebook Chat System is an AI-powered platform that allows you to:
- Upload and convert various document formats (PDF, DOCX, EPUB, TXT)
- Chat with your documents using natural language
- Perform semantic searches across your document collection
- Organize and manage your document library
- Get intelligent insights from your content

## Quick Start (5 minutes)

### Step 1: Access the System

1. **Web Interface**: Navigate to `http://localhost:3000` (development) or your deployed URL
2. **API Access**: The REST API is available at `http://localhost:8000` with interactive docs at `/docs`

### Step 2: Create Your Account

1. Click "Sign Up" on the homepage
2. Fill in your details:
   - Email address
   - Strong password (minimum 8 characters, mixed case, numbers, special characters)
   - Display name
3. Verify your email (if email verification is enabled)
4. Choose your subscription plan (if applicable)

### Step 3: Upload Your First Document

1. **Via Web Interface**:
   - Click "Upload Document" button
   - Select your file (supports PDF, DOCX, EPUB, TXT)
   - Add a title and description (optional)
   - Click "Upload"

2. **Via API**:
   ```bash
   curl -X POST "http://localhost:8000/api/v1/documents/upload" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -F "file=@your-document.pdf" \
     -F "title=My Document"
   ```

### Step 4: Wait for Processing

Your document will be automatically:
1. **Converted** to text format
2. **Chunked** into searchable segments
3. **Indexed** for semantic search
4. **Ready** for chat interactions

Processing time varies by document size (typically 1-5 minutes).

### Step 5: Start Chatting

1. Navigate to your document in the library
2. Click "Chat" or "Open Chat"
3. Ask questions about your document:
   - "What are the main topics in this document?"
   - "Summarize chapter 3"
   - "Find information about [specific topic]"

## Supported File Formats

| Format | Extension | Max Size | Notes |
|--------|-----------|----------|-------|
| PDF | `.pdf` | 50MB | Text and image-based PDFs |
| Word Document | `.docx` | 25MB | Modern Word format only |
| EPUB | `.epub` | 25MB | E-book format |
| Plain Text | `.txt` | 10MB | UTF-8 encoding |

## Tips for Best Results

### Document Preparation
- Use clear, well-formatted documents
- Remove unnecessary pages (covers, blank pages)
- Ensure text is selectable in PDFs
- Use descriptive filenames

### Effective Questioning
- Be specific in your questions
- Reference sections or chapters when relevant
- Ask follow-up questions for clarity
- Use natural language

## Next Steps

Now that you're up and running:

1. **Explore Features**: Try advanced search and filtering
2. **Organize Content**: Create folders and tags
3. **Share Documents**: Collaborate with team members
4. **Integrate APIs**: Connect with your workflow tools
5. **Monitor Usage**: Track your document processing

Ready to dive deeper? Check out our [Feature Documentation](features.md) for advanced capabilities!
