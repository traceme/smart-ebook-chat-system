import React, { useState, useMemo, useCallback } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Typography,
  Chip,
  IconButton,
  Collapse,
  Divider,
  TextField,
  InputAdornment,
  Paper,
} from '@mui/material';
import { styled } from '@mui/material/styles';

// Mock document data generator for testing
const generateMockDocuments = (count = 100) => {
  const documentTypes = ['📄', '📊', '📈', '📚', '📝', '🔬', '💻', '🎯'];
  const categories = ['AI/ML', 'Programming', 'Business', 'Science', 'Education', 'Research'];
  const statuses = ['processed', 'processing', 'pending', 'error'];
  
  return Array.from({ length: count }, (_, index) => ({
    id: `doc-${index + 1}`,
    title: `Document ${index + 1}: ${['Machine Learning Guide', 'React Tutorial', 'Business Plan', 'Research Paper', 'Study Notes'][index % 5]}`,
    category: categories[index % categories.length],
    type: documentTypes[index % documentTypes.length],
    size: `${Math.floor(Math.random() * 500 + 50)}KB`,
    status: statuses[index % statuses.length],
    uploadDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
    tags: categories.slice(0, Math.floor(Math.random() * 3) + 1),
    isSelected: false,
  }));
};

// Styled components
const StyledListItem = styled(ListItem)(({ theme, selected }) => ({
  padding: 0,
  borderRadius: '0 20px 20px 0',
  margin: '1px 8px 1px 0',
  '&:hover': {
    backgroundColor: selected ? '#e8f0fe' : '#f1f3f4',
  },
  backgroundColor: selected ? '#e8f0fe' : 'transparent',
}));

const StyledListItemButton = styled(ListItemButton)(({ theme }) => ({
  padding: '8px 16px',
  minHeight: '48px',
  '&:hover': {
    backgroundColor: 'transparent',
  },
  '&.Mui-selected': {
    backgroundColor: 'transparent',
    '&:hover': {
      backgroundColor: 'transparent',
    },
  },
}));

const CategoryHeader = styled(Box)(({ theme }) => ({
  padding: '12px 16px 8px',
  borderBottom: '1px solid #dadce0',
  backgroundColor: '#fafafa',
  position: 'sticky',
  top: 0,
  zIndex: 1,
}));

// Virtual scrolling implementation using basic windowing
const VirtualizedDocumentList = ({ 
  documents, 
  itemHeight = 60, 
  maxHeight = 400, 
  onDocumentSelect,
  selectedDocument,
  searchTerm = '',
  collapsed = false
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  
  const filteredDocuments = useMemo(() => {
    if (!searchTerm) return documents;
    
    return documents.filter(doc =>
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [documents, searchTerm]);

  const visibleRange = useMemo(() => {
    const containerHeight = maxHeight;
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight) + 1,
      filteredDocuments.length
    );
    
    return { startIndex, endIndex };
  }, [scrollTop, itemHeight, maxHeight, filteredDocuments.length]);

  const handleScroll = useCallback((event) => {
    setScrollTop(event.target.scrollTop);
  }, []);

  const visibleDocuments = filteredDocuments.slice(
    visibleRange.startIndex,
    visibleRange.endIndex
  );

  const totalHeight = filteredDocuments.length * itemHeight;
  const offsetY = visibleRange.startIndex * itemHeight;

  if (collapsed) {
    return (
      <Box sx={{ textAlign: 'center', py: 2 }}>
        <Typography variant="caption" color="text.secondary">
          {filteredDocuments.length}
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{ 
        height: maxHeight, 
        overflow: 'auto',
        position: 'relative',
        '&::-webkit-scrollbar': {
          width: '8px',
        },
        '&::-webkit-scrollbar-track': {
          background: '#f1f1f1',
        },
        '&::-webkit-scrollbar-thumb': {
          background: '#c1c1c1',
          borderRadius: '4px',
        },
        '&::-webkit-scrollbar-thumb:hover': {
          background: '#a1a1a1',
        },
      }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleDocuments.map((document, index) => {
            const actualIndex = visibleRange.startIndex + index;
            const isSelected = selectedDocument?.id === document.id;
            
            return (
              <StyledListItem key={document.id} selected={isSelected}>
                <StyledListItemButton
                  selected={isSelected}
                  onClick={() => onDocumentSelect(document)}
                  sx={{ width: '100%' }}
                >
                  <ListItemIcon sx={{ minWidth: '40px' }}>
                    <Box sx={{ fontSize: '18px' }}>{document.type}</Box>
                  </ListItemIcon>
                  
                  <ListItemText
                    primary={
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: isSelected ? 600 : 400,
                          color: isSelected ? '#1a73e8' : '#202124',
                          fontSize: '14px',
                          lineHeight: 1.3,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {document.title}
                      </Typography>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          {document.size}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          •
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {document.uploadDate}
                        </Typography>
                        <Chip
                          label={document.status}
                          size="small"
                          sx={{
                            height: '16px',
                            fontSize: '10px',
                            ml: 'auto',
                            backgroundColor: document.status === 'processed' ? '#e8f5e8' : 
                                           document.status === 'processing' ? '#fff3e0' :
                                           document.status === 'error' ? '#ffebee' : '#f5f5f5',
                            color: document.status === 'processed' ? '#2e7d32' : 
                                   document.status === 'processing' ? '#f57c00' :
                                   document.status === 'error' ? '#d32f2f' : '#757575',
                          }}
                        />
                      </Box>
                    }
                  />
                </StyledListItemButton>
              </StyledListItem>
            );
          })}
        </div>
      </div>
    </Box>
  );
};

const DocumentList = ({ 
  documents: propDocuments,
  onDocumentSelect = () => {},
  selectedDocument = null,
  searchTerm = '',
  collapsed = false,
  showSearch = true,
  maxHeight = 400,
}) => {
  const [internalSearchTerm, setInternalSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState(new Set(['Recent']));
  
  // Use provided documents or generate mock data
  const documents = useMemo(() => {
    return propDocuments || generateMockDocuments(150);
  }, [propDocuments]);

  const effectiveSearchTerm = searchTerm || internalSearchTerm;

  // Group documents by category
  const groupedDocuments = useMemo(() => {
    const filtered = documents.filter(doc =>
      !effectiveSearchTerm || 
      doc.title.toLowerCase().includes(effectiveSearchTerm.toLowerCase()) ||
      doc.category.toLowerCase().includes(effectiveSearchTerm.toLowerCase()) ||
      doc.tags.some(tag => tag.toLowerCase().includes(effectiveSearchTerm.toLowerCase()))
    );

    const groups = filtered.reduce((acc, doc) => {
      const category = doc.category || 'Uncategorized';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(doc);
      return acc;
    }, {});

    // Add recent documents group
    const recentDocs = filtered.slice(0, 10);
    if (recentDocs.length > 0) {
      groups['Recent'] = recentDocs;
    }

    return groups;
  }, [documents, effectiveSearchTerm]);

  const toggleCategory = (category) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const allDocuments = useMemo(() => {
    return Object.values(groupedDocuments).flat();
  }, [groupedDocuments]);

  if (collapsed) {
    return (
      <Box sx={{ p: 1, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '12px' }}>
          📄 {documents.length}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Search Bar */}
      {showSearch && (
        <Box sx={{ p: 2, borderBottom: '1px solid #dadce0' }}>
          <TextField
            size="small"
            placeholder="Search documents..."
            value={internalSearchTerm}
            onChange={(e) => setInternalSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <span style={{ fontSize: '16px' }}>🔍</span>
                </InputAdornment>
              ),
            }}
            sx={{
              width: '100%',
              '& .MuiOutlinedInput-root': {
                backgroundColor: '#f1f3f4',
                '&:hover': {
                  backgroundColor: '#fff',
                },
                '&.Mui-focused': {
                  backgroundColor: '#fff',
                },
              },
            }}
          />
        </Box>
      )}

      {/* Document List */}
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        {effectiveSearchTerm ? (
          // Flat list for search results with virtual scrolling
          <VirtualizedDocumentList
            documents={allDocuments}
            onDocumentSelect={onDocumentSelect}
            selectedDocument={selectedDocument}
            searchTerm={effectiveSearchTerm}
            maxHeight={maxHeight}
          />
        ) : (
          // Grouped list by category
          <Box sx={{ height: '100%', overflow: 'auto' }}>
            {Object.entries(groupedDocuments).map(([category, categoryDocs]) => (
              <Box key={category}>
                <CategoryHeader>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                    }}
                    onClick={() => toggleCategory(category)}
                  >
                    <Typography variant="subtitle2" sx={{ fontSize: '12px', fontWeight: 600, color: '#5f6368' }}>
                      {category.toUpperCase()}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip
                        label={categoryDocs.length}
                        size="small"
                        sx={{
                          height: '18px',
                          fontSize: '10px',
                          backgroundColor: '#e8f0fe',
                          color: '#1a73e8',
                        }}
                      />
                      <Typography sx={{ fontSize: '12px', color: '#5f6368' }}>
                        {expandedCategories.has(category) ? '▼' : '▶'}
                      </Typography>
                    </Box>
                  </Box>
                </CategoryHeader>

                <Collapse in={expandedCategories.has(category)}>
                  <VirtualizedDocumentList
                    documents={categoryDocs}
                    onDocumentSelect={onDocumentSelect}
                    selectedDocument={selectedDocument}
                    maxHeight={Math.min(300, categoryDocs.length * 60)}
                  />
                </Collapse>
              </Box>
            ))}
          </Box>
        )}
      </Box>

      {/* Footer Stats */}
      <Box sx={{ p: 2, borderTop: '1px solid #dadce0', backgroundColor: '#fafafa' }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
          {allDocuments.length} document{allDocuments.length !== 1 ? 's' : ''} 
          {effectiveSearchTerm && ` matching "${effectiveSearchTerm}"`}
        </Typography>
      </Box>
    </Box>
  );
};

export default DocumentList; 