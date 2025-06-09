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
      <p className={styles.intro}>
        <b>Available features:</b>{" "}
        {samplePageLinks.map((link, i) => (
          <React.Fragment key={link.url}>
            <Link to={link.url} style={link.badge ? { fontWeight: 'bold', color: '#3b82f6' } : {}}>
              {link.text}
            </Link>
            {i !== samplePageLinks.length - 1 && <> · </>}
          </React.Fragment>
        ))}
        <br />
        <span style={{ color: '#10b981', fontWeight: 'bold' }}>✅ Task 9 Complete:</span> Semantic search with k=8 retrieval, BGE reranking & context construction.
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
