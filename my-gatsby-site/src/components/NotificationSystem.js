import React, { useState, useEffect, createContext, useContext } from 'react';
import './NotificationSystem.css';

// Notification Context
const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

// Notification Provider Component
export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [quotaWarnings, setQuotaWarnings] = useState([]);

  // Add notification
  const addNotification = (notification) => {
    const id = Date.now() + Math.random();
    const newNotification = {
      id,
      timestamp: new Date(),
      ...notification
    };
    
    setNotifications(prev => [...prev, newNotification]);
    
    // Auto-remove after timeout (unless persistent)
    if (!notification.persistent) {
      const timeout = notification.timeout || getDefaultTimeout(notification.type);
      setTimeout(() => {
        removeNotification(id);
      }, timeout);
    }
  };

  // Remove notification
  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Clear all notifications
  const clearNotifications = () => {
    setNotifications([]);
  };

  // Add quota warning
  const addQuotaWarning = (warning) => {
    const id = Date.now() + Math.random();
    const newWarning = {
      id,
      timestamp: new Date(),
      ...warning
    };
    
    setQuotaWarnings(prev => {
      // Prevent duplicate warnings for the same quota type
      const filtered = prev.filter(w => w.quotaType !== warning.quotaType);
      return [...filtered, newWarning];
    });
  };

  // Remove quota warning
  const removeQuotaWarning = (id) => {
    setQuotaWarnings(prev => prev.filter(w => w.id !== id));
  };

  // Clear quota warnings
  const clearQuotaWarnings = () => {
    setQuotaWarnings([]);
  };

  const getDefaultTimeout = (type) => {
    switch (type) {
      case 'error': return 8000;
      case 'warning': return 6000;
      case 'success': return 4000;
      case 'info': return 5000;
      default: return 5000;
    }
  };

  const value = {
    notifications,
    quotaWarnings,
    addNotification,
    removeNotification,
    clearNotifications,
    addQuotaWarning,
    removeQuotaWarning,
    clearQuotaWarnings
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationContainer />
      <QuotaWarningsContainer />
    </NotificationContext.Provider>
  );
};

// Main Notification Container
const NotificationContainer = () => {
  const { notifications, removeNotification } = useNotifications();

  return (
    <div className="notification-container">
      {notifications.map(notification => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onRemove={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  );
};

// Individual Notification Item
const NotificationItem = ({ notification, onRemove }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    // Trigger enter animation
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const handleRemove = () => {
    setIsRemoving(true);
    setTimeout(onRemove, 300); // Wait for exit animation
  };

  const getIcon = (type) => {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      case 'quota': return '📊';
      default: return 'ℹ️';
    }
  };

  const formatTime = (timestamp) => {
    return timestamp.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div 
      className={`notification-item ${notification.type} ${isVisible ? 'visible' : ''} ${isRemoving ? 'removing' : ''}`}
    >
      <div className="notification-content">
        <div className="notification-header">
          <span className="notification-icon">{getIcon(notification.type)}</span>
          <span className="notification-title">
            {notification.title || getDefaultTitle(notification.type)}
          </span>
          <span className="notification-time">{formatTime(notification.timestamp)}</span>
          <button 
            className="notification-close"
            onClick={handleRemove}
            aria-label="Close notification"
          >
            ×
          </button>
        </div>
        
        {notification.message && (
          <div className="notification-message">
            {notification.message}
          </div>
        )}

        {notification.actions && (
          <div className="notification-actions">
            {notification.actions.map((action, index) => (
              <button
                key={index}
                className={`notification-btn ${action.style || 'primary'}`}
                onClick={() => {
                  action.onClick();
                  if (action.closeOnClick !== false) {
                    handleRemove();
                  }
                }}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {notification.progress !== undefined && (
        <div className="notification-progress">
          <div 
            className="notification-progress-bar"
            style={{ width: `${notification.progress}%` }}
          />
        </div>
      )}
    </div>
  );
};

// Quota Warnings Container
const QuotaWarningsContainer = () => {
  const { quotaWarnings, removeQuotaWarning, clearQuotaWarnings } = useNotifications();
  const [isMinimized, setIsMinimized] = useState(false);

  if (quotaWarnings.length === 0) return null;

  const criticalWarnings = quotaWarnings.filter(w => w.severity === 'critical');
  const warningCount = quotaWarnings.length;

  return (
    <div className={`quota-warnings-container ${isMinimized ? 'minimized' : ''}`}>
      <div className="quota-warnings-header">
        <div className="quota-warnings-title">
          <span className="quota-warnings-icon">📊</span>
          <span>Quota Warnings ({warningCount})</span>
          {criticalWarnings.length > 0 && (
            <span className="critical-badge">{criticalWarnings.length} Critical</span>
          )}
        </div>
        
        <div className="quota-warnings-controls">
          <button
            className="quota-minimize-btn"
            onClick={() => setIsMinimized(!isMinimized)}
            aria-label={isMinimized ? 'Expand warnings' : 'Minimize warnings'}
          >
            {isMinimized ? '▲' : '▼'}
          </button>
          <button
            className="quota-clear-btn"
            onClick={clearQuotaWarnings}
            aria-label="Clear all warnings"
          >
            ×
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div className="quota-warnings-list">
          {quotaWarnings.map(warning => (
            <QuotaWarningItem
              key={warning.id}
              warning={warning}
              onRemove={() => removeQuotaWarning(warning.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Individual Quota Warning Item
const QuotaWarningItem = ({ warning, onRemove }) => {
  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical': return '🚨';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '📊';
    }
  };

  const getQuotaIcon = (quotaType) => {
    switch (quotaType) {
      case 'upload': return '📁';
      case 'token': return '🔤';
      case 'search': return '🔍';
      default: return '📊';
    }
  };

  const formatTime = (timestamp) => {
    const now = new Date();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    return timestamp.toLocaleDateString();
  };

  return (
    <div className={`quota-warning-item ${warning.severity}`}>
      <div className="quota-warning-header">
        <span className="quota-warning-icons">
          {getSeverityIcon(warning.severity)}
          {getQuotaIcon(warning.quotaType)}
        </span>
        <div className="quota-warning-info">
          <span className="quota-warning-title">{warning.title}</span>
          <span className="quota-warning-time">{formatTime(warning.timestamp)}</span>
        </div>
        <button 
          className="quota-warning-close"
          onClick={onRemove}
          aria-label="Dismiss warning"
        >
          ×
        </button>
      </div>
      
      <div className="quota-warning-message">
        {warning.message}
      </div>

      {warning.usage && (
        <div className="quota-warning-usage">
          <div className="usage-bar">
            <div 
              className="usage-fill"
              style={{ 
                width: `${Math.min(warning.usage.percentage, 100)}%`,
                backgroundColor: warning.severity === 'critical' ? '#e74c3c' : '#f39c12'
              }}
            />
          </div>
          <div className="usage-text">
            {warning.usage.current.toLocaleString()} / {warning.usage.limit.toLocaleString()} 
            {warning.usage.unit} ({warning.usage.percentage.toFixed(1)}%)
          </div>
        </div>
      )}

      {warning.actions && (
        <div className="quota-warning-actions">
          {warning.actions.map((action, index) => (
            <button
              key={index}
              className={`quota-warning-btn ${action.style || 'primary'}`}
              onClick={action.onClick}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// Utility function to get default titles
const getDefaultTitle = (type) => {
  switch (type) {
    case 'success': return 'Success';
    case 'error': return 'Error';
    case 'warning': return 'Warning';
    case 'info': return 'Information';
    case 'quota': return 'Quota Alert';
    default: return 'Notification';
  }
};

// Hook for quota monitoring
export const useQuotaMonitoring = () => {
  const { addQuotaWarning, addNotification } = useNotifications();

  const checkQuotaStatus = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const response = await fetch('/api/v1/subscription/quota-status', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) return;

      const data = await response.json();
      
      // Check each quota type
      Object.entries(data).forEach(([quotaType, quota]) => {
        const percentage = quota.percentage_used;
        
        // Critical: 95%+ usage
        if (percentage >= 95) {
          addQuotaWarning({
            quotaType,
            severity: 'critical',
            title: `${quotaType.charAt(0).toUpperCase() + quotaType.slice(1)} Quota Critical`,
            message: `You've used ${percentage.toFixed(1)}% of your ${quotaType} quota. Upgrade now to avoid service interruption.`,
            usage: {
              current: quota.current_usage,
              limit: quota.limit,
              percentage,
              unit: quotaType === 'upload' ? 'MB' : quotaType === 'token' ? 'tokens' : 'searches'
            },
            actions: [
              {
                label: 'Upgrade Plan',
                style: 'danger',
                onClick: () => {
                  // Navigate to subscription upgrade
                  window.location.href = '/subscription-plans';
                }
              }
            ]
          });
        }
        // Warning: 85%+ usage
        else if (percentage >= 85) {
          addQuotaWarning({
            quotaType,
            severity: 'warning',
            title: `${quotaType.charAt(0).toUpperCase() + quotaType.slice(1)} Quota Warning`,
            message: `You've used ${percentage.toFixed(1)}% of your ${quotaType} quota. Consider upgrading soon.`,
            usage: {
              current: quota.current_usage,
              limit: quota.limit,
              percentage,
              unit: quotaType === 'upload' ? 'MB' : quotaType === 'token' ? 'tokens' : 'searches'
            },
            actions: [
              {
                label: 'View Plans',
                style: 'secondary',
                onClick: () => {
                  window.location.href = '/subscription-plans';
                }
              }
            ]
          });
        }
      });

    } catch (error) {
      console.error('Error checking quota status:', error);
    }
  };

  // Monitor quota every 5 minutes
  useEffect(() => {
    checkQuotaStatus(); // Initial check
    const interval = setInterval(checkQuotaStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return { checkQuotaStatus };
};

export default NotificationProvider; 