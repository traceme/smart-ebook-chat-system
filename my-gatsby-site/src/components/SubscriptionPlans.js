import React, { useState, useEffect } from 'react';
import './SubscriptionPlans.css';
import SubscriptionUpgradeFlow from './SubscriptionUpgradeFlow';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Switch,
  FormControlLabel,
  Divider,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
} from '@mui/material';
import { styled, alpha } from '@mui/material/styles';

// Icons using Unicode emojis
const CheckIcon = () => <span style={{ fontSize: '16px', color: '#34a853' }}>✅</span>;
const CloseIcon = () => <span style={{ fontSize: '16px', color: '#ea4335' }}>❌</span>;
const StarIcon = () => <span style={{ fontSize: '16px' }}>⭐</span>;
const CrownIcon = () => <span style={{ fontSize: '16px' }}>👑</span>;
const RocketIcon = () => <span style={{ fontSize: '16px' }}>🚀</span>;
const ShieldIcon = () => <span style={{ fontSize: '16px' }}>🛡️</span>;

// Styled components
const PlanCard = styled(Card)(({ theme, featured, current }) => ({
  height: '100%',
  position: 'relative',
  border: current 
    ? '2px solid #4285f4' 
    : featured 
      ? '2px solid #34a853' 
      : '1px solid #dadce0',
  transition: 'all 0.3s ease-in-out',
  ...(featured && {
    transform: 'scale(1.05)',
    zIndex: 1,
    boxShadow: '0 8px 32px rgba(52, 168, 83, 0.2)',
  }),
  ...(current && {
    backgroundColor: alpha('#4285f4', 0.02),
  }),
  '&:hover': {
    boxShadow: featured 
      ? '0 12px 40px rgba(52, 168, 83, 0.3)' 
      : '0 8px 24px rgba(0,0,0,0.12)',
    transform: featured ? 'scale(1.05)' : 'translateY(-4px)',
  },
}));

const PriceDisplay = styled(Box)(({ theme }) => ({
  textAlign: 'center',
  marginBottom: theme.spacing(3),
}));

const FeatureList = styled(List)(({ theme }) => ({
  '& .MuiListItem-root': {
    paddingLeft: 0,
    paddingRight: 0,
    paddingTop: theme.spacing(0.5),
    paddingBottom: theme.spacing(0.5),
  },
}));

const FeaturedBadge = styled(Chip)(({ theme }) => ({
  position: 'absolute',
  top: -12,
  right: 16,
  backgroundColor: '#34a853',
  color: 'white',
  fontWeight: 600,
  fontSize: '0.75rem',
  '& .MuiChip-icon': {
    color: 'white',
  },
}));

const CurrentPlanBadge = styled(Chip)(({ theme }) => ({
  position: 'absolute',
  top: -12,
  left: 16,
  backgroundColor: '#4285f4',
  color: 'white',
  fontWeight: 600,
  fontSize: '0.75rem',
}));

// Plans configuration
const plans = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: 'month',
    description: 'Perfect for trying out our platform',
    features: [
      { name: 'Basic document upload', included: true },
      { name: '100MB storage', included: true },
      { name: '10K AI tokens/month', included: true },
      { name: 'Standard processing speed', included: true },
      { name: 'Community support', included: true },
      { name: 'Basic search', included: true },
      { name: 'Priority processing', included: false },
      { name: 'Advanced AI features', included: false },
      { name: 'API access', included: false },
      { name: 'Custom quotas', included: false },
      { name: 'SSO integration', included: false },
    ],
    limits: {
      storage: '100 MB',
      tokens: '10,000',
      uploads: '10 documents',
      support: 'Community',
    },
    buttonText: 'Get Started',
    buttonVariant: 'outlined',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 29,
    period: 'month',
    description: 'Best for professionals and small teams',
    featured: true,
    features: [
      { name: 'Advanced document upload', included: true },
      { name: '1GB storage', included: true },
      { name: '100K AI tokens/month', included: true },
      { name: 'Priority processing speed', included: true },
      { name: 'Email support', included: true },
      { name: 'Advanced search & filters', included: true },
      { name: 'Export capabilities', included: true },
      { name: 'Advanced AI features', included: true },
      { name: 'Batch processing', included: true },
      { name: 'API access', included: false },
      { name: 'Custom quotas', included: false },
      { name: 'SSO integration', included: false },
    ],
    limits: {
      storage: '1 GB',
      tokens: '100,000',
      uploads: '100 documents',
      support: 'Email',
    },
    buttonText: 'Start Free Trial',
    buttonVariant: 'contained',
    savings: 'Most Popular',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 99,
    period: 'month',
    description: 'For large teams and organizations',
    features: [
      { name: 'Unlimited document upload', included: true },
      { name: '10GB+ storage', included: true },
      { name: '1M+ AI tokens/month', included: true },
      { name: 'Fastest processing speed', included: true },
      { name: 'Dedicated support', included: true },
      { name: 'Advanced analytics', included: true },
      { name: 'Full API access', included: true },
      { name: 'Custom integrations', included: true },
      { name: 'Custom quotas', included: true },
      { name: 'SSO integration', included: true },
      { name: 'White-label options', included: true },
      { name: 'SLA guarantee', included: true },
    ],
    limits: {
      storage: 'Custom',
      tokens: 'Custom',
      uploads: 'Unlimited',
      support: 'Dedicated',
    },
    buttonText: 'Contact Sales',
    buttonVariant: 'contained',
    savings: 'Best Value',
  },
];

const SubscriptionPlans = () => {
  const [plans, setPlans] = useState([]);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [authToken, setAuthToken] = useState('');
  const [upgrading, setUpgrading] = useState(null);
  const [showUpgradeFlow, setShowUpgradeFlow] = useState(false);
  const [selectedPlanForFlow, setSelectedPlanForFlow] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [upgradeDialog, setUpgradeDialog] = useState(false);
  const [annualBilling, setAnnualBilling] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('authToken') || '';
    setAuthToken(token);
    
    if (token) {
      fetchPlans(token);
      fetchCurrentSubscription(token);
    } else {
      fetchPlans(); // Fetch plans without auth for public viewing
    }
  }, []);

  const fetchPlans = async (token = '') => {
    try {
      const headers = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/v1/subscription/tiers', {
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setPlans(data.tiers);
    } catch (err) {
      console.error('Error fetching plans:', err);
      setError('Failed to load subscription plans');
    }
  };

  const fetchCurrentSubscription = async (token) => {
    try {
      const response = await fetch('/api/v1/subscription/my-subscription', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentPlan(data.subscription);
      }
    } catch (err) {
      console.error('Error fetching current subscription:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planId, planName) => {
    if (!authToken) {
      alert('Please log in to upgrade your subscription');
      return;
    }

    setUpgrading(planId);

    try {
      const response = await fetch('/api/v1/subscription/subscribe', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tier_id: planId,
          billing_cycle: 'monthly',
          prorate: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setCurrentPlan(data);
      alert(`Successfully upgraded to ${planName}!`);
      
      // Refresh the page to update all components
      window.location.reload();
    } catch (err) {
      console.error('Error upgrading subscription:', err);
      alert('Failed to upgrade subscription. Please try again.');
    } finally {
      setUpgrading(null);
    }
  };

  const handleOpenUpgradeFlow = (plan = null) => {
    if (!authToken) {
      alert('Please log in to manage your subscription');
      return;
    }
    setSelectedPlanForFlow(plan);
    setShowUpgradeFlow(true);
  };

  const handleCloseUpgradeFlow = () => {
    setShowUpgradeFlow(false);
    setSelectedPlanForFlow(null);
    // Refresh data after flow completion
    if (authToken) {
      fetchCurrentSubscription(authToken);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const isCurrentPlan = (planId) => {
    return currentPlan && currentPlan.tier_id === planId;
  };

  const canUpgrade = (planName) => {
    if (!currentPlan) return true;
    
    const tierOrder = { 'free': 1, 'pro': 2, 'enterprise': 3 };
    const currentTierOrder = tierOrder[currentPlan.tier.name] || 0;
    const targetTierOrder = tierOrder[planName] || 0;
    
    return targetTierOrder > currentTierOrder;
  };

  const handlePlanSelect = (plan) => {
    if (plan.id === currentPlan) return;
    
    setSelectedPlan(plan);
    
    if (plan.id === 'enterprise') {
      onContactSales();
    } else {
      setSelectedPlanForFlow(plan);
      setShowUpgradeFlow(true);
    }
  };

  const isUpgrade = (planId) => {
    const currentIndex = plans.findIndex(p => p.id === currentPlan);
    const newIndex = plans.findIndex(p => p.id === planId);
    return newIndex > currentIndex;
  };

  const isDowngrade = (planId) => {
    const currentIndex = plans.findIndex(p => p.id === currentPlan);
    const newIndex = plans.findIndex(p => p.id === planId);
    return newIndex < currentIndex;
  };

  const getPrice = (plan) => {
    if (plan.price === 0) return 0;
    return annualBilling ? Math.round(plan.price * 12 * 0.8) : plan.price;
  };

  const getAnnualSavings = (plan) => {
    if (plan.price === 0) return 0;
    return plan.price * 12 * 0.2;
  };

  const onContactSales = () => {
    // Handle enterprise contact sales
    window.open('mailto:sales@smartebookchat.com?subject=Enterprise Plan Inquiry', '_blank');
  };

  const handleConfirmUpgrade = async () => {
    if (!selectedPlan) return;
    
    try {
      setConfirmDialog(false);
      setUpgradeDialog(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update current plan
      setCurrentPlan(selectedPlan.id);
      setUpgradeDialog(false);
      setSelectedPlan(null);
      
      // Show success message (you could add a toast here)
      console.log(`Successfully upgraded to ${selectedPlan.name} plan`);
      
    } catch (error) {
      setUpgradeDialog(false);
      console.error('Failed to upgrade plan:', error);
    }
  };

  const PlanCard = ({ plan }) => {
    const isCurrent = isCurrentPlan(plan.id);
    const canUpgradeToThis = canUpgrade(plan.name);
    const isUpgrading = upgrading === plan.id;

    return (
      <Grid item xs={12} md={4} key={plan.id}>
        <PlanCard 
          featured={plan.featured}
          current={plan.id === currentPlan}
        >
          {plan.featured && (
            <FeaturedBadge 
              label={plan.savings} 
              icon={<StarIcon />}
            />
          )}
          
          {plan.id === currentPlan && (
            <CurrentPlanBadge label="Current Plan" />
          )}

          <CardContent sx={{ p: 3 }}>
            {/* Plan Header */}
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
                {plan.name}
                {plan.id === 'enterprise' && <CrownIcon />}
                {plan.id === 'pro' && <RocketIcon />}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {plan.description}
              </Typography>
            </Box>

            {/* Pricing */}
            <PriceDisplay>
              <Typography variant="h3" sx={{ fontWeight: 700, color: '#202124' }}>
                ${getPrice(plan)}
                <Typography component="span" variant="h6" color="text.secondary">
                  /{annualBilling ? 'year' : plan.period}
                </Typography>
              </Typography>
              
              {annualBilling && plan.price > 0 && (
                <Typography variant="body2" color="success.main" sx={{ mt: 1 }}>
                  Save ${getAnnualSavings(plan)} annually
                </Typography>
              )}
            </PriceDisplay>

            {/* Features */}
            <FeatureList>
              {plan.features.slice(0, showComparison ? plan.features.length : 6).map((feature, index) => (
                <ListItem key={index}>
                  <ListItemIcon sx={{ minWidth: 28 }}>
                    {feature.included ? <CheckIcon /> : <CloseIcon />}
                  </ListItemIcon>
                  <ListItemText 
                    primary={feature.name}
                    primaryTypographyProps={{
                      fontSize: '0.875rem',
                      color: feature.included ? 'text.primary' : 'text.disabled',
                    }}
                  />
                </ListItem>
              ))}
            </FeatureList>

            {!showComparison && plan.features.length > 6 && (
              <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', display: 'block', mt: 1 }}>
                +{plan.features.length - 6} more features
              </Typography>
            )}

            {/* Limits Summary */}
            <Box sx={{ mt: 2, p: 2, bgcolor: alpha('#f8f9fa', 0.5), borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary" gutterBottom>
                Includes:
              </Typography>
              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                    <strong>Storage:</strong> {plan.limits.storage}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                    <strong>Tokens:</strong> {plan.limits.tokens}
                  </Typography>
                </Grid>
              </Grid>
            </Box>

            {/* Action Button */}
            <Box sx={{ mt: 3 }}>
              {plan.id === currentPlan ? (
                <Button
                  fullWidth
                  variant="outlined"
                  disabled
                  sx={{ py: 1.5 }}
                >
                  Current Plan
                </Button>
              ) : (
                <Button
                  fullWidth
                  variant={plan.buttonVariant}
                  color={plan.featured ? 'success' : 'primary'}
                  onClick={() => handlePlanSelect(plan)}
                  disabled={loading}
                  sx={{ py: 1.5, fontWeight: 600 }}
                >
                  {plan.buttonText}
                  {isUpgrade(plan.id) && ' ⬆️'}
                  {isDowngrade(plan.id) && ' ⬇️'}
                </Button>
              )}
            </Box>

            {/* Change indicator */}
            {plan.id !== currentPlan && (
              <Typography 
                variant="caption" 
                color={isUpgrade(plan.id) ? 'success.main' : 'warning.main'}
                sx={{ textAlign: 'center', display: 'block', mt: 1 }}
              >
                {isUpgrade(plan.id) ? 'Upgrade' : 'Downgrade'} from {plans.find(p => p.id === currentPlan)?.name}
              </Typography>
            )}
          </CardContent>
        </PlanCard>
      </Grid>
    );
  };

  if (loading) {
    return (
      <div className="subscription-plans">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading subscription plans...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="subscription-plans">
        <div className="error-message">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, color: '#202124' }}>
          💳 Choose Your Plan
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Select the perfect plan for your document processing needs
        </Typography>

        {/* Billing Toggle */}
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mb: 2 }}>
          <Typography variant="body2" sx={{ mr: 2 }}>
            Monthly
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={annualBilling}
                onChange={(e) => setAnnualBilling(e.target.checked)}
                color="primary"
              />
            }
            label=""
          />
          <Typography variant="body2" sx={{ ml: 2 }}>
            Annual
            <Chip 
              label="Save 20%" 
              size="small" 
              color="success" 
              sx={{ ml: 1, fontSize: '0.7rem' }}
            />
          </Typography>
        </Box>
      </Box>

      {/* Plans Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {plans.map((plan) => (
          <PlanCard key={plan.id} plan={plan} />
        ))}
      </Grid>

      {/* FAQ or Additional Info */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>Need help choosing?</strong> All plans include a 14-day free trial. 
          You can upgrade or downgrade at any time. Enterprise customers get dedicated support and custom integrations.
        </Typography>
      </Alert>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog} onClose={() => setConfirmDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Confirm Plan {isUpgrade(selectedPlan?.id) ? 'Upgrade' : 'Change'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            You're about to {isUpgrade(selectedPlan?.id) ? 'upgrade' : 'change'} your plan to:
          </Typography>
          
          <Box sx={{ my: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {selectedPlan?.name} Plan
            </Typography>
            <Typography variant="body2" color="text.secondary">
              ${getPrice(selectedPlan || {})} per {annualBilling ? 'year' : 'month'}
            </Typography>
          </Box>

          {isDowngrade(selectedPlan?.id) && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Downgrade Notice:</strong> Your usage may exceed the new plan limits. 
                Some features and data may become unavailable.
              </Typography>
            </Alert>
          )}

          <Typography variant="body2">
            {isUpgrade(selectedPlan?.id) 
              ? 'Your new features will be available immediately. You\'ll be charged prorated for the remainder of your billing cycle.'
              : 'Changes will take effect immediately. You may receive a prorated refund for unused time.'
            }
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmUpgrade} 
            variant="contained"
            color={isUpgrade(selectedPlan?.id) ? 'primary' : 'warning'}
          >
            Confirm {isUpgrade(selectedPlan?.id) ? 'Upgrade' : 'Change'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Processing Dialog */}
      <Dialog open={upgradeDialog} maxWidth="xs" fullWidth>
        <DialogContent sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" gutterBottom>
            Processing Plan Change...
          </Typography>
          <LinearProgress sx={{ my: 2 }} />
          <Typography variant="body2" color="text.secondary">
            Please wait while we update your subscription
          </Typography>
        </DialogContent>
      </Dialog>

      {showUpgradeFlow && (
        <SubscriptionUpgradeFlow
          onClose={handleCloseUpgradeFlow}
          initialPlan={selectedPlanForFlow}
        />
      )}
    </Box>
  );
};

export default SubscriptionPlans;