import React from 'react';
import { Container, Box, Typography, Paper } from '@mui/material';
import DocumentManager from '../components/DocumentManager';
import Layout from '../components/layout';

const DocumentManagerDemo = () => {
  return (
    <Layout>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
            🗂️ Document Management System Demo
          </Typography>
          <Typography variant="h6" color="text.secondary" paragraph>
            Comprehensive document management with advanced search, filtering, tagging, and organization capabilities.
          </Typography>
          
          <Box sx={{ mt: 3 }}>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
              ✨ Key Features:
            </Typography>
            <Box component="ul" sx={{ pl: 3, '& li': { mb: 1 } }}>
              <li><strong>Grid & List Views:</strong> Switch between card and table views</li>
              <li><strong>Advanced Search:</strong> Search by title, description, and content</li>
              <li><strong>Smart Filtering:</strong> Filter by status, file type, and tags</li>
              <li><strong>Batch Operations:</strong> Select multiple documents for bulk actions</li>
              <li><strong>Status Tracking:</strong> Visual indicators for processing status</li>
              <li><strong>Tag Management:</strong> Organize documents with custom tags</li>
              <li><strong>File Type Support:</strong> PDF, DOCX, EPUB, TXT with type-specific icons</li>
              <li><strong>Upload Progress:</strong> Real-time upload and processing tracking</li>
              <li><strong>Quick Actions:</strong> Preview, download, edit, share, archive, delete</li>
              <li><strong>Sorting Options:</strong> Sort by name, date, size, or status</li>
              <li><strong>Responsive Design:</strong> Works on desktop, tablet, and mobile</li>
              <li><strong>Keyboard Shortcuts:</strong> Ctrl+A (select all), Ctrl+U (upload), Del (delete)</li>
            </Box>
          </Box>

          <Box sx={{ mt: 3 }}>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
              🎯 How to Use:
            </Typography>
            <Box component="ol" sx={{ pl: 3, '& li': { mb: 1 } }}>
              <li>Use the search bar to find documents by name or description</li>
              <li>Apply filters by status, type, or tags using the dropdown menus</li>
              <li>Click the view toggle to switch between grid and list views</li>
              <li>Select documents using checkboxes for batch operations</li>
              <li>Click on document cards to preview them</li>
              <li>Use the floating action button or "Upload Document" to add new files</li>
              <li>Access quick actions via the three-dot menu on each document</li>
              <li>Sort documents using the sort menu</li>
            </Box>
          </Box>
        </Paper>

        <DocumentManager />
      </Container>
    </Layout>
  );
};

export default DocumentManagerDemo; 