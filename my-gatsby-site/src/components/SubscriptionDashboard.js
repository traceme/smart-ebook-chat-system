import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  Button,
  Avatar,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert,
  AlertTitle,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
} from '@mui/material';
import { styled, alpha } from '@mui/material/styles';
import './SubscriptionDashboard.css';

// Icons using Unicode emojis
const PlanIcon = () => <span style={{ fontSize: '20px' }}>📋</span>;
const UsageIcon = () => <span style={{ fontSize: '20px' }}>📊</span>;
const BillingIcon = () => <span style={{ fontSize: '20px' }}>💳</span>;
const UpgradeIcon = () => <span style={{ fontSize: '18px' }}>⬆️</span>;
const DownloadIcon = () => <span style={{ fontSize: '16px' }}>📥</span>;
const TokenIcon = () => <span style={{ fontSize: '16px' }}>🪙</span>;
const StorageIcon = () => <span style={{ fontSize: '16px' }}>💾</span>;
const CalendarIcon = () => <span style={{ fontSize: '16px' }}>📅</span>;
const CheckIcon = () => <span style={{ fontSize: '16px' }}>✅</span>;
const WarningIcon = () => <span style={{ fontSize: '16px' }}>⚠️</span>;
const InfoIcon = () => <span style={{ fontSize: '16px' }}>ℹ️</span>;

// Styled components
const StyledCard = styled(Card)(({ theme, variant }) => ({
  height: '100%',
  transition: 'all 0.2s ease-in-out',
  border: '1px solid #dadce0',
  ...(variant === 'primary' && {
    background: `linear-gradient(135deg, ${alpha('#4285f4', 0.1)} 0%, ${alpha('#34a853', 0.05)} 100%)`,
    borderColor: '#4285f4',
  }),
  ...(variant === 'warning' && {
    background: `linear-gradient(135deg, ${alpha('#ea4335', 0.1)} 0%, ${alpha('#fbbc04', 0.05)} 100%)`,
    borderColor: '#ea4335',
  }),
  '&:hover': {
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    transform: 'translateY(-2px)',
  },
}));

const UsageProgressBar = styled(LinearProgress)(({ theme, severity }) => ({
  height: '8px',
  borderRadius: '4px',
  backgroundColor: alpha('#dadce0', 0.3),
  '& .MuiLinearProgress-bar': {
    borderRadius: '4px',
    backgroundColor: 
      severity === 'high' ? '#ea4335' :
      severity === 'medium' ? '#fbbc04' : '#34a853',
  },
}));

const PlanBadge = styled(Chip)(({ theme, tier }) => ({
  fontSize: '12px',
  fontWeight: 600,
  height: '24px',
  ...(tier === 'free' && {
    backgroundColor: alpha('#5f6368', 0.1),
    color: '#5f6368',
  }),
  ...(tier === 'pro' && {
    backgroundColor: alpha('#4285f4', 0.1),
    color: '#4285f4',
  }),
  ...(tier === 'enterprise' && {
    backgroundColor: alpha('#34a853', 0.1),
    color: '#34a853',
  }),
}));

// Subscription plans configuration
const subscriptionPlans = {
  free: {
    name: 'Free',
    price: 0,
    uploadLimit: 100, // MB
    tokenLimit: 10000,
    features: ['Basic document upload', 'Standard AI processing', 'Community support'],
    color: '#5f6368',
  },
  pro: {
    name: 'Pro',
    price: 29,
    uploadLimit: 1000, // MB (1GB)
    tokenLimit: 100000,
    features: ['Priority processing', 'Advanced AI features', 'Email support', 'Export capabilities'],
    color: '#4285f4',
  },
  enterprise: {
    name: 'Enterprise',
    price: 99,
    uploadLimit: 10000, // MB (10GB)
    tokenLimit: 1000000,
    features: ['Custom quotas', 'API access', 'Dedicated support', 'Advanced analytics', 'SSO integration'],
    color: '#34a853',
  },
};

const SubscriptionDashboard = ({ 
  user = {
    subscription: {
      tier: 'pro',
      startDate: new Date('2024-01-01'),
      nextBillingDate: new Date('2024-02-01'),
      status: 'active',
    },
    usage: {
      uploadUsed: 450, // MB
      tokensUsed: 65000,
      lastUpdated: new Date(),
    },
  },
  onUpgrade = () => {},
  onDowngrade = () => {},
  onManageBilling = () => {},
  onDownloadInvoice = () => {},
  className,
}) => {
  const [currentUsage, setCurrentUsage] = useState(user.usage);
  const currentPlan = subscriptionPlans[user.subscription.tier];

  // Calculate usage percentages
  const uploadPercentage = Math.min((currentUsage.uploadUsed / currentPlan.uploadLimit) * 100, 100);
  const tokenPercentage = Math.min((currentUsage.tokensUsed / currentPlan.tokenLimit) * 100, 100);

  // Determine usage severity
  const getUsageSeverity = (percentage) => {
    if (percentage >= 90) return 'high';
    if (percentage >= 70) return 'medium';
    return 'low';
  };

  // Mock billing history
  const billingHistory = [
    {
      id: 1,
      date: new Date('2024-01-01'),
      amount: currentPlan.price,
      status: 'paid',
      invoiceId: 'INV-2024-001',
    },
    {
      id: 2,
      date: new Date('2023-12-01'),
      amount: currentPlan.price,
      status: 'paid',
      invoiceId: 'INV-2023-012',
    },
    {
      id: 3,
      date: new Date('2023-11-01'),
      amount: currentPlan.price,
      status: 'paid',
      invoiceId: 'INV-2023-011',
    },
  ];

  // Mock usage recommendations
  const getUsageRecommendations = () => {
    const recommendations = [];
    
    if (uploadPercentage > 80) {
      recommendations.push({
        type: 'warning',
        title: 'Upload Quota Nearly Exceeded',
        message: `You've used ${uploadPercentage.toFixed(1)}% of your upload quota. Consider upgrading or managing your storage.`,
      });
    }
    
    if (tokenPercentage > 80) {
      recommendations.push({
        type: 'warning',
        title: 'Token Usage High',
        message: `You've used ${tokenPercentage.toFixed(1)}% of your token quota. Consider upgrading for unlimited processing.`,
      });
    }
    
    if (user.subscription.tier === 'free' && (uploadPercentage > 50 || tokenPercentage > 50)) {
      recommendations.push({
        type: 'info',
        title: 'Upgrade Recommendation',
        message: 'Consider upgrading to Pro for 10x more storage and tokens plus priority processing.',
      });
    }
    
    return recommendations;
  };

  const recommendations = getUsageRecommendations();

  return (
    <Box className={className}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, color: '#202124' }}>
          📋 Subscription Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage your subscription, monitor usage, and track billing information.
        </Typography>
      </Box>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Box sx={{ mb: 3 }}>
          {recommendations.map((rec, index) => (
            <Alert 
              key={index} 
              severity={rec.type === 'warning' ? 'warning' : 'info'} 
              sx={{ mb: 1 }}
            >
              <AlertTitle>{rec.title}</AlertTitle>
              {rec.message}
            </Alert>
          ))}
        </Box>
      )}

      <Grid container spacing={3}>
        {/* Current Plan */}
        <Grid item xs={12} md={4}>
          <StyledCard variant="primary">
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ 
                  width: 48, 
                  height: 48, 
                  bgcolor: currentPlan.color, 
                  mr: 2,
                  fontSize: '20px'
                }}>
                  <PlanIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Current Plan
                  </Typography>
                  <PlanBadge 
                    label={currentPlan.name} 
                    tier={user.subscription.tier}
                  />
                </Box>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="h4" sx={{ fontWeight: 700, color: currentPlan.color }}>
                  ${currentPlan.price}
                  <Typography component="span" variant="body2" color="text.secondary">
                    /month
                  </Typography>
                </Typography>
              </Box>

              <List dense>
                {currentPlan.features.map((feature, index) => (
                  <ListItem key={index} sx={{ px: 0 }}>
                    <ListItemIcon sx={{ minWidth: 24 }}>
                      <CheckIcon />
                    </ListItemIcon>
                    <ListItemText 
                      primary={feature} 
                      primaryTypographyProps={{ fontSize: '0.875em' }}
                    />
                  </ListItem>
                ))}
              </List>

              <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                {user.subscription.tier !== 'enterprise' && (
                  <Button 
                    variant="contained" 
                    size="small" 
                    onClick={onUpgrade}
                    startIcon={<UpgradeIcon />}
                  >
                    Upgrade
                  </Button>
                )}
                <Button 
                  variant="outlined" 
                  size="small" 
                  onClick={onManageBilling}
                >
                  Manage
                </Button>
              </Box>
            </CardContent>
          </StyledCard>
        </Grid>

        {/* Usage Statistics */}
        <Grid item xs={12} md={8}>
          <StyledCard>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Avatar sx={{ width: 40, height: 40, bgcolor: '#4285f4', mr: 2 }}>
                  <UsageIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Usage Statistics
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Last updated: {currentUsage.lastUpdated.toLocaleString()}
                  </Typography>
                </Box>
              </Box>

              <Grid container spacing={3}>
                {/* Upload Usage */}
                <Grid item xs={12} sm={6}>
                  <Paper sx={{ p: 2, border: '1px solid #dadce0' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <StorageIcon />
                      <Typography variant="subtitle2" sx={{ ml: 1, fontWeight: 600 }}>
                        Upload Storage
                      </Typography>
                    </Box>
                    
                    <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                      {currentUsage.uploadUsed} MB
                      <Typography component="span" variant="body2" color="text.secondary">
                        / {currentPlan.uploadLimit} MB
                      </Typography>
                    </Typography>
                    
                    <UsageProgressBar
                      variant="determinate"
                      value={uploadPercentage}
                      severity={getUsageSeverity(uploadPercentage)}
                      sx={{ mb: 1 }}
                    />
                    
                    <Typography variant="caption" color="text.secondary">
                      {uploadPercentage.toFixed(1)}% used
                    </Typography>
                  </Paper>
                </Grid>

                {/* Token Usage */}
                <Grid item xs={12} sm={6}>
                  <Paper sx={{ p: 2, border: '1px solid #dadce0' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <TokenIcon />
                      <Typography variant="subtitle2" sx={{ ml: 1, fontWeight: 600 }}>
                        AI Tokens
                      </Typography>
                    </Box>
                    
                    <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                      {currentUsage.tokensUsed.toLocaleString()}
                      <Typography component="span" variant="body2" color="text.secondary">
                        / {currentPlan.tokenLimit.toLocaleString()}
                      </Typography>
                    </Typography>
                    
                    <UsageProgressBar
                      variant="determinate"
                      value={tokenPercentage}
                      severity={getUsageSeverity(tokenPercentage)}
                      sx={{ mb: 1 }}
                    />
                    
                    <Typography variant="caption" color="text.secondary">
                      {tokenPercentage.toFixed(1)}% used
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>

              {/* Quota Reset Info */}
              <Box sx={{ mt: 2, p: 2, bgcolor: alpha('#4285f4', 0.05), borderRadius: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <CalendarIcon />
                  <Typography variant="body2" sx={{ ml: 1 }}>
                    <strong>Next billing cycle:</strong> {user.subscription.nextBillingDate.toLocaleDateString()}
                    <br />
                    Quotas will reset on your next billing date.
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </StyledCard>
        </Grid>

        {/* Billing Information */}
        <Grid item xs={12}>
          <StyledCard>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar sx={{ width: 40, height: 40, bgcolor: '#34a853', mr: 2 }}>
                    <BillingIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Billing History
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Recent transactions and invoices
                    </Typography>
                  </Box>
                </Box>
                
                <Button 
                  variant="outlined" 
                  size="small"
                  onClick={onManageBilling}
                >
                  Manage Billing
                </Button>
              </Box>

              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Invoice</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {billingHistory.map((bill) => (
                      <TableRow key={bill.id} hover>
                        <TableCell>
                          {bill.date.toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            ${bill.amount}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={bill.status} 
                            size="small"
                            color={bill.status === 'paid' ? 'success' : 'default'}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                            {bill.invoiceId}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="Download Invoice">
                            <IconButton 
                              size="small" 
                              onClick={() => onDownloadInvoice(bill.invoiceId)}
                            >
                              <DownloadIcon />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Subscription Details */}
              <Divider sx={{ my: 3 }} />
              
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                  Subscription Details
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Typography variant="caption" color="text.secondary">
                      Plan
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {currentPlan.name}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Typography variant="caption" color="text.secondary">
                      Status
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {user.subscription.status}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Typography variant="caption" color="text.secondary">
                      Start Date
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {user.subscription.startDate.toLocaleDateString()}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Typography variant="caption" color="text.secondary">
                      Next Billing
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {user.subscription.nextBillingDate.toLocaleDateString()}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            </CardContent>
          </StyledCard>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SubscriptionDashboard;