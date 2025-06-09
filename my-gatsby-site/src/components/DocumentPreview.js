import React, { useState, useEffect, Suspense, lazy } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Chip,
  Skeleton,
  Button,
  Divider,
  Toolbar,
  Tooltip,
  Alert,
  CircularProgress,
} from '@mui/material';
import { styled } from '@mui/material/styles';

// Simple icons using Unicode since we may not have @mui/icons-material
const ShareIcon = () => <span style={{ fontSize: '18px' }}>📤</span>;
const DeleteIcon = () => <span style={{ fontSize: '18px' }}>🗑️</span>;
const DownloadIcon = () => <span style={{ fontSize: '18px' }}>⬇️</span>;
const EditIcon = () => <span style={{ fontSize: '18px' }}>✏️</span>;
const PrintIcon = () => <span style={{ fontSize: '18px' }}>🖨️</span>;
const FullscreenIcon = () => <span style={{ fontSize: '18px' }}>🔍</span>;
const CloseIcon = () => <span style={{ fontSize: '18px' }}>✕</span>;

// Styled components
const PreviewContainer = styled(Paper)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: '#ffffff',
  borderRadius: '8px',
  border: '1px solid #dadce0',
  overflow: 'hidden',
}));

const PreviewToolbar = styled(Toolbar)(({ theme }) => ({
  backgroundColor: '#f8f9fa',
  borderBottom: '1px solid #dadce0',
  minHeight: '56px !important',
  paddingLeft: '16px',
  paddingRight: '16px',
}));

const ContentArea = styled(Box)(({ theme }) => ({
  flex: 1,
  overflow: 'auto',
  padding: 0,
  position: 'relative',
  backgroundColor: '#ffffff',
}));

// Document type renderers
const TextDocumentRenderer = ({ content, isLoading }) => {
  if (isLoading) {
    return (
      <Box sx={{ p: 3 }}>
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} variant="text" height={24} sx={{ mb: 1 }} />
        ))}
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: '800px', mx: 'auto' }}>
      <Typography
        variant="body1"
        sx={{
          lineHeight: 1.6,
          fontSize: '16px',
          color: '#202124',
          fontFamily: '"Google Sans", "Roboto", monospace',
          whiteSpace: 'pre-wrap',
        }}
      >
        {content || 'Document content will be displayed here...'}
      </Typography>
    </Box>
  );
};

const ImageDocumentRenderer = ({ document, isLoading }) => {
  if (isLoading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Skeleton variant="rectangular" width="100%" height={400} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, textAlign: 'center' }}>
      <Box
        component="img"
        src={document.previewUrl || 'https://via.placeholder.com/600x400?text=Image+Preview'}
        alt={document.title}
        sx={{
          maxWidth: '100%',
          maxHeight: '70vh',
          objectFit: 'contain',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}
      />
    </Box>
  );
};

const PdfDocumentRenderer = ({ document, isLoading }) => {
  if (isLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="rectangular" width="100%" height={500} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, textAlign: 'center' }}>
      <Box
        sx={{
          width: '100%',
          height: '70vh',
          border: '1px solid #dadce0',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f8f9fa',
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h1" sx={{ fontSize: '48px', mb: 2 }}>
            📄
          </Typography>
          <Typography variant="h6" sx={{ mb: 2 }}>
            PDF Document
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {document.title}
          </Typography>
          <Button variant="contained" startIcon={<span>👁️</span>}>
            Open PDF Viewer
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

// Empty state component
const EmptyState = () => (
  <Box
    sx={{
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#fafafa',
      p: 4,
    }}
  >
    <Box sx={{ textAlign: 'center', maxWidth: '400px' }}>
      <Typography variant="h1" sx={{ fontSize: '72px', mb: 2, opacity: 0.3 }}>
        📄
      </Typography>
      <Typography variant="h5" sx={{ mb: 2, color: '#5f6368', fontWeight: 400 }}>
        No document selected
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Select a document from the sidebar to view its content here.
        You can search, filter, and organize your documents using the tools available.
      </Typography>
    </Box>
  </Box>
);

// Main document preview component
const DocumentPreview = ({
  document = null,
  onShare = () => {},
  onDelete = () => {},
  onDownload = () => {},
  onEdit = () => {},
  onPrint = () => {},
  isLoading = false,
  showToolbar = true,
}) => {
  const [contentLoading, setContentLoading] = useState(false);
  const [documentContent, setDocumentContent] = useState('');
  const [error, setError] = useState(null);

  // Simulate lazy loading of document content
  useEffect(() => {
    if (document) {
      setContentLoading(true);
      setError(null);
      
      // Simulate API call to load document content
      const loadContent = setTimeout(() => {
        try {
          // Mock content based on document type
          let content = '';
          
          if (document.type === '📄' || document.type === '📝') {
            content = `# ${document.title}

This is a sample document content for demonstration purposes. 

## Overview
${document.title} contains important information that has been processed and indexed by the Smart eBook Chat System.

## Key Points
• Document Type: ${document.category}
• Upload Date: ${document.uploadDate}
• File Size: ${document.size}
• Processing Status: ${document.status}
• Tags: ${document.tags?.join(', ') || 'None'}

## Content Preview
Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.

Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

## Additional Information
This document has been successfully processed and is available for semantic search and AI-powered conversations. You can ask questions about this content or use it as context for generating responses.

---
Document ID: ${document.id}
Last Modified: ${document.uploadDate}`;
          } else {
            content = `Document preview for ${document.title} (${document.type})`;
          }
          
          setDocumentContent(content);
          setContentLoading(false);
        } catch (err) {
          setError('Failed to load document content');
          setContentLoading(false);
        }
      }, 800); // Simulate network delay

      return () => clearTimeout(loadContent);
    }
  }, [document]);

  if (!document && !isLoading) {
    return <EmptyState />;
  }

  const getDocumentRenderer = () => {
    if (!document) return null;

    const type = document.type;
    
    if (type === '📊' || type === '📈') {
      return <ImageDocumentRenderer document={document} isLoading={contentLoading} />;
    } else if (type === '📚') {
      return <PdfDocumentRenderer document={document} isLoading={contentLoading} />;
    } else {
      return <TextDocumentRenderer content={documentContent} isLoading={contentLoading} />;
    }
  };

  return (
    <PreviewContainer elevation={0}>
      {/* Toolbar */}
      {showToolbar && document && (
        <PreviewToolbar>
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" sx={{ fontSize: '16px', fontWeight: 500, mb: 0.5 }}>
                {document.type} {document.title}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip
                  label={document.category}
                  size="small"
                  sx={{
                    height: '20px',
                    fontSize: '11px',
                    backgroundColor: '#e8f0fe',
                    color: '#1a73e8',
                  }}
                />
                <Chip
                  label={document.status}
                  size="small"
                  sx={{
                    height: '20px',
                    fontSize: '11px',
                    backgroundColor: document.status === 'processed' ? '#e8f5e8' : 
                                   document.status === 'processing' ? '#fff3e0' :
                                   document.status === 'error' ? '#ffebee' : '#f5f5f5',
                    color: document.status === 'processed' ? '#2e7d32' : 
                           document.status === 'processing' ? '#f57c00' :
                           document.status === 'error' ? '#d32f2f' : '#757575',
                  }}
                />
                <Typography variant="caption" color="text.secondary">
                  {document.size} • {document.uploadDate}
                </Typography>
              </Box>
            </Box>

            {/* Action buttons */}
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Tooltip title="Share">
                <IconButton size="small" onClick={() => onShare(document)}>
                  <ShareIcon />
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Download">
                <IconButton size="small" onClick={() => onDownload(document)}>
                  <DownloadIcon />
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Edit">
                <IconButton size="small" onClick={() => onEdit(document)}>
                  <EditIcon />
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Print">
                <IconButton size="small" onClick={() => onPrint(document)}>
                  <PrintIcon />
                </IconButton>
              </Tooltip>

              <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
              
              <Tooltip title="Delete">
                <IconButton size="small" onClick={() => onDelete(document)} color="error">
                  <DeleteIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </PreviewToolbar>
      )}

      {/* Content Area */}
      <ContentArea>
        {error ? (
          <Box sx={{ p: 3 }}>
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
            <Button variant="outlined" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </Box>
        ) : isLoading ? (
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={40} />
              <Typography variant="body2" sx={{ ml: 2 }}>
                Loading document...
              </Typography>
            </Box>
          </Box>
        ) : (
          getDocumentRenderer()
        )}
      </ContentArea>
    </PreviewContainer>
  );
};

export default DocumentPreview; 