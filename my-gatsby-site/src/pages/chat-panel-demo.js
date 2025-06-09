import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Button,
  Chip,
  Alert,
  AlertTitle,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { gmailTheme } from '../components/GmailLayout';
import GmailNavigation from '../components/GmailNavigation';
import ChatPanel from '../components/ChatPanel';

// Sample chat messages with different types
const sampleMessages = [
  {
    id: 1,
    text: "Welcome to Smart eBook Chat! I'm your AI assistant. I can help you with document analysis, summarization, and answering questions about your uploaded content.",
    isOwn: false,
    timestamp: new Date(Date.now() - 300000),
    type: 'text',
  },
  {
    id: 2,
    text: "Hi! Can you help me understand this document about machine learning?",
    isOwn: true,
    timestamp: new Date(Date.now() - 240000),
    type: 'text',
  },
  {
    id: 3,
    text: `Of course! Here's a summary of key machine learning concepts:

## Machine Learning Basics

**Supervised Learning**: Uses labeled training data
- Classification (categories)
- Regression (continuous values)

**Unsupervised Learning**: Finds patterns in unlabeled data
- Clustering
- Dimensionality reduction

**Reinforcement Learning**: Learns through interaction
- Agent takes actions
- Receives rewards/penalties
- Optimizes strategy over time

### Code Example
\`\`\`python
# Simple linear regression
from sklearn.linear_model import LinearRegression
model = LinearRegression()
model.fit(X_train, y_train)
predictions = model.predict(X_test)
\`\`\`

> "Machine learning is the study of computer algorithms that improve automatically through experience." - Tom Mitchell`,
    isOwn: false,
    timestamp: new Date(Date.now() - 180000),
    type: 'text',
  },
  {
    id: 4,
    text: "That's really helpful! Can you explain neural networks too? 🧠",
    isOwn: true,
    timestamp: new Date(Date.now() - 120000),
    type: 'text',
  },
  {
    id: 5,
    text: `Absolutely! Neural networks are fascinating! 🚀

## Neural Networks

Neural networks are computational models inspired by biological neural networks. They consist of:

1. **Neurons (Nodes)**: Basic processing units
2. **Layers**: Input, hidden, and output layers
3. **Weights**: Connection strengths between neurons
4. **Activation Functions**: Determine neuron output

### Types of Neural Networks

- **Feedforward Networks**: Information flows in one direction
- **Convolutional Networks (CNNs)**: Great for image processing
- **Recurrent Networks (RNNs)**: Handle sequential data
- **Transformers**: State-of-the-art for language tasks

### Simple Neuron Math
\`\`\`
output = activation_function(Σ(input_i × weight_i) + bias)
\`\`\`

**Key Benefits:**
- ✅ Pattern recognition
- ✅ Complex problem solving
- ✅ Adaptability
- ✅ Parallel processing

Would you like me to explain any specific type in more detail?`,
    isOwn: false,
    timestamp: new Date(Date.now() - 60000),
    type: 'text',
  },
  {
    id: 6,
    text: "Perfect! This is exactly what I needed. Thank you! 😊👍",
    isOwn: true,
    timestamp: new Date(Date.now() - 10000),
    type: 'text',
  },
];

const markdownExamples = [
  {
    title: "Headers & Text Formatting",
    content: `# Main Title
## Subtitle
### Section

**Bold text** and *italic text*
~~Strikethrough~~ and \`inline code\`

> This is a blockquote
> It can span multiple lines`
  },
  {
    title: "Lists & Links", 
    content: `## Todo List
- [x] Complete Task 12.1
- [x] Complete Task 12.2  
- [ ] Add more features
- [ ] Test on mobile

### Links
[Google](https://google.com)
[Documentation](https://reactjs.org)`
  },
  {
    title: "Code Blocks",
    content: `### JavaScript Example
\`\`\`javascript
const chatBot = {
  name: 'AI Assistant',
  greet: (user) => \`Hello \${user}! 👋\`,
  processMessage: async (text) => {
    // AI processing logic
    return await generateResponse(text);
  }
};
\`\`\`

### Python Example
\`\`\`python
def calculate_accuracy(predictions, labels):
    correct = sum(p == l for p, l in zip(predictions, labels))
    return correct / len(labels)
\`\`\``
  },
  {
    title: "Tables & Math",
    content: `| Model | Accuracy | Speed |
|-------|----------|-------|
| GPT-4 | 95% | Fast |
| BERT | 92% | Medium |
| RNN | 85% | Slow |

### Math (if supported)
E = mc²
∑(x_i) for i=1 to n`
  }
];

const ChatPanelDemo = () => {
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [isChatMinimized, setIsChatMinimized] = useState(false);
  const [chatWidth, setChatWidth] = useState('medium');
  const [messages, setMessages] = useState(sampleMessages);
  const [isTyping, setIsTyping] = useState(false);
  const [enableMarkdown, setEnableMarkdown] = useState(true);
  const [enableEmoji, setEnableEmoji] = useState(true);
  const [chatTheme, setChatTheme] = useState('light');

  // Simulate AI response
  const simulateAIResponse = (userMessage) => {
    setIsTyping(true);
    
    setTimeout(() => {
      const responses = [
        "That's an interesting question! Let me help you with that.",
        "I understand what you're looking for. Here's my response...",
        "Great question! Based on the context, I can explain that...",
        "Let me break this down for you step by step:",
        `Here's what I found about "${userMessage.text.slice(0, 20)}...":`,
      ];
      
      const response = responses[Math.floor(Math.random() * responses.length)];
      
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: response,
        isOwn: false,
        timestamp: new Date(),
        type: 'text',
      }]);
      setIsTyping(false);
    }, 1500 + Math.random() * 1000);
  };

  const handleSendMessage = (message) => {
    setMessages(prev => [...prev, message]);
    
    // Simulate AI response
    if (Math.random() > 0.3) { // 70% chance of AI response
      simulateAIResponse(message);
    }
  };

  const loadSampleConversation = () => {
    setMessages(sampleMessages);
  };

  const clearChat = () => {
    setMessages([]);
  };

  const addSystemMessage = (text) => {
    setMessages(prev => [...prev, {
      id: Date.now(),
      text,
      isOwn: false,
      timestamp: new Date(),
      type: 'system',
    }]);
  };

  const insertMarkdownExample = (example) => {
    setMessages(prev => [...prev, {
      id: Date.now(),
      text: example.content,
      isOwn: false,
      timestamp: new Date(),
      type: 'text',
    }]);
  };

  return (
    <ThemeProvider theme={gmailTheme}>
      <Box sx={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
        {/* Navigation */}
        <GmailNavigation
          user={{ name: 'Demo User', email: 'demo@example.com' }}
        />

        <Container maxWidth="xl" sx={{ py: 4 }}>
          {/* Header */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, color: '#202124' }}>
              💬 Chat Panel Demo
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Interactive chat component with markdown support, emoji picker, and responsive design.
            </Typography>
            
            <Alert severity="info" sx={{ mb: 3 }}>
              <AlertTitle>Chat Features</AlertTitle>
              <strong>Markdown Support:</strong> Full markdown rendering with syntax highlighting<br />
              <strong>Emoji Picker:</strong> Click the smiley icon to add emojis<br />
              <strong>Responsive Design:</strong> Adapts to different screen sizes<br />
              <strong>Live Preview:</strong> Toggle markdown preview while typing
            </Alert>
          </Box>

          <Grid container spacing={4}>
            {/* Controls */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                  🎮 Chat Controls
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={isChatOpen}
                          onChange={(e) => setIsChatOpen(e.target.checked)}
                        />
                      }
                      label="Show Chat Panel"
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={isChatMinimized}
                          onChange={(e) => setIsChatMinimized(e.target.checked)}
                          disabled={!isChatOpen}
                        />
                      }
                      label="Minimize Chat"
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Chat Width</InputLabel>
                      <Select
                        value={chatWidth}
                        onChange={(e) => setChatWidth(e.target.value)}
                        label="Chat Width"
                      >
                        <MenuItem value="small">Small (320px)</MenuItem>
                        <MenuItem value="medium">Medium (400px)</MenuItem>
                        <MenuItem value="large">Large (480px)</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Theme</InputLabel>
                      <Select
                        value={chatTheme}
                        onChange={(e) => setChatTheme(e.target.value)}
                        label="Theme"
                      >
                        <MenuItem value="light">Light</MenuItem>
                        <MenuItem value="dark">Dark</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={enableMarkdown}
                          onChange={(e) => setEnableMarkdown(e.target.checked)}
                        />
                      }
                      label="Enable Markdown"
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={enableEmoji}
                          onChange={(e) => setEnableEmoji(e.target.checked)}
                        />
                      }
                      label="Enable Emoji Picker"
                    />
                  </Grid>
                </Grid>

                <Divider sx={{ my: 2 }} />

                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Button size="small" onClick={loadSampleConversation}>
                    Load Sample Chat
                  </Button>
                  <Button size="small" onClick={clearChat} color="warning">
                    Clear Chat
                  </Button>
                  <Button 
                    size="small" 
                    onClick={() => addSystemMessage("📢 System notification: Chat session restored")}
                  >
                    Add System Message
                  </Button>
                </Box>
              </Paper>
            </Grid>

            {/* Chat Statistics */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  📊 Chat Statistics
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Total Messages</Typography>
                    <Typography variant="h6" color="primary">
                      {messages.length}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">User Messages</Typography>
                    <Typography variant="h6" color="success.main">
                      {messages.filter(m => m.isOwn).length}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">AI Responses</Typography>
                    <Typography variant="h6" color="info.main">
                      {messages.filter(m => !m.isOwn && m.type !== 'system').length}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">System Messages</Typography>
                    <Typography variant="h6">
                      {messages.filter(m => m.type === 'system').length}
                    </Typography>
                  </Grid>
                </Grid>

                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Chat Status
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip 
                      label={isChatOpen ? 'Open' : 'Closed'} 
                      color={isChatOpen ? 'success' : 'default'}
                      size="small"
                    />
                    <Chip 
                      label={isChatMinimized ? 'Minimized' : 'Expanded'} 
                      color={isChatMinimized ? 'warning' : 'info'}
                      size="small"
                    />
                    <Chip 
                      label={isTyping ? 'AI Typing...' : 'Ready'}
                      color={isTyping ? 'secondary' : 'primary'}
                      size="small"
                    />
                  </Box>
                </Box>
              </Paper>
            </Grid>

            {/* Markdown Examples */}
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  📝 Markdown Examples
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Click any example to add it to the chat and see markdown rendering in action:
                </Typography>
                
                <Grid container spacing={2}>
                  {markdownExamples.map((example, index) => (
                    <Grid item xs={12} sm={6} md={3} key={index}>
                      <Paper 
                        sx={{ 
                          p: 2, 
                          cursor: 'pointer',
                          '&:hover': { backgroundColor: '#f5f5f5' },
                          border: '1px solid #dadce0'
                        }}
                        onClick={() => insertMarkdownExample(example)}
                      >
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                          {example.title}
                        </Typography>
                        <Typography 
                          variant="caption" 
                          color="text.secondary"
                          sx={{ 
                            display: 'block',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {example.content.slice(0, 50)}...
                        </Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            </Grid>

            {/* Component Features */}
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  ✨ Component Features
                </Typography>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                      💬 Chat Functionality
                    </Typography>
                    <List dense>
                      <ListItem>
                        <ListItemIcon>📝</ListItemIcon>
                        <ListItemText 
                          primary="Full Markdown Support"
                          secondary="Headers, lists, code blocks, links, and more"
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon>🎨</ListItemIcon>
                        <ListItemText 
                          primary="Syntax Highlighting"
                          secondary="Code blocks with language-specific highlighting"
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon>😊</ListItemIcon>
                        <ListItemText 
                          primary="Emoji Picker"
                          secondary="Categorized emoji selection with search"
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon>👁️</ListItemIcon>
                        <ListItemText 
                          primary="Live Preview"
                          secondary="Toggle markdown preview while typing"
                        />
                      </ListItem>
                    </List>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                      🎛️ UI/UX Features
                    </Typography>
                    <List dense>
                      <ListItem>
                        <ListItemIcon>📱</ListItemIcon>
                        <ListItemText 
                          primary="Responsive Design"
                          secondary="Adapts to mobile, tablet, and desktop"
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon>🔧</ListItemIcon>
                        <ListItemText 
                          primary="Customizable Settings"
                          secondary="Toggle features and adjust preferences"
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon>📏</ListItemIcon>
                        <ListItemText 
                          primary="Flexible Sizing"
                          secondary="Small, medium, and large width options"
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon>🔔</ListItemIcon>
                        <ListItemText 
                          primary="Notification Badges"
                          secondary="Unread message count when minimized"
                        />
                      </ListItem>
                    </List>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          </Grid>
        </Container>

        {/* Chat Panel */}
        <ChatPanel
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          isMinimized={isChatMinimized}
          onToggleMinimize={() => setIsChatMinimized(!isChatMinimized)}
          chatWidth={chatWidth}
          messages={messages}
          onSendMessage={handleSendMessage}
          isTyping={isTyping}
          user={{ name: 'Demo User', avatar: '👤' }}
          bot={{ name: 'AI Assistant', avatar: '🤖' }}
          enableMarkdown={enableMarkdown}
          enableEmoji={enableEmoji}
          theme={chatTheme}
          placeholder="Ask me anything about your documents..."
        />
      </Box>
    </ThemeProvider>
  );
};

export default ChatPanelDemo;

export const Head = () => (
  <>
    <title>Chat Panel Demo - Smart eBook Chat</title>
    <meta name="description" content="Interactive chat component with markdown support, emoji picker, and responsive design" />
  </>
);