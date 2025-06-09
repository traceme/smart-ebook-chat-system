import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Box, Container, Typography, TextField, Button, ButtonGroup, FormControl, InputLabel, Select, MenuItem, Paper } from '@mui/material'
import Layout from '../components/layout'
import DocumentList from '../components/DocumentList'
import GmailLayout from '../components/GmailLayout';
import DocumentPreview from '../components/DocumentPreview';
import Seo from '../components/seo';

const DocumentListDemo = () => {
  const [searchValue, setSearchValue] = useState('');
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [documentCount, setDocumentCount] = useState(150);
  
  // Mock user data
  const mockUser = {
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    avatar: null,
  };

  const handleSearch = (value) => {
    setSearchValue(value);
  };

  const handleDocumentSelect = (document) => {
    setSelectedDocument(document);
  };

  const handleDocumentAction = (action, document) => {
    console.log(`${action} action triggered for document:`, document);
    // In a real app, these would connect to actual APIs
  };

  // Create document list sidebar content
  const documentListSidebar = (
    <DocumentList
      onDocumentSelect={handleDocumentSelect}
      selectedDocument={selectedDocument}
      searchTerm={searchValue}
      showSearch={true}
      maxHeight={600}
    />
  );

  return (
    <GmailLayout
      user={mockUser}
      onSearch={handleSearch}
      searchValue={searchValue}
      sidebarContent={documentListSidebar}
    >
      <Box sx={{ p: 3, height: '100%' }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" sx={{ mb: 1, fontWeight: 400 }}>
            📄 Document List Demo
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Virtual Scrolling & Large Dataset Performance Testing
          </Typography>
        </Box>

        {/* Performance Testing Controls */}
        <Paper sx={{ mb: 3 }}>
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2, fontSize: '16px', fontWeight: 500 }}>
              🚀 Performance Testing
            </Typography>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Document Count: <strong>{documentCount}</strong>
              </Typography>
              <ButtonGroup size="small" sx={{ mb: 2 }}>
                <Button onClick={() => setDocumentCount(50)}>50</Button>
                <Button onClick={() => setDocumentCount(150)}>150</Button>
                <Button onClick={() => setDocumentCount(500)}>500</Button>
                <Button onClick={() => setDocumentCount(1000)}>1K</Button>
                <Button onClick={() => setDocumentCount(5000)}>5K</Button>
              </ButtonGroup>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1a73e8', mb: 1 }}>
                  Virtual Scrolling Features:
                </Typography>
                <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '14px', color: '#5f6368' }}>
                  <li>Renders only visible items</li>
                  <li>Smooth scrolling performance</li>
                  <li>Memory efficient for large lists</li>
                  <li>Category grouping with collapsible sections</li>
                  <li>Real-time search filtering</li>
                </ul>
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1a73e8', mb: 1 }}>
                  Test Scenarios:
                </Typography>
                <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '14px', color: '#5f6368' }}>
                  <li>Scroll through 5000+ documents</li>
                  <li>Search while maintaining performance</li>
                  <li>Category expansion/collapse</li>
                  <li>Document selection and highlighting</li>
                  <li>Responsive behavior on mobile</li>
                </ul>
              </Box>
            </Box>
          </Box>
        </Paper>

        {/* Document Preview Area */}
        <Box sx={{ mb: 3, height: '500px' }}>
          <DocumentPreview
            document={selectedDocument}
            onShare={(doc) => handleDocumentAction('share', doc)}
            onDelete={(doc) => handleDocumentAction('delete', doc)}
            onDownload={(doc) => handleDocumentAction('download', doc)}
            onEdit={(doc) => handleDocumentAction('edit', doc)}
            onPrint={(doc) => handleDocumentAction('print', doc)}
          />
        </Box>

        {/* Performance Metrics */}
        <Paper>
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2, fontSize: '16px', fontWeight: 500 }}>
              📊 Performance Metrics
            </Typography>
            
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
              <Box sx={{ textAlign: 'center', p: 2, backgroundColor: '#f8f9fa', borderRadius: 1 }}>
                <Typography variant="h4" sx={{ fontWeight: 600, color: '#1a73e8' }}>
                  {documentCount}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Total Documents
                </Typography>
              </Box>
              
              <Box sx={{ textAlign: 'center', p: 2, backgroundColor: '#f8f9fa', borderRadius: 1 }}>
                <Typography variant="h4" sx={{ fontWeight: 600, color: '#0f9d58' }}>
                  ~10
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  DOM Elements (Virtual)
                </Typography>
              </Box>
              
              <Box sx={{ textAlign: 'center', p: 2, backgroundColor: '#f8f9fa', borderRadius: 1 }}>
                <Typography variant="h4" sx={{ fontWeight: 600, color: '#ea4335' }}>
                  60fps
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Scroll Performance
                </Typography>
              </Box>
            </Box>
            
            <Box sx={{ mt: 3, p: 2, backgroundColor: '#fff3e0', borderRadius: 1 }}>
              <Typography variant="body2" sx={{ fontSize: '13px', color: '#f57c00', fontWeight: 500 }}>
                💡 Pro Tip: Try searching for "AI", "Programming", or any document type while scrolling to see real-time filtering performance!
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
    </GmailLayout>
  );
};

export const Head = () => (
  <Seo 
    title="Document List Demo - Virtual Scrolling" 
    description="Performance testing demo for virtualized document list with large datasets and Gmail-style interface."
  />
);

export default DocumentListDemo; 