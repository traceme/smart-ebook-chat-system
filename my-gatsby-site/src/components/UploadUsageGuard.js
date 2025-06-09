import React, { useState, useEffect } from 'react';
import {
  Box,
  Alert,
  AlertTitle,
  Button,
  Typography,
  LinearProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Card,
  CardContent,
  Grid,
} from '@mui/material';
import { styled, alpha } from '@mui/material/styles';
import { useUsage } from './UsageProvider';

// Icons using Unicode emojis
const UploadIcon = () => <span style={{ fontSize: '16px' }}>📁</span>;
const WarningIcon = () => <span style={{ fontSize: '16px' }}>⚠️</span>;
const BlockIcon = () => <span style={{ fontSize: '16px' }}>🚫</span>;
const UpgradeIcon = () => <span style={{ fontSize: '16px' }}>⬆️</span>;
const StorageIcon = () => <span style={{ fontSize: '16px' }}>💾</span>;
const DocumentIcon = () => <span style={{ fontSize: '16px' }}>📄</span>;
const CheckIcon = () => <span style={{ fontSize: '16px' }}>✅</span>;

// Styled components
const GuardContainer = styled(Box)(({ theme, severity }) => ({
  border: `2px solid ${
    severity === 'critical' ? '#ea4335' 
    : severity === 'warning' ? '#fbbc04'
    : severity === 'caution' ? '#f57c00'
    : '#dadce0'
  }`,
  borderRadius: theme.spacing(1),
  backgroundColor: alpha(
    severity === 'critical' ? '#ea4335' 
    : severity === 'warning' ? '#fbbc04'
    : severity === 'caution' ? '#f57c00'
    : '#34a853',
    0.02
  ),
  padding: theme.spacing(2),
  transition: 'all 0.2s ease-in-out',
}));

const QuotaBar = styled(LinearProgress)(({ theme, severity }) => ({
  height: 8,
  borderRadius: 4,
  backgroundColor: alpha('#dadce0', 0.3),
  '& .MuiLinearProgress-bar': {
    borderRadius: 4,
    backgroundColor: severity === 'critical' ? '#ea4335' 
                   : severity === 'warning' ? '#fbbc04'
                   : severity === 'caution' ? '#f57c00'
                   : '#34a853',
  },
}));

const UploadUsageGuard = ({ 
  children,
  fileSize = 0,
  fileCount = 1,
  onUpgrade = () => {},
  onManageUsage = () => {},
  showDetailedBreakdown = false,
}) => {
  const {
    currentTier,
    usage,
    limits,
    percentages,
    canPerformAction,
    getUsageSeverity,
    addUsage,
  } = useUsage();

  const [uploadBlocked, setUploadBlocked] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [preUploadWarning, setPreUploadWarning] = useState(null);

  // Check if upload is allowed
  const checkUploadPermissions = () => {
    const storageCheck = canPerformAction('use_storage', fileSize);
    const documentCheck = canPerformAction('upload_document', fileCount);
    
    return {
      storage: storageCheck,
      documents: documentCheck,
      allowed: storageCheck.allowed && documentCheck.allowed,
    };
  };

  const uploadCheck = checkUploadPermissions();

  // Determine overall severity after upload
  const postUploadUsage = {
    storage: usage.storage + fileSize,
    documents: usage.documents + fileCount,
    tokens: usage.tokens, // unchanged
  };

  const postUploadPercentages = {
    storage: limits.storage > 0 ? (postUploadUsage.storage / limits.storage) * 100 : 0,
    documents: limits.documents > 0 ? (postUploadUsage.documents / limits.documents) * 100 : 0,
    tokens: percentages.tokens, // unchanged
  };

  const worstPostUploadSeverity = Math.max(
    getUsageSeverity(postUploadPercentages.storage),
    getUsageSeverity(postUploadPercentages.documents)
  );

  // Check if this upload would push user into warning territory
  const currentStorageSeverity = getUsageSeverity(percentages.storage);
  const currentDocumentSeverity = getUsageSeverity(percentages.documents);
  const postStorageSeverity = getUsageSeverity(postUploadPercentages.storage);
  const postDocumentSeverity = getUsageSeverity(postUploadPercentages.documents);

  const severityIncreased = (
    postStorageSeverity > currentStorageSeverity ||
    postDocumentSeverity > currentDocumentSeverity
  );

  useEffect(() => {
    if (!uploadCheck.allowed) {
      setUploadBlocked(true);
    } else if (severityIncreased && worstPostUploadSeverity >= 2) { // warning or critical
      setPreUploadWarning({
        severity: worstPostUploadSeverity === 3 ? 'critical' : 'warning',
        message: worstPostUploadSeverity === 3 
          ? 'This upload will push you very close to your quota limits'
          : 'This upload will increase your usage significantly',
      });
    } else {
      setUploadBlocked(false);
      setPreUploadWarning(null);
    }
  }, [fileSize, fileCount, uploadCheck.allowed, severityIncreased, worstPostUploadSeverity]);

  const handleUploadAttempt = () => {
    if (!uploadCheck.allowed) {
      setShowUpgradeDialog(true);
      return false;
    }
    
    // Add usage tracking
    addUsage('storage', fileSize);
    addUsage('documents', fileCount);
    
    return true;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 MB';
    const mb = bytes;
    return `${mb.toFixed(1)} MB`;
  };

  const getUsageColor = (severity) => {
    switch (severity) {
      case 'critical': return '#ea4335';
      case 'warning': return '#fbbc04';
      case 'caution': return '#f57c00';
      default: return '#34a853';
    }
  };

  const getSeverityText = (severity) => {
    switch (severity) {
      case 'critical': return 'Critical';
      case 'warning': return 'High';
      case 'caution': return 'Medium';
      default: return 'Good';
    }
  };

  const renderQuotaDisplay = () => (
    <Grid container spacing={2} sx={{ mb: 2 }}>
      {/* Storage Quota */}
      <Grid item xs={12} sm={6}>
        <Card variant="outlined" sx={{ height: '100%' }}>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <StorageIcon />
              <Typography variant="body2" sx={{ ml: 1, fontWeight: 600 }}>
                Storage Usage
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Current: {usage.storage.toFixed(1)} MB
              </Typography>
              <Typography variant="caption" color="text.secondary">
                After upload: {postUploadUsage.storage.toFixed(1)} MB
              </Typography>
            </Box>
            
            <QuotaBar 
              variant="determinate" 
              value={Math.min(postUploadPercentages.storage, 100)}
              severity={postStorageSeverity}
              sx={{ mb: 1 }}
            />
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                Limit: {limits.storage} MB
              </Typography>
              <Chip 
                label={`${Math.round(postUploadPercentages.storage)}%`}
                size="small"
                sx={{ 
                  fontSize: '0.7rem',
                  color: getUsageColor(postStorageSeverity),
                  borderColor: getUsageColor(postStorageSeverity),
                }}
                variant="outlined"
              />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Document Quota */}
      {limits.documents !== -1 && (
        <Grid item xs={12} sm={6}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <DocumentIcon />
                <Typography variant="body2" sx={{ ml: 1, fontWeight: 600 }}>
                  Document Count
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Current: {usage.documents} docs
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  After upload: {postUploadUsage.documents} docs
                </Typography>
              </Box>
              
              <QuotaBar 
                variant="determinate" 
                value={Math.min(postUploadPercentages.documents, 100)}
                severity={postDocumentSeverity}
                sx={{ mb: 1 }}
              />
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                  Limit: {limits.documents} documents/month
                </Typography>
                <Chip 
                  label={`${Math.round(postUploadPercentages.documents)}%`}
                  size="small"
                  sx={{ 
                    fontSize: '0.7rem',
                    color: getUsageColor(postDocumentSeverity),
                    borderColor: getUsageColor(postDocumentSeverity),
                  }}
                  variant="outlined"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      )}
    </Grid>
  );

  const renderUploadGuard = () => {
    if (uploadBlocked) {
      return (
        <GuardContainer severity="critical">
          <Alert severity="error" sx={{ mb: 2 }}>
            <AlertTitle>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <BlockIcon />
                <span style={{ marginLeft: 8 }}>Upload Blocked</span>
              </Box>
            </AlertTitle>
            {!uploadCheck.storage.allowed && (
              <Typography variant="body2" sx={{ mb: 1 }}>
                • {uploadCheck.storage.message}
              </Typography>
            )}
            {!uploadCheck.documents.allowed && (
              <Typography variant="body2" sx={{ mb: 1 }}>
                • {uploadCheck.documents.message}
              </Typography>
            )}
            <Typography variant="body2" sx={{ mt: 1 }}>
              Please upgrade your plan or clean up existing files to continue.
            </Typography>
          </Alert>

          {showDetailedBreakdown && renderQuotaDisplay()}

          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<UpgradeIcon />}
              onClick={() => setShowUpgradeDialog(true)}
            >
              Upgrade Plan
            </Button>
            <Button
              variant="outlined"
              onClick={onManageUsage}
            >
              Manage Usage
            </Button>
          </Box>
        </GuardContainer>
      );
    }

    if (preUploadWarning) {
      return (
        <GuardContainer severity={preUploadWarning.severity}>
          <Alert 
            severity={preUploadWarning.severity === 'critical' ? 'warning' : 'info'}
            sx={{ mb: 2 }}
          >
            <AlertTitle>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <WarningIcon />
                <span style={{ marginLeft: 8 }}>Usage Warning</span>
              </Box>
            </AlertTitle>
            <Typography variant="body2">
              {preUploadWarning.message}. You're uploading {formatFileSize(fileSize)} 
              {fileCount > 1 && ` across ${fileCount} files`}.
            </Typography>
          </Alert>

          {showDetailedBreakdown && renderQuotaDisplay()}

          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            <Button
              variant="outlined"
              startIcon={<UpgradeIcon />}
              onClick={() => setShowUpgradeDialog(true)}
              size="small"
            >
              Consider Upgrading
            </Button>
          </Box>
        </GuardContainer>
      );
    }

    // Good to go
    return (
      <GuardContainer severity="normal">
        <Alert severity="success" sx={{ mb: showDetailedBreakdown ? 2 : 0 }}>
          <AlertTitle>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <CheckIcon />
              <span style={{ marginLeft: 8 }}>Ready to Upload</span>
            </Box>
          </AlertTitle>
          <Typography variant="body2">
            You can upload {formatFileSize(fileSize)}
            {fileCount > 1 && ` across ${fileCount} files`} without issues.
          </Typography>
        </Alert>

        {showDetailedBreakdown && renderQuotaDisplay()}
      </GuardContainer>
    );
  };

  return (
    <Box>
      {renderUploadGuard()}
      
      {/* Render children with upload handler */}
      <Box sx={{ mt: 2 }}>
        {React.cloneElement(children, {
          onUploadAttempt: handleUploadAttempt,
          uploadAllowed: uploadCheck.allowed,
        })}
      </Box>

      {/* Upgrade Dialog */}
      <Dialog 
        open={showUpgradeDialog} 
        onClose={() => setShowUpgradeDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Quota Limit Reached
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            You've reached your {currentTier} plan limits:
          </Typography>
          
          <List dense sx={{ mt: 2 }}>
            {!uploadCheck.storage.allowed && (
              <ListItem>
                <ListItemIcon>
                  <StorageIcon />
                </ListItemIcon>
                <ListItemText 
                  primary="Storage Limit"
                  secondary={uploadCheck.storage.message}
                />
              </ListItem>
            )}
            {!uploadCheck.documents.allowed && (
              <ListItem>
                <ListItemIcon>
                  <DocumentIcon />
                </ListItemIcon>
                <ListItemText 
                  primary="Document Limit"
                  secondary={uploadCheck.documents.message}
                />
              </ListItem>
            )}
          </List>

          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              Upgrade to Pro for 10x more storage and documents, or Enterprise for unlimited resources.
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowUpgradeDialog(false)}>
            Cancel
          </Button>
          <Button onClick={onManageUsage} variant="outlined">
            Manage Usage
          </Button>
          <Button 
            onClick={() => {
              setShowUpgradeDialog(false);
              onUpgrade();
            }}
            variant="contained"
            startIcon={<UpgradeIcon />}
          >
            Upgrade Plan
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UploadUsageGuard; 