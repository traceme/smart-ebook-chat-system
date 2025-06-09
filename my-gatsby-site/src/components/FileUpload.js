import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Paper,
  LinearProgress,
  Alert,
  Chip,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Description as DescriptionIcon,
  PictureAsPdf as PdfIcon,
  Article as DocIcon,
  MenuBook as EpubIcon,
  TextSnippet as TextIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';

const FileUpload = ({ 
  onUpload, 
  accept = ".pdf,.docx,.epub,.txt,.md", 
  maxSize = 10 * 1024 * 1024, // 10MB
  multiple = true 
}) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [errors, setErrors] = useState([]);

  const getFileIcon = (filename) => {
    const ext = filename.toLowerCase().split('.').pop();
    switch (ext) {
      case 'pdf':
        return <PdfIcon color="error" />;
      case 'docx':
      case 'doc':
        return <DocIcon color="primary" />;
      case 'epub':
        return <EpubIcon color="secondary" />;
      case 'txt':
      case 'md':
        return <TextIcon color="action" />;
      default:
        return <DescriptionIcon color="action" />;
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateFile = (file) => {
    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/epub+zip',
      'text/plain',
      'text/markdown'
    ];

    const validExtensions = ['pdf', 'docx', 'doc', 'epub', 'txt', 'md'];
    const fileExtension = file.name.toLowerCase().split('.').pop();

    if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
      return 'File type not supported. Please upload PDF, DOCX, EPUB, TXT, or MD files.';
    }

    if (file.size > maxSize) {
      return `File size exceeds ${formatFileSize(maxSize)} limit.`;
    }

    return null;
  };

  const handleFileSelection = (files) => {
    const newFiles = [];
    const newErrors = [];

    Array.from(files).forEach((file) => {
      const error = validateFile(file);
      if (error) {
        newErrors.push(`${file.name}: ${error}`);
      } else {
        newFiles.push({
          id: Math.random().toString(36).substr(2, 9),
          file,
          status: 'pending',
          progress: 0,
        });
      }
    });

    setErrors(newErrors);
    setSelectedFiles((prev) => [...prev, ...newFiles]);
  };

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    
    const files = e.dataTransfer.files;
    handleFileSelection(files);
  }, []);

  const handleFileInput = (e) => {
    const files = e.target.files;
    handleFileSelection(files);
  };

  const removeFile = (fileId) => {
    setSelectedFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const clearAll = () => {
    setSelectedFiles([]);
    setErrors([]);
  };

  const handleUpload = () => {
    if (selectedFiles.length > 0) {
      const files = selectedFiles.map(f => f.file);
      onUpload(files);
      setSelectedFiles([]);
      setErrors([]);
    }
  };

  const getFileTypeChip = (filename) => {
    const ext = filename.toLowerCase().split('.').pop();
    const typeMap = {
      'pdf': { label: 'PDF', color: 'error' },
      'docx': { label: 'Word', color: 'primary' },
      'doc': { label: 'Word', color: 'primary' },
      'epub': { label: 'EPUB', color: 'secondary' },
      'txt': { label: 'Text', color: 'default' },
      'md': { label: 'Markdown', color: 'default' },
    };
    
    const type = typeMap[ext] || { label: 'File', color: 'default' };
    return (
      <Chip 
        label={type.label} 
        size="small" 
        color={type.color} 
        variant="outlined"
      />
    );
  };

  return (
    <Box>
      {/* Drag and Drop Area */}
      <Paper
        variant="outlined"
        sx={{
          p: 4,
          textAlign: 'center',
          border: dragOver ? '2px dashed #1976d2' : '2px dashed #ccc',
          backgroundColor: dragOver ? 'rgba(25, 118, 210, 0.05)' : 'transparent',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          '&:hover': {
            borderColor: '#1976d2',
            backgroundColor: 'rgba(25, 118, 210, 0.02)',
          },
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-input').click()}
      >
        <CloudUploadIcon 
          sx={{ 
            fontSize: 48, 
            color: dragOver ? '#1976d2' : '#ccc',
            mb: 2 
          }} 
        />
        <Typography variant="h6" gutterBottom>
          {dragOver ? 'Drop files here' : 'Drag & drop files here'}
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          or click to browse files
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Supports: PDF, DOCX, EPUB, TXT, MD (max {formatFileSize(maxSize)})
        </Typography>
        
        <input
          id="file-input"
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileInput}
          style={{ display: 'none' }}
        />
      </Paper>

      {/* Error Messages */}
      {errors.length > 0 && (
        <Box sx={{ mt: 2 }}>
          {errors.map((error, index) => (
            <Alert key={index} severity="error" sx={{ mb: 1 }}>
              {error}
            </Alert>
          ))}
        </Box>
      )}

      {/* Selected Files List */}
      {selectedFiles.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Selected Files ({selectedFiles.length})
            </Typography>
            <Button onClick={clearAll} color="secondary" size="small">
              Clear All
            </Button>
          </Box>
          
          <Paper variant="outlined">
            <List dense>
              {selectedFiles.map((fileObj, index) => (
                <ListItem key={fileObj.id} divider={index < selectedFiles.length - 1}>
                  <ListItemIcon>
                    {getFileIcon(fileObj.file.name)}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" noWrap sx={{ flex: 1 }}>
                          {fileObj.file.name}
                        </Typography>
                        {getFileTypeChip(fileObj.file.name)}
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          {formatFileSize(fileObj.file.size)}
                        </Typography>
                        {fileObj.status === 'uploading' && (
                          <LinearProgress 
                            variant="determinate" 
                            value={fileObj.progress} 
                            sx={{ mt: 0.5 }}
                          />
                        )}
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton 
                      edge="end" 
                      onClick={() => removeFile(fileObj.id)}
                      size="small"
                    >
                      <CloseIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </Paper>

          {/* Upload Button */}
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Button
              variant="contained"
              size="large"
              startIcon={<CloudUploadIcon />}
              onClick={handleUpload}
              disabled={selectedFiles.length === 0}
              sx={{
                minWidth: 200,
                background: 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #1565c0 30%, #1976d2 90%)',
                },
              }}
            >
              Upload {selectedFiles.length} File{selectedFiles.length !== 1 ? 's' : ''}
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default FileUpload; 