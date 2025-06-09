import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Alert, Snackbar, AlertTitle } from '@mui/material';

// Usage context
const UsageContext = createContext(null);

// Hook to use usage context
export const useUsage = () => {
  const context = useContext(UsageContext);
  if (!context) {
    throw new Error('useUsage must be used within a UsageProvider');
  }
  return context;
};

// Subscription tier configurations
const TIER_LIMITS = {
  free: {
    storage: 100, // MB
    tokens: 10000,
    documents: 50,
    processingSpeed: 'standard',
    features: ['basic_search', 'basic_chat'],
  },
  pro: {
    storage: 1000, // MB
    tokens: 100000,
    documents: 500,
    processingSpeed: 'priority',
    features: ['advanced_search', 'advanced_chat', 'batch_processing', 'export'],
  },
  enterprise: {
    storage: 10000, // MB
    tokens: 1000000,
    documents: -1, // unlimited
    processingSpeed: 'fastest',
    features: ['all'],
  },
};

// Usage warning thresholds
const WARNING_THRESHOLDS = {
  caution: 60, // 60% usage
  warning: 80, // 80% usage
  critical: 95, // 95% usage
};

const UsageProvider = ({ children, initialTier = 'free' }) => {
  const [currentTier, setCurrentTier] = useState(initialTier);
  const [usage, setUsage] = useState({
    storage: 450, // MB used
    tokens: 65000, // tokens used this month
    documents: 35, // documents uploaded this month
    lastUpdated: new Date(),
  });
  const [notifications, setNotifications] = useState([]);
  const [quotaWarnings, setQuotaWarnings] = useState({});

  // Get current tier limits
  const getCurrentLimits = useCallback(() => {
    return TIER_LIMITS[currentTier] || TIER_LIMITS.free;
  }, [currentTier]);

  // Calculate usage percentages
  const getUsagePercentages = useCallback(() => {
    const limits = getCurrentLimits();
    
    return {
      storage: limits.storage > 0 ? (usage.storage / limits.storage) * 100 : 0,
      tokens: limits.tokens > 0 ? (usage.tokens / limits.tokens) * 100 : 0,
      documents: limits.documents > 0 ? (usage.documents / limits.documents) * 100 : 0,
    };
  }, [usage, getCurrentLimits]);

  // Get usage severity level
  const getUsageSeverity = useCallback((percentage) => {
    if (percentage >= WARNING_THRESHOLDS.critical) return 'critical';
    if (percentage >= WARNING_THRESHOLDS.warning) return 'warning';
    if (percentage >= WARNING_THRESHOLDS.caution) return 'caution';
    return 'normal';
  }, []);

  // Check if feature is available for current tier
  const hasFeature = useCallback((feature) => {
    const limits = getCurrentLimits();
    return limits.features.includes('all') || limits.features.includes(feature);
  }, [getCurrentLimits]);

  // Check if user can perform action (e.g., upload document, use tokens)
  const canPerformAction = useCallback((action, amount = 1) => {
    const limits = getCurrentLimits();
    const percentages = getUsagePercentages();
    
    switch (action) {
      case 'upload_document':
        if (limits.documents === -1) return { allowed: true }; // unlimited
        if (usage.documents + amount > limits.documents) {
          return {
            allowed: false,
            reason: 'document_limit',
            message: `Document limit reached (${limits.documents} documents per month)`,
            upgradeRequired: true,
          };
        }
        break;
        
      case 'use_storage':
        if (usage.storage + amount > limits.storage) {
          return {
            allowed: false,
            reason: 'storage_limit',
            message: `Storage limit exceeded (${limits.storage}MB limit)`,
            upgradeRequired: true,
          };
        }
        break;
        
      case 'use_tokens':
        if (usage.tokens + amount > limits.tokens) {
          return {
            allowed: false,
            reason: 'token_limit',
            message: `Token limit exceeded (${limits.tokens.toLocaleString()} tokens per month)`,
            upgradeRequired: true,
          };
        }
        break;
        
      default:
        break;
    }
    
    return { allowed: true };
  }, [usage, getCurrentLimits, getUsagePercentages]);

  // Update usage data
  const updateUsage = useCallback((newUsage) => {
    setUsage(prev => ({
      ...prev,
      ...newUsage,
      lastUpdated: new Date(),
    }));
  }, []);

  // Add usage (e.g., after uploading document or using tokens)
  const addUsage = useCallback((type, amount) => {
    setUsage(prev => ({
      ...prev,
      [type]: prev[type] + amount,
      lastUpdated: new Date(),
    }));
  }, []);

  // Show usage notification
  const showNotification = useCallback((message, severity = 'info', duration = 6000) => {
    const id = Date.now();
    const notification = {
      id,
      message,
      severity,
      duration,
      timestamp: new Date(),
    };
    
    setNotifications(prev => [...prev, notification]);
    
    // Auto-remove notification
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, duration);
  }, []);

  // Check and trigger quota warnings
  const checkQuotaWarnings = useCallback(() => {
    const percentages = getUsagePercentages();
    const newWarnings = {};
    
    Object.entries(percentages).forEach(([type, percentage]) => {
      const severity = getUsageSeverity(percentage);
      const previousSeverity = quotaWarnings[type];
      
      // Only show notification if severity increased
      if (severity !== 'normal' && severity !== previousSeverity) {
        newWarnings[type] = severity;
        
        let message = '';
        let notificationSeverity = 'info';
        
        switch (severity) {
          case 'caution':
            message = `${type.charAt(0).toUpperCase() + type.slice(1)} usage at ${Math.round(percentage)}% - Consider upgrading soon`;
            notificationSeverity = 'info';
            break;
          case 'warning':
            message = `${type.charAt(0).toUpperCase() + type.slice(1)} usage at ${Math.round(percentage)}% - Approaching limit`;
            notificationSeverity = 'warning';
            break;
          case 'critical':
            message = `${type.charAt(0).toUpperCase() + type.slice(1)} usage at ${Math.round(percentage)}% - Limit almost reached!`;
            notificationSeverity = 'error';
            break;
        }
        
        if (message) {
          showNotification(message, notificationSeverity, 8000);
        }
      }
    });
    
    setQuotaWarnings(prev => ({ ...prev, ...newWarnings }));
  }, [getUsagePercentages, getUsageSeverity, quotaWarnings, showNotification]);

  // Effect to check quota warnings when usage changes
  useEffect(() => {
    checkQuotaWarnings();
  }, [usage, currentTier]); // Don't include checkQuotaWarnings to avoid infinite loop

  // Simulate real-time usage updates (in real app, this would come from backend)
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate small random usage increases
      if (Math.random() < 0.1) { // 10% chance every 5 seconds
        const types = ['storage', 'tokens'];
        const type = types[Math.floor(Math.random() * types.length)];
        const amount = type === 'storage' ? Math.floor(Math.random() * 5) : Math.floor(Math.random() * 100);
        
        addUsage(type, amount);
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [addUsage]);

  // Get recommendation for user
  const getRecommendation = useCallback(() => {
    const percentages = getUsagePercentages();
    const highUsageTypes = Object.entries(percentages)
      .filter(([type, percentage]) => percentage > WARNING_THRESHOLDS.warning)
      .map(([type]) => type);
    
    if (highUsageTypes.length === 0) {
      return null;
    }
    
    if (currentTier === 'free' && highUsageTypes.length > 0) {
      return {
        type: 'upgrade',
        title: 'Consider Upgrading',
        message: `You're approaching your ${highUsageTypes.join(' and ')} limits. Upgrade to Pro for 10x more capacity.`,
        action: 'upgrade_to_pro',
        severity: 'warning',
      };
    }
    
    if (currentTier === 'pro' && highUsageTypes.length > 1) {
      return {
        type: 'upgrade',
        title: 'Enterprise Benefits',
        message: `You're using multiple resources heavily. Enterprise offers unlimited documents and priority support.`,
        action: 'upgrade_to_enterprise',
        severity: 'info',
      };
    }
    
    return {
      type: 'optimize',
      title: 'Usage Optimization',
      message: `Consider cleaning up old documents or optimizing your AI token usage to stay within limits.`,
      action: 'manage_usage',
      severity: 'info',
    };
  }, [getUsagePercentages, currentTier]);

  // Context value
  const contextValue = {
    // Current state
    currentTier,
    usage,
    notifications,
    quotaWarnings,
    
    // Computed values
    limits: getCurrentLimits(),
    percentages: getUsagePercentages(),
    recommendation: getRecommendation(),
    
    // Actions
    setCurrentTier,
    updateUsage,
    addUsage,
    showNotification,
    
    // Utilities
    hasFeature,
    canPerformAction,
    getUsageSeverity,
  };

  return (
    <UsageContext.Provider value={contextValue}>
      {children}
      
      {/* Global notifications */}
      {notifications.map(notification => (
        <Snackbar
          key={notification.id}
          open={true}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          sx={{ mt: 8 }} // Account for app header
        >
          <Alert 
            severity={notification.severity}
            onClose={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
            sx={{ minWidth: '300px' }}
          >
            {notification.severity === 'error' && (
              <AlertTitle>Quota Limit Reached</AlertTitle>
            )}
            {notification.severity === 'warning' && (
              <AlertTitle>Usage Warning</AlertTitle>
            )}
            {notification.message}
          </Alert>
        </Snackbar>
      ))}
    </UsageContext.Provider>
  );
};

export default UsageProvider; 