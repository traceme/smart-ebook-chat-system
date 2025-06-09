import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Divider,
  Grid,
  Button,
  Chip,
  Alert,
  AlertTitle,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { gmailTheme } from '../components/GmailLayout';
import GmailNavigation from '../components/GmailNavigation';
import SearchAutocomplete from '../components/SearchAutocomplete';

// Generate sample documents for testing
const generateSampleDocuments = (count = 1000) => {
  const categories = ['AI/ML', 'Programming', 'Business', 'Science', 'Education', 'Research', 'Finance', 'Health'];
  const statuses = ['processing', 'completed', 'failed', 'pending'];
  const fileTypes = ['PDF', 'Text', 'Word Document', 'Spreadsheet', 'Presentation'];
  
  const titles = [
    'Introduction to Machine Learning',
    'Advanced Python Programming',
    'Business Strategy Fundamentals',
    'Quantum Physics Explained',
    'Financial Market Analysis',
    'Healthcare Data Science',
    'Software Architecture Patterns',
    'Digital Marketing Guide',
    'Neural Networks Deep Dive',
    'React Development Best Practices',
  ];

  return Array.from({ length: count }, (_, i) => ({
    id: `doc-${i}`,
    title: `${titles[i % titles.length]} ${Math.floor(i / titles.length) + 1}`,
    category: categories[i % categories.length],
    status: statuses[i % statuses.length],
    type: fileTypes[i % fileTypes.length],
    uploadDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
    size: `${(Math.random() * 50 + 1).toFixed(1)} MB`,
    tags: [categories[i % categories.length], fileTypes[i % fileTypes.length]],
  }));
};

const SearchAutocompleteDemo = () => {
  const [documents, setDocuments] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilters, setSearchFilters] = useState({});
  const [searchResults, setSearchResults] = useState([]);
  const [recentSearches, setRecentSearches] = useState([
    'machine learning algorithms',
    'python tutorials',
    'business strategy',
    'neural networks',
    'financial analysis',
  ]);
  const [searchPerformance, setSearchPerformance] = useState({});

  // Initialize documents
  useEffect(() => {
    const docs = generateSampleDocuments(1000);
    setDocuments(docs);
  }, []);

  // Handle search execution
  const handleSearch = (query, filters, suggestion) => {
    const startTime = performance.now();
    
    let results = documents;
    
    // Apply text search
    if (query.trim()) {
      const searchTerm = query.toLowerCase();
      results = results.filter(doc => 
        doc.title.toLowerCase().includes(searchTerm) ||
        doc.category.toLowerCase().includes(searchTerm) ||
        doc.tags.some(tag => tag.toLowerCase().includes(searchTerm))
      );
    }
    
    // Apply filters
    if (filters.tags && filters.tags.length > 0) {
      results = results.filter(doc => 
        filters.tags.some(tag => doc.tags.includes(tag))
      );
    }
    
    if (filters.contentTypes && filters.contentTypes.length > 0) {
      results = results.filter(doc => 
        filters.contentTypes.includes(doc.type)
      );
    }
    
    if (filters.showProcessedOnly) {
      results = results.filter(doc => doc.status === 'completed');
    }
    
    // Apply date range filter
    if (filters.dateRange) {
      const [minDays, maxDays] = filters.dateRange;
      const now = new Date();
      results = results.filter(doc => {
        const daysDiff = (now - doc.uploadDate) / (1000 * 60 * 60 * 24);
        return daysDiff >= minDays && daysDiff <= maxDays;
      });
    }
    
    const endTime = performance.now();
    
    setSearchQuery(query);
    setSearchFilters(filters);
    setSearchResults(results);
    setSearchPerformance({
      searchTime: endTime - startTime,
      totalDocuments: documents.length,
      resultsCount: results.length,
      filtersApplied: Object.keys(filters).filter(key => {
        const value = filters[key];
        return Array.isArray(value) ? value.length > 0 : value;
      }).length,
    });
  };

  // Clear search
  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchFilters({});
    setSearchResults([]);
    setSearchPerformance({});
  };

  return (
    <ThemeProvider theme={gmailTheme}>
      <Box sx={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
        {/* Navigation */}
        <GmailNavigation
          searchValue={searchQuery}
          onSearchChange={(value) => setSearchQuery(value)}
          user={{ name: 'Demo User', email: 'demo@example.com' }}
        />

        <Container maxWidth="xl" sx={{ py: 4 }}>
          {/* Header */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, color: '#202124' }}>
              🔍 Search Autocomplete Demo
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Advanced search component with autocomplete, filters, and performance optimization.
            </Typography>
            
            <Alert severity="info" sx={{ mb: 3 }}>
              <AlertTitle>Demo Features</AlertTitle>
              <strong>Autocomplete:</strong> Type to see document, tag, and content type suggestions<br />
              <strong>Filters:</strong> Click the filter icon to apply advanced search criteria<br />
              <strong>Keyboard Navigation:</strong> Use arrow keys in dropdown, Enter to search, Escape to close<br />
              <strong>Performance:</strong> Debounced input with 300ms delay for optimal performance
            </Alert>
          </Box>

          <Grid container spacing={4}>
            {/* Search Component */}
            <Grid item xs={12}>
              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                  🚀 Advanced Search Bar
                </Typography>
                
                <SearchAutocomplete
                  onSearch={handleSearch}
                  onFiltersChange={setSearchFilters}
                  searchValue={searchQuery}
                  documents={documents}
                  recentSearches={recentSearches}
                  onRecentSearchesChange={setRecentSearches}
                  placeholder="Search through 1,000 sample documents..."
                />
                
                {searchQuery && (
                  <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Typography variant="body2" color="text.secondary">
                      Search query:
                    </Typography>
                    <Chip label={searchQuery} size="small" />
                    {Object.entries(searchFilters).map(([key, value]) => {
                      if (Array.isArray(value) && value.length > 0) {
                        return value.map(item => (
                          <Chip key={`${key}-${item}`} label={`${key}: ${item}`} size="small" variant="outlined" />
                        ));
                      } else if (value && typeof value === 'boolean') {
                        return <Chip key={key} label={key} size="small" variant="outlined" />;
                      }
                      return null;
                    }).flat()}
                    <Button size="small" onClick={handleClearSearch}>
                      Clear All
                    </Button>
                  </Box>
                )}
              </Paper>
            </Grid>

            {/* Performance Metrics */}
            {Object.keys(searchPerformance).length > 0 && (
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    📊 Performance Metrics
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Search Time</Typography>
                      <Typography variant="h6" color="primary">
                        {searchPerformance.searchTime?.toFixed(2)}ms
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Results Found</Typography>
                      <Typography variant="h6" color="success.main">
                        {searchPerformance.resultsCount?.toLocaleString()}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Total Documents</Typography>
                      <Typography variant="h6">
                        {searchPerformance.totalDocuments?.toLocaleString()}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Filters Applied</Typography>
                      <Typography variant="h6" color="info.main">
                        {searchPerformance.filtersApplied}
                      </Typography>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>
            )}

            {/* Recent Searches */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  🕒 Recent Searches
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {recentSearches.map((search, index) => (
                    <Chip
                      key={index}
                      label={search}
                      size="small"
                      clickable
                      onClick={() => handleSearch(search, {}, null)}
                      sx={{ 
                        backgroundColor: '#f1f3f4',
                        '&:hover': { backgroundColor: '#e8f0fe' }
                      }}
                    />
                  ))}
                </Box>
              </Paper>
            </Grid>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <Grid item xs={12}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    📋 Search Results ({searchResults.length.toLocaleString()})
                  </Typography>
                  
                  <TableContainer sx={{ maxHeight: 400 }}>
                    <Table stickyHeader size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Title</TableCell>
                          <TableCell>Category</TableCell>
                          <TableCell>Type</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Upload Date</TableCell>
                          <TableCell>Size</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {searchResults.slice(0, 50).map((doc) => (
                          <TableRow key={doc.id} hover>
                            <TableCell sx={{ fontWeight: 500 }}>{doc.title}</TableCell>
                            <TableCell>
                              <Chip label={doc.category} size="small" />
                            </TableCell>
                            <TableCell>{doc.type}</TableCell>
                            <TableCell>
                              <Chip 
                                label={doc.status} 
                                size="small" 
                                color={doc.status === 'completed' ? 'success' : 'default'}
                              />
                            </TableCell>
                            <TableCell>{doc.uploadDate.toLocaleDateString()}</TableCell>
                            <TableCell>{doc.size}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  
                  {searchResults.length > 50 && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                      Showing first 50 results of {searchResults.length.toLocaleString()} total matches
                    </Typography>
                  )}
                </Paper>
              </Grid>
            )}

            {/* Component Features */}
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  ✨ Component Features
                </Typography>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                      🎯 Search Capabilities
                    </Typography>
                    <ul style={{ margin: 0, paddingLeft: 20 }}>
                      <li>Real-time autocomplete suggestions</li>
                      <li>Document title and content matching</li>
                      <li>Tag-based search suggestions</li>
                      <li>Content type filtering</li>
                      <li>Recent search history</li>
                    </ul>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                      ⚡ Performance Features
                    </Typography>
                    <ul style={{ margin: 0, paddingLeft: 20 }}>
                      <li>Debounced input (300ms delay)</li>
                      <li>Efficient suggestion generation</li>
                      <li>Keyboard navigation support</li>
                      <li>Mobile-responsive design</li>
                      <li>Lazy loading for large datasets</li>
                    </ul>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                      🔧 Advanced Filters
                    </Typography>
                    <ul style={{ margin: 0, paddingLeft: 20 }}>
                      <li>Content type selection</li>
                      <li>Tag-based filtering</li>
                      <li>Date range slider</li>
                      <li>Processing status filters</li>
                      <li>Filter count indicator</li>
                    </ul>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                      🎨 UX Features
                    </Typography>
                    <ul style={{ margin: 0, paddingLeft: 20 }}>
                      <li>Gmail-inspired styling</li>
                      <li>Smooth animations</li>
                      <li>Clear and intuitive UI</li>
                      <li>Accessibility support</li>
                      <li>Error handling</li>
                    </ul>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </ThemeProvider>
  );
};

export default SearchAutocompleteDemo;

export const Head = () => (
  <>
    <title>Search Autocomplete Demo - Smart eBook Chat</title>
    <meta name="description" content="Advanced search autocomplete component with filters and performance optimization" />
  </>
); 