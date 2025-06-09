import React, { useState } from 'react';
import { Box, Typography, Card, CardContent, Alert } from '@mui/material';
import GmailLayout from '../components/GmailLayout';
import DocumentList from '../components/DocumentList';
import DocumentPreview from '../components/DocumentPreview';
import Seo from '../components/seo';

const GmailLayoutComplete = () => {
  const [searchValue, setSearchValue] = useState('');
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [userSettings, setUserSettings] = useState({
    displayName: 'Alex Chen',
    email: 'alex.chen@smartebooks.com',
    bio: 'Full-stack developer passionate about AI and user experience',
    emailNotifications: true,
    pushNotifications: true,
    theme: 'light',
    compactView: false,
    sidebarWidth: 280,
  });
  
  // Mock user data
  const mockUser = {
    name: 'Alex Chen',
    email: 'alex.chen@smartebooks.com',
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
    
    // Show action feedback
    const actions = {
      share: `📤 Sharing "${document.title}"`,
      delete: `🗑️ Deleting "${document.title}"`,
      download: `⬇️ Downloading "${document.title}"`,
      edit: `✏️ Opening "${document.title}" for editing`,
      print: `🖨️ Printing "${document.title}"`
    };
    
    // In a real app, you'd show a snackbar or similar notification
    alert(actions[action] || `Action: ${action}`);
  };

  const handleSettingsChange = (newSettings) => {
    setUserSettings(newSettings);
    console.log('Settings updated:', newSettings);
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
      userSettings={userSettings}
      onSettingsChange={handleSettingsChange}
    >
      {/* Main Content Area */}
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header Info */}
        <Box sx={{ p: 3, borderBottom: '1px solid #dadce0', backgroundColor: '#f8f9fa' }}>
          <Typography variant="h5" sx={{ mb: 1, fontWeight: 400 }}>
            📚 Smart eBook Chat System
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Complete Gmail-style Layout Demo
          </Typography>
          
          {/* Demo Instructions */}
          <Alert severity="info" sx={{ mt: 2, mb: 0 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>🎯 Try these features:</strong>
            </Typography>
            <Box component="ul" sx={{ margin: 0, paddingLeft: '1.2rem', fontSize: '14px' }}>
              <li>Press <strong>'/'</strong> to focus the search bar</li>
              <li>Click the <strong>☰ menu</strong> to toggle the sidebar</li>
              <li>Click the <strong>⚙️ settings</strong> icon to open the settings drawer</li>
              <li>Select documents from the sidebar to preview them</li>
              <li>Use the toolbar actions in the preview area</li>
              <li>Search for <strong>"AI"</strong>, <strong>"Programming"</strong>, or any category</li>
              <li>Resize your window to test responsive behavior</li>
            </Box>
          </Alert>
        </Box>

        {/* Document Preview Area */}
        <Box sx={{ flex: 1, p: 3, overflow: 'hidden' }}>
          {selectedDocument ? (
            <DocumentPreview
              document={selectedDocument}
              onShare={(doc) => handleDocumentAction('share', doc)}
              onDelete={(doc) => handleDocumentAction('delete', doc)}
              onDownload={(doc) => handleDocumentAction('download', doc)}
              onEdit={(doc) => handleDocumentAction('edit', doc)}
              onPrint={(doc) => handleDocumentAction('print', doc)}
            />
          ) : (
            <Card sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CardContent sx={{ textAlign: 'center', maxWidth: '500px' }}>
                <Typography variant="h1" sx={{ fontSize: '72px', mb: 2, opacity: 0.3 }}>
                  🎯
                </Typography>
                <Typography variant="h5" sx={{ mb: 2, color: '#5f6368', fontWeight: 400 }}>
                  Welcome to the Gmail-style Interface
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                  This is a complete demonstration of the Gmail-inspired layout components we've built:
                </Typography>
                
                <Box sx={{ textAlign: 'left', mb: 3 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1a73e8', mb: 1 }}>
                    ✅ Implemented Components:
                  </Typography>
                  <Box component="ul" sx={{ margin: 0, paddingLeft: '1.2rem', fontSize: '14px', color: '#5f6368' }}>
                    <li><strong>Top Navigation Bar</strong> - Gmail-style header with search</li>
                    <li><strong>Left Sidebar</strong> - Document list with virtual scrolling</li>
                    <li><strong>Main Content Area</strong> - Document preview with lazy loading</li>
                    <li><strong>Right Settings Drawer</strong> - Tabbed settings panel</li>
                    <li><strong>Responsive Design</strong> - Mobile-friendly layout</li>
                    <li><strong>Action Toolbar</strong> - Share, edit, delete, and more</li>
                  </Box>
                </Box>
                
                <Typography variant="body2" color="text.secondary">
                  Select a document from the sidebar to see the preview area in action!
                </Typography>
              </CardContent>
            </Card>
          )}
        </Box>
      </Box>
    </GmailLayout>
  );
};

export const Head = () => (
  <Seo 
    title="Complete Gmail-style Layout" 
    description="Full demonstration of Gmail-inspired interface with navigation, document list, and preview components working together."
  />
);

export default GmailLayoutComplete; 