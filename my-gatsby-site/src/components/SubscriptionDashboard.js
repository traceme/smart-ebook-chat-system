import React, { useState, useEffect } from 'react';
import './SubscriptionDashboard.css';

const SubscriptionDashboard = () => {
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [authToken, setAuthToken] = useState('');

  useEffect(() => {
    // Get auth token from localStorage or wherever it's stored
    const token = localStorage.getItem('authToken') || '';
    setAuthToken(token);
    
    if (token) {
      fetchSubscriptionData(token);
    } else {
      setError('Please log in to view subscription details');
      setLoading(false);
    }
  }, []);

  const fetchSubscriptionData = async (token) => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/subscription/my-subscription', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setSubscriptionData(data);
    } catch (err) {
      console.error('Error fetching subscription data:', err);
      setError('Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getUsagePercentage = (current, limit) => {
    if (limit === 0) return 0;
    return Math.min((current / limit) * 100, 100);
  };

  const getUsageColor = (percentage) => {
    if (percentage >= 90) return '#e74c3c';
    if (percentage >= 75) return '#f39c12';
    return '#27ae60';
  };

  const QuotaCard = ({ title, current, limit, unit, type }) => {
    const percentage = getUsagePercentage(current, limit);
    const color = getUsageColor(percentage);

    return (
      <div className="quota-card">
        <div className="quota-header">
          <h3>{title}</h3>
          <span className="quota-percentage" style={{ color }}>
            {percentage.toFixed(1)}%
          </span>
        </div>
        <div className="quota-progress">
          <div 
            className="quota-progress-bar" 
            style={{ 
              width: `${percentage}%`,
              backgroundColor: color 
            }}
          />
        </div>
        <div className="quota-details">
          <span className="quota-current">
            {current.toLocaleString()} {unit}
          </span>
          <span className="quota-limit">
            / {limit.toLocaleString()} {unit}
          </span>
        </div>
        <div className="quota-remaining">
          {(limit - current).toLocaleString()} {unit} remaining
        </div>
      </div>
    );
  };

  const UsageTrendChart = ({ trendData }) => {
    if (!trendData || trendData.length === 0) return null;

    const maxValue = Math.max(...trendData.map(d => 
      Math.max(d.usage.upload || 0, d.usage.token || 0, d.usage.search || 0)
    ));

    return (
      <div className="usage-trend">
        <h3>Usage Trend (Last 6 Months)</h3>
        <div className="trend-chart">
          {trendData.map((month, index) => (
            <div key={index} className="trend-month">
              <div className="trend-bars">
                <div 
                  className="trend-bar upload"
                  style={{ height: `${(month.usage.upload / maxValue) * 100}%` }}
                  title={`Upload: ${month.usage.upload}`}
                />
                <div 
                  className="trend-bar token"
                  style={{ height: `${(month.usage.token / maxValue) * 100}%` }}
                  title={`Tokens: ${month.usage.token}`}
                />
                <div 
                  className="trend-bar search"
                  style={{ height: `${(month.usage.search / maxValue) * 100}%` }}
                  title={`Searches: ${month.usage.search}`}
                />
              </div>
              <div className="trend-label">{month.month}</div>
            </div>
          ))}
        </div>
        <div className="trend-legend">
          <div className="legend-item">
            <span className="legend-color upload"></span>
            Upload (MB)
          </div>
          <div className="legend-item">
            <span className="legend-color token"></span>
            Tokens
          </div>
          <div className="legend-item">
            <span className="legend-color search"></span>
            Searches
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="subscription-dashboard">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading subscription data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="subscription-dashboard">
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

  if (!subscriptionData) {
    return (
      <div className="subscription-dashboard">
        <div className="no-data">
          <h2>No Subscription Data</h2>
          <p>Unable to load subscription information.</p>
        </div>
      </div>
    );
  }

  const { subscription, quota_status, usage_analytics } = subscriptionData;

  return (
    <div className="subscription-dashboard">
      <div className="dashboard-header">
        <h1>Subscription Dashboard</h1>
        <div className="subscription-badge">
          <span className={`tier-badge ${subscription.tier.name}`}>
            {subscription.tier.display_name}
          </span>
          <span className={`status-badge ${subscription.status}`}>
            {subscription.status}
          </span>
        </div>
      </div>

      {/* Current Subscription Info */}
      <div className="subscription-info">
        <div className="info-card">
          <h2>Current Plan</h2>
          <div className="plan-details">
            <div className="plan-name">{subscription.tier.display_name}</div>
            <div className="plan-price">
              {formatCurrency(subscription.tier.price_monthly)}/month
            </div>
            <div className="plan-cycle">
              Billing: {subscription.billing_cycle}
            </div>
            <div className="plan-dates">
              <div>Started: {formatDate(subscription.start_date)}</div>
              {subscription.end_date && (
                <div>Ends: {formatDate(subscription.end_date)}</div>
              )}
            </div>
          </div>
        </div>

        <div className="info-card">
          <h2>Account Summary</h2>
          <div className="account-stats">
            <div className="stat">
              <span className="stat-label">Documents</span>
              <span className="stat-value">{usage_analytics.document_count}</span>
            </div>
            <div className="stat">
              <span className="stat-label">This Month</span>
              <span className="stat-value">{usage_analytics.current_month}</span>
            </div>
            {subscription.next_billing_date && (
              <div className="stat">
                <span className="stat-label">Next Billing</span>
                <span className="stat-value">{formatDate(subscription.next_billing_date)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quota Status */}
      <div className="quota-section">
        <h2>Usage & Quotas</h2>
        <div className="quota-grid">
          <QuotaCard
            title="File Uploads"
            current={quota_status.upload.current_usage}
            limit={quota_status.upload.limit}
            unit="MB"
            type="upload"
          />
          <QuotaCard
            title="AI Tokens"
            current={quota_status.token.current_usage}
            limit={quota_status.token.limit}
            unit="tokens"
            type="token"
          />
          <QuotaCard
            title="Searches"
            current={quota_status.search.current_usage}
            limit={quota_status.search.limit}
            unit="searches"
            type="search"
          />
        </div>
        <div className="quota-reset">
          <p>Quotas reset on: {formatDate(quota_status.upload.reset_date)}</p>
        </div>
      </div>

      {/* Usage Trend */}
      {usage_analytics.usage_trend && (
        <UsageTrendChart trendData={usage_analytics.usage_trend} />
      )}

      {/* Plan Features */}
      <div className="features-section">
        <h2>Plan Features</h2>
        <div className="features-grid">
          {subscription.tier.features && subscription.tier.features.map((feature, index) => (
            <div key={index} className="feature-item">
              <span className="feature-check">✓</span>
              {feature}
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="dashboard-actions">
        <button className="btn btn-primary" onClick={() => window.location.href = '/subscription/plans'}>
          Upgrade Plan
        </button>
        <button className="btn btn-secondary" onClick={() => window.location.href = '/subscription/billing'}>
          Billing History
        </button>
        <button className="btn btn-secondary" onClick={() => window.location.href = '/subscription/usage'}>
          Detailed Usage
        </button>
      </div>
    </div>
  );
};

export default SubscriptionDashboard;