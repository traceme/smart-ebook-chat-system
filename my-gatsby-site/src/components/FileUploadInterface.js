import React, { useState, useEffect, useCallback } from 'react';
import './FileUploadInterface.css';
import UsageIndicator from './UsageIndicator';

const FileUploadInterface = ({ apiBaseUrl = 'http://localhost:8000' }) => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [uploadResults, setUploadResults] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [quota, setQuota] = useState(null);
  const [userDocuments, setUserDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const authToken = localStorage.getItem('authToken') || '';

  useEffect(() => {
    if (authToken) {
      fetchUserDocuments();
    }
  }, [authToken]);

  const fetchUserDocuments = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiBaseUrl}/api/v1/documents/`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUserDocuments(data.documents || []);
      }
    } catch (err) {
      setError('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleQuotaExceeded = useCallback((exceededQuotas) => {
    const uploadQuota = exceededQuotas.find(([type]) => type === 'upload');
    if (uploadQuota) {
      setError('Upload quota exceeded! Please upgrade your plan or wait for the next billing cycle.');
    }
  }, []);

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFileSelection(droppedFiles);
  };

  const handleFileInput = (e) => {
    const selectedFiles = Array.from(e.target.files);
    handleFileSelection(selectedFiles);
  };

  const handleFileSelection = (selectedFiles) => {
    const validFiles = selectedFiles.filter(file => {
      const validTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
        'application/epub+zip',
        'text/plain',
        'text/markdown'
      ];
      return validTypes.includes(file.type) || file.name.toLowerCase().endsWith('.md');
    });

    if (validFiles.length !== selectedFiles.length) {
      setError('Some files were rejected. Only PDF, DOCX, DOC, EPUB, TXT, and MD files are supported.');
    }

    setFiles(prev => [...prev, ...validFiles.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      status: 'pending',
      progress: 0
    }))]);
  };

  const removeFile = (fileId) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const calculateTotalSize = () => {
    return files.reduce((total, f) => total + f.file.size, 0);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const uploadFiles = async () => {
    if (files.length === 0) return;

    setUploading(true);
    setError(null);
    const results = [];

    for (const fileObj of files) {
      try {
        // Update status to uploading
        setFiles(prev => prev.map(f => 
          f.id === fileObj.id ? { ...f, status: 'uploading' } : f
        ));

        // Step 1: Initialize upload
        const initResponse = await fetch(`${apiBaseUrl}/api/v1/documents/upload/init`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            filename: fileObj.file.name,
            file_size: fileObj.file.size,
            file_type: fileObj.file.type,
          }),
        });

        if (!initResponse.ok) {
          const errorData = await initResponse.json();
          throw new Error(errorData.detail || 'Failed to initialize upload');
        }

        const initData = await initResponse.json();

        // Step 2: Upload to presigned URL
        const uploadResponse = await fetch(initData.presigned_url, {
          method: 'PUT',
          body: fileObj.file,
          headers: {
            'Content-Type': fileObj.file.type,
          },
        });

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload file to storage');
        }

        // Update progress to 80%
        setFiles(prev => prev.map(f => 
          f.id === fileObj.id ? { ...f, progress: 80 } : f
        ));

        // Step 3: Complete upload
        const completeResponse = await fetch(`${apiBaseUrl}/api/v1/documents/upload/complete`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            document_id: initData.document_id,
          }),
        });

        if (!completeResponse.ok) {
          const errorData = await completeResponse.json();
          throw new Error(errorData.detail || 'Failed to complete upload');
        }

        const completeData = await completeResponse.json();

        // Step 4: Trigger conversion
        const convertResponse = await fetch(`${apiBaseUrl}/api/v1/convert`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            document_id: initData.document_id,
          }),
        });

        if (convertResponse.ok) {
          const convertData = await convertResponse.json();
          console.log('Conversion started:', convertData);
        }

        // Success
        setFiles(prev => prev.map(f => 
          f.id === fileObj.id ? { ...f, status: 'completed', progress: 100 } : f
        ));

        results.push({
          ...completeData,
          filename: fileObj.file.name,
          status: 'success'
        });

      } catch (err) {
        console.error(`Upload failed for ${fileObj.file.name}:`, err);
        setFiles(prev => prev.map(f => 
          f.id === fileObj.id ? { ...f, status: 'error', error: err.message } : f
        ));

        results.push({
          filename: fileObj.file.name,
          status: 'error',
          error: err.message
        });
      }
    }

    setUploadResults(results);
    setUploading(false);
    
    // Refresh documents list
    fetchUserDocuments();
  };

  const clearFiles = () => {
    setFiles([]);
    setUploadResults([]);
    setError(null);
  };

  const getFileIcon = (filename) => {
    const ext = filename.toLowerCase().split('.').pop();
    switch (ext) {
      case 'pdf': return '📄';
      case 'docx':
      case 'doc': return '📝';
      case 'epub': return '📚';
      case 'txt': return '📄';
      case 'md': return '📋';
      default: return '📄';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'uploading': return '⬆️';
      case 'completed': return '✅';
      case 'error': return '❌';
      default: return '⏳';
    }
  };

  if (!authToken) {
    return (
      <div className="file-upload-interface">
        <div className="auth-required">
          <h2>Authentication Required</h2>
          <p>Please log in to upload documents.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="file-upload-interface">
      {/* Header Section */}
      <div className="upload-header">
        <h1>Document Upload</h1>
        <p>Upload your documents for processing and semantic search</p>
      </div>

      {/* Usage Indicator Section */}
      <div className="upload-usage-section">
        <h3>Upload Quota Status</h3>
        <UsageIndicator 
          type="detailed"
          showLabels={true}
          refreshInterval={30000}
          onQuotaExceeded={handleQuotaExceeded}
        />
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-banner">
          <span className="error-icon">❌</span>
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* File Drop Zone */}
      <div 
        className={`file-drop-zone ${dragOver ? 'drag-over' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="drop-zone-content">
          <div className="drop-zone-icon">📁</div>
          <h3>Drag & Drop Files Here</h3>
          <p>or click to select files</p>
          <input
            type="file"
            multiple
            accept=".pdf,.docx,.doc,.epub,.txt,.md"
            onChange={handleFileInput}
            className="file-input"
          />
          <div className="supported-formats">
            <strong>Supported formats:</strong> PDF, DOCX, DOC, EPUB, TXT, MD
          </div>
        </div>
      </div>

      {/* Selected Files List */}
      {files.length > 0 && (
        <div className="selected-files">
          <div className="files-header">
            <h3>Selected Files ({files.length})</h3>
            <div className="files-actions">
              <span className="total-size">Total: {formatFileSize(calculateTotalSize())}</span>
              <button className="btn btn-secondary" onClick={clearFiles}>Clear All</button>
              <button 
                className="btn btn-primary" 
                onClick={uploadFiles}
                disabled={uploading || files.length === 0}
              >
                {uploading ? 'Uploading...' : 'Upload Files'}
              </button>
            </div>
          </div>

          <div className="files-list">
            {files.map(fileObj => (
              <div key={fileObj.id} className={`file-item ${fileObj.status}`}>
                <div className="file-info">
                  <span className="file-icon">{getFileIcon(fileObj.file.name)}</span>
                  <div className="file-details">
                    <span className="file-name">{fileObj.file.name}</span>
                    <span className="file-size">{formatFileSize(fileObj.file.size)}</span>
                  </div>
                </div>

                <div className="file-status">
                  <span className="status-icon">{getStatusIcon(fileObj.status)}</span>
                  <span className="status-text">{fileObj.status}</span>
                  {fileObj.status === 'uploading' && (
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${fileObj.progress}%` }}
                      />
                    </div>
                  )}
                  {fileObj.status === 'error' && fileObj.error && (
                    <div className="error-message">{fileObj.error}</div>
                  )}
                </div>

                <button 
                  className="remove-file" 
                  onClick={() => removeFile(fileObj.id)}
                  disabled={fileObj.status === 'uploading'}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Results */}
      {uploadResults.length > 0 && (
        <div className="upload-results">
          <h3>Upload Results</h3>
          <div className="results-list">
            {uploadResults.map((result, index) => (
              <div key={index} className={`result-item ${result.status}`}>
                <span className="result-icon">
                  {result.status === 'success' ? '✅' : '❌'}
                </span>
                <span className="result-filename">{result.filename}</span>
                <span className="result-status">
                  {result.status === 'success' ? 'Upload completed' : result.error}
                </span>
                {result.status === 'success' && result.document_id && (
                  <span className="result-id">ID: {result.document_id.substring(0, 8)}...</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* User Documents */}
      <div className="user-documents">
        <h3>Your Documents ({userDocuments.length})</h3>
        {loading ? (
          <div className="documents-loading">
            <div className="spinner"></div>
            <span>Loading documents...</span>
          </div>
        ) : userDocuments.length > 0 ? (
          <div className="documents-grid">
            {userDocuments.map(doc => (
              <div key={doc.id} className="document-card">
                <div className="document-header">
                  <span className="document-icon">{getFileIcon(doc.filename)}</span>
                  <div className="document-info">
                    <h4 className="document-title">{doc.filename}</h4>
                    <p className="document-meta">
                      {formatFileSize(doc.file_size)} • {new Date(doc.uploaded_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <div className="document-status">
                  <div className={`status-badge ${doc.upload_status}`}>
                    {doc.upload_status}
                  </div>
                  {doc.content_extracted && (
                    <div className="status-badge extracted">Content Extracted</div>
                  )}
                </div>

                {doc.conversion_status && (
                  <div className="conversion-status">
                    <span>Conversion: {doc.conversion_status}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="no-documents">
            <p>No documents uploaded yet. Upload your first document above!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUploadInterface; 