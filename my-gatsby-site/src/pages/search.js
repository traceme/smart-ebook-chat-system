import React from "react"
import { Link } from "gatsby"

import Layout from "../components/layout"
import Seo from "../components/seo"
import SearchInterface from "../components/SearchInterface"

const SearchPage = () => (
  <Layout>
    <div style={{ padding: "0" }}>
      <SearchInterface apiBaseUrl="http://localhost:8000" />
    </div>
    
    <div style={{ 
      textAlign: "center", 
      marginTop: "2rem", 
      padding: "1rem",
      background: "white",
      borderRadius: "8px",
      boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)"
    }}>
      <p>
        <Link 
          to="/" 
          style={{
            color: "#3b82f6",
            textDecoration: "none",
            fontWeight: "600"
          }}
        >
          ← Back to Home
        </Link>
      </p>
      <p style={{ fontSize: "0.9rem", color: "#6b7280", margin: "0.5rem 0 0 0" }}>
        Smart eBook Chat System - Semantic Search Interface
      </p>
    </div>
  </Layout>
)

export const Head = () => (
  <Seo 
    title="Semantic Search" 
    description="Search your documents with advanced semantic search, BGE reranking, and context window construction."
  />
)

export default SearchPage 