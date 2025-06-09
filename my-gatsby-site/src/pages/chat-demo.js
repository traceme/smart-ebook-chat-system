import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Container,
  Grid,
  Paper,
  Button,
  Tabs,
  Tab,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  Divider,
  Alert,
  Chip,
  AppBar,
  Toolbar,
  IconButton,
  Drawer,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import ChatInterface from '../components/ChatInterface';
import ChatControls from '../components/ChatControls';
import ContextManager from '../components/ContextManager';

// Icons using Unicode emojis
const ChatIcon = () => <span style={{ fontSize: '20px' }}>💬</span>;
const DocumentIcon = () => <span style={{ fontSize: '16px' }}>📄</span>;
const ControlsIcon = () => <span style={{ fontSize: '16px' }}>⚙️</span>;
const ContextIcon = () => <span style={{ fontSize: '16px' }}>📚</span>;
const MenuIcon = () => <span style={{ fontSize: '16px' }}>☰</span>;
const DemoIcon = () => <span style={{ fontSize: '16px' }}>🎭</span>;

// Styled components
const DemoContainer = styled(Box)(({ theme }) => ({
  height: '100vh',
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: '#f5f5f5',
}));

const DemoHeader = styled(AppBar)(({ theme }) => ({
  backgroundColor: '#fff',
  color: '#202124',
  boxShadow: '0 1px 3px rgba(60,64,67,0.3)',
}));

const MainContent = styled(Box)(({ theme }) => ({
  flex: 1,
  display: 'flex',
  overflow: 'hidden',
}));

const ChatSection = styled(Box)(({ theme }) => ({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  margin: theme.spacing(1),
  marginLeft: 0,
}));

const SidePanel = styled(Paper)(({ theme }) => ({
  width: 350,
  margin: theme.spacing(1),
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
}));

const DemoControls = styled(Card)(({ theme }) => ({
  margin: theme.spacing(1),
  padding: theme.spacing(2),
}));

// Sample data
const sampleDocuments = [
  {
    id: '1',
    title: 'Introduction to Machine Learning',
    description: 'Comprehensive guide to ML fundamentals',
    type: 'PDF',
    pages: 45,
    words: 12500,
    size: 2.5 * 1024 * 1024,
    uploadedAt: new Date('2024-01-15'),
    content: 'Machine learning is a subset of artificial intelligence that focuses on algorithms that can learn from data...',
  },
  {
    id: '2',
    title: 'Python Programming Best Practices',
    description: 'Best practices for writing clean Python code',
    type: 'DOCX',
    pages: 28,
    words: 8200,
    size: 1.8 * 1024 * 1024,
    uploadedAt: new Date('2024-01-20'),
    content: 'Python is a high-level programming language known for its readability and simplicity...',
  },
  {
    id: '3',
    title: 'Data Science with Pandas',
    description: 'Complete guide to data manipulation with Pandas',
    type: 'PDF',
    pages: 67,
    words: 18900,
    size: 4.2 * 1024 * 1024,
    uploadedAt: new Date('2024-01-25'),
    content: 'Pandas is a powerful data manipulation library for Python that provides data structures...',
  },
  {
    id: '4',
    title: 'Neural Networks Deep Dive',
    description: 'Advanced concepts in neural network architectures',
    type: 'EPUB',
    pages: 89,
    words: 25600,
    size: 3.1 * 1024 * 1024,
    uploadedAt: new Date('2024-02-01'),
    content: 'Neural networks are computing systems inspired by biological neural networks...',
  },
  {
    id: '5',
    title: 'API Design Patterns',
    description: 'Modern patterns for RESTful API design',
    type: 'PDF',
    pages: 34,
    words: 9800,
    size: 2.0 * 1024 * 1024,
    uploadedAt: new Date('2024-02-05'),
    content: 'REST (Representational State Transfer) is an architectural style for designing web services...',
  },
];

const sampleConversations = [
  {
    id: 'conv-1',
    name: 'ML Basics Discussion',
    timestamp: new Date('2024-02-10T10:30:00'),
    model: 'gpt-4',
    temperature: 0.7,
    systemPrompt: 'You are a helpful AI assistant specialized in machine learning.',
    messageCount: 12,
  },
  {
    id: 'conv-2',
    name: 'Python Code Review',
    timestamp: new Date('2024-02-09T14:15:00'),
    model: 'claude-3-sonnet',
    temperature: 0.3,
    systemPrompt: 'You are a code review assistant.',
    messageCount: 8,
  },
  {
    id: 'conv-3',
    name: 'Data Analysis Session',
    timestamp: new Date('2024-02-08T09:45:00'),
    model: 'gpt-3.5-turbo',
    temperature: 0.5,
    systemPrompt: 'You are a data science expert.',
    messageCount: 15,
  },
];

const sampleMessages = [
  {
    id: 1,
    type: 'user',
    content: 'Can you explain the key concepts of machine learning from my documents?',
    timestamp: new Date('2024-02-10T10:30:00'),
    references: [sampleDocuments[0]],
  },
  {
    id: 2,
    type: 'assistant',
    content: `Based on your "Introduction to Machine Learning" document, here are the key concepts:

## Core Machine Learning Concepts

**1. Supervised Learning**
- Uses labeled training data
- Examples: classification, regression
- Algorithms: linear regression, decision trees, neural networks

**2. Unsupervised Learning**
- Finds patterns in unlabeled data
- Examples: clustering, dimensionality reduction
- Algorithms: k-means, PCA, autoencoders

**3. Feature Engineering**
The process of selecting and transforming variables for your model:

\`\`\`python
# Example feature scaling
from sklearn.preprocessing import StandardScaler
scaler = StandardScaler()
scaled_features = scaler.fit_transform(features)
\`\`\`

**4. Model Evaluation**
- Cross-validation
- Metrics: accuracy, precision, recall, F1-score
- Overfitting vs underfitting

Would you like me to dive deeper into any of these concepts or explore specific algorithms mentioned in your documents?`,
    timestamp: new Date('2024-02-10T10:31:30'),
    model: 'gpt-4',
    temperature: 0.7,
    isStreaming: false,
  },
];

const TabPanel = ({ children, value, index, ...other }) => (
  <Box
    role="tabpanel"
    hidden={value !== index}
    id={`demo-tabpanel-${index}`}
    aria-labelledby={`demo-tab-${index}`}
    {...other}
  >
    {value === index && children}
  </Box>
);

const ChatDemo = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // State management
  const [activeTab, setActiveTab] = useState(0);
  const [selectedModel, setSelectedModel] = useState('gpt-4');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2000);
  const [systemPrompt, setSystemPrompt] = useState('You are a helpful AI assistant specialized in analyzing documents and answering questions.');
  const [autoSave, setAutoSave] = useState(true);
  const [streamingEnabled, setStreamingEnabled] = useState(true);
  const [selectedDocuments, setSelectedDocuments] = useState(['1', '2']);
  const [activeConversationId, setActiveConversationId] = useState('conv-1');
  const [conversations, setConversations] = useState(sampleConversations);
  const [maxContextDocuments, setMaxContextDocuments] = useState(10);
  const [autoContextSelection, setAutoContextSelection] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [demoMode, setDemoMode] = useState(true);
  const [currentMessages, setCurrentMessages] = useState(sampleMessages);

  // Demo configuration
  const [showControls, setShowControls] = useState(true);
  const [showContext, setShowContext] = useState(true);
  const [interactiveDemo, setInteractiveDemo] = useState(true);

  // Handlers
  const handleDocumentSelect = useCallback((documentId) => {
    setSelectedDocuments(prev => [...prev, documentId]);
  }, []);

  const handleDocumentDeselect = useCallback((documentId) => {
    setSelectedDocuments(prev => prev.filter(id => id !== documentId));
  }, []);

  const handleSendMessage = useCallback((userMessage, assistantMessage) => {
    console.log('Message sent:', userMessage);
    // In a real implementation, this would trigger API calls
  }, []);

  const handleClearChat = useCallback(() => {
    setCurrentMessages([]);
  }, []);

  const handleExportChat = useCallback(() => {
    console.log('Exporting chat...');
    // Implementation would generate export file
  }, []);

  const handleShareChat = useCallback(() => {
    console.log('Sharing chat...');
    // Implementation would generate share link
  }, []);

  const handleSaveConversation = useCallback((conversationData) => {
    setConversations(prev => [...prev, conversationData]);
  }, []);

  const handleLoadConversation = useCallback((conversationId) => {
    setActiveConversationId(conversationId);
    // In real implementation, load conversation messages
  }, []);

  const handleDeleteConversation = useCallback((conversationId) => {
    setConversations(prev => prev.filter(conv => conv.id !== conversationId));
    if (activeConversationId === conversationId) {
      setActiveConversationId(null);
    }
  }, [activeConversationId]);

  const handleConversationRename = useCallback((conversationId, newName) => {
    setConversations(prev => prev.map(conv => 
      conv.id === conversationId ? { ...conv, name: newName } : conv
    ));
  }, []);

  const sidebar = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Tabs
        value={activeTab}
        onChange={(e, newValue) => setActiveTab(newValue)}
        variant="fullWidth"
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab 
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <ControlsIcon />
              Controls
            </Box>
          } 
        />
        <Tab 
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <ContextIcon />
              Context
            </Box>
          } 
        />
      </Tabs>

      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        <TabPanel value={activeTab} index={0}>
          {showControls && (
            <ChatControls
              selectedModel={selectedModel}
              onModelChange={setSelectedModel}
              temperature={temperature}
              onTemperatureChange={setTemperature}
              maxTokens={maxTokens}
              onMaxTokensChange={setMaxTokens}
              conversations={conversations}
              onSaveConversation={handleSaveConversation}
              onLoadConversation={handleLoadConversation}
              onDeleteConversation={handleDeleteConversation}
              onExportConversation={(format) => console.log('Export:', format)}
              onShareConversation={(shareId) => console.log('Share:', shareId)}
              systemPrompt={systemPrompt}
              onSystemPromptChange={setSystemPrompt}
              autoSave={autoSave}
              onAutoSaveChange={setAutoSave}
              streamingEnabled={streamingEnabled}
              onStreamingEnabledChange={setStreamingEnabled}
            />
          )}
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          {showContext && (
            <ContextManager
              documents={sampleDocuments}
              conversations={conversations}
              activeConversationId={activeConversationId}
              selectedDocuments={selectedDocuments}
              onDocumentSelect={handleDocumentSelect}
              onDocumentDeselect={handleDocumentDeselect}
              onDocumentView={(docId) => console.log('View document:', docId)}
              onDocumentEdit={(docId) => console.log('Edit document:', docId)}
              onDocumentDelete={(docId) => console.log('Delete document:', docId)}
              onConversationSelect={handleLoadConversation}
              onConversationDelete={handleDeleteConversation}
              onConversationRename={handleConversationRename}
              onContextSearch={(query) => console.log('Context search:', query)}
              maxContextDocuments={maxContextDocuments}
              onMaxContextDocumentsChange={setMaxContextDocuments}
              autoContextSelection={autoContextSelection}
              onAutoContextSelectionChange={setAutoContextSelection}
            />
          )}
        </TabPanel>
      </Box>
    </Box>
  );

  return (
    <DemoContainer>
      {/* Header */}
      <DemoHeader position="static" elevation={1}>
        <Toolbar>
          {isMobile && (
            <IconButton
              edge="start"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          <ChatIcon />
          <Typography variant="h6" sx={{ ml: 1, flexGrow: 1 }}>
            Smart eBook Chat - Interface Demo
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={demoMode}
                onChange={(e) => setDemoMode(e.target.checked)}
                size="small"
              />
            }
            label="Demo Mode"
          />
        </Toolbar>
      </DemoHeader>

      {/* Demo Controls */}
      {demoMode && (
        <DemoControls>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <DemoIcon />
            <Typography variant="h6" sx={{ ml: 1 }}>
              Demo Configuration
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <FormControlLabel
              control={
                <Switch
                  checked={showControls}
                  onChange={(e) => setShowControls(e.target.checked)}
                  size="small"
                />
              }
              label="Show Controls"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={showContext}
                  onChange={(e) => setShowContext(e.target.checked)}
                  size="small"
                />
              }
              label="Show Context Manager"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={interactiveDemo}
                  onChange={(e) => setInteractiveDemo(e.target.checked)}
                  size="small"
                />
              }
              label="Interactive Demo"
            />
            
            <Divider orientation="vertical" flexItem />
            
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Chip 
                label={`${sampleDocuments.length} Documents`} 
                size="small" 
                color="primary" 
              />
              <Chip 
                label={`${selectedDocuments.length} Selected`} 
                size="small" 
                color="secondary" 
              />
              <Chip 
                label={`${conversations.length} Conversations`} 
                size="small" 
                variant="outlined" 
              />
            </Box>
          </Box>
          
          {interactiveDemo && (
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Interactive Demo:</strong> Try selecting documents from the context manager, 
                adjusting model settings, and sending messages to see the chat interface in action.
              </Typography>
            </Alert>
          )}
        </DemoControls>
      )}

      {/* Main Content */}
      <MainContent>
        {/* Sidebar */}
        {isMobile ? (
          <Drawer
            variant="temporary"
            anchor="left"
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            ModalProps={{ keepMounted: true }}
            sx={{
              '& .MuiDrawer-paper': { width: 350 },
            }}
          >
            {sidebar}
          </Drawer>
        ) : (
          <SidePanel>
            {sidebar}
          </SidePanel>
        )}

        {/* Chat Interface */}
        <ChatSection>
          <ChatInterface
            documents={sampleDocuments.filter(doc => selectedDocuments.includes(doc.id))}
            onSendMessage={handleSendMessage}
            onClearChat={handleClearChat}
            onExportChat={handleExportChat}
            onShareChat={handleShareChat}
            initialMessages={currentMessages}
          />
        </ChatSection>
      </MainContent>

      {/* Feature Overview */}
      {demoMode && (
        <Card sx={{ m: 1, mt: 0 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Chat Interface Features
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" color="primary">
                  💬 Chat Features
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • Streaming responses with markdown rendering<br />
                  • Code syntax highlighting<br />
                  • Reference highlighting and linking<br />
                  • Message history and context management
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" color="primary">
                  ⚙️ Advanced Controls
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • Multiple AI model selection<br />
                  • Temperature and token controls<br />
                  • Custom system prompts<br />
                  • Conversation management
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" color="primary">
                  📚 Context Management
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • Document selection and filtering<br />
                  • Conversation history<br />
                  • Context usage tracking<br />
                  • Auto-selection features
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}
    </DemoContainer>
  );
};

export default ChatDemo; 