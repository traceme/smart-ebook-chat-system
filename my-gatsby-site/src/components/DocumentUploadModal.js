import React, { useState, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  LinearProgress,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Alert,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Autocomplete,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Close as CloseIcon,
  Description as DocumentIcon,
  PictureAsPdf as PdfIcon,
  Article as DocIcon,
  MenuBook as BookIcon,
  Delete as DeleteIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

const UploadZone = styled(Box)(({ theme, isDragOver, hasFiles }) => ({
  border: `2px dashed ${
    hasFiles ? theme.palette.success.main :
    isDragOver ? theme.palette.primary.main : 
    theme.palette.grey[300]
  }`,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(4),
  textAlign: 'center',
  backgroundColor: 
    hasFiles ? theme.palette.success.light + '10' :
    isDragOver ? theme.palette.primary.light + '20' : 
    theme.palette.grey[50],
  transition: 'all 0.2s ease-in-out',
  cursor: 'pointer',
  minHeight: 200,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  '&:hover': {
    borderColor: theme.palette.primary.main,
    backgroundColor: theme.palette.primary.light + '10',
  },
}));

const FileItem = styled(ListItem)(({ theme, status }) => ({
  backgroundColor: 
    status === 'success' ? theme.palette.success.light + '20' :
    status === 'error' ? theme.palette.error.light + '20' :
    status === 'uploading' ? theme.palette.info.light + '20' :
    'transparent',
  borderRadius: theme.shape.borderRadius,
  marginBottom: theme.spacing(1),
  border: `1px solid ${
    status === 'success' ? theme.palette.success.main :
    status === 'error' ? theme.palette.error.main :
    status === 'uploading' ? theme.palette.info.main :
    theme.palette.grey[300]
  }`,
}));

const SUPPORTED_TYPES = {
  'application/pdf': { ext: 'pdf', icon: PdfIcon, color: 'error', label: 'PDF' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { ext: 'docx', icon: DocIcon, color: 'primary', label: 'Word Document' },
  'application/epub+zip': { ext: 'epub', icon: BookIcon, color: 'secondary', label: 'EPUB' },
  'text/plain': { ext: 'txt', icon: DocumentIcon, color: 'default', label: 'Text File' },
  'text/markdown': { ext: 'md', icon: DocumentIcon, color: 'default', label: 'Markdown' },
};

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_FILES = 10;

const DocumentUploadModal = ({ open, onClose, onUpload, existingTags = [] }) => {
  const [files, setFiles] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [errors, setErrors] = useState([]);
  const [globalTags, setGlobalTags] = useState([]);
  const [description, setDescription] = useState('');
  const fileInputRef = useRef(null);

  // Validate file
  const validateFile = (file) => {
    const errors = [];
    
    if (!SUPPORTED_TYPES[file.type]) {
      errors.push(`Unsupported file type: ${file.type}`);
    }
    
    if (file.size > MAX_FILE_SIZE) {
      errors.push(`File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB (max 50MB)`);
    }
    
    return errors;
  };

  // Get file icon
  const getFileIcon = (file) => {
    const typeInfo = SUPPORTED_TYPES[file.type];
    if (typeInfo) {
      const IconComponent = typeInfo.icon;
      return <IconComponent color={typeInfo.color} />;
    }
    return <DocumentIcon />;
  };

  // Get file status
  const getFileStatus = (fileId) => {
    const progress = uploadProgress[fileId];
    if (!progress) return 'pending';
    if (progress.error) return 'error';
    if (progress.progress >= 100) return 'success';
    if (progress.progress > 0) return 'uploading';
    return 'pending';
  };

  // Handle file selection
  const handleFileSelect = useCallback((selectedFiles) => {
    const newFiles = Array.from(selectedFiles).map(file => ({
      id: `${Date.now()}-${Math.random()}`,
      file,
      tags: [...globalTags],
      description: description || '',
      errors: validateFile(file)
    }));

    // Check total file limit
    if (files.length + newFiles.length > MAX_FILES) {
      setErrors(prev => [...prev, `Maximum ${MAX_FILES} files allowed`]);
      return;
    }

    setFiles(prev => [...prev, ...newFiles]);
    setErrors([]);
  }, [files.length, globalTags, description]);

  // Drag and drop handlers
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const droppedFiles = e.dataTransfer.files;
    handleFileSelect(droppedFiles);
  }, [handleFileSelect]);

  // File input change
  const handleFileInputChange = (e) => {
    handleFileSelect(e.target.files);
    e.target.value = ''; // Reset input
  };

  // Remove file
  const removeFile = (fileId) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
    setUploadProgress(prev => {
      const { [fileId]: removed, ...rest } = prev;
      return rest;
    });
  };

  // Update file metadata
  const updateFileMetadata = (fileId, field, value) => {
    setFiles(prev => prev.map(f => 
      f.id === fileId ? { ...f, [field]: value } : f
    ));
  };

  // Start upload
  const handleUpload = async () => {
    const validFiles = files.filter(f => f.errors.length === 0);
    
    if (validFiles.length === 0) {
      setErrors(['No valid files to upload']);
      return;
    }

    // Simulate upload process
    for (const fileData of validFiles) {
      const { id, file, tags, description } = fileData;
      
      setUploadProgress(prev => ({
        ...prev,
        [id]: { progress: 0, error: null }
      }));

      // Simulate upload progress
      const uploadInterval = setInterval(() => {
        setUploadProgress(prev => {
          const current = prev[id];
          if (!current) return prev;
          
          const newProgress = Math.min(current.progress + Math.random() * 15, 100);
          
          if (newProgress >= 100) {
            clearInterval(uploadInterval);
            
            // Simulate success/error
            const success = Math.random() > 0.1; // 90% success rate
            
            return {
              ...prev,
              [id]: {
                progress: 100,
                error: success ? null : 'Upload failed - please try again'
              }
            };
          }
          
          return {
            ...prev,
            [id]: { ...current, progress: newProgress }
          };
        });
      }, 200);
    }

    // Call onUpload callback
    if (onUpload) {
      onUpload(validFiles);
    }
  };

  // Handle close
  const handleClose = () => {
    // Check if any uploads are in progress
    const inProgress = Object.values(uploadProgress).some(p => p.progress > 0 && p.progress < 100);
    
    if (inProgress) {
      if (window.confirm('Uploads are in progress. Are you sure you want to close?')) {
        resetModal();
        onClose();
      }
    } else {
      resetModal();
      onClose();
    }
  };

  // Reset modal state
  const resetModal = () => {
    setFiles([]);
    setUploadProgress({});
    setErrors([]);
    setGlobalTags([]);
    setDescription('');
    setIsDragOver(false);
  };

  // Check if upload is complete
  const isUploadComplete = files.length > 0 && 
    Object.keys(uploadProgress).length === files.filter(f => f.errors.length === 0).length &&
    Object.values(uploadProgress).every(p => p.progress >= 100);

  const hasValidFiles = files.some(f => f.errors.length === 0);
  const isUploading = Object.values(uploadProgress).some(p => p.progress > 0 && p.progress < 100);

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '600px' }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <UploadIcon />
          <Typography variant="h6">Upload Documents</Typography>
        </Box>
        <IconButton onClick={handleClose} disabled={isUploading}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {/* Upload Zone */}
        <UploadZone
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          isDragOver={isDragOver}
          hasFiles={files.length > 0}
        >
          <UploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            {files.length > 0 ? `${files.length} file(s) selected` : 'Drop files here or click to browse'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Supports PDF, DOCX, EPUB, TXT, MD files up to 50MB each
          </Typography>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.epub,.txt,.md"
            onChange={handleFileInputChange}
            style={{ display: 'none' }}
          />
        </UploadZone>

        {/* Global Metadata */}
        {files.length > 0 && (
          <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="subtitle1" gutterBottom>
              Apply to All Files:
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <TextField
                label="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description for all files"
                size="small"
                sx={{ flex: 1 }}
              />
            </Box>
            <Autocomplete
              multiple
              options={existingTags}
              value={globalTags}
              onChange={(e, newValue) => setGlobalTags(newValue)}
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
                  placeholder="Add tags for all files"
                  size="small"
                />
              )}
            />
          </Box>
        )}

        {/* Error Messages */}
        {errors.length > 0 && (
          <Alert severity="error" sx={{ mt: 2 }}>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </Alert>
        )}

        {/* File List */}
        {files.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Files to Upload ({files.length}):
            </Typography>
            <List dense>
              {files.map((fileData) => {
                const status = getFileStatus(fileData.id);
                const progress = uploadProgress[fileData.id];
                
                return (
                  <FileItem key={fileData.id} status={status}>
                    <ListItemIcon>
                      {getFileIcon(fileData.file)}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box>
                          <Typography variant="body2" noWrap>
                            {fileData.file.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {(fileData.file.size / 1024).toFixed(1)} KB
                            {fileData.tags.length > 0 && ` • ${fileData.tags.join(', ')}`}
                          </Typography>
                          {fileData.errors.length > 0 && (
                            <Typography variant="caption" color="error" display="block">
                              {fileData.errors.join(', ')}
                            </Typography>
                          )}
                          {progress && progress.error && (
                            <Typography variant="caption" color="error" display="block">
                              {progress.error}
                            </Typography>
                          )}
                        </Box>
                      }
                      secondary={
                        progress && (
                          <Box sx={{ mt: 1 }}>
                            <LinearProgress 
                              variant="determinate" 
                              value={progress.progress}
                              color={
                                progress.error ? 'error' :
                                progress.progress >= 100 ? 'success' : 'primary'
                              }
                            />
                            <Typography variant="caption">
                              {progress.error ? 'Failed' : `${Math.round(progress.progress)}%`}
                            </Typography>
                          </Box>
                        )
                      }
                    />
                    <ListItemSecondaryAction>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {status === 'success' && <SuccessIcon color="success" />}
                        {status === 'error' && <ErrorIcon color="error" />}
                        {fileData.errors.length > 0 && <WarningIcon color="warning" />}
                        <IconButton 
                          onClick={() => removeFile(fileData.id)}
                          disabled={status === 'uploading'}
                          size="small"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </ListItemSecondaryAction>
                  </FileItem>
                );
              })}
            </List>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose} disabled={isUploading}>
          {isUploadComplete ? 'Close' : 'Cancel'}
        </Button>
        {!isUploadComplete && (
          <Button
            variant="contained"
            onClick={handleUpload}
            disabled={!hasValidFiles || isUploading}
            startIcon={<UploadIcon />}
          >
            {isUploading ? 'Uploading...' : `Upload ${files.filter(f => f.errors.length === 0).length} File(s)`}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default DocumentUploadModal; 