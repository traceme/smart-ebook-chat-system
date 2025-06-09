import React, { useState } from 'react';
import {
  Paper,
  Box,
  Typography,
  Button,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Autocomplete,
  Alert,
  Divider,
  FormControl,
  InputLabel,
  Select,
  FormControlLabel,
  Checkbox,
  LinearProgress,
} from '@mui/material';
import {
  Share as ShareIcon,
  Archive as ArchiveIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Label as TagIcon,
  Edit as EditIcon,
  Folder as FolderIcon,
  Security as SecurityIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  CloudDownload as ExportIcon,
  Schedule as ScheduleIcon,
  Warning as WarningIcon,
  CheckCircle as SuccessIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

const ActionContainer = styled(Paper)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: theme.spacing(2),
  marginBottom: theme.spacing(2),
  background: `linear-gradient(45deg, ${theme.palette.primary.light}15, ${theme.palette.secondary.light}15)`,
  border: `1px solid ${theme.palette.primary.main}30`,
}));

const ActionButton = styled(Button)(({ theme }) => ({
  marginRight: theme.spacing(1),
  minWidth: '120px',
}));

const DocumentBulkActions = ({ 
  selectedDocuments, 
  documents, 
  onClearSelection, 
  onShare,
  onArchive,
  onDelete,
  onUpdateTags,
  onUpdateMetadata,
  onExport,
  availableTags = [] 
}) => {
  const [actionMenuAnchor, setActionMenuAnchor] = useState(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [metadataDialogOpen, setMetadataDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  
  // Form states
  const [shareSettings, setShareSettings] = useState({
    isPublic: false,
    allowDownload: true,
    expiryDate: '',
    password: '',
  });
  const [newTags, setNewTags] = useState([]);
  const [tagAction, setTagAction] = useState('add'); // 'add', 'remove', 'replace'
  const [metadataUpdates, setMetadataUpdates] = useState({
    description: '',
    category: '',
    language: '',
  });
  const [exportFormat, setExportFormat] = useState('zip');
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [operationProgress, setOperationProgress] = useState(null);

  // Get selected document data
  const selectedDocData = documents.filter(doc => selectedDocuments.has(doc.id));
  const selectedCount = selectedDocuments.size;

  // Calculate total size
  const totalSize = selectedDocData.reduce((sum, doc) => sum + doc.size, 0);
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get file type distribution
  const typeDistribution = selectedDocData.reduce((acc, doc) => {
    acc[doc.type] = (acc[doc.type] || 0) + 1;
    return acc;
  }, {});

  // Handle bulk share
  const handleBulkShare = async () => {
    setOperationProgress({ action: 'Sharing', current: 0, total: selectedCount });
    
    // Simulate progress
    for (let i = 0; i < selectedCount; i++) {
      await new Promise(resolve => setTimeout(resolve, 200));
      setOperationProgress(prev => ({ ...prev, current: i + 1 }));
    }
    
    if (onShare) {
      onShare(Array.from(selectedDocuments), shareSettings);
    }
    
    setOperationProgress(null);
    setShareDialogOpen(false);
    resetForms();
  };

  // Handle bulk tag update
  const handleBulkTagUpdate = async () => {
    setOperationProgress({ action: 'Updating tags', current: 0, total: selectedCount });
    
    // Simulate progress
    for (let i = 0; i < selectedCount; i++) {
      await new Promise(resolve => setTimeout(resolve, 150));
      setOperationProgress(prev => ({ ...prev, current: i + 1 }));
    }
    
    if (onUpdateTags) {
      onUpdateTags(Array.from(selectedDocuments), newTags, tagAction);
    }
    
    setOperationProgress(null);
    setTagDialogOpen(false);
    resetForms();
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    setOperationProgress({ action: 'Deleting', current: 0, total: selectedCount });
    
    // Simulate progress
    for (let i = 0; i < selectedCount; i++) {
      await new Promise(resolve => setTimeout(resolve, 100));
      setOperationProgress(prev => ({ ...prev, current: i + 1 }));
    }
    
    if (onDelete) {
      onDelete(Array.from(selectedDocuments));
    }
    
    setOperationProgress(null);
    setDeleteDialogOpen(false);
  };

  // Handle bulk metadata update
  const handleBulkMetadataUpdate = async () => {
    setOperationProgress({ action: 'Updating metadata', current: 0, total: selectedCount });
    
    // Simulate progress
    for (let i = 0; i < selectedCount; i++) {
      await new Promise(resolve => setTimeout(resolve, 180));
      setOperationProgress(prev => ({ ...prev, current: i + 1 }));
    }
    
    if (onUpdateMetadata) {
      onUpdateMetadata(Array.from(selectedDocuments), metadataUpdates);
    }
    
    setOperationProgress(null);
    setMetadataDialogOpen(false);
    resetForms();
  };

  // Handle bulk export
  const handleBulkExport = async () => {
    setOperationProgress({ action: 'Preparing export', current: 0, total: selectedCount });
    
    // Simulate progress
    for (let i = 0; i < selectedCount; i++) {
      await new Promise(resolve => setTimeout(resolve, 250));
      setOperationProgress(prev => ({ ...prev, current: i + 1 }));
    }
    
    if (onExport) {
      onExport(Array.from(selectedDocuments), { format: exportFormat, includeMetadata });
    }
    
    setOperationProgress(null);
    setExportDialogOpen(false);
    resetForms();
  };

  // Reset form states
  const resetForms = () => {
    setShareSettings({
      isPublic: false,
      allowDownload: true,
      expiryDate: '',
      password: '',
    });
    setNewTags([]);
    setTagAction('add');
    setMetadataUpdates({
      description: '',
      category: '',
      language: '',
    });
    setExportFormat('zip');
    setIncludeMetadata(true);
  };

  if (selectedCount === 0) return null;

  return (
    <>
      <ActionContainer>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {selectedCount} document{selectedCount > 1 ? 's' : ''} selected
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total size: {formatFileSize(totalSize)} • Types: {Object.keys(typeDistribution).join(', ')}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {Object.entries(typeDistribution).map(([type, count]) => (
              <Chip 
                key={type} 
                label={`${type.toUpperCase()}: ${count}`} 
                size="small" 
                variant="outlined" 
              />
            ))}
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ActionButton
            variant="outlined"
            startIcon={<ShareIcon />}
            onClick={() => setShareDialogOpen(true)}
            size="small"
          >
            Share
          </ActionButton>
          
          <ActionButton
            variant="outlined"
            startIcon={<TagIcon />}
            onClick={() => setTagDialogOpen(true)}
            size="small"
          >
            Tags
          </ActionButton>
          
          <ActionButton
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => setMetadataDialogOpen(true)}
            size="small"
          >
            Edit
          </ActionButton>

          <ActionButton
            variant="outlined"
            startIcon={<ExportIcon />}
            onClick={() => setExportDialogOpen(true)}
            size="small"
          >
            Export
          </ActionButton>
          
          <ActionButton
            variant="outlined"
            startIcon={<ArchiveIcon />}
            onClick={() => onArchive && onArchive(Array.from(selectedDocuments))}
            size="small"
          >
            Archive
          </ActionButton>
          
          <ActionButton
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => setDeleteDialogOpen(true)}
            size="small"
          >
            Delete
          </ActionButton>
          
          <Button onClick={onClearSelection} size="small">
            Clear
          </Button>
        </Box>
      </ActionContainer>

      {/* Progress Bar */}
      {operationProgress && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2">{operationProgress.action}...</Typography>
            <Typography variant="body2">
              {operationProgress.current} / {operationProgress.total}
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={(operationProgress.current / operationProgress.total) * 100} 
          />
        </Paper>
      )}

      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onClose={() => setShareDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Share {selectedCount} Document{selectedCount > 1 ? 's' : ''}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={shareSettings.isPublic}
                  onChange={(e) => setShareSettings(prev => ({ ...prev, isPublic: e.target.checked }))}
                />
              }
              label="Make publicly accessible"
            />
            
            <FormControlLabel
              control={
                <Checkbox
                  checked={shareSettings.allowDownload}
                  onChange={(e) => setShareSettings(prev => ({ ...prev, allowDownload: e.target.checked }))}
                />
              }
              label="Allow download"
            />
            
            <TextField
              label="Expiry Date"
              type="date"
              value={shareSettings.expiryDate}
              onChange={(e) => setShareSettings(prev => ({ ...prev, expiryDate: e.target.value }))}
              fullWidth
              margin="normal"
              InputLabelProps={{ shrink: true }}
            />
            
            <TextField
              label="Password Protection (optional)"
              type="password"
              value={shareSettings.password}
              onChange={(e) => setShareSettings(prev => ({ ...prev, password: e.target.value }))}
              fullWidth
              margin="normal"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShareDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleBulkShare} variant="contained" startIcon={<ShareIcon />}>
            Share Documents
          </Button>
        </DialogActions>
      </Dialog>

      {/* Tag Dialog */}
      <Dialog open={tagDialogOpen} onClose={() => setTagDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Update Tags for {selectedCount} Document{selectedCount > 1 ? 's' : ''}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <FormControl fullWidth margin="normal">
              <InputLabel>Action</InputLabel>
              <Select
                value={tagAction}
                label="Action"
                onChange={(e) => setTagAction(e.target.value)}
              >
                <MenuItem value="add">Add tags</MenuItem>
                <MenuItem value="remove">Remove tags</MenuItem>
                <MenuItem value="replace">Replace all tags</MenuItem>
              </Select>
            </FormControl>
            
            <Autocomplete
              multiple
              options={availableTags}
              value={newTags}
              onChange={(e, newValue) => setNewTags(newValue)}
              freeSolo
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip variant="outlined" label={option} {...getTagProps({ index })} />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Tags"
                  placeholder="Select or create tags"
                  margin="normal"
                />
              )}
              sx={{ mt: 2 }}
            />
            
            <Alert severity="info" sx={{ mt: 2 }}>
              {tagAction === 'add' && 'Selected tags will be added to all documents'}
              {tagAction === 'remove' && 'Selected tags will be removed from all documents'}
              {tagAction === 'replace' && 'All existing tags will be replaced with selected tags'}
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTagDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleBulkTagUpdate} variant="contained" startIcon={<TagIcon />}>
            Update Tags
          </Button>
        </DialogActions>
      </Dialog>

      {/* Metadata Dialog */}
      <Dialog open={metadataDialogOpen} onClose={() => setMetadataDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Update Metadata for {selectedCount} Document{selectedCount > 1 ? 's' : ''}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              label="Description"
              value={metadataUpdates.description}
              onChange={(e) => setMetadataUpdates(prev => ({ ...prev, description: e.target.value }))}
              fullWidth
              multiline
              rows={3}
              margin="normal"
              helperText="Leave empty to keep existing descriptions"
            />
            
            <TextField
              label="Category"
              value={metadataUpdates.category}
              onChange={(e) => setMetadataUpdates(prev => ({ ...prev, category: e.target.value }))}
              fullWidth
              margin="normal"
            />
            
            <FormControl fullWidth margin="normal">
              <InputLabel>Language</InputLabel>
              <Select
                value={metadataUpdates.language}
                label="Language"
                onChange={(e) => setMetadataUpdates(prev => ({ ...prev, language: e.target.value }))}
              >
                <MenuItem value="">Keep existing</MenuItem>
                <MenuItem value="en">English</MenuItem>
                <MenuItem value="es">Spanish</MenuItem>
                <MenuItem value="fr">French</MenuItem>
                <MenuItem value="de">German</MenuItem>
                <MenuItem value="zh">Chinese</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMetadataDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleBulkMetadataUpdate} variant="contained" startIcon={<EditIcon />}>
            Update Metadata
          </Button>
        </DialogActions>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={exportDialogOpen} onClose={() => setExportDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Export {selectedCount} Document{selectedCount > 1 ? 's' : ''}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <FormControl fullWidth margin="normal">
              <InputLabel>Export Format</InputLabel>
              <Select
                value={exportFormat}
                label="Export Format"
                onChange={(e) => setExportFormat(e.target.value)}
              >
                <MenuItem value="zip">ZIP Archive</MenuItem>
                <MenuItem value="tar">TAR Archive</MenuItem>
                <MenuItem value="individual">Individual Files</MenuItem>
              </Select>
            </FormControl>
            
            <FormControlLabel
              control={
                <Checkbox
                  checked={includeMetadata}
                  onChange={(e) => setIncludeMetadata(e.target.checked)}
                />
              }
              label="Include metadata files"
              sx={{ mt: 2 }}
            />
            
            <Alert severity="info" sx={{ mt: 2 }}>
              Total download size: {formatFileSize(totalSize)}
              {includeMetadata && ' (plus metadata files)'}
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleBulkExport} variant="contained" startIcon={<ExportIcon />}>
            Export Documents
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="error" />
          Confirm Delete
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This action cannot be undone. Are you sure you want to delete {selectedCount} document{selectedCount > 1 ? 's' : ''}?
          </Alert>
          
          <Typography variant="body2" sx={{ mb: 2 }}>
            Documents to be deleted:
          </Typography>
          
          <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
            {selectedDocData.slice(0, 10).map((doc) => (
              <Typography key={doc.id} variant="body2" sx={{ ml: 2, mb: 0.5 }}>
                • {doc.title}
              </Typography>
            ))}
            {selectedDocData.length > 10 && (
              <Typography variant="body2" sx={{ ml: 2, fontStyle: 'italic' }}>
                ... and {selectedDocData.length - 10} more
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleBulkDelete} variant="contained" color="error" startIcon={<DeleteIcon />}>
            Delete {selectedCount} Document{selectedCount > 1 ? 's' : ''}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default DocumentBulkActions; 