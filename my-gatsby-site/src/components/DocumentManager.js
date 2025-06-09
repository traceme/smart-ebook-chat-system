import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  TextField,
  Button,
  IconButton,
  Chip,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Checkbox,
  Fab,
  Tooltip,
  Menu,
  Divider,
  LinearProgress,
  Alert,
  Snackbar,
  Card,
  CardContent,
  CardActions,
  Avatar,
  Badge,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Sort as SortIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewGridIcon,
  Upload as UploadIcon,
  MoreVert as MoreIcon,
  Description as DocumentIcon,
  PictureAsPdf as PdfIcon,
  Article as DocIcon,
  MenuBook as BookIcon,
  Image as ImageIcon,
  Code as CodeIcon,
  Share as ShareIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Archive as ArchiveIcon,
  Download as DownloadIcon,
  Visibility as PreviewIcon,
  Label as TagIcon,
  DateRange as DateIcon,
  Storage as SizeIcon,
  CheckCircle as ProcessedIcon,
  Error as ErrorIcon,
  Schedule as PendingIcon,
  CloudUpload as UploadingIcon,
  Add as AddIcon,
  Close as CloseIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import DocumentUploadModal from './DocumentUploadModal';
import DocumentPreviewModal from './DocumentPreviewModal';
import { styled } from '@mui/material/styles';

// Styled components
const SearchContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(2),
  marginBottom: theme.spacing(3),
  padding: theme.spacing(2),
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[2],
}));

const DocumentCard = styled(Card)(({ theme, selected }) => ({
  height: '100%',
  cursor: 'pointer',
  transition: 'all 0.2s ease-in-out',
  border: selected ? `2px solid ${theme.palette.primary.main}` : '1px solid transparent',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: theme.shadows[4],
    borderColor: theme.palette.primary.light,
  },
}));

const DocumentListItem = styled(ListItem)(({ theme, selected }) => ({
  backgroundColor: selected ? theme.palette.action.selected : 'transparent',
  borderRadius: theme.shape.borderRadius,
  marginBottom: theme.spacing(0.5),
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
}));

const StatusBadge = styled(Badge)(({ theme, status }) => ({
  '& .MuiBadge-badge': {
    backgroundColor: 
      status === 'processed' ? theme.palette.success.main :
      status === 'processing' ? theme.palette.warning.main :
      status === 'error' ? theme.palette.error.main :
      theme.palette.grey[500],
    color: 'white',
  },
}));

const UploadZone = styled(Box)(({ theme, isDragOver }) => ({
  border: `2px dashed ${isDragOver ? theme.palette.primary.main : theme.palette.grey[300]}`,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(4),
  textAlign: 'center',
  backgroundColor: isDragOver ? theme.palette.primary.light + '20' : theme.palette.grey[50],
  transition: 'all 0.2s ease-in-out',
  cursor: 'pointer',
  '&:hover': {
    borderColor: theme.palette.primary.main,
    backgroundColor: theme.palette.primary.light + '10',
  },
}));

// Mock data - in real app this would come from API
const generateMockDocuments = () => [
  {
    id: '1',
    title: 'Machine Learning Fundamentals.pdf',
    type: 'pdf',
    size: 2485760,
    uploadDate: new Date('2024-01-15'),
    status: 'processed',
    tags: ['machine-learning', 'AI', 'education'],
    pageCount: 156,
    processingTime: 45,
    shared: false,
    description: 'Comprehensive guide to machine learning algorithms and applications.',
  },
  {
    id: '2',
    title: 'React Development Guide.docx',
    type: 'docx',
    size: 1024000,
    uploadDate: new Date('2024-01-14'),
    status: 'processing',
    tags: ['react', 'frontend', 'development'],
    pageCount: 89,
    processingTime: null,
    shared: true,
    description: 'Step-by-step guide for React development best practices.',
  },
  {
    id: '3',
    title: 'The Pragmatic Programmer.epub',
    type: 'epub',
    size: 3145728,
    uploadDate: new Date('2024-01-13'),
    status: 'processed',
    tags: ['programming', 'book', 'software-engineering'],
    pageCount: 352,
    processingTime: 78,
    shared: false,
    description: 'Classic software engineering book by Andy Hunt and Dave Thomas.',
  },
  {
    id: '4',
    title: 'API Documentation.txt',
    type: 'txt',
    size: 51200,
    uploadDate: new Date('2024-01-12'),
    status: 'error',
    tags: ['API', 'documentation'],
    pageCount: null,
    processingTime: null,
    shared: false,
    description: 'Technical documentation for REST API endpoints.',
  },
  {
    id: '5',
    title: 'Design Patterns.pdf',
    type: 'pdf',
    size: 4194304,
    uploadDate: new Date('2024-01-11'),
    status: 'processed',
    tags: ['design-patterns', 'programming', 'architecture'],
    pageCount: 248,
    processingTime: 62,
    shared: true,
    description: 'Gang of Four design patterns explained with examples.',
  },
];

const DocumentManager = () => {
  // State management
  const [documents, setDocuments] = useState(generateMockDocuments());
  const [selectedDocuments, setSelectedDocuments] = useState(new Set());
  const [viewMode, setViewMode] = useState('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('uploadDate');
  const [sortOrder, setSortOrder] = useState('desc');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('');
  
  // Menu states
  const [actionMenuAnchor, setActionMenuAnchor] = useState(null);
  const [sortMenuAnchor, setSortMenuAnchor] = useState(null);
  const [selectedDocument, setSelectedDocument] = useState(null);
  
  // Upload states
  const [uploadProgress, setUploadProgress] = useState({});
  
  // Notification state
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });

  // Get file icon based on type
  const getFileIcon = (type, size = 'medium') => {
    const iconProps = { fontSize: size };
    switch (type) {
      case 'pdf': return <PdfIcon {...iconProps} color="error" />;
      case 'docx': return <DocIcon {...iconProps} color="primary" />;
      case 'epub': return <BookIcon {...iconProps} color="secondary" />;
      case 'txt': return <DocumentIcon {...iconProps} />;
      default: return <DocumentIcon {...iconProps} />;
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
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  // Get all unique tags
  const allTags = useMemo(() => {
    const tags = new Set();
    documents.forEach(doc => {
      doc.tags.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [documents]);

  // Filter and sort documents
  const filteredAndSortedDocuments = useMemo(() => {
    let filtered = documents.filter(doc => {
      if (searchQuery && !doc.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !doc.description.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      if (statusFilter !== 'all' && doc.status !== statusFilter) {
        return false;
      }
      
      if (typeFilter !== 'all' && doc.type !== typeFilter) {
        return false;
      }
      
      if (tagFilter && !doc.tags.includes(tagFilter)) {
        return false;
      }
      
      return true;
    });

    filtered.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      if (sortBy === 'uploadDate') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [documents, searchQuery, statusFilter, typeFilter, tagFilter, sortBy, sortOrder]);

  // Handle document selection
  const handleDocumentSelect = (documentId) => {
    const newSelected = new Set(selectedDocuments);
    if (newSelected.has(documentId)) {
      newSelected.delete(documentId);
    } else {
      newSelected.add(documentId);
    }
    setSelectedDocuments(newSelected);
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedDocuments.size === filteredAndSortedDocuments.length) {
      setSelectedDocuments(new Set());
    } else {
      setSelectedDocuments(new Set(filteredAndSortedDocuments.map(doc => doc.id)));
    }
  };

  // Document actions
  const handlePreview = (document) => {
    showNotification(`Previewing ${document.title}`, 'info');
  };

  const handleDownload = (document) => {
    showNotification(`Downloading ${document.title}...`, 'info');
  };

  const handleDelete = (documentIds) => {
    const idsArray = Array.isArray(documentIds) ? documentIds : [documentIds];
    setDocuments(prev => prev.filter(doc => !idsArray.includes(doc.id)));
    setSelectedDocuments(new Set());
    showNotification(`Deleted ${idsArray.length} document(s)`, 'success');
  };

  const handleArchive = (documentIds) => {
    const idsArray = Array.isArray(documentIds) ? documentIds : [documentIds];
    showNotification(`Archived ${idsArray.length} document(s)`, 'success');
  };

  // Show notification
  const showNotification = (message, severity = 'info') => {
    setNotification({ open: true, message, severity });
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
          📚 Document Manager
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage your documents with advanced search, filtering, and organization tools
        </Typography>
      </Box>

      {/* Search and Filters */}
      <SearchContainer>
        <TextField
          placeholder="Search documents..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ flex: 1 }}
        />
        
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            label="Status"
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <MenuItem value="all">All Status</MenuItem>
            <MenuItem value="processed">Processed</MenuItem>
            <MenuItem value="processing">Processing</MenuItem>
            <MenuItem value="error">Error</MenuItem>
          </Select>
        </FormControl>
        
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Type</InputLabel>
          <Select
            value={typeFilter}
            label="Type"
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <MenuItem value="all">All Types</MenuItem>
            <MenuItem value="pdf">PDF</MenuItem>
            <MenuItem value="docx">DOCX</MenuItem>
            <MenuItem value="epub">EPUB</MenuItem>
            <MenuItem value="txt">TXT</MenuItem>
          </Select>
        </FormControl>
        
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Tag</InputLabel>
          <Select
            value={tagFilter}
            label="Tag"
            onChange={(e) => setTagFilter(e.target.value)}
          >
            <MenuItem value="">All Tags</MenuItem>
            {allTags.map(tag => (
              <MenuItem key={tag} value={tag}>{tag}</MenuItem>
            ))}
          </Select>
        </FormControl>
        
        <Tooltip title="Sort">
          <IconButton onClick={(e) => setSortMenuAnchor(e.currentTarget)}>
            <SortIcon />
          </IconButton>
        </Tooltip>
        
        <Tooltip title={viewMode === 'grid' ? 'List View' : 'Grid View'}>
          <IconButton onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}>
            {viewMode === 'grid' ? <ViewListIcon /> : <ViewGridIcon />}
          </IconButton>
        </Tooltip>
      </SearchContainer>

      {/* Selection Actions */}
      {selectedDocuments.size > 0 && (
        <Paper sx={{ p: 2, mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body2">
            {selectedDocuments.size} document(s) selected
          </Typography>
          <Button
            startIcon={<ShareIcon />}
            onClick={() => showNotification('Share functionality coming soon!', 'info')}
            size="small"
          >
            Share
          </Button>
          <Button
            startIcon={<ArchiveIcon />}
            onClick={() => handleArchive(Array.from(selectedDocuments))}
            size="small"
          >
            Archive
          </Button>
          <Button
            startIcon={<DeleteIcon />}
            onClick={() => handleDelete(Array.from(selectedDocuments))}
            color="error"
            size="small"
          >
            Delete
          </Button>
          <Button
            onClick={() => setSelectedDocuments(new Set())}
            size="small"
          >
            Clear Selection
          </Button>
        </Paper>
      )}

      {/* Upload Progress */}
      {Object.keys(uploadProgress).length > 0 && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            Uploading Files
          </Typography>
          {Object.entries(uploadProgress).map(([id, upload]) => (
            <Box key={id} sx={{ mb: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2">{upload.name}</Typography>
                <Typography variant="body2">{Math.round(upload.progress)}%</Typography>
              </Box>
              <LinearProgress variant="determinate" value={upload.progress} />
            </Box>
          ))}
        </Paper>
      )}

      {/* Documents Display */}
      {viewMode === 'grid' ? (
        <Grid container spacing={2}>
          {filteredAndSortedDocuments.map((document) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={document.id}>
              <DocumentCard
                selected={selectedDocuments.has(document.id)}
                onClick={() => handlePreview(document)}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <StatusBadge
                      badgeContent=" "
                      status={document.status}
                      sx={{ mr: 1 }}
                    >
                      {getFileIcon(document.type)}
                    </StatusBadge>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="h6" component="h3" noWrap>
                        {document.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {formatFileSize(document.size)}
                      </Typography>
                    </Box>
                    <Checkbox
                      checked={selectedDocuments.has(document.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleDocumentSelect(document.id);
                      }}
                      size="small"
                    />
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {document.description}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                    {document.tags.slice(0, 3).map((tag) => (
                      <Chip key={tag} label={tag} size="small" />
                    ))}
                    {document.tags.length > 3 && (
                      <Chip label={`+${document.tags.length - 3}`} size="small" variant="outlined" />
                    )}
                  </Box>
                  
                  <Typography variant="caption" color="text.secondary">
                    {formatDate(document.uploadDate)}
                  </Typography>
                </CardContent>
                
                <CardActions sx={{ justifyContent: 'space-between' }}>
                  <Box>
                    <Tooltip title="Preview">
                      <IconButton size="small" onClick={(e) => {
                        e.stopPropagation();
                        handlePreview(document);
                      }}>
                        <PreviewIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Download">
                      <IconButton size="small" onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(document);
                      }}>
                        <DownloadIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedDocument(document);
                      setActionMenuAnchor(e.currentTarget);
                    }}
                  >
                    <MoreIcon />
                  </IconButton>
                </CardActions>
              </DocumentCard>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Paper>
          <List>
            <ListItem>
              <Checkbox
                checked={selectedDocuments.size === filteredAndSortedDocuments.length && filteredAndSortedDocuments.length > 0}
                indeterminate={selectedDocuments.size > 0 && selectedDocuments.size < filteredAndSortedDocuments.length}
                onChange={handleSelectAll}
              />
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Typography variant="body2" sx={{ width: '40%' }}>Name</Typography>
                    <Typography variant="body2" sx={{ width: '15%' }}>Status</Typography>
                    <Typography variant="body2" sx={{ width: '15%' }}>Size</Typography>
                    <Typography variant="body2" sx={{ width: '20%' }}>Upload Date</Typography>
                    <Typography variant="body2" sx={{ width: '10%' }}>Actions</Typography>
                  </Box>
                }
              />
            </ListItem>
            <Divider />
            
            {filteredAndSortedDocuments.map((document) => (
              <DocumentListItem
                key={document.id}
                selected={selectedDocuments.has(document.id)}
                onClick={() => handlePreview(document)}
              >
                <Checkbox
                  checked={selectedDocuments.has(document.id)}
                  onChange={(e) => {
                    e.stopPropagation();
                    handleDocumentSelect(document.id);
                  }}
                />
                <ListItemIcon>
                  <StatusBadge badgeContent=" " status={document.status}>
                    {getFileIcon(document.type)}
                  </StatusBadge>
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box sx={{ width: '40%' }}>
                        <Typography variant="body2" noWrap>{document.title}</Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                          {document.tags.slice(0, 2).map((tag) => (
                            <Chip key={tag} label={tag} size="small" />
                          ))}
                        </Box>
                      </Box>
                      <Box sx={{ width: '15%' }}>
                        <Chip
                          label={document.status}
                          size="small"
                          color={
                            document.status === 'processed' ? 'success' :
                            document.status === 'processing' ? 'warning' :
                            document.status === 'error' ? 'error' : 'default'
                          }
                        />
                      </Box>
                      <Typography variant="body2" sx={{ width: '15%' }}>
                        {formatFileSize(document.size)}
                      </Typography>
                      <Typography variant="body2" sx={{ width: '20%' }}>
                        {formatDate(document.uploadDate)}
                      </Typography>
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <Tooltip title="Preview">
                    <IconButton size="small" onClick={(e) => {
                      e.stopPropagation();
                      handlePreview(document);
                    }}>
                      <PreviewIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Download">
                    <IconButton size="small" onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(document);
                    }}>
                      <DownloadIcon />
                    </IconButton>
                  </Tooltip>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedDocument(document);
                      setActionMenuAnchor(e.currentTarget);
                    }}
                  >
                    <MoreIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </DocumentListItem>
            ))}
          </List>
        </Paper>
      )}

      {/* Empty State */}
      {filteredAndSortedDocuments.length === 0 && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <DocumentIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No documents found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {searchQuery || statusFilter !== 'all' || typeFilter !== 'all' || tagFilter
              ? 'Try adjusting your search or filters'
              : 'Upload your first document to get started'
            }
          </Typography>
          <Button
            variant="contained"
            startIcon={<UploadIcon />}
            onClick={() => showNotification('Upload functionality coming soon!', 'info')}
          >
            Upload Document
          </Button>
        </Paper>
      )}

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="upload"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => showNotification('Upload functionality coming soon!', 'info')}
      >
        <UploadIcon />
      </Fab>

      {/* Action Menu */}
      <Menu
        anchorEl={actionMenuAnchor}
        open={Boolean(actionMenuAnchor)}
        onClose={() => setActionMenuAnchor(null)}
      >
        <MenuItem onClick={() => {
          handlePreview(selectedDocument);
          setActionMenuAnchor(null);
        }}>
          <ListItemIcon><PreviewIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Preview</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => {
          showNotification('Edit functionality coming soon!', 'info');
          setActionMenuAnchor(null);
        }}>
          <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => {
          showNotification('Share functionality coming soon!', 'info');
          setActionMenuAnchor(null);
        }}>
          <ListItemIcon><ShareIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Share</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => {
          handleDownload(selectedDocument);
          setActionMenuAnchor(null);
        }}>
          <ListItemIcon><DownloadIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Download</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => {
          handleArchive(selectedDocument?.id);
          setActionMenuAnchor(null);
        }}>
          <ListItemIcon><ArchiveIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Archive</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => {
          handleDelete(selectedDocument?.id);
          setActionMenuAnchor(null);
        }} sx={{ color: 'error.main' }}>
          <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      {/* Sort Menu */}
      <Menu
        anchorEl={sortMenuAnchor}
        open={Boolean(sortMenuAnchor)}
        onClose={() => setSortMenuAnchor(null)}
      >
        <MenuItem onClick={() => {
          setSortBy('title');
          setSortMenuAnchor(null);
        }}>
          <ListItemText>Sort by Name</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => {
          setSortBy('uploadDate');
          setSortMenuAnchor(null);
        }}>
          <ListItemText>Sort by Date</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => {
          setSortBy('size');
          setSortMenuAnchor(null);
        }}>
          <ListItemText>Sort by Size</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => {
          setSortBy('status');
          setSortMenuAnchor(null);
        }}>
          <ListItemText>Sort by Status</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => {
          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
          setSortMenuAnchor(null);
        }}>
          <ListItemText>{sortOrder === 'asc' ? 'Descending' : 'Ascending'}</ListItemText>
        </MenuItem>
      </Menu>

      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={4000}
        onClose={() => setNotification(prev => ({ ...prev, open: false }))}
      >
        <Alert
          onClose={() => setNotification(prev => ({ ...prev, open: false }))}
          severity={notification.severity}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default DocumentManager; 