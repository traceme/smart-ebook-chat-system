import React, { useState, useEffect } from 'react';
import './SubscriptionPlans.css';
import SubscriptionUpgradeFlow from './SubscriptionUpgradeFlow';

const SubscriptionPlans = () => {
  const [plans, setPlans] = useState([]);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [authToken, setAuthToken] = useState('');
  const [upgrading, setUpgrading] = useState(null);
  const [showUpgradeFlow, setShowUpgradeFlow] = useState(false);
  const [selectedPlanForFlow, setSelectedPlanForFlow] = useState(null);

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

  const PlanCard = ({ plan }) => {
    const isCurrent = isCurrentPlan(plan.id);
    const canUpgradeToThis = canUpgrade(plan.name);
    const isUpgrading = upgrading === plan.id;

    return (
      <div className={`plan-card ${plan.name} ${isCurrent ? 'current' : ''}`}>
        {plan.name === 'pro' && (
          <div className="popular-badge">Most Popular</div>
        )}
        
        <div className="plan-header">
          <h3 className="plan-name">{plan.display_name}</h3>
          <div className="plan-price">
            <span className="price-amount">{formatCurrency(plan.price_monthly)}</span>
            <span className="price-period">/month</span>
          </div>
          {plan.price_yearly > 0 && (
            <div className="yearly-price">
              {formatCurrency(plan.price_yearly)}/year 
              <span className="savings">
                (Save {formatCurrency((plan.price_monthly * 12) - plan.price_yearly)})
              </span>
            </div>
          )}
          <p className="plan-description">{plan.description}</p>
        </div>

        <div className="plan-quotas">
          <div className="quota-item">
            <span className="quota-icon">📁</span>
            <span className="quota-text">
              {formatNumber(plan.upload_quota_mb)} MB uploads/month
            </span>
          </div>
          <div className="quota-item">
            <span className="quota-icon">🤖</span>
            <span className="quota-text">
              {formatNumber(plan.token_quota)} AI tokens/month
            </span>
          </div>
          <div className="quota-item">
            <span className="quota-icon">🔍</span>
            <span className="quota-text">
              {formatNumber(plan.search_quota)} searches/month
            </span>
          </div>
          <div className="quota-item">
            <span className="quota-icon">📚</span>
            <span className="quota-text">
              Up to {plan.documents_limit} documents
            </span>
          </div>
        </div>

        <div className="plan-features">
          <h4>Features</h4>
          <ul>
            {plan.features && plan.features.map((feature, index) => (
              <li key={index}>
                <span className="feature-check">✓</span>
                {feature}
              </li>
            ))}
          </ul>
        </div>

        <div className="plan-action">
          {isCurrent ? (
            <div className="current-plan-actions">
              <button className="btn btn-current" disabled>
                Current Plan
              </button>
              <button 
                className="btn btn-manage"
                onClick={() => handleOpenUpgradeFlow()}
              >
                Manage Subscription
              </button>
            </div>
          ) : canUpgradeToThis ? (
            <div className="upgrade-actions">
              <button 
                className={`btn btn-upgrade ${plan.name}`}
                onClick={() => handleOpenUpgradeFlow(plan)}
                disabled={isUpgrading}
              >
                {isUpgrading ? (
                  <>
                    <span className="spinner-small"></span>
                    Upgrading...
                  </>
                ) : (
                  `Upgrade to ${plan.display_name}`
                )}
              </button>
              <button 
                className="btn btn-quick-upgrade"
                onClick={() => handleUpgrade(plan.id, plan.display_name)}
                disabled={isUpgrading}
              >
                Quick Upgrade
              </button>
            </div>
          ) : (
            <button 
              className="btn btn-downgrade-flow"
              onClick={() => handleOpenUpgradeFlow(plan)}
            >
              Downgrade to {plan.display_name}
            </button>
          )}
        </div>
      </div>
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
    <div className="subscription-plans">
      <div className="plans-header">
        <h1>Choose Your Plan</h1>
        <p>Select the perfect plan for your document processing needs</p>
        {currentPlan && (
          <div className="current-plan-info">
            <span>Currently on: </span>
            <strong>{currentPlan.tier.display_name}</strong>
          </div>
        )}
      </div>

      <div className="billing-toggle">
        <div className="toggle-container">
          <span className="toggle-label">Monthly</span>
          <div className="toggle-switch">
            <input type="checkbox" id="billing-toggle" />
            <label htmlFor="billing-toggle"></label>
          </div>
          <span className="toggle-label">
            Yearly <span className="savings-badge">Save 20%</span>
          </span>
        </div>
      </div>

      <div className="plans-grid">
        {plans.map((plan) => (
          <PlanCard key={plan.id} plan={plan} />
        ))}
      </div>

      <div className="plans-footer">
        <div className="faq-section">
          <h3>Frequently Asked Questions</h3>
          <div className="faq-grid">
            <div className="faq-item">
              <h4>Can I change my plan anytime?</h4>
              <p>Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately for upgrades.</p>
            </div>
            <div className="faq-item">
              <h4>What happens to my data if I downgrade?</h4>
              <p>Your data remains safe. However, you may need to reduce usage to fit within the new plan's limits.</p>
            </div>
            <div className="faq-item">
              <h4>Do you offer refunds?</h4>
              <p>We offer a 30-day money-back guarantee for all paid plans. Contact support for assistance.</p>
            </div>
            <div className="faq-item">
              <h4>What payment methods do you accept?</h4>
              <p>We accept all major credit cards, PayPal, and bank transfers for Enterprise plans.</p>
            </div>
          </div>
        </div>

        <div className="contact-section">
          <h3>Need a Custom Plan?</h3>
          <p>Enterprise customers can get custom quotas and features tailored to their needs.</p>
          <button className="btn btn-contact">Contact Sales</button>
        </div>
      </div>

      {showUpgradeFlow && (
        <SubscriptionUpgradeFlow
          onClose={handleCloseUpgradeFlow}
          initialPlan={selectedPlanForFlow}
        />
      )}
    </div>
  );
};

export default SubscriptionPlans;