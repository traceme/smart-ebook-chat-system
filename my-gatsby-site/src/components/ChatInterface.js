import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  Paper,
  Divider,
  Chip,
  Menu,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Slider,
  Switch,
  FormControlLabel,
  Tooltip,
  Avatar,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  AppBar,
  Toolbar,
  Collapse,
  Alert,
  LinearProgress,
} from '@mui/material';
import { styled, alpha } from '@mui/material/styles';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight, oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

// Icons using Unicode emojis
const SendIcon = () => <span style={{ fontSize: '18px' }}>📤</span>;
const UserIcon = () => <span style={{ fontSize: '20px' }}>👤</span>;
const AssistantIcon = () => <span style={{ fontSize: '20px' }}>🤖</span>;
const SettingsIcon = () => <span style={{ fontSize: '16px' }}>⚙️</span>;
const ExportIcon = () => <span style={{ fontSize: '16px' }}>📄</span>;
const ShareIcon = () => <span style={{ fontSize: '16px' }}>🔗</span>;
const ClearIcon = () => <span style={{ fontSize: '16px' }}>🗑️</span>;
const ContextIcon = () => <span style={{ fontSize: '16px' }}>📚</span>;
const HistoryIcon = () => <span style={{ fontSize: '16px' }}>📜</span>;
const ModelIcon = () => <span style={{ fontSize: '16px' }}>🧠</span>;
const TempIcon = () => <span style={{ fontSize: '16px' }}>🌡️</span>;
const CopyIcon = () => <span style={{ fontSize: '16px' }}>📋</span>;
const RefreshIcon = () => <span style={{ fontSize: '16px' }}>🔄</span>;

// Styled components
const ChatContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  height: '100vh',
  backgroundColor: '#fff',
  border: '1px solid #dadce0',
  borderRadius: theme.spacing(1),
  overflow: 'hidden',
}));

const ChatHeader = styled(AppBar)(({ theme }) => ({
  backgroundColor: '#f8f9fa',
  color: '#202124',
  boxShadow: '0 1px 3px rgba(60,64,67,0.3)',
  borderBottom: '1px solid #dadce0',
}));

const MessagesContainer = styled(Box)(({ theme }) => ({
  flex: 1,
  overflowY: 'auto',
  padding: theme.spacing(1),
  backgroundColor: '#fafafa',
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

const MessageBubble = styled(Paper)(({ theme, isUser, isStreaming }) => ({
  padding: theme.spacing(1.5, 2),
  marginBottom: theme.spacing(1),
  maxWidth: '80%',
  alignSelf: isUser ? 'flex-end' : 'flex-start',
  marginLeft: isUser ? 'auto' : 0,
  marginRight: isUser ? 0 : 'auto',
  backgroundColor: isUser ? '#4285f4' : '#fff',
  color: isUser ? '#fff' : '#202124',
  border: isUser ? 'none' : '1px solid #dadce0',
  borderRadius: isUser 
    ? '16px 16px 4px 16px' 
    : '16px 16px 16px 4px',
  position: 'relative',
  ...(isStreaming && {
    '&::after': {
      content: '""',
      position: 'absolute',
      bottom: 4,
      right: 8,
      width: 4,
      height: 4,
      backgroundColor: '#34a853',
      borderRadius: '50%',
      animation: 'pulse 1.5s infinite',
    },
  }),
  '& pre': {
    backgroundColor: alpha(theme.palette.grey[100], 0.8),
    borderRadius: 4,
    padding: theme.spacing(1),
    margin: theme.spacing(0.5, 0),
    overflow: 'auto',
  },
  '& code': {
    backgroundColor: alpha(theme.palette.grey[100], 0.3),
    padding: '2px 4px',
    borderRadius: 2,
    fontSize: '0.9em',
  },
  '& blockquote': {
    borderLeft: `4px solid ${isUser ? '#fff' : '#4285f4'}`,
    margin: theme.spacing(1, 0),
    paddingLeft: theme.spacing(1),
    fontStyle: 'italic',
  },
  '@keyframes pulse': {
    '0%': { opacity: 1 },
    '50%': { opacity: 0.5 },
    '100%': { opacity: 1 },
  },
}));

const InputContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  backgroundColor: '#fff',
  borderTop: '1px solid #dadce0',
}));

const ReferenceChip = styled(Chip)(({ theme }) => ({
  margin: theme.spacing(0.25),
  cursor: 'pointer',
  '&:hover': {
    backgroundColor: alpha('#4285f4', 0.1),
  },
}));

const ControlPanel = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1.5),
  backgroundColor: '#f8f9fa',
  borderBottom: '1px solid #dadce0',
}));

// Available AI models
const AI_MODELS = [
  { id: 'gpt-4', name: 'GPT-4', provider: 'OpenAI', description: 'Most capable model' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'OpenAI', description: 'Fast and efficient' },
  { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', provider: 'Anthropic', description: 'Balanced performance' },
  { id: 'claude-3-haiku', name: 'Claude 3 Haiku', provider: 'Anthropic', description: 'Quick responses' },
];

const ChatInterface = ({
  documents = [],
  onSendMessage = () => {},
  onClearChat = () => {},
  onExportChat = () => {},
  onShareChat = () => {},
  initialMessages = [],
  className,
}) => {
  // State management
  const [messages, setMessages] = useState(initialMessages);
  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gpt-4');
  const [temperature, setTemperature] = useState(0.7);
  const [contextVisible, setContextVisible] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedReferences, setSelectedReferences] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  
  // Refs
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Scroll to bottom when messages change
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Handle sending messages
  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || isStreaming) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
      references: selectedReferences,
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setSelectedReferences([]);
    setIsStreaming(true);

    // Create assistant message for streaming
    const assistantMessage = {
      id: Date.now() + 1,
      type: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
      model: selectedModel,
      temperature,
    };

    setMessages(prev => [...prev, assistantMessage]);

    try {
      // Simulate streaming response
      await simulateStreamingResponse(assistantMessage.id, userMessage.content);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessage.id 
          ? { ...msg, content: 'Sorry, I encountered an error. Please try again.', isStreaming: false }
          : msg
      ));
    } finally {
      setIsStreaming(false);
    }

    // Call external handler
    onSendMessage(userMessage, assistantMessage);
  }, [inputValue, selectedReferences, isStreaming, selectedModel, temperature, onSendMessage]);

  // Simulate streaming response
  const simulateStreamingResponse = useCallback(async (messageId, userInput) => {
    const responses = {
      default: "I'd be happy to help you with that. Let me analyze the information you've provided and give you a comprehensive response.",
      'document': "Based on the documents you've shared, I can see several key points that are relevant to your question. Let me break down the main insights:",
      'search': "I've searched through the available information and found several relevant passages. Here's what I discovered:",
      'summary': "Here's a summary of the key information:\n\n**Main Points:**\n- First key insight\n- Second important finding\n- Third relevant detail\n\n**Recommendations:**\nBased on this analysis, I recommend...",
    };

    let responseText = responses.default;
    
    // Choose response based on user input
    if (userInput.toLowerCase().includes('document')) {
      responseText = responses.document;
    } else if (userInput.toLowerCase().includes('search')) {
      responseText = responses.search;
    } else if (userInput.toLowerCase().includes('summary')) {
      responseText = responses.summary;
    }

    // Add code example for certain queries
    if (userInput.toLowerCase().includes('code') || userInput.toLowerCase().includes('example')) {
      responseText += "\n\nHere's a code example:\n\n```javascript\nfunction processDocument(doc) {\n  return doc.content\n    .split('\\n')\n    .filter(line => line.trim())\n    .map(line => line.trim());\n}\n```";
    }

    // Add references
    if (selectedReferences.length > 0) {
      responseText += "\n\n**References:**\n" + 
        selectedReferences.map((ref, i) => `[${i + 1}] ${ref.title} (page ${ref.page})`).join('\n');
    }

    // Stream the response character by character
    const words = responseText.split(' ');
    for (let i = 0; i < words.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
      
      const partialContent = words.slice(0, i + 1).join(' ');
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, content: partialContent }
          : msg
      ));
    }

    // Mark streaming as complete
    setMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? { ...msg, isStreaming: false }
        : msg
    ));
  }, [selectedReferences]);

  // Handle keyboard shortcuts
  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  // Copy message content
  const copyMessage = useCallback((content) => {
    navigator.clipboard.writeText(content);
    // You could add a toast notification here
  }, []);

  // Reference highlighting component
  const ReferenceHighlight = ({ reference, onClick }) => (
    <ReferenceChip
      label={`${reference.title} (p.${reference.page})`}
      size="small"
      variant="outlined"
      onClick={() => onClick(reference)}
      icon={<ContextIcon />}
    />
  );

  // Custom Markdown components with reference highlighting
  const MarkdownComponents = {
    code({ node, inline, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || '');
      return !inline && match ? (
        <SyntaxHighlighter
          style={darkMode ? oneDark : oneLight}
          language={match[1]}
          PreTag="div"
          {...props}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      ) : (
        <code className={className} {...props}>
          {children}
        </code>
      );
    },
    p({ children }) {
      // Check if paragraph contains reference markers like [1], [2], etc.
      const content = String(children);
      const referencePattern = /\[(\d+)\]/g;
      
      if (referencePattern.test(content)) {
        // Split content and create reference chips
        const parts = content.split(referencePattern);
        return (
          <Typography component="div" variant="body2">
            {parts.map((part, index) => {
              const refNumber = parseInt(part);
              if (!isNaN(refNumber) && selectedReferences[refNumber - 1]) {
                return (
                  <ReferenceHighlight
                    key={index}
                    reference={selectedReferences[refNumber - 1]}
                    onClick={(ref) => console.log('Reference clicked:', ref)}
                  />
                );
              }
              return part;
            })}
          </Typography>
        );
      }
      
      return <Typography variant="body2">{children}</Typography>;
    },
  };

  // Render message content
  const renderMessageContent = useCallback((message) => {
    if (message.type === 'user') {
      return (
        <Box>
          <Typography variant="body2">{message.content}</Typography>
          {message.references && message.references.length > 0 && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="caption" color="text.secondary">
                References:
              </Typography>
              {message.references.map((ref, index) => (
                <ReferenceHighlight
                  key={index}
                  reference={ref}
                  onClick={(ref) => console.log('Reference clicked:', ref)}
                />
              ))}
            </Box>
          )}
        </Box>
      );
    }

    return (
      <Box>
        <ReactMarkdown components={MarkdownComponents}>
          {message.content}
        </ReactMarkdown>
        {message.isStreaming && (
          <LinearProgress 
            sx={{ mt: 1, height: 2 }} 
            color="primary"
          />
        )}
      </Box>
    );
  }, []);

  return (
    <ChatContainer className={className}>
      {/* Chat Header */}
      <ChatHeader position="static" elevation={0}>
        <Toolbar>
          <AssistantIcon />
          <Typography variant="h6" sx={{ ml: 1, flexGrow: 1 }}>
            Smart eBook Chat
          </Typography>
          
          <Tooltip title="Chat History">
            <IconButton 
              color="inherit" 
              onClick={() => setHistoryOpen(true)}
            >
              <HistoryIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Context View">
            <IconButton 
              color="inherit" 
              onClick={() => setContextVisible(!contextVisible)}
            >
              <ContextIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Export Chat">
            <IconButton 
              color="inherit" 
              onClick={onExportChat}
            >
              <ExportIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Share Chat">
            <IconButton 
              color="inherit" 
              onClick={onShareChat}
            >
              <ShareIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Settings">
            <IconButton 
              color="inherit" 
              onClick={() => setSettingsOpen(true)}
            >
              <SettingsIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Clear Chat">
            <IconButton 
              color="inherit" 
              onClick={onClearChat}
            >
              <ClearIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </ChatHeader>

      {/* Control Panel */}
      <Collapse in={settingsOpen}>
        <ControlPanel>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Model</InputLabel>
              <Select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                label="Model"
              >
                {AI_MODELS.map(model => (
                  <MenuItem key={model.id} value={model.id}>
                    <Box>
                      <Typography variant="body2">{model.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {model.description}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <Box sx={{ minWidth: 150 }}>
              <Typography variant="caption" color="text.secondary">
                Temperature: {temperature}
              </Typography>
              <Slider
                size="small"
                value={temperature}
                onChange={(e, value) => setTemperature(value)}
                min={0}
                max={1}
                step={0.1}
                valueLabelDisplay="auto"
              />
            </Box>
            
            <FormControlLabel
              control={
                <Switch
                  checked={darkMode}
                  onChange={(e) => setDarkMode(e.target.checked)}
                  size="small"
                />
              }
              label="Dark Mode"
            />
          </Box>
        </ControlPanel>
      </Collapse>

      {/* Context Viewer */}
      <Collapse in={contextVisible}>
        <Box sx={{ p: 2, backgroundColor: '#f5f5f5', borderBottom: '1px solid #dadce0' }}>
          <Typography variant="subtitle2" gutterBottom>
            Document Context ({documents.length} documents)
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {documents.slice(0, 5).map((doc, index) => (
              <Chip
                key={index}
                label={doc.title}
                size="small"
                onClick={() => setSelectedReferences(prev => 
                  prev.find(ref => ref.id === doc.id) 
                    ? prev.filter(ref => ref.id !== doc.id)
                    : [...prev, doc]
                )}
                color={selectedReferences.find(ref => ref.id === doc.id) ? 'primary' : 'default'}
              />
            ))}
            {documents.length > 5 && (
              <Chip 
                label={`+${documents.length - 5} more`} 
                size="small" 
                variant="outlined" 
              />
            )}
          </Box>
        </Box>
      </Collapse>

      {/* Messages Area */}
      <MessagesContainer>
        {messages.length === 0 ? (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100%',
            textAlign: 'center',
            color: 'text.secondary'
          }}>
            <AssistantIcon />
            <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
              Welcome to Smart eBook Chat!
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Ask questions about your documents, request summaries, or explore topics.
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
              <Chip 
                label="Summarize documents" 
                variant="outlined" 
                size="small"
                onClick={() => setInputValue('Can you summarize the key points from my documents?')}
              />
              <Chip 
                label="Search for topics" 
                variant="outlined" 
                size="small"
                onClick={() => setInputValue('Search for information about...')}
              />
              <Chip 
                label="Ask questions" 
                variant="outlined" 
                size="small"
                onClick={() => setInputValue('I have a question about...')}
              />
            </Box>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {messages.map((message) => (
              <Box key={message.id} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <Avatar 
                  sx={{ 
                    width: 32, 
                    height: 32, 
                    bgcolor: message.type === 'user' ? '#4285f4' : '#34a853',
                    alignSelf: message.type === 'user' ? 'flex-end' : 'flex-start',
                  }}
                >
                  {message.type === 'user' ? <UserIcon /> : <AssistantIcon />}
                </Avatar>
                
                <MessageBubble 
                  isUser={message.type === 'user'} 
                  isStreaming={message.isStreaming}
                  elevation={1}
                >
                  {renderMessageContent(message)}
                  
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    mt: 1,
                    pt: 1,
                    borderTop: message.type === 'assistant' ? '1px solid #f0f0f0' : 'none'
                  }}>
                    <Typography variant="caption" color="text.secondary">
                      {message.timestamp.toLocaleTimeString()}
                      {message.model && ` • ${AI_MODELS.find(m => m.id === message.model)?.name}`}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <IconButton 
                        size="small" 
                        onClick={() => copyMessage(message.content)}
                      >
                        <CopyIcon />
                      </IconButton>
                      {message.type === 'assistant' && !message.isStreaming && (
                        <IconButton 
                          size="small" 
                          onClick={() => {
                            // Regenerate response
                            console.log('Regenerating response...');
                          }}
                        >
                          <RefreshIcon />
                        </IconButton>
                      )}
                    </Box>
                  </Box>
                </MessageBubble>
              </Box>
            ))}
            <div ref={messagesEndRef} />
          </Box>
        )}
      </MessagesContainer>

      {/* Input Area */}
      <InputContainer>
        {selectedReferences.length > 0 && (
          <Box sx={{ mb: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Selected references:
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
              {selectedReferences.map((ref, index) => (
                <ReferenceChip
                  key={index}
                  label={ref.title}
                  size="small"
                  onDelete={() => setSelectedReferences(prev => 
                    prev.filter((_, i) => i !== index)
                  )}
                />
              ))}
            </Box>
          </Box>
        )}
        
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
          <TextField
            ref={inputRef}
            fullWidth
            multiline
            maxRows={4}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask a question about your documents..."
            variant="outlined"
            disabled={isStreaming}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 3,
              },
            }}
          />
          <Button
            variant="contained"
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isStreaming}
            sx={{ 
              minWidth: 'auto', 
              px: 2, 
              py: 1.5,
              borderRadius: 3,
            }}
          >
            {isStreaming ? <RefreshIcon /> : <SendIcon />}
          </Button>
        </Box>
      </InputContainer>

      {/* Chat History Dialog */}
      <Dialog 
        open={historyOpen} 
        onClose={() => setHistoryOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Chat History</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Previous conversations would be listed here...
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </ChatContainer>
  );
};

export default ChatInterface; 