import * as React from "react"
import { Link } from "gatsby"
import UsageIndicator from "./UsageIndicator"

const Header = ({ siteTitle }) => (
  <header
    style={{
      padding: `var(--space-4) var(--size-gutter)`,
      display: `flex`,
      alignItems: `center`,
      justifyContent: `space-between`,
      background: `rgba(255, 255, 255, 0.95)`,
      backdropFilter: `blur(10px)`,
      boxShadow: `0 2px 8px rgba(0, 0, 0, 0.1)`,
      borderRadius: `8px`,
      margin: `1rem auto`,
      maxWidth: `1200px`,
    }}
  >
    <Link
      to="/"
      style={{
        fontSize: `var(--font-sm)`,
        textDecoration: `none`,
        fontWeight: `600`,
        color: `#2c3e50`,
      }}
    >
      {siteTitle}
    </Link>
    
    {/* Navigation and Usage Indicator Section */}
    <div style={{
      display: `flex`,
      alignItems: `center`,
      gap: `1.5rem`,
    }}>
      {/* Navigation Links */}
      <nav style={{
        display: `flex`,
        gap: `1rem`,
        alignItems: `center`,
      }}>
        <Link
          to="/search"
          style={{
            textDecoration: `none`,
            color: `#7f8c8d`,
            fontSize: `0.875rem`,
            fontWeight: `500`,
            transition: `color 0.2s ease`,
          }}
          activeStyle={{
            color: `#3498db`,
          }}
        >
          Search
        </Link>
        <Link
          to="/document-manager-demo"
          style={{
            textDecoration: `none`,
            color: `#7f8c8d`,
            fontSize: `0.875rem`,
            fontWeight: `500`,
            transition: `color 0.2s ease`,
          }}
          activeStyle={{
            color: `#3498db`,
          }}
        >
          📚 Documents
        </Link>
        <Link
          to="/usage-indicator-demo"
          style={{
            textDecoration: `none`,
            color: `#7f8c8d`,
            fontSize: `0.875rem`,
            fontWeight: `500`,
            transition: `color 0.2s ease`,
          }}
          activeStyle={{
            color: `#3498db`,
          }}
        >
          Demo
        </Link>
      </nav>
      
      {/* Usage Indicator - Mini format for header */}
      <UsageIndicator 
        type="mini" 
        showLabels={false}
        refreshInterval={300000}
        onQuotaExceeded={(exceededQuotas) => {
          // Could show a toast notification or redirect to upgrade page
          console.log('Quota exceeded in header:', exceededQuotas);
        }}
      />
      
      {/* User Menu or Auth Section */}
      <div style={{
        display: `flex`,
        alignItems: `center`,
        gap: `0.5rem`,
      }}>
        <button style={{
          background: `none`,
          border: `1px solid #ecf0f1`,
          borderRadius: `6px`,
          padding: `0.5rem 1rem`,
          fontSize: `0.875rem`,
          cursor: `pointer`,
          transition: `all 0.2s ease`,
          color: `#7f8c8d`,
        }}>
          👤 Account
        </button>
      </div>
    </div>
  </header>
)

export default Header
