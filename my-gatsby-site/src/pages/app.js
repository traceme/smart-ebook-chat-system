import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Fab,
  Snackbar,
  Alert,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Tab,
  Tabs,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  LinearProgress,
  Divider,
  Badge,
  CircularProgress,
  TextField,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Description as DescriptionIcon,
  Chat as ChatIcon,
  Search as SearchIcon,
  Settings as SettingsIcon,
  Folder as FolderIcon,
  Add as AddIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  ErrorOutline as ErrorIcon,
  HourglassEmpty as ProcessingIcon,
  Visibility as ViewIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Share as ShareIcon,
} from '@mui/icons-material';
import GmailLayout from '../components/GmailLayout';
import DocumentList from '../components/DocumentList';
import DocumentPreview from '../components/DocumentPreview';
import FileUpload from '../components/FileUpload';
import Seo from '../components/seo';
import ReactMarkdown from 'react-markdown';

// Mock API service
const mockAPI = {
  // Upload document
  uploadDocument: async (file, onProgress) => {
    return new Promise((resolve) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 20;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          onProgress(progress);
          setTimeout(() => {
            resolve({
              id: Date.now(),
              filename: file.name,
              size: file.size,
              status: 'uploaded',
              uploadedAt: new Date().toISOString(),
            });
          }, 500);
        } else {
          onProgress(progress);
        }
      }, 200);
    });
  },

  // Get user documents
  getUserDocuments: async () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          {
            id: 1,
            title: 'Getting Started Guide',
            filename: 'getting-started.pdf',
            size: 2048000,
            status: 'processed',
            uploadedAt: '2024-06-08T10:00:00Z',
            processedAt: '2024-06-08T10:02:00Z',
            tags: ['Guide', 'Tutorial'],
            category: 'Documentation',
          },
          {
            id: 2,
            title: 'API Reference Manual',
            filename: 'api-reference.docx',
            size: 1536000,
            status: 'processing',
            uploadedAt: '2024-06-08T11:00:00Z',
            tags: ['API', 'Reference'],
            category: 'Technical',
            progress: 75,
          },
          {
            id: 3,
            title: 'User Interface Guidelines',
            filename: 'ui-guidelines.epub',
            size: 3072000,
            status: 'processed',
            uploadedAt: '2024-06-08T09:00:00Z',
            processedAt: '2024-06-08T09:05:00Z',
            tags: ['UI', 'Design', 'Guidelines'],
            category: 'Design',
          },
        ]);
      }, 500);
    });
  },

  // Search documents
  searchDocuments: async (query) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const searchResults = [
          {
            id: 1,
            title: `Content about "${query}" - Chapter 1`,
            content: `This section discusses key concepts related to "${query}". The document provides comprehensive coverage including practical examples, theoretical foundations, and real-world applications. Important insights are highlighted throughout this chapter.`,
            relevance: 0.92 + Math.random() * 0.08,
            documentId: 1,
            page: Math.floor(Math.random() * 20) + 1,
          },
          {
            id: 2,
            title: `Advanced topics on "${query}" - Reference Guide`,
            content: `Here we explore advanced aspects of "${query}" with detailed analysis and expert recommendations. This section includes case studies, best practices, and implementation strategies that are essential for understanding the topic.`,
            relevance: 0.85 + Math.random() * 0.10,
            documentId: 2,
            page: Math.floor(Math.random() * 15) + 1,
          },
          {
            id: 3,
            title: `"${query}" implementation guide`,
            content: `A practical guide covering implementation details for "${query}". Includes step-by-step instructions, troubleshooting tips, and common pitfalls to avoid. This comprehensive resource serves as your go-to reference.`,
            relevance: 0.78 + Math.random() * 0.15,
            documentId: 3,
            page: Math.floor(Math.random() * 25) + 1,
          }
        ];
        
        // Return 1-3 random results to simulate realistic search
        const numResults = Math.floor(Math.random() * 3) + 1;
        resolve(searchResults.slice(0, numResults));
      }, 800);
    });
  },

  // Send chat message
  sendChatMessage: async (message, context) => {
    // Simulate AI processing time
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const responses = [
      {
        content: `I understand you're asking about "${message}". Based on the documents you've uploaded, here's what I can tell you:\n\n**Key Points:**\n- This appears to be related to document content analysis\n- The uploaded files contain valuable information that can help answer your question\n- For more detailed answers, please ensure your documents are fully processed\n\n**Recommendations:**\n- Try uploading more specific documents related to your query\n- Use more specific keywords in your search\n- Consider breaking down complex questions into smaller parts`,
        references: [
          { documentId: 1, title: 'Sample Document 1.pdf', page: 1 },
          { documentId: 2, title: 'Sample Document 2.pdf', page: 3 }
        ]
      },
      {
        content: `Regarding "${message}", I found several relevant points in your documents:\n\n**Summary:**\n- Your question touches on important concepts covered in the uploaded materials\n- The documents provide context and background information\n- Multiple sources in your library relate to this topic\n\n**Next Steps:**\n- Review the referenced documents for more details\n- Feel free to ask follow-up questions\n- Upload additional documents if you need more comprehensive information`,
        references: [
          { documentId: 3, title: 'Sample Document 3.pdf', page: 2 }
        ]
      },
      {
        content: `Thank you for asking about "${message}". Here's what I found in your document collection:\n\n**Analysis:**\n- The topic you're inquiring about appears in multiple documents\n- There are cross-references and related concepts throughout your library\n- The information is well-documented and provides good coverage\n\n**Additional Information:**\n- Consider exploring related topics in your documents\n- The search function can help you find more specific information\n- Feel free to ask more detailed questions about specific aspects`,
        references: [
          { documentId: 1, title: 'Sample Document 1.pdf', page: 5 },
          { documentId: 4, title: 'Sample Document 4.pdf', page: 1 }
        ]
      }
    ];

    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    
    return {
      id: Date.now(),
      content: randomResponse.content,
      timestamp: new Date().toISOString(),
      references: randomResponse.references
    };
  },
};

// Real API service
const API_BASE_URL = 'http://localhost:8000/api/v1';

const realAPI = {
  // Get auth token from localStorage
  getAuthToken: () => localStorage.getItem('authToken') || '',
  
  // Upload document
  uploadDocument: async (file, onProgress) => {
    const authToken = realAPI.getAuthToken();
    if (!authToken) {
      throw new Error('Please login first');
    }

    try {
      // Step 1: Initialize upload
      const initResponse = await fetch(`${API_BASE_URL}/documents/upload/init`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: file.name,
          file_size: file.size,
          file_hash: 'placeholder-hash-' + Date.now(), // In real app, calculate SHA-256
        }),
      });

      if (!initResponse.ok) {
        throw new Error('Failed to initialize upload');
      }

      const initData = await initResponse.json();
      onProgress(25);

      // Step 2: Upload to presigned URL (simulated)
      onProgress(75);

      // Step 3: Complete upload
      const completeResponse = await fetch(`${API_BASE_URL}/documents/upload/${initData.document_id}/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (!completeResponse.ok) {
        throw new Error('Failed to complete upload');
      }

      onProgress(100);
      
      const completeData = await completeResponse.json();
      return {
        id: initData.document_id,
        title: file.name.replace(/\.[^/.]+$/, ''), // Remove file extension for title
        filename: file.name,
        size: file.size,
        status: 'uploaded',
        uploadedAt: new Date().toISOString(),
        tags: [],
        category: 'Uploaded',
      };
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  },

  // Get user documents
  getUserDocuments: async () => {
    const authToken = realAPI.getAuthToken();
    if (!authToken) {
      // Return mock data if no auth token
      return mockAPI.getUserDocuments();
    }

    try {
      const response = await fetch(`${API_BASE_URL}/documents/`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        return data || []; // Backend returns array directly, not wrapped in documents property
      } else {
        // Fallback to mock data
        return mockAPI.getUserDocuments();
      }
    } catch (error) {
      console.error('Failed to load documents:', error);
      // Fallback to mock data
      return mockAPI.getUserDocuments();
    }
  },

  // Search documents
  searchDocuments: async (query) => {
    const authToken = realAPI.getAuthToken();
    if (!authToken) {
      return mockAPI.searchDocuments(query);
    }

    try {
      const response = await fetch(`${API_BASE_URL}/vector-search/search`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query,
          limit: 10,
          k_retrieval: 8,
          enable_reranking: true,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.results || [];
      } else {
        return mockAPI.searchDocuments(query);
      }
    } catch (error) {
      console.error('Search error:', error);
      return mockAPI.searchDocuments(query);
    }
  },

  // Send chat message (enhanced with search context)
  sendChatMessage: async (message, context) => {
    const authToken = realAPI.getAuthToken();
    
    try {
      // First, search for relevant content
      const searchResults = await realAPI.searchDocuments(message);
      
      // Create context from search results
      const searchContext = searchResults.slice(0, 3).map(result => ({
        title: result.title,
        content: result.content,
        page: result.page,
        relevance: result.relevance
      }));

      // Simulate AI response with search context
      const response = {
        id: Date.now(),
        content: searchContext.length > 0 
          ? `Based on your documents, I found relevant information about "${message}":\n\n${searchContext.map((ctx, idx) => 
              `**${idx + 1}. ${ctx.title}** (Relevance: ${(ctx.relevance * 100).toFixed(0)}%)\n${ctx.content}\n`
            ).join('\n')}\n\nThis information comes from your uploaded documents and provides context for your question.`
          : `I couldn't find specific information about "${message}" in your uploaded documents. Please make sure you have uploaded relevant documents or try rephrasing your question.`,
        timestamp: new Date().toISOString(),
        references: searchContext.map(ctx => ({
          documentId: searchResults.find(r => r.title === ctx.title)?.documentId || 1,
          title: ctx.title,
          page: ctx.page || 1
        }))
      };

      return response;
    } catch (error) {
      console.error('Chat error:', error);
      // Fallback to mock response
      return mockAPI.sendChatMessage(message, context);
    }
  },

  // Check backend health
  checkHealth: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      return response.ok;
    } catch (error) {
      return false;
    }
  },

  // Login user (simple implementation)
  login: async (email, password) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login/access-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          username: email,
          password: password,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('authToken', data.access_token);
        return data;
      } else {
        throw new Error('Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  // Register new user
  register: async (email, password) => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          password: password,
        }),
      });

      if (response.ok) {
        return await response.json();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  },
};

const SmartEbookChatApp = () => {
  // State management
  const [activeTab, setActiveTab] = useState(0);
  const [documents, setDocuments] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  const [chatMessages, setChatMessages] = useState([
    {
      id: 1,
      role: 'assistant',
      content: 'Hello! I\'m your AI assistant. Upload some documents and I\'ll help you find information and answer questions about them.',
      timestamp: new Date().toISOString(),
    }
  ]);
  const [chatInputValue, setChatInputValue] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // Authentication state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginLoading, setLoginLoading] = useState(false);
  const [backendHealth, setBackendHealth] = useState(null);

  // Mock user data
  const mockUser = {
    name: 'Alex Chen',
    email: 'alex.chen@smartebooks.com',
    avatar: null,
  };

  const [userSettings, setUserSettings] = useState({
    displayName: 'Alex Chen',
    email: 'alex.chen@smartebooks.com',
    bio: 'AI-powered document analysis enthusiast',
    emailNotifications: true,
    pushNotifications: true,
    theme: 'light',
    compactView: false,
    sidebarWidth: 280,
  });

  // Load documents on mount
  useEffect(() => {
    loadDocuments();
    checkBackendHealth();
    checkAuthStatus();
  }, []);

  const loadDocuments = async () => {
    try {
      if (isLoggedIn && !isDemoMode) {
        // Try real API first
        const docs = await realAPI.getUserDocuments();
        setDocuments(docs);
      } else {
        // Use mock data for demo mode or when not logged in
        const docs = await mockAPI.getUserDocuments();
        setDocuments(docs);
      }
    } catch (error) {
      console.error('Failed to load documents:', error);
      // Fallback to mock data
      const docs = await mockAPI.getUserDocuments();
      setDocuments(docs);
      if (!isDemoMode) {
        showNotification('Switched to demo mode due to API error', 'info');
        setIsDemoMode(true);
      }
    }
  };

  const handleFileUpload = async (files) => {
    setUploading(true);
    setUploadProgress(0);
    
    try {
      for (const file of files) {
        if (isLoggedIn && !isDemoMode) {
          // Try real API upload
          const uploadedDoc = await realAPI.uploadDocument(file, setUploadProgress);
          setDocuments(prev => [...prev, uploadedDoc]);
          showNotification(`${file.name} uploaded successfully!`, 'success');
        } else {
          // Use mock upload for demo mode
          const uploadedDoc = await mockAPI.uploadDocument(file, setUploadProgress);
          setDocuments(prev => [...prev, uploadedDoc]);
          showNotification(`${file.name} uploaded (demo mode)!`, 'success');
        }
      }
    } catch (error) {
      console.error('Upload failed:', error);
      showNotification(`Upload failed: ${error.message}`, 'error');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setUploadDialogOpen(false);
    }
  };

  const handleSearch = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const results = await realAPI.searchDocuments(query);
      setSearchResults(results);
    } catch (error) {
      showNotification('Search failed', 'error');
    } finally {
      setSearching(false);
    }
  };

  const handleChatMessage = async (message) => {
    if (!message.trim()) return;

    // Add user message
    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    };
    setChatMessages(prev => [...prev, userMessage]);
    setChatInputValue('');
    setChatLoading(true);

    try {
      const response = await realAPI.sendChatMessage(message, { documents });
      const assistantMessage = {
        id: response.id,
        role: 'assistant',
        content: response.content,
        timestamp: response.timestamp,
        references: response.references,
      };
      setChatMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      showNotification('Failed to send message', 'error');
    } finally {
      setChatLoading(false);
    }
  };

  const handleDocumentAction = (action, document) => {
    switch (action) {
      case 'view':
        setSelectedDocument(document);
        setActiveTab(0); // Switch to documents tab
        break;
      case 'download':
        showNotification(`Downloading ${document.title}`, 'info');
        break;
      case 'delete':
        setDocuments(prev => prev.filter(d => d.id !== document.id));
        showNotification(`${document.title} deleted`, 'info');
        break;
      case 'share':
        showNotification(`Sharing ${document.title}`, 'info');
        break;
      default:
        console.log(`Action: ${action}`, document);
    }
  };

  const showNotification = (message, severity = 'info') => {
    setNotification({ open: true, message, severity });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'processed':
        return <CheckCircleIcon color="success" fontSize="small" />;
      case 'processing':
        return <ProcessingIcon color="warning" fontSize="small" />;
      case 'error':
        return <ErrorIcon color="error" fontSize="small" />;
      default:
        return <DescriptionIcon color="action" fontSize="small" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'processed':
        return 'success';
      case 'processing':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  // Tab panel component
  const TabPanel = ({ children, value, index, ...other }) => (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tab-panel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ height: '100%' }}>{children}</Box>}
    </div>
  );

  // Document list for sidebar
  const documentListSidebar = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Upload Section */}
      <Box sx={{ p: 2, borderBottom: '1px solid #dadce0' }}>
        <Button
          variant="contained"
          startIcon={<CloudUploadIcon />}
          onClick={() => setUploadDialogOpen(true)}
          fullWidth
          sx={{
            background: 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)',
            boxShadow: '0 3px 5px 2px rgba(25, 118, 210, .3)',
            '&:hover': {
              background: 'linear-gradient(45deg, #1565c0 30%, #1976d2 90%)',
            }
          }}
        >
          Upload Documents
        </Button>
      </Box>

      {/* Document Stats */}
      <Box sx={{ p: 2, borderBottom: '1px solid #dadce0' }}>
        <Grid container spacing={1}>
          <Grid item xs={4}>
            <Paper sx={{ p: 1, textAlign: 'center' }}>
              <Typography variant="h6" color="primary">
                {documents.length}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Total
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={4}>
            <Paper sx={{ p: 1, textAlign: 'center' }}>
              <Typography variant="h6" color="success.main">
                {documents.filter(d => d.status === 'processed').length}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Ready
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={4}>
            <Paper sx={{ p: 1, textAlign: 'center' }}>
              <Typography variant="h6" color="warning.main">
                {documents.filter(d => d.status === 'processing').length}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Processing
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Box>

      {/* Document List */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <List dense>
          {documents.map((doc) => (
            <ListItem
              key={doc.id}
              button
              selected={selectedDocument?.id === doc.id}
              onClick={() => setSelectedDocument(doc)}
              sx={{
                borderLeft: selectedDocument?.id === doc.id ? 3 : 0,
                borderColor: 'primary.main',
                backgroundColor: selectedDocument?.id === doc.id ? 'action.selected' : 'transparent',
              }}
            >
              <ListItemIcon>
                {getStatusIcon(doc.status)}
              </ListItemIcon>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" noWrap sx={{ flex: 1 }}>
                      {doc.title}
                    </Typography>
                    <Chip
                      label={doc.status}
                      size="small"
                      color={getStatusColor(doc.status)}
                      variant="outlined"
                    />
                  </Box>
                }
                secondary={
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {doc.filename} • {(doc.size / 1024 / 1024).toFixed(2)} MB
                    </Typography>
                    {doc.status === 'processing' && doc.progress && (
                      <LinearProgress 
                        variant="determinate" 
                        value={doc.progress} 
                        size="small"
                        sx={{ mt: 0.5 }}
                      />
                    )}
                    {doc.tags && (
                      <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                        {doc.tags.slice(0, 2).map((tag) => (
                          <Chip
                            key={tag}
                            label={tag}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '10px', height: '18px' }}
                          />
                        ))}
                        {doc.tags.length > 2 && (
                          <Typography variant="caption" color="text.secondary">
                            +{doc.tags.length - 2}
                          </Typography>
                        )}
                      </Box>
                    )}
                  </Box>
                }
              />
            </ListItem>
          ))}
        </List>

        {documents.length === 0 && (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <FolderIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
            <Typography variant="body2" color="text.secondary">
              No documents uploaded yet
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Click "Upload Documents" to get started
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );

  const checkBackendHealth = async () => {
    const isHealthy = await realAPI.checkHealth();
    setBackendHealth(isHealthy);
  };

  const checkAuthStatus = () => {
    const token = realAPI.getAuthToken();
    setIsLoggedIn(!!token);
  };

  const handleLogin = async () => {
    setLoginLoading(true);
    try {
      await realAPI.login(loginForm.email, loginForm.password);
      setIsLoggedIn(true);
      setIsDemoMode(false);
      setLoginDialogOpen(false);
      setLoginForm({ email: '', password: '' });
      showNotification('Login successful!', 'success');
      loadDocuments(); // Reload documents after login
    } catch (error) {
      console.log('Login failed, enabling demo mode');
      setIsDemoMode(true);
      setIsLoggedIn(false);
      setLoginDialogOpen(false);
      setLoginForm({ email: '', password: '' });
      showNotification('Login failed. Running in demo mode with mock data.', 'warning');
      loadDocuments(); // Load mock documents
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    setIsLoggedIn(false);
    setDocuments([]);
    showNotification('Logged out successfully', 'info');
  };

  return (
    <>
      <GmailLayout
        user={mockUser}
        onSearch={setSearchQuery}
        searchValue={searchQuery}
        sidebarContent={documentListSidebar}
        userSettings={userSettings}
        onSettingsChange={setUserSettings}
        sidebarTitle="Documents"
      >
        {/* Main Content Area */}
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* Status Header */}
          <Box sx={{ p: 2, borderBottom: '1px solid #dadce0', bgcolor: '#f8f9fa' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Chip
                  label={backendHealth ? 'Backend Online' : 'Backend Offline'}
                  color={backendHealth ? 'success' : 'error'}
                  size="small"
                  variant="outlined"
                />
                <Chip
                  label={isLoggedIn ? 'Authenticated' : isDemoMode ? 'Demo Mode' : 'Not Authenticated'}
                  color={isLoggedIn ? 'success' : isDemoMode ? 'warning' : 'default'}
                  size="small"
                  variant="outlined"
                />
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {!isLoggedIn ? (
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setLoginDialogOpen(true)}
                  >
                    Login
                  </Button>
                ) : (
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleLogout}
                  >
                    Logout
                  </Button>
                )}
                <Button
                  variant="text"
                  size="small"
                  onClick={checkBackendHealth}
                >
                  Check Status
                </Button>
              </Box>
            </Box>
          </Box>

          {/* Header */}
          <Box sx={{ borderBottom: '1px solid #dadce0' }}>
            <Tabs
              value={activeTab}
              onChange={(e, newValue) => setActiveTab(newValue)}
              sx={{ px: 3 }}
            >
              <Tab 
                icon={<DescriptionIcon />} 
                label="Documents" 
                iconPosition="start"
              />
              <Tab 
                icon={<SearchIcon />} 
                label="Search" 
                iconPosition="start"
              />
              <Tab 
                icon={
                  <Badge 
                    badgeContent={chatMessages.filter(m => m.role === 'assistant').length} 
                    color="primary"
                  >
                    <ChatIcon />
                  </Badge>
                } 
                label="Chat" 
                iconPosition="start"
              />
            </Tabs>
          </Box>

          {/* Tab Content */}
          <Box sx={{ flex: 1, overflow: 'hidden' }}>
            {/* Documents Tab */}
            <TabPanel value={activeTab} index={0}>
              {selectedDocument ? (
                <DocumentPreview
                  document={selectedDocument}
                  onShare={(doc) => handleDocumentAction('share', doc)}
                  onDelete={(doc) => handleDocumentAction('delete', doc)}
                  onDownload={(doc) => handleDocumentAction('download', doc)}
                  onEdit={(doc) => handleDocumentAction('edit', doc)}
                  onPrint={(doc) => handleDocumentAction('print', doc)}
                />
              ) : (
                <Box sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  p: 3 
                }}>
                  <Card sx={{ maxWidth: 500, textAlign: 'center' }}>
                    <CardContent sx={{ p: 4 }}>
                      <CloudUploadIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
                      <Typography variant="h5" gutterBottom>
                        Welcome to Smart eBook Chat
                      </Typography>
                      <Typography variant="body1" color="text.secondary" paragraph>
                        Upload your documents to get started. Our AI will process them and help you 
                        find information, answer questions, and analyze content.
                      </Typography>
                      
                      {!isLoggedIn && (
                        <Alert severity="info" sx={{ mb: 2 }}>
                          Currently running in demo mode. Login to connect to the real backend for full functionality.
                        </Alert>
                      )}
                      
                      <Button
                        variant="contained"
                        size="large"
                        startIcon={<CloudUploadIcon />}
                        onClick={() => setUploadDialogOpen(true)}
                        sx={{ mt: 2 }}
                      >
                        Upload Your First Document
                      </Button>
                    </CardContent>
                  </Card>
                </Box>
              )}
            </TabPanel>

            {/* Search Tab */}
            <TabPanel value={activeTab} index={1}>
              <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 2 }}>
                {/* Search Header */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h5" gutterBottom>
                    Semantic Search
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Search through your uploaded documents using AI-powered semantic search
                  </Typography>
                </Box>

                {/* Search Input */}
                <Box sx={{ mb: 3 }}>
                  <TextField
                    fullWidth
                    placeholder="Search your documents..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleSearch(searchQuery);
                      }
                    }}
                    variant="outlined"
                    InputProps={{
                      endAdornment: (
                        <Button
                          variant="contained"
                          onClick={() => handleSearch(searchQuery)}
                          disabled={!searchQuery.trim() || searching}
                          sx={{ ml: 1 }}
                        >
                          {searching ? <CircularProgress size={20} /> : 'Search'}
                        </Button>
                      ),
                    }}
                  />
                </Box>

                {/* Search Results */}
                <Box sx={{ flex: 1, overflow: 'auto' }}>
                  {searching && (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <CircularProgress />
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                        Searching through your documents...
                      </Typography>
                    </Box>
                  )}

                  {!searching && searchResults.length > 0 && (
                    <Box>
                      <Typography variant="h6" gutterBottom>
                        Search Results ({searchResults.length})
                      </Typography>
                      <List>
                        {searchResults.map((result, index) => (
                          <ListItem
                            key={result.id}
                            button
                            onClick={() => {
                              const doc = documents.find(d => d.id === result.documentId);
                              if (doc) {
                                setSelectedDocument(doc);
                                setActiveTab(0);
                              }
                            }}
                            sx={{
                              border: '1px solid #e0e0e0',
                              borderRadius: 2,
                              mb: 1,
                              '&:hover': {
                                backgroundColor: '#f5f5f5',
                              },
                            }}
                          >
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                    {result.title}
                                  </Typography>
                                  <Chip
                                    label={`${(result.relevance * 100).toFixed(0)}% match`}
                                    size="small"
                                    color="primary"
                                    variant="outlined"
                                  />
                                  {result.page && (
                                    <Chip
                                      label={`Page ${result.page}`}
                                      size="small"
                                      variant="outlined"
                                    />
                                  )}
                                </Box>
                              }
                              secondary={
                                <Typography variant="body2" color="text.secondary">
                                  {result.content}
                                </Typography>
                              }
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  )}

                  {!searching && searchQuery && searchResults.length === 0 && (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <SearchIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                      <Typography variant="h6" color="text.secondary">
                        No results found
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Try different keywords or upload more documents
                      </Typography>
                    </Box>
                  )}

                  {!searchQuery && (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <SearchIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                      <Typography variant="h6" color="text.secondary">
                        Start searching your documents
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Enter keywords to find relevant content across all your uploaded documents
                      </Typography>
                      
                      {/* Quick Search Suggestions */}
                      <Box sx={{ mt: 3 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Try searching for:
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
                          {['introduction', 'setup', 'configuration', 'examples', 'troubleshooting'].map((suggestion) => (
                            <Chip
                              key={suggestion}
                              label={suggestion}
                              onClick={() => {
                                setSearchQuery(suggestion);
                                handleSearch(suggestion);
                              }}
                              clickable
                              variant="outlined"
                            />
                          ))}
                        </Box>
                      </Box>
                    </Box>
                  )}
                </Box>
              </Box>
            </TabPanel>

            {/* Chat Tab */}
            <TabPanel value={activeTab} index={2}>
              <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 2 }}>
                {documents.filter(d => d.status === 'processed').length === 0 ? (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Upload and process some documents first to start chatting with AI.
                  </Alert>
                ) : (
                  <Alert severity="success" sx={{ mb: 2 }}>
                    You have {documents.filter(d => d.status === 'processed').length} processed documents ready for chat!
                  </Alert>
                )}
                
                {/* Simple Chat Interface */}
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', bgcolor: '#f5f5f5', borderRadius: 2, overflow: 'hidden' }}>
                  {/* Messages Area */}
                  <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                    {chatMessages.map((message) => (
                      <Box
                        key={message.id}
                        sx={{
                          display: 'flex',
                          flexDirection: message.role === 'user' ? 'row-reverse' : 'row',
                          mb: 2,
                        }}
                      >
                        <Box
                          sx={{
                            maxWidth: '70%',
                            p: 2,
                            borderRadius: 2,
                            bgcolor: message.role === 'user' ? '#1976d2' : '#fff',
                            color: message.role === 'user' ? 'white' : 'black',
                            boxShadow: 1,
                          }}
                        >
                          {message.role === 'assistant' ? (
                            <ReactMarkdown
                              components={{
                                p: ({ children }) => (
                                  <Typography variant="body1" sx={{ mb: 1, whiteSpace: 'pre-wrap' }}>
                                    {children}
                                  </Typography>
                                ),
                                strong: ({ children }) => (
                                  <Typography component="span" sx={{ fontWeight: 'bold' }}>
                                    {children}
                                  </Typography>
                                ),
                              }}
                            >
                              {message.content}
                            </ReactMarkdown>
                          ) : (
                            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                              {message.content}
                            </Typography>
                          )}
                          {message.references && (
                            <Box sx={{ mt: 1 }}>
                              <Typography variant="caption" color="text.secondary">
                                References:
                              </Typography>
                              {message.references.map((ref, idx) => (
                                <Chip
                                  key={idx}
                                  label={`${ref.title} (p.${ref.page})`}
                                  size="small"
                                  sx={{ ml: 0.5, mt: 0.5 }}
                                />
                              ))}
                            </Box>
                          )}
                        </Box>
                      </Box>
                    ))}
                    
                    {chatLoading && (
                      <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 2 }}>
                        <Box
                          sx={{
                            p: 2,
                            borderRadius: 2,
                            bgcolor: '#fff',
                            boxShadow: 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                          }}
                        >
                          <CircularProgress size={16} />
                          <Typography variant="body2" color="text.secondary">
                            AI is thinking...
                          </Typography>
                        </Box>
                      </Box>
                    )}
                  </Box>

                  {/* Input Area */}
                  <Box sx={{ p: 2, borderTop: '1px solid #ddd', bgcolor: 'white' }}>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <TextField
                        fullWidth
                        multiline
                        maxRows={4}
                        placeholder={
                          documents.filter(d => d.status === 'processed').length === 0
                            ? "Upload and process some documents first..."
                            : "Ask me anything about your documents..."
                        }
                        value={chatInputValue}
                        onChange={(e) => setChatInputValue(e.target.value)}
                        disabled={documents.filter(d => d.status === 'processed').length === 0 || chatLoading}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleChatMessage(chatInputValue);
                          }
                        }}
                        variant="outlined"
                        size="small"
                      />
                      <Button
                        variant="contained"
                        onClick={() => handleChatMessage(chatInputValue)}
                        disabled={!chatInputValue.trim() || documents.filter(d => d.status === 'processed').length === 0 || chatLoading}
                        sx={{ minWidth: 'auto', px: 2 }}
                      >
                        Send
                      </Button>
                    </Box>
                  </Box>
                </Box>
              </Box>
            </TabPanel>
          </Box>
        </Box>

        {/* Upload FAB */}
        <Fab
          color="primary"
          aria-label="upload"
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            background: 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)',
            '&:hover': {
              background: 'linear-gradient(45deg, #1565c0 30%, #1976d2 90%)',
            }
          }}
          onClick={() => setUploadDialogOpen(true)}
        >
          <AddIcon />
        </Fab>
      </GmailLayout>

      {/* Upload Dialog */}
      <Dialog
        open={uploadDialogOpen}
        onClose={() => !uploading && setUploadDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CloudUploadIcon color="primary" />
            Upload Documents
          </Box>
          {!uploading && (
            <IconButton onClick={() => setUploadDialogOpen(false)}>
              <CloseIcon />
            </IconButton>
          )}
        </DialogTitle>
        <DialogContent>
          {uploading ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CircularProgress size={60} sx={{ mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Uploading Documents...
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={uploadProgress} 
                sx={{ mt: 2, mb: 1 }}
              />
              <Typography variant="body2" color="text.secondary">
                {Math.round(uploadProgress)}% complete
              </Typography>
            </Box>
          ) : (
            <FileUpload
              onUpload={handleFileUpload}
              accept=".pdf,.docx,.epub,.txt"
              maxSize={10 * 1024 * 1024} // 10MB
              multiple
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Login Dialog */}
      <Dialog
        open={loginDialogOpen}
        onClose={() => !loginLoading && setLoginDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Login to Smart eBook Chat System
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Alert severity="info" sx={{ mb: 3 }}>
              Use your FastAPI backend credentials to access real features, or continue without login for demo mode.
            </Alert>
            
            <Box sx={{ mb: 2 }}>
              <Button
                variant="outlined"
                fullWidth
                onClick={() => {
                  setLoginForm({ email: 'test@example.com', password: 'password123' });
                }}
                disabled={loginLoading}
              >
                Use Test Account (test@example.com)
              </Button>
            </Box>
            
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={loginForm.email}
              onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
              disabled={loginLoading}
              sx={{ mb: 2 }}
              placeholder="test@example.com"
            />
            
            <TextField
              fullWidth
              label="Password"
              type="password"
              value={loginForm.password}
              onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
              disabled={loginLoading}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleLogin();
                }
              }}
              placeholder="password123"
            />
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3 }}>
              <Button
                onClick={() => setLoginDialogOpen(false)}
                disabled={loginLoading}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleLogin}
                disabled={loginLoading || !loginForm.email || !loginForm.password}
                startIcon={loginLoading ? <CircularProgress size={16} /> : null}
              >
                {loginLoading ? 'Logging in...' : 'Login'}
              </Button>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification({ ...notification, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert
          onClose={() => setNotification({ ...notification, open: false })}
          severity={notification.severity}
          variant="filled"
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export const Head = () => (
  <Seo 
    title="Smart eBook Chat System" 
    description="AI-powered document analysis and chat system. Upload documents, search content, and get intelligent answers."
  />
);

export default SmartEbookChatApp; 