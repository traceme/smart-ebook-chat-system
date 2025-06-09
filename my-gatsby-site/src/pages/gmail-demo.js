import React, { useState } from 'react';
import { Box, Typography, Card, CardContent, Chip, Paper } from '@mui/material';
import GmailLayout from '../components/GmailLayout';
import Seo from '../components/seo';

const GmailDemo = () => {
  const [searchValue, setSearchValue] = useState('');
  
  // Mock user data
  const mockUser = {
    name: 'John Doe',
    email: 'john.doe@example.com',
    avatar: null, // Will use default avatar
  };

  // Mock data for demonstration
  const sampleDocuments = [
    {
      id: 1,
      title: 'Machine Learning Fundamentals',
      snippet: 'Introduction to neural networks and deep learning concepts...',
      tags: ['AI', 'Education'],
      uploadDate: '2024-01-15',
    },
    {
      id: 2,
      title: 'React Development Guide',
      snippet: 'Best practices for building modern React applications...',
      tags: ['Programming', 'Web Dev'],
      uploadDate: '2024-01-10',
    },
    {
      id: 3,
      title: 'Data Science Handbook',
      snippet: 'Comprehensive guide to data analysis and visualization...',
      tags: ['Data Science', 'Analytics'],
      uploadDate: '2024-01-05',
    },
  ];

  const handleSearch = (value) => {
    setSearchValue(value);
  };

  // Filter documents based on search
  const filteredDocuments = sampleDocuments.filter(doc =>
    doc.title.toLowerCase().includes(searchValue.toLowerCase()) ||
    doc.snippet.toLowerCase().includes(searchValue.toLowerCase()) ||
    doc.tags.some(tag => tag.toLowerCase().includes(searchValue.toLowerCase()))
  );

  const customSidebarContent = (
    <Box sx={{ p: 2, height: '100%' }}>
      <Typography variant="h6" sx={{ mb: 2, fontSize: '16px', fontWeight: 500 }}>
        📂 Document Library
      </Typography>
      
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" sx={{ mb: 1, fontSize: '12px', color: '#5f6368', textTransform: 'uppercase' }}>
          Quick Actions
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {[
            { icon: '📄', label: 'All Documents', count: 3 },
            { icon: '💬', label: 'Conversations', count: 5 },
            { icon: '🔍', label: 'Recent Searches', count: 2 },
            { icon: '⭐', label: 'Favorites', count: 1 },
          ].map((item) => (
            <Box
              key={item.label}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                p: 1.5,
                borderRadius: 1,
                cursor: 'pointer',
                fontSize: '14px',
                color: '#5f6368',
                '&:hover': {
                  backgroundColor: '#f1f3f4',
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Box>
              <Chip 
                label={item.count} 
                size="small" 
                sx={{ 
                  height: '20px', 
                  fontSize: '11px',
                  backgroundColor: '#e8f0fe',
                  color: '#1a73e8'
                }} 
              />
            </Box>
          ))}
        </Box>
      </Box>

      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" sx={{ mb: 1, fontSize: '12px', color: '#5f6368', textTransform: 'uppercase' }}>
          Tags
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {['AI', 'Programming', 'Data Science', 'Education', 'Web Dev'].map((tag) => (
            <Chip
              key={tag}
              label={tag}
              size="small"
              variant="outlined"
              sx={{
                height: '28px',
                fontSize: '12px',
                borderColor: '#dadce0',
                color: '#5f6368',
                '&:hover': {
                  backgroundColor: '#f1f3f4',
                },
              }}
            />
          ))}
        </Box>
      </Box>
    </Box>
  );

  return (
    <GmailLayout
      user={mockUser}
      onSearch={handleSearch}
      searchValue={searchValue}
      sidebarContent={customSidebarContent}
    >
      <Box sx={{ p: 3, height: '100%' }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" sx={{ mb: 1, fontWeight: 400 }}>
            📚 Smart eBook Chat System
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Gmail-style Interface Demo
          </Typography>
        </Box>

        {/* Search Results or Document List */}
        <Box>
          <Typography variant="h6" sx={{ mb: 2, fontSize: '16px', fontWeight: 500 }}>
            {searchValue ? `Search results for "${searchValue}"` : 'Recent Documents'}
            <Chip 
              label={filteredDocuments.length} 
              size="small" 
              sx={{ ml: 2, backgroundColor: '#e8f0fe', color: '#1a73e8' }}
            />
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {filteredDocuments.length > 0 ? (
              filteredDocuments.map((doc) => (
                <Card 
                  key={doc.id} 
                  sx={{ 
                    cursor: 'pointer',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': { 
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      transform: 'translateY(-1px)'
                    }
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'flex-start', mb: 1 }}>
                      <Typography variant="h6" sx={{ fontSize: '16px', fontWeight: 500, mb: 1 }}>
                        {doc.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                        {doc.uploadDate}
                      </Typography>
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {doc.snippet}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {doc.tags.map((tag) => (
                        <Chip
                          key={tag}
                          label={tag}
                          size="small"
                          sx={{
                            height: '24px',
                            fontSize: '11px',
                            backgroundColor: '#f1f3f4',
                            color: '#5f6368',
                          }}
                        />
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Paper sx={{ p: 4, textAlign: 'center', backgroundColor: '#fafafa' }}>
                <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                  🔍 No documents found
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {searchValue 
                    ? `No documents match "${searchValue}". Try a different search term.`
                    : 'Upload some documents to get started!'
                  }
                </Typography>
              </Paper>
            )}
          </Box>
        </Box>

        {/* Demo Features Info */}
        <Box sx={{ mt: 4, p: 3, backgroundColor: '#f8f9fa', borderRadius: 2 }}>
          <Typography variant="h6" sx={{ mb: 2, fontSize: '16px', fontWeight: 500 }}>
            🎯 Demo Features
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1a73e8' }}>
                Navigation Features:
              </Typography>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '14px', color: '#5f6368' }}>
                <li>Gmail-style top navigation bar</li>
                <li>Responsive search with '/' keyboard shortcut</li>
                <li>Collapsible sidebar with quick actions</li>
                <li>User menu with avatar and dropdown</li>
                <li>Mobile-responsive design</li>
              </ul>
            </Box>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1a73e8' }}>
                Try These:
              </Typography>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '14px', color: '#5f6368' }}>
                <li>Press '/' to focus search bar</li>
                <li>Click the menu button to toggle sidebar</li>
                <li>Try searching for "AI" or "React"</li>
                <li>Click your avatar for user menu</li>
                <li>Resize window to see mobile layout</li>
              </ul>
            </Box>
          </Box>
        </Box>
      </Box>
    </GmailLayout>
  );
};

export const Head = () => (
  <Seo 
    title="Gmail-style Interface Demo" 
    description="Demonstration of Gmail-inspired navigation and layout components for the Smart eBook Chat System."
  />
);

export default GmailDemo; 