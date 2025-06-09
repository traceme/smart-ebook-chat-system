import * as React from "react"
import { Link } from "gatsby"
import { StaticImage } from "gatsby-plugin-image"

import Layout from "../components/layout"
import Seo from "../components/seo"
import * as styles from "../components/index.module.css"

const links = [
  {
    text: "Tutorial",
    url: "https://www.gatsbyjs.com/docs/tutorial",
    description:
      "A great place to get started if you're new to web development. Designed to guide you through setting up your first Gatsby site.",
  },
  {
    text: "Examples",
    url: "https://github.com/gatsbyjs/gatsby/tree/master/examples",
    description:
      "A collection of websites ranging from very basic to complex/complete that illustrate how to accomplish specific tasks within your Gatsby sites.",
  },
  {
    text: "Plugin Library",
    url: "https://www.gatsbyjs.com/plugins",
    description:
      "Learn how to add functionality and customize your Gatsby site or app with thousands of plugins built by our amazing developer community.",
  },
  {
    text: "Build and Host",
    url: "https://www.gatsbyjs.com/cloud",
    description:
      "Now you're ready to show the world! Give your Gatsby site superpowers: Build and host on Gatsby Cloud. Get started for free!",
  },
]

const samplePageLinks = [
  {
    text: "🚀 Smart eBook Chat System",
    url: "app",
    badge: true,
    description:
      "🔥 MAIN APP! Complete document upload, processing, search, and AI chat system",
  },
  {
    text: "📧 Complete Gmail Layout",
    url: "gmail-layout-complete",
    badge: true,
    description:
      "🔥 COMPLETE! Full Gmail-style interface with navigation, document list, and preview area",
  },
  {
    text: "📧 Gmail Navigation Demo",
    url: "gmail-demo",
    badge: false,
    description:
      "Gmail-inspired navigation with responsive search, collapsible sidebar, and user menu",
  },
  {
    text: "📄 Document List + Virtual Scrolling",
    url: "document-list-demo",
    badge: true,
    description:
      "High-performance document list with virtual scrolling for 5000+ items, categories, and search",
  },
  {
    text: "🔍 Search Autocomplete",
    url: "search-autocomplete-demo",
    badge: true,
    description:
      "Advanced search with autocomplete, filters, debouncing, and keyboard navigation",
  },
  {
    text: "💬 Chat Panel with Markdown",
    url: "chat-panel-demo",
    badge: true,
    description:
      "NEW! Interactive chat with markdown rendering, emoji picker, and responsive design",
  },
  {
    text: "💳 Subscription Management",
    url: "subscription-demo",
    badge: true,
    description:
      "NEW! Complete subscription system with dashboard, plans, usage indicators, and billing",
  },
  {
    text: "📊 Usage Integration System",
    url: "usage-integration-demo",
    badge: true,
    description:
      "NEW! Global usage indicators, contextual guards, and real-time quota monitoring",
  },
  {
    text: "💬 Smart Chat Interface",
    url: "chat-demo",
    badge: true,
    description:
      "NEW! Interactive chat with streaming responses, markdown rendering, context management, and AI model controls",
  },
  {
    text: "🗂️ Document Management",
    url: "document-manager-demo",
    badge: true,
    description:
      "NEW! Complete document management with search, filtering, tagging, preview, and batch operations",
  },
  {
    text: "⚙️ Settings & Preferences",
    url: "settings-demo",
    badge: true,
    description:
      "NEW! Comprehensive settings interface with user preferences, model configuration, and application settings",
  },
  {
    text: "🔑 API Key Management",
    url: "api-key-demo",
    badge: true,
    description:
      "NEW! Secure API key management with AES-256 encryption, provider validation, and usage analytics",
  },
  {
    text: "🔍 Semantic Search",
    url: "search",
    badge: true,
    description:
      "Advanced semantic search with BGE reranking and context window construction for LLM processing",
  },
  {
    text: "Page 2",
    url: "page-2",
    badge: false,
    description:
      "A simple example of linking to another page within a Gatsby site",
  },
  { text: "TypeScript", url: "using-typescript" },
  { text: "Server Side Rendering", url: "using-ssr" },
  { text: "Deferred Static Generation", url: "using-dsg" },
]

const moreLinks = [
  { text: "Join us on Discord", url: "https://gatsby.dev/discord" },
  {
    text: "Documentation",
    url: "https://gatsbyjs.com/docs/",
  },
  {
    text: "Starters",
    url: "https://gatsbyjs.com/starters/",
  },
  {
    text: "Showcase",
    url: "https://gatsbyjs.com/showcase/",
  },
  {
    text: "Contributing",
    url: "https://www.gatsbyjs.com/contributing/",
  },
  { text: "Issues", url: "https://github.com/gatsbyjs/gatsby/issues" },
]

const utmParameters = `?utm_source=starter&utm_medium=start-page&utm_campaign=default-starter`

const IndexPage = () => (
  <Layout>
    <div className={styles.textCenter}>
      <StaticImage
        src="../images/example.png"
        loading="eager"
        width={64}
        quality={95}
        formats={["auto", "webp", "avif"]}
        alt=""
        style={{ marginBottom: `var(--space-3)` }}
      />
      <h1>
        Welcome to <b>Smart eBook Chat System</b>
      </h1>
      
      {/* Main App Entry Button */}
      <div style={{ margin: '2rem 0', textAlign: 'center' }}>
        <Link 
          to="/app" 
          style={{ 
            textDecoration: 'none',
            display: 'inline-block',
            padding: '16px 32px',
            backgroundColor: '#1976d2',
            color: 'white',
            borderRadius: '8px',
            fontSize: '18px',
            fontWeight: 'bold',
            boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)',
            transition: 'all 0.3s ease',
          }}
          onMouseOver={(e) => {
            e.target.style.backgroundColor = '#1565c0';
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = '0 6px 16px rgba(25, 118, 210, 0.4)';
          }}
          onMouseOut={(e) => {
            e.target.style.backgroundColor = '#1976d2';
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 4px 12px rgba(25, 118, 210, 0.3)';
          }}
        >
          🚀 Launch Smart eBook Chat System
        </Link>
        <div style={{ marginTop: '1rem', fontSize: '14px', color: '#666' }}>
          Upload documents, search content, and chat with AI
        </div>
      </div>

      <p className={styles.intro}>
        <b>Demo pages and components:</b>{" "}
        {samplePageLinks.slice(1).map((link, i) => (
          <React.Fragment key={link.url}>
            <Link to={link.url} style={link.badge ? { fontWeight: 'bold', color: '#3b82f6' } : {}}>
              {link.text}
            </Link>
            {i !== samplePageLinks.slice(1).length - 1 && <> · </>}
          </React.Fragment>
        ))}
        <br />
        <span style={{ color: '#10b981', fontWeight: 'bold' }}>✅ Task 13 Complete:</span> Document Management UI with search, filtering, tagging, and batch operations.<br />
        <span style={{ color: '#10b981', fontWeight: 'bold' }}>✅ Task 15 Complete:</span> Settings & Preferences interface with user configuration, model settings, and API key management.
      </p>
    </div>
    <ul className={styles.list}>
      {links.map(link => (
        <li key={link.url} className={styles.listItem}>
          <a
            className={styles.listItemLink}
            href={`${link.url}${utmParameters}`}
          >
            {link.text} ↗
          </a>
          <p className={styles.listItemDescription}>{link.description}</p>
        </li>
      ))}
    </ul>
    {moreLinks.map((link, i) => (
      <React.Fragment key={link.url}>
        <a href={`${link.url}${utmParameters}`}>{link.text}</a>
        {i !== moreLinks.length - 1 && <> · </>}
      </React.Fragment>
    ))}
  </Layout>
)

/**
 * Head export to define metadata for the page
 *
 * See: https://www.gatsbyjs.com/docs/reference/built-in-components/gatsby-head/
 */
export const Head = () => <Seo title="Home" />

export default IndexPage
