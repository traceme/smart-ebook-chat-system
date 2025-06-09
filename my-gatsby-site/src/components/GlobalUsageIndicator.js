import React, { useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  Badge,
  Menu,
  MenuItem,
  LinearProgress,
  Chip,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Card,
  CardContent,
  Alert,
} from '@mui/material';
import { styled, alpha } from '@mui/material/styles';
import { useUsage } from './UsageProvider';

// Icons using Unicode emojis
const UsageIcon = () => <span style={{ fontSize: '18px' }}>📊</span>;
const StorageIcon = () => <span style={{ fontSize: '14px' }}>💾</span>;
const TokenIcon = () => <span style={{ fontSize: '14px' }}>🪙</span>;
const DocumentIcon = () => <span style={{ fontSize: '14px' }}>📄</span>;
const WarningIcon = () => <span style={{ fontSize: '14px' }}>⚠️</span>;
const CriticalIcon = () => <span style={{ fontSize: '14px' }}>🚨</span>;
const UpgradeIcon = () => <span style={{ fontSize: '14px' }}>⬆️</span>;

// Styled components
const UsageButton = styled(IconButton)(({ theme, severity }) => ({
  position: 'relative',
  padding: theme.spacing(1),
  borderRadius: theme.spacing(1),
  border: '1px solid #dadce0',
  backgroundColor: '#fff',
  color: '#5f6368',
  transition: 'all 0.2s ease-in-out',
  
  ...(severity === 'warning' && {
    borderColor: '#fbbc04',
    backgroundColor: alpha('#fbbc04', 0.05),
    color: '#f57c00',
  }),
  
  ...(severity === 'critical' && {
    borderColor: '#ea4335',
    backgroundColor: alpha('#ea4335', 0.05),
    color: '#ea4335',
  }),
  
  '&:hover': {
    backgroundColor: alpha('#4285f4', 0.05),
    borderColor: '#4285f4',
    ...(severity === 'warning' && {
      backgroundColor: alpha('#fbbc04', 0.1),
    }),
    ...(severity === 'critical' && {
      backgroundColor: alpha('#ea4335', 0.1),
    }),
  },
}));

const UsageMenuItem = styled(MenuItem)(({ theme }) => ({
  padding: theme.spacing(1, 2),
  minWidth: '300px',
  '&:hover': {
    backgroundColor: 'transparent',
  },
}));

const UsageProgressBar = styled(LinearProgress)(({ theme, severity }) => ({
  height: 6,
  borderRadius: 3,
  backgroundColor: alpha('#dadce0', 0.3),
  
  '& .MuiLinearProgress-bar': {
    borderRadius: 3,
    backgroundColor: severity === 'critical' ? '#ea4335' 
                   : severity === 'warning' ? '#fbbc04'
                   : severity === 'caution' ? '#f57c00'
                   : '#34a853',
  },
}));

const GlobalUsageIndicator = ({ 
  onUpgrade = () => {},
  onManageUsage = () => {},
  compact = false,
}) => {
  const {
    currentTier,
    percentages,
    limits,
    usage,
    recommendation,
    getUsageSeverity,
    hasFeature,
  } = useUsage();
  
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  // Determine overall severity
  const overallSeverity = Math.max(
    getUsageSeverity(percentages.storage),
    getUsageSeverity(percentages.tokens),
    getUsageSeverity(percentages.documents)
  );

  // Count critical/warning items
  const criticalCount = Object.values(percentages).filter(p => 
    getUsageSeverity(p) === 'critical'
  ).length;
  
  const warningCount = Object.values(percentages).filter(p => 
    getUsageSeverity(p) === 'warning'
  ).length;

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const formatUsageText = (used, limit, unit = '') => {
    if (limit === -1) return `${used.toLocaleString()}${unit} used`;
    return `${used.toLocaleString()}${unit} / ${limit.toLocaleString()}${unit}`;
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return '#ea4335';
      case 'warning': return '#fbbc04';
      case 'caution': return '#f57c00';
      default: return '#34a853';
    }
  };

  const getSeverityLabel = (severity) => {
    switch (severity) {
      case 'critical': return 'Critical';
      case 'warning': return 'Warning';
      case 'caution': return 'Caution';
      default: return 'Good';
    }
  };

  if (compact) {
    return (
      <Tooltip title="View usage details">
        <UsageButton 
          onClick={handleClick}
          severity={overallSeverity}
          size="small"
        >
          <UsageIcon />
          {(criticalCount > 0 || warningCount > 0) && (
            <Badge 
              badgeContent={criticalCount + warningCount}
              color={criticalCount > 0 ? 'error' : 'warning'}
              sx={{ 
                position: 'absolute', 
                top: -2, 
                right: -2,
                '& .MuiBadge-badge': {
                  fontSize: '0.6rem',
                  minWidth: '16px',
                  height: '16px',
                },
              }}
            />
          )}
        </UsageButton>
      </Tooltip>
    );
  }

  return (
    <Box>
      <Tooltip title="Click to view detailed usage">
        <UsageButton 
          onClick={handleClick}
          severity={overallSeverity}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <UsageIcon />
            <Box sx={{ textAlign: 'left', minWidth: '80px' }}>
              <Typography variant="caption" sx={{ lineHeight: 1, display: 'block' }}>
                {currentTier.charAt(0).toUpperCase() + currentTier.slice(1)} Plan
              </Typography>
              <Typography 
                variant="caption" 
                sx={{ 
                  lineHeight: 1, 
                  color: getSeverityColor(overallSeverity),
                  fontWeight: 600,
                }}
              >
                {getSeverityLabel(overallSeverity)}
              </Typography>
            </Box>
          </Box>
          
          {(criticalCount > 0 || warningCount > 0) && (
            <Badge 
              badgeContent={criticalCount + warningCount}
              color={criticalCount > 0 ? 'error' : 'warning'}
              sx={{ 
                position: 'absolute', 
                top: -5, 
                right: -5,
              }}
            />
          )}
        </UsageButton>
      </Tooltip>

      {/* Usage Details Menu */}
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: { 
            mt: 1,
            border: '1px solid #dadce0',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }
        }}
      >
        {/* Header */}
        <UsageMenuItem disabled>
          <Box sx={{ width: '100%' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
              Usage Overview
            </Typography>
            <Chip 
              label={`${currentTier.charAt(0).toUpperCase() + currentTier.slice(1)} Plan`}
              size="small"
              color="primary"
            />
          </Box>
        </UsageMenuItem>
        
        <Divider />

        {/* Storage Usage */}
        <UsageMenuItem>
          <Box sx={{ width: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <StorageIcon />
                <Typography variant="body2" sx={{ ml: 1, fontWeight: 500 }}>
                  Storage
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">
                {Math.round(percentages.storage)}%
              </Typography>
            </Box>
            <UsageProgressBar 
              variant="determinate" 
              value={Math.min(percentages.storage, 100)}
              severity={getUsageSeverity(percentages.storage)}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              {formatUsageText(usage.storage, limits.storage, 'MB')}
            </Typography>
          </Box>
        </UsageMenuItem>

        {/* Token Usage */}
        <UsageMenuItem>
          <Box sx={{ width: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <TokenIcon />
                <Typography variant="body2" sx={{ ml: 1, fontWeight: 500 }}>
                  AI Tokens
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">
                {Math.round(percentages.tokens)}%
              </Typography>
            </Box>
            <UsageProgressBar 
              variant="determinate" 
              value={Math.min(percentages.tokens, 100)}
              severity={getUsageSeverity(percentages.tokens)}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              {formatUsageText(usage.tokens, limits.tokens)} this month
            </Typography>
          </Box>
        </UsageMenuItem>

        {/* Document Usage */}
        {limits.documents !== -1 && (
          <UsageMenuItem>
            <Box sx={{ width: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <DocumentIcon />
                  <Typography variant="body2" sx={{ ml: 1, fontWeight: 500 }}>
                    Documents
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {Math.round(percentages.documents)}%
                </Typography>
              </Box>
              <UsageProgressBar 
                variant="determinate" 
                value={Math.min(percentages.documents, 100)}
                severity={getUsageSeverity(percentages.documents)}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                {formatUsageText(usage.documents, limits.documents)} this month
              </Typography>
            </Box>
          </UsageMenuItem>
        )}

        {/* Recommendation */}
        {recommendation && (
          <>
            <Divider />
            <UsageMenuItem>
              <Alert 
                severity={recommendation.severity}
                sx={{ 
                  width: '100%',
                  '& .MuiAlert-message': { 
                    width: '100%' 
                  }
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                  {recommendation.title}
                </Typography>
                <Typography variant="caption">
                  {recommendation.message}
                </Typography>
              </Alert>
            </UsageMenuItem>
          </>
        )}

        <Divider />

        {/* Actions */}
        <UsageMenuItem>
          <Box sx={{ display: 'flex', gap: 1, width: '100%' }}>
            {recommendation?.type === 'upgrade' && (
              <Button
                variant="contained"
                size="small"
                startIcon={<UpgradeIcon />}
                onClick={() => {
                  handleClose();
                  onUpgrade();
                }}
                sx={{ flex: 1 }}
              >
                Upgrade
              </Button>
            )}
            
            <Button
              variant="outlined"
              size="small"
              onClick={() => {
                handleClose();
                onManageUsage();
              }}
              sx={{ flex: 1 }}
            >
              Manage Usage
            </Button>
          </Box>
        </UsageMenuItem>

        {/* Last Updated */}
        <UsageMenuItem disabled>
          <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', width: '100%' }}>
            Last updated: {usage.lastUpdated.toLocaleTimeString()}
          </Typography>
        </UsageMenuItem>
      </Menu>
    </Box>
  );
};

export default GlobalUsageIndicator; 