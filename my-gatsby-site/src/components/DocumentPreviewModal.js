import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Chip,
  IconButton,
  Tabs,
  Tab,
  Paper,
  Grid,
  TextField,
  Autocomplete,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Alert,
  CircularProgress,
  Card,
  CardContent,
} from '@mui/material';
import {
  Close as CloseIcon,
  Download as DownloadIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Description as DocumentIcon,
  PictureAsPdf as PdfIcon,
  Article as DocIcon,
  MenuBook as BookIcon,
  Visibility as PreviewIcon,
  Info as InfoIcon,
  Tag as TagIcon,
  DateRange as DateIcon,
  Storage as SizeIcon,
  Person as AuthorIcon,
  Language as LanguageIcon,
  Assignment as PageIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

const TabPanel = ({ children, value, index, ...other }) => (
  <div
    role="tabpanel"
    hidden={value !== index}
    id={`preview-tabpanel-${index}`}
    aria-labelledby={`preview-tab-${index}`}
    {...other}
  >
    {value === index && (
      <Box sx={{ p: 3 }}>
        {children}
      </Box>
    )}
  </div>
);

const PreviewContainer = styled(Box)(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.grey[50],
  minHeight: 400,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
  overflow: 'hidden',
}));

const MetadataCard = styled(Card)(({ theme }) => ({
  height: '100%',
  '& .MuiCardContent-root': {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
}));

// Mock document content for preview
const generateMockContent = (document) => {
  const contentSamples = {
    pdf: `# ${document.title}

## Chapter 1: Introduction

This is a sample preview of the PDF document. The actual content would be extracted from the PDF file and displayed here.

### Key Points:
- Machine learning fundamentals
- Algorithm implementations
- Practical applications
- Case studies and examples

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.`,
    
    docx: `# ${document.title}

## Document Overview

This Word document contains detailed information about React development practices and patterns.

### Contents:
1. Introduction to React
2. Component Architecture
3. State Management
4. Performance Optimization
5. Testing Strategies

The document provides comprehensive guidance for modern React development...`,
    
    epub: `# ${document.title}

## Table of Contents

### Part I: Foundations
- Chapter 1: The Pragmatic Philosophy
- Chapter 2: A Pragmatic Approach
- Chapter 3: The Basic Tools

### Part II: A Pragmatic Approach
- Chapter 4: Pragmatic Paranoia
- Chapter 5: Bend, or Break
- Chapter 6: While You Are Coding

This classic book offers practical advice for software developers...`,
    
    txt: `${document.title}

API DOCUMENTATION
================

Overview
--------
This documentation covers all REST API endpoints available in the system.

Authentication
--------------
All API requests require authentication using Bearer tokens.

Endpoints
---------
GET /api/documents - List all documents
POST /api/documents - Create new document
GET /api/documents/:id - Get specific document
PUT /api/documents/:id - Update document
DELETE /api/documents/:id - Delete document`
  };

  return contentSamples[document.type] || 'Content preview not available for this file type.';
};

const DocumentPreviewModal = ({ 
  open, 
  onClose, 
  document, 
  onUpdate, 
  existingTags = [],
  onDownload 
}) => {
  const [tabValue, setTabValue] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editedDocument, setEditedDocument] = useState(null);
  const [loading, setLoading] = useState(false);
  const [previewContent, setPreviewContent] = useState('');

  // Initialize edited document when modal opens
  useEffect(() => {
    if (document) {
      setEditedDocument({ ...document });
      setPreviewContent(generateMockContent(document));
      setLoading(false);
    }
  }, [document]);

  // Get file icon
  const getFileIcon = (type) => {
    switch (type) {
      case 'pdf': return <PdfIcon color="error" />;
      case 'docx': return <DocIcon color="primary" />;
      case 'epub': return <BookIcon color="secondary" />;
      case 'txt': return <DocumentIcon />;
      default: return <DocumentIcon />;
    }
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format date
  const formatDate = (date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  // Handle save changes
  const handleSave = () => {
    if (onUpdate) {
      onUpdate(editedDocument);
    }
    setIsEditing(false);
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditedDocument({ ...document });
    setIsEditing(false);
  };

  // Handle download
  const handleDownload = () => {
    if (onDownload) {
      onDownload(document);
    }
  };

  if (!document) return null;

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { height: '90vh' }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {getFileIcon(document.type)}
          <Box>
            <Typography variant="h6" noWrap>
              {document.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {formatFileSize(document.size)} • {formatDate(document.uploadDate)}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={handleDownload} color="primary">
            <DownloadIcon />
          </IconButton>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab icon={<PreviewIcon />} label="Preview" />
          <Tab icon={<InfoIcon />} label="Details" />
          <Tab icon={<TagIcon />} label="Metadata" />
        </Tabs>
      </Box>

      <DialogContent sx={{ p: 0, height: '100%', overflow: 'hidden' }}>
        {/* Preview Tab */}
        <TabPanel value={tabValue} index={0}>
          <PreviewContainer>
            {loading ? (
              <CircularProgress />
            ) : (
              <Box sx={{ 
                width: '100%', 
                height: '100%', 
                p: 3, 
                overflow: 'auto',
                fontFamily: 'monospace',
                whiteSpace: 'pre-wrap'
              }}>
                {previewContent}
              </Box>
            )}
          </PreviewContainer>
        </TabPanel>

        {/* Details Tab */}
        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <MetadataCard>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    📋 Document Information
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemIcon><DocumentIcon /></ListItemIcon>
                      <ListItemText 
                        primary="File Name" 
                        secondary={document.title}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><SizeIcon /></ListItemIcon>
                      <ListItemText 
                        primary="File Size" 
                        secondary={formatFileSize(document.size)}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><DateIcon /></ListItemIcon>
                      <ListItemText 
                        primary="Upload Date" 
                        secondary={formatDate(document.uploadDate)}
                      />
                    </ListItem>
                    {document.pageCount && (
                      <ListItem>
                        <ListItemIcon><PageIcon /></ListItemIcon>
                        <ListItemText 
                          primary="Pages" 
                          secondary={`${document.pageCount} pages`}
                        />
                      </ListItem>
                    )}
                  </List>
                </CardContent>
              </MetadataCard>
            </Grid>

            <Grid item xs={12} md={6}>
              <MetadataCard>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    ⚡ Processing Information
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText 
                        primary="Status" 
                        secondary={
                          <Chip 
                            label={document.status}
                            color={
                              document.status === 'processed' ? 'success' :
                              document.status === 'processing' ? 'warning' :
                              document.status === 'error' ? 'error' : 'default'
                            }
                            size="small"
                          />
                        }
                      />
                    </ListItem>
                    {document.processingTime && (
                      <ListItem>
                        <ListItemText 
                          primary="Processing Time" 
                          secondary={`${document.processingTime} seconds`}
                        />
                      </ListItem>
                    )}
                    <ListItem>
                      <ListItemText 
                        primary="Shared" 
                        secondary={document.shared ? 'Yes' : 'No'}
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </MetadataCard>
            </Grid>

            <Grid item xs={12}>
              <MetadataCard>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    📝 Description
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    {document.description || 'No description available.'}
                  </Typography>
                </CardContent>
              </MetadataCard>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Metadata Tab */}
        <TabPanel value={tabValue} index={2}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6">
              Document Metadata
            </Typography>
            {!isEditing ? (
              <Button
                startIcon={<EditIcon />}
                onClick={() => setIsEditing(true)}
                variant="outlined"
              >
                Edit
              </Button>
            ) : (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  startIcon={<SaveIcon />}
                  onClick={handleSave}
                  variant="contained"
                  color="primary"
                >
                  Save
                </Button>
                <Button
                  startIcon={<CancelIcon />}
                  onClick={handleCancelEdit}
                  variant="outlined"
                >
                  Cancel
                </Button>
              </Box>
            )}
          </Box>

          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                label="Title"
                value={editedDocument?.title || ''}
                onChange={(e) => setEditedDocument(prev => ({ ...prev, title: e.target.value }))}
                fullWidth
                disabled={!isEditing}
                variant={isEditing ? "outlined" : "filled"}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Description"
                value={editedDocument?.description || ''}
                onChange={(e) => setEditedDocument(prev => ({ ...prev, description: e.target.value }))}
                fullWidth
                multiline
                rows={4}
                disabled={!isEditing}
                variant={isEditing ? "outlined" : "filled"}
              />
            </Grid>

            <Grid item xs={12}>
              <Autocomplete
                multiple
                options={existingTags}
                value={editedDocument?.tags || []}
                onChange={(e, newValue) => setEditedDocument(prev => ({ ...prev, tags: newValue }))}
                freeSolo
                disabled={!isEditing}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip 
                      variant="outlined" 
                      label={option} 
                      {...getTagProps({ index })}
                      disabled={!isEditing}
                    />
                  ))
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Tags"
                    placeholder={isEditing ? "Add tags..." : ""}
                    variant={isEditing ? "outlined" : "filled"}
                  />
                )}
              />
            </Grid>

            {isEditing && (
              <Grid item xs={12}>
                <Alert severity="info">
                  Changes will be applied to the document metadata. Tags help organize and search for documents.
                </Alert>
              </Grid>
            )}
          </Grid>

          {/* Tags Display */}
          {!isEditing && (editedDocument?.tags?.length > 0) && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Current Tags:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {editedDocument.tags.map((tag, index) => (
                  <Chip key={index} label={tag} variant="outlined" />
                ))}
              </Box>
            </Box>
          )}
        </TabPanel>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <Button onClick={onClose}>
            Close
          </Button>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              startIcon={<DownloadIcon />}
              onClick={handleDownload}
              variant="outlined"
            >
              Download
            </Button>
          </Box>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default DocumentPreviewModal; 