import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Divider,
  Paper,
  Grid,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Badge,
  Avatar,
  Tooltip,
  Switch,
  FormControlLabel,
  Slider,
  Alert,
  LinearProgress,
} from '@mui/material';
import { styled } from '@mui/material/styles';

// Icons using Unicode emojis
const ContextIcon = () => <span style={{ fontSize: '16px' }}>📚</span>;
const DocumentIcon = () => <span style={{ fontSize: '16px' }}>📄</span>;
const HistoryIcon = () => <span style={{ fontSize: '16px' }}>📜</span>;
const SearchIcon = () => <span style={{ fontSize: '16px' }}>🔍</span>;
const FilterIcon = () => <span style={{ fontSize: '16px' }}>🔽</span>;
const EditIcon = () => <span style={{ fontSize: '16px' }}>✏️</span>;
const DeleteIcon = () => <span style={{ fontSize: '16px' }}>🗑️</span>;
const AddIcon = () => <span style={{ fontSize: '16px' }}>➕</span>;
const ViewIcon = () => <span style={{ fontSize: '16px' }}>👁️</span>;
const TagIcon = () => <span style={{ fontSize: '16px' }}>🏷️</span>;
const TimeIcon = () => <span style={{ fontSize: '16px' }}>⏰</span>;
const MessageIcon = () => <span style={{ fontSize: '16px' }}>💬</span>;
const RefreshIcon = () => <span style={{ fontSize: '16px' }}>🔄</span>;
const ExpandIcon = () => <span style={{ fontSize: '16px' }}>📖</span>;
const CollapseIcon = () => <span style={{ fontSize: '16px' }}>📕</span>;
const PinIcon = () => <span style={{ fontSize: '16px' }}>📌</span>;
const StarIcon = () => <span style={{ fontSize: '16px' }}>⭐</span>;

// Styled components
const ContextContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  backgroundColor: '#fafafa',
  border: '1px solid #dadce0',
  borderRadius: theme.spacing(1),
}));

const ContextHeader = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  backgroundColor: '#f8f9fa',
  borderBottom: '1px solid #dadce0',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
}));

const ContextContent = styled(Box)(({ theme }) => ({
  flex: 1,
  overflowY: 'auto',
  padding: theme.spacing(1),
  '&::-webkit-scrollbar': {
    width: '8px',
  },
  '&::-webkit-scrollbar-track': {
    backgroundColor: '#f1f1f1',
  },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: '#dadce0',
    borderRadius: '4px',
    '&:hover': {
      backgroundColor: '#bdc1c6',
    },
  },
}));

const DocumentCard = styled(Card)(({ theme, isSelected, isPinned }) => ({
  marginBottom: theme.spacing(1),
  border: isSelected ? '2px solid #4285f4' : '1px solid #dadce0',
  backgroundColor: isSelected ? '#e8f0fe' : '#fff',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  position: 'relative',
  '&:hover': {
    boxShadow: '0 2px 8px rgba(60,64,67,0.3)',
    transform: 'translateY(-1px)',
  },
  ...(isPinned && {
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 8,
      right: 8,
      width: 8,
      height: 8,
      backgroundColor: '#fbbc04',
      borderRadius: '50%',
    },
  }),
}));

const ConversationItem = styled(ListItem)(({ theme, isActive }) => ({
  backgroundColor: isActive ? '#e8f0fe' : 'transparent',
  borderRadius: theme.spacing(1),
  marginBottom: theme.spacing(0.5),
  border: isActive ? '1px solid #4285f4' : '1px solid transparent',
  '&:hover': {
    backgroundColor: '#f5f5f5',
  },
}));

const TabPanel = ({ children, value, index, ...other }) => (
  <Box
    role="tabpanel"
    hidden={value !== index}
    id={`context-tabpanel-${index}`}
    aria-labelledby={`context-tab-${index}`}
    {...other}
  >
    {value === index && children}
  </Box>
);

const ContextManager = ({
  documents = [],
  conversations = [],
  activeConversationId = null,
  selectedDocuments = [],
  onDocumentSelect = () => {},
  onDocumentDeselect = () => {},
  onDocumentView = () => {},
  onDocumentEdit = () => {},
  onDocumentDelete = () => {},
  onConversationSelect = () => {},
  onConversationDelete = () => {},
  onConversationRename = () => {},
  onContextSearch = () => {},
  contextSearchEnabled = true,
  maxContextDocuments = 10,
  onMaxContextDocumentsChange = () => {},
  autoContextSelection = true,
  onAutoContextSelectionChange = () => {},
  className,
}) => {
  // State management
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [documentViewOpen, setDocumentViewOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameConversationId, setRenameConversationId] = useState(null);
  const [newConversationName, setNewConversationName] = useState('');
  const [pinnedDocuments, setPinnedDocuments] = useState(new Set());
  const [expandedAccordions, setExpandedAccordions] = useState(new Set(['context-settings']));

  // Filter documents based on search and type
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.content?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || 
                       (filterType === 'selected' && selectedDocuments.includes(doc.id)) ||
                       (filterType === 'pinned' && pinnedDocuments.has(doc.id));
    return matchesSearch && matchesType;
  });

  // Filter conversations based on search
  const filteredConversations = conversations.filter(conv => 
    conv.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle document selection
  const handleDocumentClick = useCallback((document) => {
    if (selectedDocuments.includes(document.id)) {
      onDocumentDeselect(document.id);
    } else {
      if (selectedDocuments.length < maxContextDocuments) {
        onDocumentSelect(document.id);
      }
    }
  }, [selectedDocuments, maxContextDocuments, onDocumentSelect, onDocumentDeselect]);

  // Handle document view
  const handleDocumentView = useCallback((document) => {
    setSelectedDocument(document);
    setDocumentViewOpen(true);
    onDocumentView(document.id);
  }, [onDocumentView]);

  // Handle pin toggle
  const handlePinToggle = useCallback((documentId) => {
    setPinnedDocuments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(documentId)) {
        newSet.delete(documentId);
      } else {
        newSet.add(documentId);
      }
      return newSet;
    });
  }, []);

  // Handle conversation rename
  const handleConversationRename = useCallback((conversationId) => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (conversation) {
      setRenameConversationId(conversationId);
      setNewConversationName(conversation.name);
      setRenameDialogOpen(true);
    }
  }, [conversations]);

  // Handle search
  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
    if (contextSearchEnabled) {
      onContextSearch(query);
    }
  }, [contextSearchEnabled, onContextSearch]);

  // Handle accordion toggle
  const handleAccordionToggle = useCallback((accordionId) => {
    setExpandedAccordions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(accordionId)) {
        newSet.delete(accordionId);
      } else {
        newSet.add(accordionId);
      }
      return newSet;
    });
  }, []);

  // Calculate context usage
  const contextUsage = (selectedDocuments.length / maxContextDocuments) * 100;

  return (
    <ContextContainer className={className}>
      {/* Header */}
      <ContextHeader>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <ContextIcon />
          <Typography variant="h6" sx={{ ml: 1 }}>
            Context Manager
          </Typography>
          <Badge 
            badgeContent={selectedDocuments.length} 
            color="primary" 
            sx={{ ml: 2 }}
          >
            <DocumentIcon />
          </Badge>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title="Refresh Context">
            <IconButton size="small" onClick={() => window.location.reload()}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </ContextHeader>

      {/* Search and Filter */}
      <Box sx={{ p: 2, borderBottom: '1px solid #dadce0' }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search documents and conversations..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          InputProps={{
            startAdornment: <SearchIcon />,
          }}
          sx={{ mb: 1 }}
        />
        
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            Filter:
          </Typography>
          <Chip
            label="All"
            size="small"
            onClick={() => setFilterType('all')}
            color={filterType === 'all' ? 'primary' : 'default'}
          />
          <Chip
            label="Selected"
            size="small"
            onClick={() => setFilterType('selected')}
            color={filterType === 'selected' ? 'primary' : 'default'}
          />
          <Chip
            label="Pinned"
            size="small"
            onClick={() => setFilterType('pinned')}
            color={filterType === 'pinned' ? 'primary' : 'default'}
          />
        </Box>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <DocumentIcon />
                Documents ({filteredDocuments.length})
              </Box>
            } 
          />
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <HistoryIcon />
                History ({filteredConversations.length})
              </Box>
            } 
          />
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ContextIcon />
                Settings
              </Box>
            } 
          />
        </Tabs>
      </Box>

      {/* Content */}
      <ContextContent>
        {/* Documents Tab */}
        <TabPanel value={activeTab} index={0}>
          {/* Context Usage Indicator */}
          <Paper sx={{ p: 2, mb: 2, backgroundColor: '#f9f9f9' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="body2" fontWeight={500}>
                Context Usage
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {selectedDocuments.length} / {maxContextDocuments}
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={contextUsage} 
              sx={{ height: 6, borderRadius: 3 }}
              color={contextUsage > 80 ? 'warning' : 'primary'}
            />
            {contextUsage > 80 && (
              <Alert severity="warning" sx={{ mt: 1 }}>
                Context is nearly full. Consider deselecting some documents.
              </Alert>
            )}
          </Paper>

          {/* Documents List */}
          {filteredDocuments.length === 0 ? (
            <Paper sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
              <DocumentIcon />
              <Typography variant="body2" sx={{ mt: 1 }}>
                {searchQuery ? 'No documents match your search' : 'No documents available'}
              </Typography>
            </Paper>
          ) : (
            <Box>
              {filteredDocuments.map((document) => {
                const isSelected = selectedDocuments.includes(document.id);
                const isPinned = pinnedDocuments.has(document.id);
                
                return (
                  <DocumentCard
                    key={document.id}
                    isSelected={isSelected}
                    isPinned={isPinned}
                    onClick={() => handleDocumentClick(document)}
                  >
                    <CardContent sx={{ pb: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Typography variant="subtitle2" fontWeight={500}>
                          {document.title}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {isPinned && (
                            <Tooltip title="Pinned">
                              <PinIcon />
                            </Tooltip>
                          )}
                          {isSelected && (
                            <Tooltip title="Selected for Context">
                              <StarIcon />
                            </Tooltip>
                          )}
                        </Box>
                      </Box>
                      
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {document.description || 'No description available'}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
                        <Chip label={document.type || 'Document'} size="small" />
                        {document.pages && (
                          <Chip label={`${document.pages} pages`} size="small" variant="outlined" />
                        )}
                        {document.words && (
                          <Chip label={`${document.words.toLocaleString()} words`} size="small" variant="outlined" />
                        )}
                      </Box>
                      
                      <Typography variant="caption" color="text.secondary">
                        Added: {new Date(document.uploadedAt).toLocaleDateString()}
                      </Typography>
                    </CardContent>
                    
                    <CardActions sx={{ pt: 0, justifyContent: 'space-between' }}>
                      <Box>
                        <Tooltip title="View Document">
                          <IconButton 
                            size="small" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDocumentView(document);
                            }}
                          >
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={isPinned ? "Unpin" : "Pin"}>
                          <IconButton 
                            size="small" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePinToggle(document.id);
                            }}
                          >
                            <PinIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                      
                      <Typography variant="caption" color="text.secondary">
                        {document.size && `${(document.size / 1024 / 1024).toFixed(1)} MB`}
                      </Typography>
                    </CardActions>
                  </DocumentCard>
                );
              })}
            </Box>
          )}
        </TabPanel>

        {/* History Tab */}
        <TabPanel value={activeTab} index={1}>
          {filteredConversations.length === 0 ? (
            <Paper sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
              <HistoryIcon />
              <Typography variant="body2" sx={{ mt: 1 }}>
                {searchQuery ? 'No conversations match your search' : 'No conversation history'}
              </Typography>
            </Paper>
          ) : (
            <List>
              {filteredConversations.map((conversation) => (
                <ConversationItem
                  key={conversation.id}
                  isActive={conversation.id === activeConversationId}
                  onClick={() => onConversationSelect(conversation.id)}
                >
                  <ListItemIcon>
                    <MessageIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary={conversation.name}
                    secondary={
                      <Box>
                        <Typography variant="caption" display="block">
                          {conversation.timestamp.toLocaleString()}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                          <Chip label={conversation.model} size="small" />
                          <Chip 
                            label={`${conversation.messageCount || 0} messages`} 
                            size="small" 
                            variant="outlined" 
                          />
                        </Box>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Tooltip title="Rename">
                      <IconButton
                        edge="end"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleConversationRename(conversation.id);
                        }}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        edge="end"
                        onClick={(e) => {
                          e.stopPropagation();
                          onConversationDelete(conversation.id);
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </ListItemSecondaryAction>
                </ConversationItem>
              ))}
            </List>
          )}
        </TabPanel>

        {/* Settings Tab */}
        <TabPanel value={activeTab} index={2}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Accordion 
              expanded={expandedAccordions.has('context-settings')}
              onChange={() => handleAccordionToggle('context-settings')}
            >
              <AccordionSummary>
                <Typography variant="subtitle2">Context Settings</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box>
                    <Typography variant="body2" gutterBottom>
                      Max Context Documents: {maxContextDocuments}
                    </Typography>
                    <Slider
                      value={maxContextDocuments}
                      onChange={(e, value) => onMaxContextDocumentsChange(value)}
                      min={1}
                      max={20}
                      step={1}
                      marks={[
                        { value: 5, label: '5' },
                        { value: 10, label: '10' },
                        { value: 15, label: '15' },
                        { value: 20, label: '20' },
                      ]}
                      valueLabelDisplay="auto"
                    />
                    <Typography variant="caption" color="text.secondary">
                      Maximum number of documents to include in context
                    </Typography>
                  </Box>

                  <FormControlLabel
                    control={
                      <Switch
                        checked={autoContextSelection}
                        onChange={(e) => onAutoContextSelectionChange(e.target.checked)}
                      />
                    }
                    label="Auto-select relevant documents"
                  />

                  <FormControlLabel
                    control={
                      <Switch
                        checked={contextSearchEnabled}
                        onChange={(e) => {/* handle change */}}
                      />
                    }
                    label="Enable context search"
                  />
                </Box>
              </AccordionDetails>
            </Accordion>

            <Accordion 
              expanded={expandedAccordions.has('history-settings')}
              onChange={() => handleAccordionToggle('history-settings')}
            >
              <AccordionSummary>
                <Typography variant="subtitle2">History Settings</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <FormControlLabel
                    control={<Switch defaultChecked />}
                    label="Auto-save conversations"
                  />
                  <FormControlLabel
                    control={<Switch defaultChecked />}
                    label="Keep conversation history"
                  />
                  <Button variant="outlined" color="error" startIcon={<DeleteIcon />}>
                    Clear All History
                  </Button>
                </Box>
              </AccordionDetails>
            </Accordion>
          </Box>
        </TabPanel>
      </ContextContent>

      {/* Document View Dialog */}
      <Dialog 
        open={documentViewOpen} 
        onClose={() => setDocumentViewOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedDocument?.title}
        </DialogTitle>
        <DialogContent>
          {selectedDocument && (
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {selectedDocument.description}
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Typography variant="body1">
                {selectedDocument.content || 'Document content will be displayed here...'}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDocumentViewOpen(false)}>Close</Button>
          <Button 
            variant="contained" 
            onClick={() => {
              if (selectedDocument) {
                handleDocumentClick(selectedDocument);
                setDocumentViewOpen(false);
              }
            }}
          >
            {selectedDocument && selectedDocuments.includes(selectedDocument.id) 
              ? 'Remove from Context' 
              : 'Add to Context'
            }
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rename Conversation Dialog */}
      <Dialog open={renameDialogOpen} onClose={() => setRenameDialogOpen(false)}>
        <DialogTitle>Rename Conversation</DialogTitle>
        <DialogContent sx={{ width: 400 }}>
          <TextField
            autoFocus
            margin="dense"
            label="Conversation Name"
            fullWidth
            variant="outlined"
            value={newConversationName}
            onChange={(e) => setNewConversationName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenameDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={() => {
              if (renameConversationId && newConversationName.trim()) {
                onConversationRename(renameConversationId, newConversationName.trim());
                setRenameDialogOpen(false);
              }
            }}
            disabled={!newConversationName.trim()}
            variant="contained"
          >
            Rename
          </Button>
        </DialogActions>
      </Dialog>
    </ContextContainer>
  );
};

export default ContextManager; 