import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Autocomplete,
  TextField,
  Box,
  Typography,
  Chip,
  Paper,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  FormControl,
  FormLabel,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Slider,
  Button,
  Badge,
} from '@mui/material';
import { styled, alpha } from '@mui/material/styles';
import { useDebounce } from '../hooks/useDebounce';

// Icons
const SearchIcon = () => <span style={{ fontSize: '18px' }}>🔍</span>;
const FilterIcon = () => <span style={{ fontSize: '18px' }}>🔧</span>;
const ClearIcon = () => <span style={{ fontSize: '18px' }}>✕</span>;
const HistoryIcon = () => <span style={{ fontSize: '18px' }}>🕒</span>;
const TagIcon = () => <span style={{ fontSize: '18px' }}>🏷️</span>;
const DocumentIcon = () => <span style={{ fontSize: '18px' }}>📄</span>;
const DateIcon = () => <span style={{ fontSize: '18px' }}>📅</span>;

// Styled components
const StyledAutocomplete = styled(Autocomplete)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    backgroundColor: alpha('#f1f3f4', 0.8),
    borderRadius: '24px',
    fontSize: '16px',
    '&:hover': {
      backgroundColor: alpha('#f1f3f4', 1),
    },
    '&.Mui-focused': {
      backgroundColor: '#fff',
      boxShadow: '0 2px 5px 1px rgba(64,60,67,.16)',
    },
    '& .MuiOutlinedInput-notchedOutline': {
      border: '1px solid transparent',
    },
    '&:hover .MuiOutlinedInput-notchedOutline': {
      border: '1px solid transparent',
    },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
      border: '1px solid #4285f4',
      borderWidth: '2px',
    },
  },
  '& .MuiAutocomplete-inputRoot': {
    paddingLeft: '48px',
    paddingRight: '12px',
  },
}));

const FilterButton = styled(IconButton)(({ theme, active }) => ({
  color: active ? '#4285f4' : '#5f6368',
  backgroundColor: active ? alpha('#4285f4', 0.1) : 'transparent',
  '&:hover': {
    backgroundColor: active ? alpha('#4285f4', 0.2) : alpha('#5f6368', 0.04),
  },
}));

const SearchAutocomplete = ({
  onSearch = () => {},
  onFiltersChange = () => {},
  placeholder = "Search documents, conversations, and more...",
  searchValue = '',
  maxSuggestions = 8,
  documents = [],
  recentSearches: propRecentSearches = [],
  onRecentSearchesChange = () => {},
}) => {
  const [inputValue, setInputValue] = useState(searchValue);
  const [filters, setFilters] = useState({
    tags: [],
    contentTypes: [],
    dateRange: [0, 365], // days ago
    showProcessedOnly: false,
  });
  const [filterMenuAnchor, setFilterMenuAnchor] = useState(null);
  const [recentSearches, setRecentSearches] = useState(propRecentSearches);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchInputRef = useRef(null);

  // Debounce search input for performance
  const debouncedSearchValue = useDebounce(inputValue, 300);

  // Sample data for autocomplete suggestions
  const sampleTags = ['AI/ML', 'Programming', 'Business', 'Science', 'Education', 'Research', 'Finance', 'Health'];
  const contentTypes = ['PDF', 'Text', 'Word Document', 'Spreadsheet', 'Presentation', 'Image'];

  // Generate search suggestions based on documents and search patterns
  const searchSuggestions = useMemo(() => {
    if (!debouncedSearchValue || debouncedSearchValue.length < 2) {
      return [];
    }

    const query = debouncedSearchValue.toLowerCase();
    const suggestions = [];

    // Document title matches
    documents.forEach(doc => {
      if (doc.title && doc.title.toLowerCase().includes(query)) {
        suggestions.push({
          type: 'document',
          value: doc.title,
          subtitle: `in ${doc.category}`,
          icon: DocumentIcon,
          data: doc,
        });
      }
    });

    // Tag matches
    sampleTags.forEach(tag => {
      if (tag.toLowerCase().includes(query)) {
        suggestions.push({
          type: 'tag',
          value: `tag:${tag}`,
          subtitle: `Search in ${tag} category`,
          icon: TagIcon,
          data: { tag },
        });
      }
    });

    // Content type matches
    contentTypes.forEach(type => {
      if (type.toLowerCase().includes(query)) {
        suggestions.push({
          type: 'filetype',
          value: `type:${type}`,
          subtitle: `Filter by ${type} files`,
          icon: DocumentIcon,
          data: { contentType: type },
        });
      }
    });

    // Recent searches
    recentSearches.forEach(search => {
      if (search.toLowerCase().includes(query)) {
        suggestions.push({
          type: 'history',
          value: search,
          subtitle: 'Recent search',
          icon: HistoryIcon,
          data: { recent: true },
        });
      }
    });

    return suggestions.slice(0, maxSuggestions);
  }, [debouncedSearchValue, documents, recentSearches, maxSuggestions]);

  // Handle search execution
  const executeSearch = useCallback((searchQuery, selectedSuggestion = null) => {
    if (!searchQuery.trim()) return;

    // Add to recent searches
    const newRecentSearches = [
      searchQuery,
      ...recentSearches.filter(s => s !== searchQuery)
    ].slice(0, 10);
    
    setRecentSearches(newRecentSearches);
    onRecentSearchesChange(newRecentSearches);

    // Apply any suggested filters
    let updatedFilters = { ...filters };
    if (selectedSuggestion?.data?.tag) {
      updatedFilters.tags = [...filters.tags, selectedSuggestion.data.tag];
      setFilters(updatedFilters);
    }

    // Execute search
    onSearch(searchQuery, updatedFilters, selectedSuggestion);
    setShowSuggestions(false);
  }, [filters, recentSearches, onSearch, onRecentSearchesChange]);

  // Handle input changes
  const handleInputChange = (event, newValue, reason) => {
    if (reason === 'input') {
      setInputValue(newValue);
      setShowSuggestions(true);
    }
  };

  // Handle suggestion selection
  const handleSuggestionSelect = (event, suggestion) => {
    if (suggestion) {
      setInputValue(suggestion.value);
      executeSearch(suggestion.value, suggestion);
    }
  };

  // Handle key events
  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && inputValue.trim()) {
      executeSearch(inputValue);
    } else if (event.key === 'Escape') {
      setShowSuggestions(false);
      searchInputRef.current?.blur();
    }
  };

  // Clear search
  const handleClear = () => {
    setInputValue('');
    onSearch('', filters);
    setShowSuggestions(false);
  };

  // Filter menu handlers
  const handleFilterClick = (event) => {
    setFilterMenuAnchor(event.currentTarget);
  };

  const handleFilterClose = () => {
    setFilterMenuAnchor(null);
  };

  const handleFilterChange = (filterType, value) => {
    const newFilters = { ...filters, [filterType]: value };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const activeFiltersCount = 
    filters.tags.length + 
    filters.contentTypes.length + 
    (filters.showProcessedOnly ? 1 : 0) +
    (filters.dateRange[0] > 0 || filters.dateRange[1] < 365 ? 1 : 0);

  // Effect to sync with external search value changes
  useEffect(() => {
    if (searchValue !== inputValue) {
      setInputValue(searchValue);
    }
  }, [searchValue]);

  return (
    <Box sx={{ position: 'relative', width: '100%', maxWidth: '720px' }}>
      <StyledAutocomplete
        freeSolo
        options={searchSuggestions}
        inputValue={inputValue}
        onInputChange={handleInputChange}
        onChange={handleSuggestionSelect}
        getOptionLabel={(option) => typeof option === 'string' ? option : option.value}
        renderOption={(props, option) => (
          <Box component="li" {...props} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.5 }}>
            <Box sx={{ color: '#5f6368', fontSize: '16px' }}>
              <option.icon />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" sx={{ 
                fontWeight: 500, 
                color: '#202124',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {option.value}
              </Typography>
              {option.subtitle && (
                <Typography variant="caption" color="text.secondary">
                  {option.subtitle}
                </Typography>
              )}
            </Box>
            <Chip 
              label={option.type} 
              size="small" 
              sx={{ 
                height: '20px', 
                fontSize: '10px',
                backgroundColor: alpha('#4285f4', 0.1),
                color: '#4285f4'
              }} 
            />
          </Box>
        )}
        renderInput={(params) => (
          <TextField
            {...params}
            ref={searchInputRef}
            placeholder={placeholder}
            onKeyDown={handleKeyDown}
            InputProps={{
              ...params.InputProps,
              startAdornment: (
                <Box sx={{ 
                  position: 'absolute', 
                  left: '16px', 
                  color: '#5f6368',
                  pointerEvents: 'none',
                  zIndex: 1
                }}>
                  <SearchIcon />
                </Box>
              ),
              endAdornment: (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {inputValue && (
                    <IconButton size="small" onClick={handleClear} sx={{ color: '#5f6368' }}>
                      <ClearIcon />
                    </IconButton>
                  )}
                  <Badge badgeContent={activeFiltersCount} color="primary">
                    <FilterButton
                      size="small"
                      onClick={handleFilterClick}
                      active={activeFiltersCount > 0}
                    >
                      <FilterIcon />
                    </FilterButton>
                  </Badge>
                </Box>
              ),
            }}
            sx={{
              '& .MuiInputBase-input': {
                fontSize: '16px',
                '&::placeholder': {
                  color: '#5f6368',
                  opacity: 1,
                },
              },
            }}
          />
        )}
        PaperComponent={({ children, ...props }) => (
          <Paper {...props} sx={{ 
            mt: 1, 
            borderRadius: 2, 
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            border: '1px solid #dadce0'
          }}>
            {children}
          </Paper>
        )}
        open={showSuggestions && searchSuggestions.length > 0}
        onOpen={() => setShowSuggestions(true)}
        onClose={() => setShowSuggestions(false)}
      />

      {/* Filter Menu */}
      <Menu
        anchorEl={filterMenuAnchor}
        open={Boolean(filterMenuAnchor)}
        onClose={handleFilterClose}
        PaperProps={{
          sx: {
            mt: 1,
            borderRadius: 2,
            minWidth: '320px',
            maxWidth: '400px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
            🔧 Search Filters
          </Typography>

          {/* Content Type Filter */}
          <FormControl component="fieldset" sx={{ mb: 2, width: '100%' }}>
            <FormLabel component="legend" sx={{ fontSize: '14px', fontWeight: 500, mb: 1 }}>
              📄 Content Types
            </FormLabel>
            <FormGroup row>
              {contentTypes.slice(0, 4).map((type) => (
                <FormControlLabel
                  key={type}
                  control={
                    <Checkbox
                      size="small"
                      checked={filters.contentTypes.includes(type)}
                      onChange={(e) => {
                        const newTypes = e.target.checked
                          ? [...filters.contentTypes, type]
                          : filters.contentTypes.filter(t => t !== type);
                        handleFilterChange('contentTypes', newTypes);
                      }}
                    />
                  }
                  label={type}
                  sx={{ fontSize: '13px' }}
                />
              ))}
            </FormGroup>
          </FormControl>

          <Divider sx={{ my: 2 }} />

          {/* Tags Filter */}
          <FormControl component="fieldset" sx={{ mb: 2, width: '100%' }}>
            <FormLabel component="legend" sx={{ fontSize: '14px', fontWeight: 500, mb: 1 }}>
              🏷️ Tags
            </FormLabel>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {sampleTags.slice(0, 6).map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  size="small"
                  clickable
                  onClick={() => {
                    const newTags = filters.tags.includes(tag)
                      ? filters.tags.filter(t => t !== tag)
                      : [...filters.tags, tag];
                    handleFilterChange('tags', newTags);
                  }}
                  sx={{
                    backgroundColor: filters.tags.includes(tag) ? '#e8f0fe' : '#f1f3f4',
                    color: filters.tags.includes(tag) ? '#1a73e8' : '#5f6368',
                    fontSize: '12px',
                    height: '24px',
                  }}
                />
              ))}
            </Box>
          </FormControl>

          <Divider sx={{ my: 2 }} />

          {/* Date Range Filter */}
          <FormControl component="fieldset" sx={{ mb: 2, width: '100%' }}>
            <FormLabel component="legend" sx={{ fontSize: '14px', fontWeight: 500, mb: 1 }}>
              📅 Upload Date (days ago)
            </FormLabel>
            <Box sx={{ px: 1 }}>
              <Slider
                value={filters.dateRange}
                onChange={(e, value) => handleFilterChange('dateRange', value)}
                valueLabelDisplay="auto"
                min={0}
                max={365}
                marks={[
                  { value: 0, label: 'Today' },
                  { value: 30, label: '30d' },
                  { value: 90, label: '90d' },
                  { value: 365, label: '1y' },
                ]}
                sx={{ mt: 1 }}
              />
            </Box>
          </FormControl>

          <Divider sx={{ my: 2 }} />

          {/* Processing Status Filter */}
          <FormControlLabel
            control={
              <Checkbox
                checked={filters.showProcessedOnly}
                onChange={(e) => handleFilterChange('showProcessedOnly', e.target.checked)}
              />
            }
            label="Show processed documents only"
            sx={{ fontSize: '13px' }}
          />

          {/* Filter Actions */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2, pt: 2, borderTop: '1px solid #dadce0' }}>
            <Button 
              size="small" 
              onClick={() => {
                const resetFilters = {
                  tags: [],
                  contentTypes: [],
                  dateRange: [0, 365],
                  showProcessedOnly: false,
                };
                setFilters(resetFilters);
                onFiltersChange(resetFilters);
              }}
            >
              Clear All
            </Button>
            <Button variant="contained" size="small" onClick={handleFilterClose}>
              Apply Filters
            </Button>
          </Box>
        </Box>
      </Menu>
    </Box>
  );
};

export default SearchAutocomplete;