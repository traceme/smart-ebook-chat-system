import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Button,
  Card,
  CardContent,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert,
  AlertTitle,
  Chip,
  Divider,
  FormControlLabel,
  Switch,
  TextField,
  RadioGroup,
  Radio,
  FormControl,
  FormLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import { styled, alpha } from '@mui/material/styles';
import './SubscriptionUpgradeFlow.css';
import UsageIndicator from './UsageIndicator';

// Icons using Unicode emojis
const CheckIcon = () => <span style={{ fontSize: '16px', color: '#34a853' }}>✅</span>;
const WarningIcon = () => <span style={{ fontSize: '16px', color: '#ea4335' }}>⚠️</span>;
const InfoIcon = () => <span style={{ fontSize: '16px', color: '#4285f4' }}>ℹ️</span>;
const ExpandIcon = () => <span style={{ fontSize: '16px' }}>📊</span>;
const CalendarIcon = () => <span style={{ fontSize: '16px' }}>📅</span>;
const CreditCardIcon = () => <span style={{ fontSize: '16px' }}>💳</span>;
const ReceiptIcon = () => <span style={{ fontSize: '16px' }}>🧾</span>;
const LockIcon = () => <span style={{ fontSize: '16px' }}>🔒</span>;

// Styled components
const PlanComparisonCard = styled(Card)(({ theme, selected, isUpgrade }) => ({
  border: selected 
    ? `2px solid ${isUpgrade ? '#34a853' : '#ea4335'}` 
    : '1px solid #dadce0',
  transition: 'all 0.2s ease-in-out',
  cursor: 'pointer',
  ...(selected && {
    backgroundColor: alpha(isUpgrade ? '#34a853' : '#ea4335', 0.02),
  }),
  '&:hover': {
    borderColor: isUpgrade ? '#34a853' : '#ea4335',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  },
}));

const StepContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  backgroundColor: '#fff',
  borderRadius: theme.spacing(1),
  border: '1px solid #dadce0',
}));

// Plans configuration
const plans = {
  free: {
    name: 'Free',
    price: 0,
    features: ['100MB storage', '10K tokens/month', 'Community support'],
    limits: { storage: 100, tokens: 10000 },
    color: '#5f6368',
  },
  pro: {
    name: 'Pro',
    price: 29,
    features: ['1GB storage', '100K tokens/month', 'Priority processing', 'Email support'],
    limits: { storage: 1000, tokens: 100000 },
    color: '#4285f4',
  },
  enterprise: {
    name: 'Enterprise',
    price: 99,
    features: ['10GB+ storage', '1M+ tokens/month', 'Custom quotas', 'Dedicated support', 'API access'],
    limits: { storage: 10000, tokens: 1000000 },
    color: '#34a853',
  },
};

const SubscriptionUpgradeFlow = ({ onClose, initialPlan = null }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [plans, setPlans] = useState([]);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(initialPlan);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [quotaStatus, setQuotaStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [prorationDetails, setProrationDetails] = useState(null);

  const authToken = localStorage.getItem('authToken') || '';

  useEffect(() => {
    if (authToken) {
      fetchData();
    }
  }, []);

  useEffect(() => {
    if (selectedPlan && currentSubscription) {
      calculateProration();
      checkDowngradeWarnings();
    }
  }, [selectedPlan, billingCycle, currentSubscription]);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchPlans(),
        fetchCurrentSubscription(),
        fetchQuotaStatus()
      ]);
    } catch (err) {
      setError('Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    const response = await fetch('/api/v1/subscription/tiers', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) throw new Error('Failed to fetch plans');

    const data = await response.json();
    setPlans(data.tiers);
  };

  const fetchCurrentSubscription = async () => {
    const response = await fetch('/api/v1/subscription/my-subscription', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) throw new Error('Failed to fetch current subscription');

    const data = await response.json();
    setCurrentSubscription(data.subscription);
  };

  const fetchQuotaStatus = async () => {
    const response = await fetch('/api/v1/subscription/quota-status', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) throw new Error('Failed to fetch quota status');

    const data = await response.json();
    setQuotaStatus(data);
  };

  const calculateProration = () => {
    if (!selectedPlan || !currentSubscription) return;

    const currentPrice = billingCycle === 'monthly' 
      ? currentSubscription.tier.price_monthly 
      : currentSubscription.tier.price_yearly;
    
    const newPrice = billingCycle === 'monthly' 
      ? selectedPlan.price_monthly 
      : selectedPlan.price_yearly;

    // Simplified proration calculation
    const today = new Date();
    const dayOfMonth = today.getDate();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const remainingDays = daysInMonth - dayOfMonth + 1;
    const dailyCurrentCost = currentPrice / daysInMonth;
    const dailyNewCost = newPrice / daysInMonth;
    
    const refund = dailyCurrentCost * remainingDays;
    const newCharge = dailyNewCost * remainingDays;
    const netCharge = newCharge - refund;

    setProrationDetails({
      currentPrice,
      newPrice,
      remainingDays,
      refund,
      newCharge,
      netCharge,
      effectiveDate: today.toLocaleDateString()
    });
  };

  const checkDowngradeWarnings = () => {
    if (!selectedPlan || !currentSubscription || !quotaStatus) return;

    const newWarnings = [];
    const isDowngrade = getTierOrder(selectedPlan.name) < getTierOrder(currentSubscription.tier.name);

    if (isDowngrade) {
      if (quotaStatus.upload.current_usage > selectedPlan.upload_quota_mb) {
        newWarnings.push({
          type: 'quota_exceeded',
          title: 'Upload Quota Exceeded',
          message: `Your current upload usage (${quotaStatus.upload.current_usage}MB) exceeds the ${selectedPlan.display_name} limit of ${selectedPlan.upload_quota_mb}MB.`,
          severity: 'error'
        });
      }

      if (quotaStatus.token.current_usage > selectedPlan.token_quota) {
        newWarnings.push({
          type: 'quota_exceeded',
          title: 'Token Quota Exceeded',
          message: `Your current token usage (${quotaStatus.token.current_usage}) exceeds the ${selectedPlan.display_name} limit of ${selectedPlan.token_quota}.`,
          severity: 'warning'
        });
      }

      newWarnings.push({
        type: 'feature_loss',
        title: 'Feature Access Changes',
        message: `Downgrading to ${selectedPlan.display_name} may limit access to certain features.`,
        severity: 'info'
      });
    }

    setWarnings(newWarnings);
  };

  const getTierOrder = (tierName) => {
    const order = { 'free': 1, 'pro': 2, 'enterprise': 3 };
    return order[tierName] || 0;
  };

  const isUpgrade = () => {
    if (!selectedPlan || !currentSubscription) return false;
    return getTierOrder(selectedPlan.name) > getTierOrder(currentSubscription.tier.name);
  };

  const handlePlanSelect = (plan) => {
    setSelectedPlan(plan);
    setCurrentStep(2);
  };

  const handleConfirmChange = async () => {
    setProcessing(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/subscription/subscribe', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tier_id: selectedPlan.id,
          billing_cycle: billingCycle,
          prorate: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update subscription');
      }

      setCurrentStep(4);
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  if (loading) {
    return (
      <div className="upgrade-flow-modal">
        <div className="upgrade-flow-content">
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading subscription options...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="upgrade-flow-modal">
      <div className="upgrade-flow-content">
        <div className="modal-header">
          <h1>Subscription Management</h1>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="step-indicator">
          <div className="step-progress">
            <div className="progress-bar" style={{ width: `${(currentStep / 4) * 100}%` }} />
          </div>
          <div className="steps">
            {[
              { number: 1, title: 'Select Plan' },
              { number: 2, title: 'Review Changes' },
              { number: 3, title: 'Confirm' },
              { number: 4, title: 'Complete' }
            ].map((step) => (
              <div key={step.number} className={`step ${currentStep >= step.number ? 'active' : ''}`}>
                <div className="step-number">{step.number}</div>
                <div className="step-title">{step.title}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="modal-body">
          {currentStep === 1 && (
            <div className="step-content">
              <h2>Choose Your New Plan</h2>
              <p>Compare plans and select the one that best fits your needs</p>

              <div className="current-plan-highlight">
                <h3>Current Plan</h3>
                {currentSubscription && (
                  <div className="current-plan-card">
                    <span className="plan-name">{currentSubscription.tier.display_name}</span>
                    <span className="plan-price">{formatCurrency(currentSubscription.tier.price_monthly)}/month</span>
                  </div>
                )}
              </div>

              <div className="plans-comparison">
                {plans.map((plan) => {
                  const isCurrent = currentSubscription?.tier_id === plan.id;

                  return (
                    <div key={plan.id} className={`plan-option ${isCurrent ? 'current' : ''} ${selectedPlan?.id === plan.id ? 'selected' : ''}`}>
                      {plan.name === 'pro' && <div className="popular-badge">Most Popular</div>}
                      
                      <div className="plan-header">
                        <h3>{plan.display_name}</h3>
                        <div className="plan-pricing">
                          <span className="price">{formatCurrency(plan.price_monthly)}</span>
                          <span className="period">/month</span>
                        </div>
                      </div>

                      <div className="plan-features">
                        <div className="feature-group">
                          <h4>Quotas</h4>
                          <ul>
                            <li>📁 {formatNumber(plan.upload_quota_mb)} MB uploads/month</li>
                            <li>🤖 {formatNumber(plan.token_quota)} AI tokens/month</li>
                            <li>🔍 {formatNumber(plan.search_quota)} searches/month</li>
                            <li>📚 Up to {plan.documents_limit} documents</li>
                          </ul>
                        </div>
                      </div>

                      <div className="plan-action">
                        {isCurrent ? (
                          <button className="btn btn-current" disabled>Current Plan</button>
                        ) : (
                          <button 
                            className={`btn btn-select ${getTierOrder(plan.name) > getTierOrder(currentSubscription?.tier.name || 'free') ? 'upgrade' : 'downgrade'}`}
                            onClick={() => handlePlanSelect(plan)}
                          >
                            {getTierOrder(plan.name) > getTierOrder(currentSubscription?.tier.name || 'free') ? 'Upgrade' : 'Downgrade'} to {plan.display_name}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="step-content">
              <h2>Review Your Changes</h2>
              <p>Please review the details of your subscription change</p>

              <div className="change-summary">
                <div className="change-header">
                  <h3>Subscription Change Summary</h3>
                  <div className="change-type">
                    <span className={`change-badge ${isUpgrade() ? 'upgrade' : 'downgrade'}`}>
                      {isUpgrade() ? 'Upgrade' : 'Downgrade'}
                    </span>
                  </div>
                </div>

                <div className="plan-comparison">
                  <div className="plan-change">
                    <div className="from-plan">
                      <h4>From</h4>
                      <div className="plan-details">
                        <span className="plan-name">{currentSubscription?.tier.display_name}</span>
                        <span className="plan-price">{formatCurrency(currentSubscription?.tier.price_monthly)}/month</span>
                      </div>
                    </div>
                    <div className="arrow">→</div>
                    <div className="to-plan">
                      <h4>To</h4>
                      <div className="plan-details">
                        <span className="plan-name">{selectedPlan?.display_name}</span>
                        <span className="plan-price">{formatCurrency(selectedPlan?.price_monthly)}/month</span>
                      </div>
                    </div>
                  </div>
                </div>

                {warnings.length > 0 && (
                  <div className="warnings-section">
                    <h4>⚠️ Important Notices</h4>
                    {warnings.map((warning, idx) => (
                      <div key={idx} className={`warning-item ${warning.severity}`}>
                        <div className="warning-header">
                          <span className="warning-icon">
                            {warning.severity === 'error' ? '❌' : warning.severity === 'warning' ? '⚠️' : 'ℹ️'}
                          </span>
                          <span className="warning-title">{warning.title}</span>
                        </div>
                        <p className="warning-message">{warning.message}</p>
                      </div>
                    ))}
                  </div>
                )}

                {quotaStatus && (
                  <div className="current-usage-section">
                    <h4>Current Usage</h4>
                    <UsageIndicator 
                      type="compact"
                      showLabels={true}
                      refreshInterval={0}
                    />
                  </div>
                )}
              </div>

              <div className="step-actions">
                <button className="btn btn-secondary" onClick={() => setCurrentStep(1)}>
                  Back to Plan Selection
                </button>
                <button 
                  className="btn btn-primary" 
                  onClick={() => setCurrentStep(3)}
                  disabled={warnings.some(w => w.severity === 'error')}
                >
                  Continue to Confirmation
                </button>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="step-content">
              <h2>Confirm Your Subscription Change</h2>
              <p>Please confirm that you want to proceed with this subscription change</p>

              <div className="confirmation-summary">
                <div className="final-details">
                  <h3>Final Details</h3>
                  <div className="detail-row">
                    <span>New Plan:</span>
                    <span className="highlight">{selectedPlan?.display_name}</span>
                  </div>
                  <div className="detail-row">
                    <span>Monthly Price:</span>
                    <span>{formatCurrency(selectedPlan?.price_monthly)}</span>
                  </div>
                </div>

                <div className="terms-acceptance">
                  <label className="checkbox-label">
                    <input type="checkbox" required />
                    <span>I understand the terms and conditions of this subscription change</span>
                  </label>
                  {!isUpgrade() && (
                    <label className="checkbox-label">
                      <input type="checkbox" required />
                      <span>I acknowledge that downgrading may limit my access to features and data</span>
                    </label>
                  )}
                </div>
              </div>

              {error && (
                <div className="error-message">
                  <span className="error-icon">❌</span>
                  <span>{error}</span>
                </div>
              )}

              <div className="step-actions">
                <button className="btn btn-secondary" onClick={() => setCurrentStep(2)}>
                  Back to Review
                </button>
                <button 
                  className={`btn ${isUpgrade() ? 'btn-success' : 'btn-warning'}`}
                  onClick={handleConfirmChange}
                  disabled={processing}
                >
                  {processing ? (
                    <>
                      <span className="spinner-small"></span>
                      Processing...
                    </>
                  ) : (
                    `Confirm ${isUpgrade() ? 'Upgrade' : 'Downgrade'}`
                  )}
                </button>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="step-content completion">
              <div className="success-icon">✅</div>
              <h2>Subscription Updated Successfully!</h2>
              <p>Your subscription has been {isUpgrade() ? 'upgraded' : 'downgraded'} to {selectedPlan?.display_name}</p>

              <div className="completion-details">
                <h3>What happens next?</h3>
                <ul>
                  <li>Your new plan features are active immediately</li>
                  <li>You'll receive a confirmation email with the details</li>
                  <li>Your next billing date will be updated accordingly</li>
                  {!isUpgrade() && (
                    <li>Please review your usage to ensure it fits within the new limits</li>
                  )}
                </ul>
              </div>

              <div className="completion-actions">
                <button className="btn btn-primary" onClick={() => window.location.reload()}>
                  Return to Dashboard
                </button>
                <button className="btn btn-secondary" onClick={onClose}>
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubscriptionUpgradeFlow; 