import React, { useState } from 'react';
import UsageIndicator from './UsageIndicator';
import './UsageIndicatorDemo.css';

const UsageIndicatorDemo = () => {
  const [refreshInterval, setRefreshInterval] = useState(300000); // 5 minutes
  const [showLabels, setShowLabels] = useState(true);

  const handleQuotaExceeded = (exceededQuotas) => {
    console.log('Quota exceeded:', exceededQuotas);
    // Here you could show a notification, redirect to upgrade page, etc.
  };

  return (
    <div className="usage-indicator-demo">
      <div className="demo-header">
        <h1>Usage Indicator Component Demo</h1>
        <p>This component can be used throughout the application to show quota status in different formats.</p>
      </div>

      <div className="demo-controls">
        <h2>Demo Controls</h2>
        <div className="controls-grid">
          <div className="control-group">
            <label htmlFor="refresh-interval">Refresh Interval:</label>
            <select 
              id="refresh-interval"
              value={refreshInterval} 
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
            >
              <option value={0}>No auto-refresh</option>
              <option value={30000}>30 seconds</option>
              <option value={60000}>1 minute</option>
              <option value={300000}>5 minutes</option>
              <option value={600000}>10 minutes</option>
            </select>
          </div>
          <div className="control-group">
            <label>
              <input 
                type="checkbox" 
                checked={showLabels} 
                onChange={(e) => setShowLabels(e.target.checked)}
              />
              Show Labels
            </label>
          </div>
        </div>
      </div>

      <div className="demo-section">
        <h2>Mini Display (Perfect for headers and navigation)</h2>
        <p>Compact horizontal layout showing just the essentials</p>
        <div className="demo-container mini-demo">
          <div className="simulated-header">
            <div className="header-left">
              <h3>My Dashboard</h3>
            </div>
            <div className="header-right">
              <UsageIndicator 
                type="mini" 
                showLabels={false}
                refreshInterval={refreshInterval}
                onQuotaExceeded={handleQuotaExceeded}
              />
              <button className="user-menu-btn">👤</button>
            </div>
          </div>
        </div>
      </div>

      <div className="demo-section">
        <h2>Compact Display (Great for sidebars and cards)</h2>
        <p>Balanced view with progress bars and key information</p>
        <div className="demo-container compact-demo">
          <div className="simulated-sidebar">
            <h3>Account Overview</h3>
            <UsageIndicator 
              type="compact"
              showLabels={showLabels}
              refreshInterval={refreshInterval}
              onQuotaExceeded={handleQuotaExceeded}
            />
          </div>
        </div>
      </div>

      <div className="demo-section">
        <h2>Detailed Display (Full dashboard view)</h2>
        <p>Comprehensive view with all quota information and reset dates</p>
        <div className="demo-container detailed-demo">
          <UsageIndicator 
            type="detailed"
            showLabels={showLabels}
            refreshInterval={refreshInterval}
            onQuotaExceeded={handleQuotaExceeded}
            className="demo-detailed"
          />
        </div>
      </div>

      <div className="demo-section">
        <h2>Usage Examples</h2>
        <div className="code-examples">
          <div className="code-example">
            <h3>Mini in Header</h3>
            <pre>{`<UsageIndicator 
  type="mini" 
  showLabels={false}
  refreshInterval={300000}
/>`}</pre>
          </div>
          
          <div className="code-example">
            <h3>Compact in Sidebar</h3>
            <pre>{`<UsageIndicator 
  type="compact"
  showLabels={true}
  onQuotaExceeded={handleQuotaWarning}
/>`}</pre>
          </div>
          
          <div className="code-example">
            <h3>Detailed in Dashboard</h3>
            <pre>{`<UsageIndicator 
  type="detailed"
  refreshInterval={60000}
  className="custom-styling"
/>`}</pre>
          </div>
        </div>
      </div>

      <div className="demo-section">
        <h2>Integration Tips</h2>
        <div className="tips-grid">
          <div className="tip">
            <h4>🎯 Placement</h4>
            <p>Use mini in headers, compact in sidebars, and detailed in main dashboard areas.</p>
          </div>
          <div className="tip">
            <h4>🔄 Refresh Rate</h4>
            <p>Set appropriate refresh intervals - shorter for critical areas, longer for background monitoring.</p>
          </div>
          <div className="tip">
            <h4>⚠️ Quota Exceeded</h4>
            <p>Use the onQuotaExceeded callback to trigger notifications or redirect to upgrade flows.</p>
          </div>
          <div className="tip">
            <h4>🎨 Theming</h4>
            <p>Component automatically adapts to dark mode and high contrast preferences.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UsageIndicatorDemo; 