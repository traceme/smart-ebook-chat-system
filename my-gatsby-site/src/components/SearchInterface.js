import React, { useState, useEffect, useCallback } from 'react'
import './SearchInterface.css'
import UsageIndicator from './UsageIndicator'

const SearchInterface = ({ apiBaseUrl = 'http://localhost:8000' }) => {
  // State management
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchHistory, setSearchHistory] = useState([])
  const [popularQueries, setPopularQueries] = useState([])
  const [filters, setFilters] = useState({
    enableReranking: true,
    kRetrieval: 8,
    scoreThreshold: null,
    limit: 10
  })
  const [searchStats, setSearchStats] = useState(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [selectedResult, setSelectedResult] = useState(null)
  const [contextWindow, setContextWindow] = useState('')

  // Authentication token (would normally come from auth context)
  const [authToken, setAuthToken] = useState(localStorage.getItem('authToken') || '')

  // Load search history and popular queries on mount
  useEffect(() => {
    if (authToken) {
      loadSearchHistory()
      loadPopularQueries()
    }
  }, [authToken])

  const loadSearchHistory = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/vector-search/analytics/user-history`, {
        headers: { 
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      })
      if (response.ok) {
        const data = await response.json()
        setSearchHistory(data.search_history || [])
      }
    } catch (error) {
      console.error('Failed to load search history:', error)
    }
  }

  const loadPopularQueries = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/vector-search/analytics/popular-queries`, {
        headers: { 
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      })
      if (response.ok) {
        const data = await response.json()
        setPopularQueries(data.popular_queries || [])
      }
    } catch (error) {
      console.error('Failed to load popular queries:', error)
    }
  }

  const performSearch = async (searchQuery = query) => {
    if (!searchQuery.trim() || !authToken) return

    setIsLoading(true)
    setResults([])
    setSearchStats(null)
    setContextWindow('')

    try {
      const searchRequest = {
        query: searchQuery,
        limit: filters.limit,
        k_retrieval: filters.kRetrieval,
        score_threshold: filters.scoreThreshold,
        enable_reranking: filters.enableReranking,
        rerank_top_k: filters.limit
      }

      const endpoint = showAdvanced ? '/search/advanced' : '/search'
      const response = await fetch(`${apiBaseUrl}/vector-search${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(searchRequest)
      })

      if (response.ok) {
        const data = await response.json()
        
        if (showAdvanced) {
          setResults(data.search_results?.results || [])
          setSearchStats(data.analytics)
          setContextWindow(data.search_results?.context_window || '')
        } else {
          setResults(data.results || [])
          setContextWindow(data.context_window || '')
          setSearchStats({
            search_time_ms: data.search_time_ms,
            embedding_time_ms: data.embedding_time_ms,
            rerank_time_ms: data.rerank_time_ms,
            reranking_enabled: data.reranking_enabled
          })
        }

        // Refresh search history
        loadSearchHistory()
      } else {
        console.error('Search failed:', await response.text())
      }
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const trackClick = async (result, position) => {
    try {
      await fetch(`${apiBaseUrl}/vector-search/analytics/click`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query,
          document_id: result.document_id,
          position,
          score: result.rerank_score || result.score
        })
      })
    } catch (error) {
      console.error('Failed to track click:', error)
    }
  }

  const handleResultClick = (result, index) => {
    setSelectedResult(result)
    trackClick(result, index)
  }

  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion)
    performSearch(suggestion)
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      performSearch()
    }
  }

  const formatScore = (score) => {
    return (score * 100).toFixed(1) + '%'
  }

  const formatTime = (timeMs) => {
    return timeMs ? `${timeMs.toFixed(0)}ms` : 'N/A'
  }

  const highlightText = (text, query) => {
    if (!query) return text
    const regex = new RegExp(`(${query})`, 'gi')
    return text.replace(regex, '<mark>$1</mark>')
  }

  return (
    <div className="search-interface">
      {/* Authentication Section */}
      {!authToken && (
        <div className="auth-section">
          <h3>Authentication Required</h3>
          <input
            type="text"
            placeholder="Enter your auth token"
            value={authToken}
            onChange={(e) => {
              setAuthToken(e.target.value)
              localStorage.setItem('authToken', e.target.value)
            }}
            className="auth-input"
          />
        </div>
      )}

      {authToken && (
        <>
          {/* Search Header */}
          <div className="search-header">
            <h1>Smart eBook Search</h1>
            <p>Semantic search with BGE reranking and context window construction</p>
          </div>

          {/* Usage Indicator Section */}
          <div className="search-usage-section">
            <h3>Current Usage</h3>
            <UsageIndicator 
              type="compact"
              showLabels={true}
              refreshInterval={60000}
              onQuotaExceeded={(exceededQuotas) => {
                console.log('Search quota exceeded:', exceededQuotas);
                // Could disable search functionality or show upgrade prompt
              }}
            />
          </div>

          {/* Search Bar */}
          <div className="search-bar">
            <div className="search-input-container">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Search your documents..."
                className="search-input"
                disabled={isLoading}
              />
              <button
                onClick={() => performSearch()}
                disabled={isLoading || !query.trim()}
                className="search-button"
              >
                {isLoading ? 'Searching...' : 'Search'}
              </button>
            </div>

            {/* Advanced Toggle */}
            <div className="advanced-toggle">
              <label>
                <input
                  type="checkbox"
                  checked={showAdvanced}
                  onChange={(e) => setShowAdvanced(e.target.checked)}
                />
                Advanced Search & Analytics
              </label>
            </div>
          </div>

          {/* Search Filters */}
          <div className="search-filters">
            <div className="filter-group">
              <label>
                Enable Reranking:
                <input
                  type="checkbox"
                  checked={filters.enableReranking}
                  onChange={(e) => setFilters({ ...filters, enableReranking: e.target.checked })}
                />
              </label>
            </div>

            <div className="filter-group">
              <label>
                Initial Retrieval (k):
                <input
                  type="number"
                  value={filters.kRetrieval}
                  onChange={(e) => setFilters({ ...filters, kRetrieval: parseInt(e.target.value) })}
                  min="1"
                  max="50"
                />
              </label>
            </div>

            <div className="filter-group">
              <label>
                Result Limit:
                <input
                  type="number"
                  value={filters.limit}
                  onChange={(e) => setFilters({ ...filters, limit: parseInt(e.target.value) })}
                  min="1"
                  max="20"
                />
              </label>
            </div>

            <div className="filter-group">
              <label>
                Score Threshold:
                <input
                  type="number"
                  value={filters.scoreThreshold || ''}
                  onChange={(e) => setFilters({ 
                    ...filters, 
                    scoreThreshold: e.target.value ? parseFloat(e.target.value) : null 
                  })}
                  min="0"
                  max="1"
                  step="0.1"
                  placeholder="Optional"
                />
              </label>
            </div>
          </div>

          {/* Search Suggestions */}
          <div className="search-suggestions">
            {popularQueries.length > 0 && (
              <div className="suggestion-section">
                <h4>Popular Searches:</h4>
                <div className="suggestion-pills">
                  {popularQueries.slice(0, 5).map((item, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionClick(item.query)}
                      className="suggestion-pill"
                    >
                      {item.query} ({item.search_count})
                    </button>
                  ))}
                </div>
              </div>
            )}

            {searchHistory.length > 0 && (
              <div className="suggestion-section">
                <h4>Recent Searches:</h4>
                <div className="suggestion-pills">
                  {searchHistory.slice(0, 3).map((item, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionClick(item.query)}
                      className="suggestion-pill recent"
                    >
                      {item.query}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Search Stats */}
          {searchStats && (
            <div className="search-stats">
              <div className="stat-item">
                <span className="stat-label">Search Time:</span>
                <span className="stat-value">{formatTime(searchStats.search_time_ms)}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Embedding Time:</span>
                <span className="stat-value">{formatTime(searchStats.embedding_time_ms)}</span>
              </div>
              {searchStats.rerank_time_ms && (
                <div className="stat-item">
                  <span className="stat-label">Rerank Time:</span>
                  <span className="stat-value">{formatTime(searchStats.rerank_time_ms)}</span>
                </div>
              )}
              <div className="stat-item">
                <span className="stat-label">Reranking:</span>
                <span className={`stat-value ${searchStats.reranking_enabled ? 'enabled' : 'disabled'}`}>
                  {searchStats.reranking_enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>
          )}

          {/* Search Results */}
          {results.length > 0 && (
            <div className="search-results">
              <h3>Search Results ({results.length})</h3>
              
              {results.map((result, index) => (
                <div
                  key={result.id || index}
                  className={`result-item ${selectedResult?.id === result.id ? 'selected' : ''}`}
                  onClick={() => handleResultClick(result, index)}
                >
                  <div className="result-header">
                    <div className="result-position">#{index + 1}</div>
                    <div className="result-scores">
                      {result.rerank_score && (
                        <span className="rerank-score">
                          Rerank: {formatScore(result.rerank_score)}
                        </span>
                      )}
                      <span className="vector-score">
                        Vector: {formatScore(result.score)}
                      </span>
                    </div>
                  </div>

                  <div className="result-content">
                    <div 
                      className="result-text"
                      dangerouslySetInnerHTML={{
                        __html: highlightText(result.text?.substring(0, 300) + '...', query)
                      }}
                    />
                  </div>

                  <div className="result-metadata">
                    <span className="document-id">Doc: {result.document_id?.substring(0, 8)}...</span>
                    <span className="chunk-index">Chunk: {result.chunk_index}</span>
                    {result.start_char && (
                      <span className="char-range">
                        Pos: {result.start_char}-{result.end_char}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Context Window */}
          {contextWindow && (
            <div className="context-window">
              <h3>Context Window for LLM</h3>
              <div className="context-content">
                <pre>{contextWindow}</pre>
              </div>
              <button
                onClick={() => navigator.clipboard.writeText(contextWindow)}
                className="copy-button"
              >
                Copy Context
              </button>
            </div>
          )}

          {/* No Results */}
          {!isLoading && query && results.length === 0 && (
            <div className="no-results">
              <h3>No results found</h3>
              <p>Try adjusting your search terms or filters.</p>
            </div>
          )}

          {/* Advanced Analytics */}
          {showAdvanced && searchStats && (
            <div className="advanced-analytics">
              <h3>Search Analytics</h3>
              <div className="analytics-grid">
                <div className="analytics-item">
                  <h4>Processing Time</h4>
                  <p>Total: {formatTime(searchStats.total_processing_time_ms)}</p>
                </div>
                <div className="analytics-item">
                  <h4>Unique Documents</h4>
                  <p>{searchStats.unique_documents}</p>
                </div>
                <div className="analytics-item">
                  <h4>Avg Relevance</h4>
                  <p>{formatScore(searchStats.avg_relevance_score)}</p>
                </div>
                <div className="analytics-item">
                  <h4>Top-3 Avg Score</h4>
                  <p>{formatScore(searchStats.search_effectiveness?.top_3_avg_score)}</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default SearchInterface 