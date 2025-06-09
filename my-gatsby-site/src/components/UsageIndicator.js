import React, { useState, useEffect } from 'react';
import './UsageIndicator.css';

const UsageIndicator = ({ 
  type = 'compact', // 'compact', 'detailed', 'mini'
  showLabels = true,
  refreshInterval = 300000, // 5 minutes default
  className = '',
  onQuotaExceeded = null
}) => {
  const [quotaData, setQuotaData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    fetchQuotaStatus();
    
    // Set up auto-refresh if interval is provided
    if (refreshInterval > 0) {
      const intervalId = setInterval(fetchQuotaStatus, refreshInterval);
      return () => clearInterval(intervalId);
    }
  }, [refreshInterval]);

  const fetchQuotaStatus = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setError('Authentication required');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/v1/subscription/quota-status', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setQuotaData(data);
      setLastUpdate(new Date());
      
      // Check for quota exceeded and call callback if provided
      if (onQuotaExceeded) {
        const exceededQuotas = Object.entries(data).filter(([_, quota]) => quota.is_exceeded);
        if (exceededQuotas.length > 0) {
          onQuotaExceeded(exceededQuotas);
        }
      }
    } catch (err) {
      console.error('Error fetching quota status:', err);
      setError('Failed to load quota data');
    } finally {
      setLoading(false);
    }
  };

  const getUsageColor = (percentage) => {
    if (percentage >= 95) return '#e74c3c'; // Critical red
    if (percentage >= 90) return '#e67e22'; // Warning orange
    if (percentage >= 75) return '#f39c12'; // Caution yellow
    return '#27ae60'; // Safe green
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

  const getQuotaIcon = (quotaType) => {
    switch (quotaType) {
      case 'upload':
        return '📁';
      case 'token':
        return '🔤';
      case 'search':
        return '🔍';
      default:
        return '📊';
    }
  };

  const QuotaMini = ({ quota, quotaType }) => {
    const percentage = quota.percentage_used;
    const color = getUsageColor(percentage);
    
    return (
      <div className="quota-mini" title={`${quotaType}: ${quota.current_usage}/${quota.limit}`}>
        <div className="quota-mini-icon">{getQuotaIcon(quotaType)}</div>
        <div className="quota-mini-bar">
          <div 
            className="quota-mini-fill" 
            style={{ width: `${Math.min(percentage, 100)}%`, backgroundColor: color }}
          />
        </div>
        <div className="quota-mini-text" style={{ color }}>
          {percentage.toFixed(0)}%
        </div>
      </div>
    );
  };

  const QuotaCompact = ({ quota, quotaType }) => {
    const percentage = quota.percentage_used;
    const color = getUsageColor(percentage);
    
    return (
      <div className="quota-compact">
        <div className="quota-compact-header">
          <span className="quota-compact-icon">{getQuotaIcon(quotaType)}</span>
          {showLabels && (
            <span className="quota-compact-label">
              {quotaType.charAt(0).toUpperCase() + quotaType.slice(1)}
            </span>
          )}
          <span className="quota-compact-percentage" style={{ color }}>
            {percentage.toFixed(1)}%
          </span>
        </div>
        <div className="quota-compact-progress">
          <div 
            className="quota-compact-fill" 
            style={{ width: `${Math.min(percentage, 100)}%`, backgroundColor: color }}
          />
        </div>
        <div className="quota-compact-details">
          <span className="quota-current">{formatNumber(quota.current_usage)}</span>
          <span className="quota-separator">/</span>
          <span className="quota-limit">{formatNumber(quota.limit)}</span>
          <span className="quota-unit">
            {quotaType === 'upload' ? 'MB' : quotaType === 'token' ? 'tokens' : 'searches'}
          </span>
        </div>
      </div>
    );
  };

  const QuotaDetailed = ({ quota, quotaType }) => {
    const percentage = quota.percentage_used;
    const color = getUsageColor(percentage);
    const resetDate = new Date(quota.reset_date);
    
    return (
      <div className="quota-detailed">
        <div className="quota-detailed-header">
          <div className="quota-detailed-title">
            <span className="quota-detailed-icon">{getQuotaIcon(quotaType)}</span>
            <span className="quota-detailed-label">
              {quotaType.charAt(0).toUpperCase() + quotaType.slice(1)} Usage
            </span>
          </div>
          <div className="quota-detailed-status">
            {quota.is_exceeded && (
              <span className="quota-exceeded-badge">Exceeded</span>
            )}
            <span className="quota-detailed-percentage" style={{ color }}>
              {percentage.toFixed(1)}%
            </span>
          </div>
        </div>
        
        <div className="quota-detailed-progress">
          <div 
            className="quota-detailed-fill" 
            style={{ width: `${Math.min(percentage, 100)}%`, backgroundColor: color }}
          />
        </div>
        
        <div className="quota-detailed-info">
          <div className="quota-usage-text">
            <span className="quota-current">{quota.current_usage.toLocaleString()}</span>
            <span className="quota-separator"> / </span>
            <span className="quota-limit">{quota.limit.toLocaleString()}</span>
            <span className="quota-unit">
              {quotaType === 'upload' ? ' MB' : quotaType === 'token' ? ' tokens' : ' searches'}
            </span>
          </div>
          <div className="quota-remaining">
            {quota.remaining.toLocaleString()} remaining
          </div>
        </div>
        
        <div className="quota-reset-info">
          Resets on {resetDate.toLocaleDateString()}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className={`usage-indicator ${type} ${className}`}>
        <div className="usage-loading">
          <div className="usage-spinner"></div>
          {type !== 'mini' && <span>Loading usage...</span>}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`usage-indicator ${type} ${className} error`}>
        <div className="usage-error">
          <span className="error-icon">⚠️</span>
          {type !== 'mini' && <span>Usage data unavailable</span>}
        </div>
      </div>
    );
  }

  if (!quotaData) {
    return null;
  }

  const quotaTypes = ['upload', 'token', 'search'];
  
  return (
    <div className={`usage-indicator ${type} ${className}`}>
      <div className="usage-content">
        {quotaTypes.map(quotaType => {
          const quota = quotaData[quotaType];
          if (!quota) return null;
          
          switch (type) {
            case 'mini':
              return <QuotaMini key={quotaType} quota={quota} quotaType={quotaType} />;
            case 'detailed':
              return <QuotaDetailed key={quotaType} quota={quota} quotaType={quotaType} />;
            case 'compact':
            default:
              return <QuotaCompact key={quotaType} quota={quota} quotaType={quotaType} />;
          }
        })}
      </div>
      
      {type !== 'mini' && lastUpdate && (
        <div className="usage-footer">
          <button 
            className="usage-refresh-btn" 
            onClick={fetchQuotaStatus}
            title="Refresh usage data"
          >
            🔄
          </button>
          <span className="usage-last-update">
            Updated {lastUpdate.toLocaleTimeString()}
          </span>
        </div>
      )}
    </div>
  );
};

export default UsageIndicator; 